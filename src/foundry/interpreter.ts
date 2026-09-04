import { cloneSnapshot } from "../engine/clone";
import { OVERHEAT_THRESHOLD } from "../engine/metrics";
import type { ArkCell, ArkEdge, ArkSnapshot } from "../engine/types";
import type { CompiledThermalCapability } from "./schema";

type RuntimeReport = {
  operations: number;
  graphVisits: number;
  targetsAttempted: number;
  targetsStabilized: number;
  coolantMoved: number;
  materialUsed: number;
  pathsRegrown: number;
  failures: Array<{ targetId: number; reason: string }>;
};

export type CapabilityExecution = {
  world: ArkSnapshot;
  report: RuntimeReport;
};

type PathStep = { edgeId: number; to: number; cost: number; materialCost: number };

function parameter(
  capability: CompiledThermalCapability,
  args: Record<string, number>,
  name: "targetTemperature" | "materialBudget" | "sourceReserve",
  fallback: number,
): number {
  const declaration = capability.definition.parameters.find((item) => item.name === name);
  if (!declaration) return fallback;
  const value = args[name] ?? declaration.default;
  if (!Number.isFinite(value) || value < declaration.minimum || value > declaration.maximum) {
    throw new Error(`${name} must be between ${declaration.minimum} and ${declaration.maximum}.`);
  }
  return value;
}

function allowedStep(edge: ArkEdge, mode: CompiledThermalCapability["definition"]["program"]["pathMode"]): boolean {
  if (mode === "active_only") return edge.network === "thermal" && edge.active && !edge.fractured && !edge.dormant;
  if (mode === "wake_dormant") return edge.network === "thermal" && !edge.fractured;
  return true;
}

function stepCost(edge: ArkEdge): { cost: number; materialCost: number } {
  if (edge.network === "thermal" && edge.active && !edge.dormant && !edge.fractured) return { cost: 1, materialCost: 0 };
  if (edge.network === "thermal" && edge.dormant && !edge.fractured) return { cost: 2, materialCost: 1 };
  if (edge.network === "thermal" && edge.fractured) return { cost: 4, materialCost: 2 };
  return { cost: 5, materialCost: 3 };
}

function adjacency(world: ArkSnapshot, mode: CompiledThermalCapability["definition"]["program"]["pathMode"]): Map<number, PathStep[]> {
  const graph = new Map<number, PathStep[]>(world.cells.map((cell) => [cell.id, []]));
  for (const edge of world.edges) {
    if (!allowedStep(edge, mode)) continue;
    const weights = stepCost(edge);
    graph.get(edge.from)?.push({ edgeId: edge.id, to: edge.to, ...weights });
    graph.get(edge.to)?.push({ edgeId: edge.id, to: edge.from, ...weights });
  }
  for (const steps of graph.values()) steps.sort((left, right) => left.to - right.to);
  return graph;
}

function activeThermalComponent(world: ArkSnapshot, start: number): Set<number> {
  const graph = adjacency(world, "active_only");
  const seen = new Set<number>([start]);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    for (const step of graph.get(queue[index]) ?? []) {
      if (seen.has(step.to)) continue;
      seen.add(step.to);
      queue.push(step.to);
    }
  }
  return seen;
}

function findPath(
  graph: Map<number, PathStep[]>,
  start: number,
  goal: number,
  maxLength: number,
  runtime: RuntimeReport,
): PathStep[] | null {
  const frontier: Array<{ id: number; cost: number; steps: PathStep[] }> = [{ id: start, cost: 0, steps: [] }];
  const best = new Map<number, number>([[start, 0]]);

  while (frontier.length) {
    frontier.sort((left, right) => left.cost - right.cost || left.id - right.id);
    const current = frontier.shift();
    if (!current) break;
    runtime.graphVisits += 1;
    if (current.id === goal) return current.steps;
    if (current.steps.length >= maxLength) continue;

    for (const step of graph.get(current.id) ?? []) {
      const nextCost = current.cost + step.cost;
      if (nextCost >= (best.get(step.to) ?? Number.POSITIVE_INFINITY)) continue;
      best.set(step.to, nextCost);
      frontier.push({ id: step.to, cost: nextCost, steps: [...current.steps, step] });
    }
  }
  return null;
}

function selectSource(
  world: ArkSnapshot,
  target: ArkCell,
  sources: ArkCell[],
  graph: Map<number, PathStep[]>,
  capability: CompiledThermalCapability,
  reserve: number,
  runtime: RuntimeReport,
): { source: ArkCell; path: PathStep[] } | null {
  const ordered = sources.filter((source) => source.coolant > reserve);
  if (capability.definition.program.sourceScope === "active_thermal_component") {
    const activeIds = activeThermalComponent(world, target.id);
    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      if (!activeIds.has(ordered[index].id)) ordered.splice(index, 1);
    }
  }
  ordered.sort((left, right) => {
    if (capability.definition.program.sourceSelector === "highest_coolant_reservoir") {
      return right.coolant - left.coolant || left.id - right.id;
    }
    const leftDistance = Math.abs(left.gx - target.gx) + Math.abs(left.gy - target.gy);
    const rightDistance = Math.abs(right.gx - target.gx) + Math.abs(right.gy - target.gy);
    return leftDistance - rightDistance || right.coolant - left.coolant || left.id - right.id;
  });

  for (const source of ordered) {
    const path = findPath(graph, source.id, target.id, capability.definition.program.maxPathLength, runtime);
    if (path) return { source, path };
  }
  return null;
}

function activatePath(world: ArkSnapshot, path: PathStep[]): number {
  let material = 0;
  for (const step of path) {
    const edge = world.edges[step.edgeId];
    material += step.materialCost;
    edge.network = "thermal";
    edge.fractured = false;
    edge.dormant = false;
    edge.active = true;
    edge.integrity = Math.max(edge.integrity, 0.72);
    edge.capacity = Math.max(edge.capacity, 24);
  }
  return material;
}

function targetField(
  cell: ArkCell,
  field: CompiledThermalCapability["definition"]["program"]["targetOrder"][number]["field"],
): number {
  if (field === "criticality") return Number(cell.critical);
  if (field === "temperature") return cell.temperature;
  if (field === "coolant") return cell.coolant;
  return cell.id;
}

function compareTargets(
  left: ArkCell,
  right: ArkCell,
  order: CompiledThermalCapability["definition"]["program"]["targetOrder"],
): number {
  for (const clause of order) {
    const difference = targetField(left, clause.field) - targetField(right, clause.field);
    if (difference !== 0) return clause.direction === "asc" ? difference : -difference;
  }
  return left.id - right.id;
}

export function executeThermalCapability(
  sourceWorld: ArkSnapshot,
  capability: CompiledThermalCapability,
  args: Record<string, number>,
): CapabilityExecution {
  const world = cloneSnapshot(sourceWorld);
  const targetTemperature = parameter(capability, args, "targetTemperature", 72);
  const materialBudget = parameter(capability, args, "materialBudget", 0);
  const sourceReserve = parameter(capability, args, "sourceReserve", 16);
  const runtime: RuntimeReport = {
    operations: 0,
    graphVisits: 0,
    targetsAttempted: 0,
    targetsStabilized: 0,
    coolantMoved: 0,
    materialUsed: 0,
    pathsRegrown: 0,
    failures: [],
  };

  const program = capability.definition.program;
  const graph = adjacency(world, program.pathMode);
  const targets = world.cells
    .filter((cell) => cell.temperature > targetTemperature && (program.targetSelector === "all_hotspots" || cell.critical))
    .sort((left, right) => compareTargets(left, right, program.targetOrder))
    .slice(0, program.maxTargets);
  const sources = world.cells.filter((cell) => cell.kind === "reservoir");

  for (const target of targets) {
    runtime.operations += 1;
    runtime.targetsAttempted += 1;
    const candidate = selectSource(world, target, sources, graph, capability, sourceReserve, runtime);
    if (!candidate) {
      runtime.failures.push({ targetId: target.id, reason: "NO_REACHABLE_RESERVOIR" });
      continue;
    }

    const pathMaterial = candidate.path.reduce((total, step) => total + step.materialCost, 0);
    if (runtime.materialUsed + pathMaterial > materialBudget) {
      runtime.failures.push({ targetId: target.id, reason: "MATERIAL_BUDGET_EXCEEDED" });
      continue;
    }

    const needed = Math.max(0, (target.temperature - targetTemperature) / 1.35);
    const available = Math.max(0, candidate.source.coolant - sourceReserve);
    const moved = Math.min(needed, available);
    if (moved <= 0) {
      runtime.failures.push({ targetId: target.id, reason: "COOLANT_RESERVE_EXHAUSTED" });
      continue;
    }

    const used = activatePath(world, candidate.path);
    runtime.materialUsed += used;
    if (used > 0) runtime.pathsRegrown += 1;
    candidate.source.coolant -= moved;
    target.coolant += moved;
    target.temperature = Math.max(targetTemperature, target.temperature - moved * 1.35);
    runtime.coolantMoved += moved;
    runtime.targetsStabilized += target.temperature <= targetTemperature + 1e-9 ? 1 : 0;
  }

  world.tick += 1;
  world.revision += 1;
  return { world, report: runtime };
}

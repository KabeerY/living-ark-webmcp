import { cloneSnapshot } from "./clone";
import type { ArkSnapshot } from "./types";

export const THERMAL_HORIZON_TICKS = 12;

export type ThermalHorizonReport = {
  world: ArkSnapshot;
  ticks: number;
  stableTicks: number;
  peakCriticalTemperature: number;
  peakCriticalTemperatureByTick: number[];
};

function cooledComponents(world: ArkSnapshot): Set<number> {
  const adjacency = new Map<number, number[]>(world.cells.map((cell) => [cell.id, []]));
  for (const edge of world.edges) {
    if (edge.network !== "thermal" || !edge.active || edge.fractured || edge.dormant) continue;
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }

  const cooled = new Set<number>();
  const seen = new Set<number>();
  for (const start of world.cells) {
    if (seen.has(start.id)) continue;
    const component: number[] = [];
    const queue = [start.id];
    seen.add(start.id);
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      component.push(id);
      for (const neighbor of adjacency.get(id) ?? []) {
        if (seen.has(neighbor)) continue;
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
    if (component.some((id) => world.cells[id].kind === "reservoir" && world.cells[id].coolant > 1)) {
      for (const id of component) cooled.add(id);
    }
  }
  return cooled;
}

/**
 * Advances the post-execution world through residual crisis heat and network
 * diffusion. The capability is not run again during this horizon: the topology
 * and resource state it left behind must keep the Ark stable on their own.
 */
export function advanceThermalHorizon(
  source: ArkSnapshot,
  targetTemperature: number,
  ticks = THERMAL_HORIZON_TICKS,
): ThermalHorizonReport {
  const world = cloneSnapshot(source);
  const cooled = cooledComponents(world);
  const peaks: number[] = [];
  let stableTicks = 0;

  for (let tick = 0; tick < ticks; tick += 1) {
    const temperatures = world.cells.map((cell) => cell.temperature);
    const deltas = world.cells.map(() => 0);

    for (const edge of world.edges) {
      if (edge.network !== "thermal" || !edge.active || edge.fractured || edge.dormant) continue;
      const from = world.cells[edge.from];
      const to = world.cells[edge.to];
      const conductance = 0.018 + Math.min(0.032, edge.capacity / 1_700);
      const transfer = (to.temperature - from.temperature) * conductance;
      deltas[from.id] += transfer;
      deltas[to.id] -= transfer;
    }

    for (const cell of world.cells) {
      const starboardPressure =
        cell.sector === "Thermal Choir" || cell.sector === "Cryovault"
          ? Math.max(0, (cell.x / world.worldWidth - 0.57) * 0.38)
          : 0;
      const passiveCooling = cooled.has(cell.id) ? Math.max(0, temperatures[cell.id] - 34) * 0.055 : 0;
      cell.temperature = Math.max(24, temperatures[cell.id] + deltas[cell.id] + starboardPressure - passiveCooling);
    }

    world.tick += 1;
    const critical = world.cells.filter((cell) => cell.critical);
    const peak = Math.max(...critical.map((cell) => cell.temperature));
    peaks.push(peak);
    if (critical.every((cell) => cell.temperature <= targetTemperature + 1e-8)) stableTicks += 1;
  }

  return {
    world,
    ticks,
    stableTicks,
    peakCriticalTemperature: Math.max(...peaks),
    peakCriticalTemperatureByTick: peaks,
  };
}

import { hashSnapshot } from "../engine/hash";
import { createHeroArk } from "../engine/heroArk";
import { OVERHEAT_THRESHOLD } from "../engine/metrics";
import { advanceThermalHorizon, THERMAL_HORIZON_TICKS, type ThermalHorizonReport } from "../engine/thermalHorizon";
import type { ArkSnapshot } from "../engine/types";
import { defaultArguments } from "./compiler";
import { executeThermalCapability } from "./interpreter";
import type { CompiledThermalCapability } from "./schema";

type FailureCode =
  | "CRITICAL_CELL_OVERHEATED"
  | "COOLANT_NOT_CONSERVED"
  | "NEGATIVE_RESOURCE"
  | "MATERIAL_BUDGET_EXCEEDED"
  | "RUNTIME_BUDGET_EXCEEDED"
  | "THERMAL_RELAPSE"
  | "NON_DETERMINISTIC_REPLAY";

export type ValidationCase = {
  index: number;
  passed: boolean;
  failureCodes: FailureCode[];
  beforeHash: string;
  afterHash: string;
  peakCriticalTemperature: number;
  horizonTicks: number;
  stableTicks: number;
  replayMatched: boolean;
};

export type ValidationReport = {
  passed: boolean;
  passedCases: number;
  totalCases: number;
  candidateHash: string;
  suiteFingerprint: string;
  cases: ValidationCase[];
  failureClusters: Array<{ code: FailureCode; worlds: number }>;
  horizonTicks: number;
  invariantSet: string[];
};

function totalCoolant(world: ArkSnapshot): number {
  return world.cells.reduce((total, cell) => total + cell.coolant, 0);
}

function caseFailures(
  before: ArkSnapshot,
  after: ArkSnapshot,
  capability: CompiledThermalCapability,
  materialUsed: number,
  graphVisits: number,
  horizon: ThermalHorizonReport,
  replayMatched: boolean,
): FailureCode[] {
  const args = defaultArguments(capability);
  const materialBudget = args.materialBudget ?? 0;
  const failures: FailureCode[] = [];
  if (after.cells.some((cell) => cell.critical && cell.temperature > OVERHEAT_THRESHOLD + 1e-8)) {
    failures.push("CRITICAL_CELL_OVERHEATED");
  }
  if (Math.abs(totalCoolant(before) - totalCoolant(after)) > 1e-7) failures.push("COOLANT_NOT_CONSERVED");
  if (after.cells.some((cell) => cell.coolant < -1e-8 || cell.energy < -1e-8 || cell.matter < -1e-8)) {
    failures.push("NEGATIVE_RESOURCE");
  }
  if (materialUsed > materialBudget + 1e-8) failures.push("MATERIAL_BUDGET_EXCEEDED");
  if (graphVisits > capability.compileReport.staticBudget.maxGraphVisits) failures.push("RUNTIME_BUDGET_EXCEEDED");
  const immediateStable = after.cells.every((cell) => !cell.critical || cell.temperature <= OVERHEAT_THRESHOLD + 1e-8);
  if (immediateStable && horizon.stableTicks !== horizon.ticks) failures.push("THERMAL_RELAPSE");
  if (!replayMatched) failures.push("NON_DETERMINISTIC_REPLAY");
  return failures;
}

function fingerprint(seeds: number[]): string {
  let hash = 0x811c9dc5;
  for (const seed of seeds) {
    hash ^= seed;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function validateThermalCapability(
  capability: CompiledThermalCapability,
  seeds: number[],
): ValidationReport {
  const args = defaultArguments(capability);
  const cases = seeds.map((seed, index): ValidationCase => {
    const before = createHeroArk(seed);
    const execution = executeThermalCapability(before, capability, args);
    const horizon = advanceThermalHorizon(execution.world, OVERHEAT_THRESHOLD, THERMAL_HORIZON_TICKS);
    const replayExecution = executeThermalCapability(createHeroArk(seed), capability, args);
    const replayHorizon = advanceThermalHorizon(replayExecution.world, OVERHEAT_THRESHOLD, THERMAL_HORIZON_TICKS);
    const afterHash = hashSnapshot(horizon.world);
    const replayMatched = afterHash === hashSnapshot(replayHorizon.world);
    const failureCodes = caseFailures(
      before,
      horizon.world,
      capability,
      execution.report.materialUsed,
      execution.report.graphVisits,
      horizon,
      replayMatched,
    );
    return {
      index,
      passed: failureCodes.length === 0,
      failureCodes,
      beforeHash: hashSnapshot(before),
      afterHash,
      peakCriticalTemperature: horizon.peakCriticalTemperature,
      horizonTicks: horizon.ticks,
      stableTicks: horizon.stableTicks,
      replayMatched,
    };
  });

  const counts = new Map<FailureCode, number>();
  for (const item of cases) {
    for (const code of item.failureCodes) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const passedCases = cases.filter((item) => item.passed).length;
  return {
    passed: passedCases === cases.length,
    passedCases,
    totalCases: cases.length,
    candidateHash: capability.hash,
    suiteFingerprint: fingerprint(seeds),
    cases,
    horizonTicks: THERMAL_HORIZON_TICKS,
    invariantSet: [
      "critical thermal stability throughout horizon",
      "coolant conservation",
      "resource non-negativity",
      "material and runtime bounds",
      "deterministic replay hash equality",
    ],
    failureClusters: [...counts.entries()]
      .map(([code, worlds]) => ({ code, worlds }))
      .sort((left, right) => right.worlds - left.worlds || left.code.localeCompare(right.code)),
  };
}

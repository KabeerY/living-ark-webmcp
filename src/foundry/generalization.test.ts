import { describe, expect, it } from "vitest";
import { compileThermalCapability } from "./compiler";
import { validateThermalCapability } from "./validator";

const certifiedStrategy = compileThermalCapability({
  name: "stabilize_thermal_mesh",
  description: "Regrow bounded thermal routes across physical adjacency and cool critical cells without starving reservoirs.",
  parameters: [
    {
      name: "targetTemperature",
      description: "Cooling setpoint below the Ark's hard thermal safety limit.",
      type: "number",
      minimum: 55,
      maximum: 82,
      default: 74,
    },
    {
      name: "materialBudget",
      description: "Maximum programmable matter available for thermal fiber regrowth.",
      type: "number",
      minimum: 1,
      maximum: 600,
      default: 520,
    },
    {
      name: "sourceReserve",
      description: "Coolant that must remain inside every source reservoir.",
      type: "number",
      minimum: 0,
      maximum: 35,
      default: 8,
    },
  ],
  program: {
    targetSelector: "all_hotspots",
    targetOrder: [
      { field: "criticality", direction: "desc" },
      { field: "temperature", direction: "desc" },
    ],
    sourceSelector: "highest_coolant_reservoir",
    sourceScope: "physical_component",
    pathMode: "regrow_fractures",
    maxPathLength: 64,
    maxTargets: 64,
  },
});

function disjointFleet(seed: number): number[] {
  let state = seed >>> 0;
  return Array.from({ length: 64 }, () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state;
  });
}

describe("certified strategy generalization", () => {
  it("survives four disjoint 64-world Fleets with delayed stability and replay equality", () => {
    const reports = [0x0317_2026, 0x5eed_cafe, 0xa11c_e042, 0xf00d_ba5e].map((seed) =>
      validateThermalCapability(certifiedStrategy, disjointFleet(seed)),
    );

    expect(new Set(reports.map((report) => report.suiteFingerprint)).size).toBe(4);
    for (const report of reports) {
      expect(report.passed).toBe(true);
      expect(report.passedCases).toBe(64);
      expect(report.totalCases).toBe(64);
      expect(report.failureClusters).toEqual([]);
      expect(report.cases).toHaveLength(64);
      expect(report.cases.every((item) => item.stableTicks === 12)).toBe(true);
      expect(report.cases.every((item) => item.replayMatched)).toBe(true);
      expect(report.cases.every((item) => item.peakCriticalTemperature <= 85 + 1e-8)).toBe(true);
    }
  }, 30_000);
});

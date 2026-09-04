import { describe, expect, it } from "vitest";
import { compileThermalCapability, defaultArguments } from "./compiler";
import { executeThermalCapability } from "./interpreter";
import { createHeroArk } from "../engine/heroArk";
import { validateThermalCapability } from "./validator";
import { FoundryStore } from "./FoundryStore";

const parameters = [
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
] as const;

const weak = {
  name: "stabilize_thermal_mesh",
  description: "Cool critical cells using reservoirs reachable through already active local thermal paths.",
  parameters,
  program: {
    targetSelector: "critical_hotspots",
    targetOrder: [{ field: "temperature", direction: "desc" }],
    sourceSelector: "nearest_reservoir",
    sourceScope: "active_thermal_component",
    pathMode: "active_only",
    maxPathLength: 20,
    maxTargets: 32,
  },
} as const;

const generalized = {
  ...weak,
  description: "Regrow bounded thermal routes across physical adjacency and cool critical cells without starving reservoirs.",
  program: {
    ...weak.program,
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
} as const;

describe("Capability Foundry", () => {
  it("compiles a narrow frozen capability and rejects unknown authority", () => {
    const compiled = compileThermalCapability(generalized);
    expect(compiled.compileReport.safe).toBe(true);
    expect(Object.isFrozen(compiled.definition)).toBe(true);
    expect(Object.isFrozen(compiled.definition.program.targetOrder)).toBe(true);
    expect(Object.isFrozen(compiled.definition.program.targetOrder[0])).toBe(true);
    expect(() => compileThermalCapability({ ...generalized, eval: "window.location" })).toThrow();
  });

  it("enforces a generic bounded target-order grammar", () => {
    expect(() =>
      compileThermalCapability({
        ...generalized,
        program: { ...generalized.program, targetOrder: "critical_first_temperature_desc" },
      }),
    ).toThrow();
    expect(() =>
      compileThermalCapability({
        ...generalized,
        program: {
          ...generalized.program,
          targetOrder: [
            { field: "temperature", direction: "desc" },
            { field: "temperature", direction: "asc" },
          ],
        },
      }),
    ).toThrow(/targetOrder fields must be unique/);
    expect(() =>
      compileThermalCapability({
        ...generalized,
        program: {
          ...generalized.program,
          targetOrder: [
            { field: "criticality", direction: "desc" },
            { field: "temperature", direction: "desc" },
            { field: "coolant", direction: "asc" },
            { field: "id", direction: "asc" },
          ],
        },
      }),
    ).toThrow();
  });

  it("keeps preview execution isolated from canonical state", () => {
    const world = createHeroArk(717);
    const before = structuredClone(world);
    const capability = compileThermalCapability(generalized);
    const execution = executeThermalCapability(world, capability, defaultArguments(capability));
    expect(world).toEqual(before);
    expect(execution.world).not.toBe(world);
  });

  it("applies declared sort keys lexicographically before the bounded target slice", () => {
    const world = createHeroArk(717);
    const critical = world.cells.find((cell) => cell.critical);
    const noncritical = world.cells.find((cell) => !cell.critical && cell.kind !== "reservoir");
    expect(critical).toBeDefined();
    expect(noncritical).toBeDefined();
    for (const cell of world.cells) cell.temperature = 60;
    critical!.temperature = 90;
    noncritical!.temperature = 110;

    const capability = compileThermalCapability({
      ...generalized,
      program: { ...generalized.program, maxTargets: 1 },
    });
    const execution = executeThermalCapability(world, capability, defaultArguments(capability));

    expect(execution.report.targetsAttempted).toBe(1);
    expect(execution.world.cells[critical!.id].temperature).toBeLessThan(90);
    expect(execution.world.cells[noncritical!.id].temperature).toBe(110);
  });

  it("falsifies a local-only strategy across a sealed fleet", () => {
    const seeds = Array.from({ length: 16 }, (_, index) => 10_000 + index * 7919);
    const report = validateThermalCapability(compileThermalCapability(weak), seeds);
    expect(report.passed).toBe(false);
    expect(report.passedCases).toBeLessThan(report.totalCases);
    expect(report.failureClusters[0]?.code).toBe("CRITICAL_CELL_OVERHEATED");
  });

  it("certifies a generalized regrowth strategy across 64 sealed worlds", () => {
    const seeds = Array.from({ length: 64 }, (_, index) => 10_000 + index * 7919);
    const local = validateThermalCapability(compileThermalCapability(weak), seeds);
    const broad = validateThermalCapability(compileThermalCapability(generalized), seeds);
    expect(broad.passedCases).toBeGreaterThan(local.passedCases);
    expect(broad.passedCases, JSON.stringify(broad.failureClusters)).toBe(64);
    expect(broad.failureClusters).toEqual([]);
  });

  it("refuses a forged passing report that is not bound to the candidate", async () => {
    const store = new FoundryStore();
    const candidate = store.author(generalized);

    await expect(
      store.validate(candidate.id, {
        validate: async (capability, seeds) => ({
          ...validateThermalCapability(capability, seeds),
          candidateHash: "forged000",
        }),
      }),
    ).rejects.toThrow(/internally inconsistent report/);
    expect(store.requireCandidate(candidate.id).certificate).toBeNull();
    expect(store.getSnapshot().validatingCandidateId).toBeNull();
  });

  it("attacks every certification revision with a different fresh Fleet", async () => {
    let fleetNumber = 0;
    const issuedSeeds: number[][] = [];
    const store = new FoundryStore((count) => {
      fleetNumber += 1;
      const seeds = Array.from({ length: count }, (_, index) => fleetNumber * 1_000_000 + index * 7919);
      issuedSeeds.push(seeds);
      return seeds;
    });
    const validator = {
      validate: async (capability: Parameters<typeof validateThermalCapability>[0], seeds: number[]) =>
        validateThermalCapability(capability, seeds),
    };
    const first = store.author(generalized);
    const firstCertified = await store.validate(first.id, validator);
    const second = store.author(generalized, first.id);
    const secondCertified = await store.validate(second.id, validator);

    expect(issuedSeeds).toHaveLength(2);
    expect(issuedSeeds[0]).not.toEqual(issuedSeeds[1]);
    expect(firstCertified.validation?.suiteFingerprint).not.toBe(secondCertified.validation?.suiteFingerprint);
    expect(firstCertified.certificate?.suiteFingerprint).toBe(firstCertified.validation?.suiteFingerprint);
    expect(secondCertified.certificate?.suiteFingerprint).toBe(secondCertified.validation?.suiteFingerprint);
    expect(store.getSnapshot().suiteFingerprint).toBe(secondCertified.validation?.suiteFingerprint);
  }, 15_000);
});

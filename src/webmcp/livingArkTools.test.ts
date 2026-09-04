import { describe, expect, it } from "vitest";
import { ArkStore } from "../app/ArkStore";
import { createHeroArk } from "../engine/heroArk";
import type { FleetValidator } from "../foundry/FleetValidator";
import { FoundryStore } from "../foundry/FoundryStore";
import { validateThermalCapability, type ValidationReport } from "../foundry/validator";
import type { ModelContext, RegisterToolOptions, SiteTool } from "./types";
import { registerLivingArkTools } from "./livingArkTools";

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

class MemoryModelContext implements ModelContext {
  readonly tools = new Map<string, SiteTool>();

  async registerTool(tool: SiteTool, options?: RegisterToolOptions): Promise<void> {
    this.tools.set(tool.name, tool);
    options?.signal?.addEventListener("abort", () => this.tools.delete(tool.name), { once: true });
  }

  require(name: string): SiteTool {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Missing tool ${name}`);
    return tool;
  }
}

describe("Living Ark WebMCP integration", () => {
  it("keeps one same-session chain from inert prototype to born tool to canonical recovery", async () => {
    const context = new MemoryModelContext();
    const ark = new ArkStore(createHeroArk(0xa7c0ffee));
    const foundry = new FoundryStore();
    let validationCalls = 0;
    const validator = {
      validate: async (capability: Parameters<typeof validateThermalCapability>[0], seeds: number[]) => {
        validationCalls += 1;
        return validateThermalCapability(capability, seeds);
      },
    } as FleetValidator;
    const unregister = await registerLivingArkTools(context, ark, foundry, validator);

    expect([...context.tools]).toHaveLength(8);
    const crisis = await context.require("inspect_crisis").execute({});
    expect(crisis.structuredContent?.criticalCellCount).toBe(59);
    expect(crisis.structuredContent?.criticalCellsTruncated).toBe(true);
    expect(crisis.structuredContent?.hottestCriticalCells).toHaveLength(12);
    expect(JSON.stringify(crisis.structuredContent?.events)).not.toContain("edgeIds");
    const manual = await context.require("read_arkscript_manual").execute({});
    const manualContract = JSON.stringify(manual.structuredContent);
    expect(manualContract).toContain('"targetOrder":{"type":"array","minItems":1,"maxItems":3');
    expect(manualContract).not.toContain("critical_first_temperature_desc");
    const before = structuredClone(ark.getSnapshot());

    const weakAuthor = await context.require("author_thermal_capability").execute({ definition: weak });
    const weakId = String(weakAuthor.structuredContent?.id);
    const weakResult = await context.require("validate_thermal_capability").execute({ candidateId: weakId });
    expect(weakResult.structuredContent?.authorityGranted).toBe(false);
    expect(ark.getSnapshot()).toEqual(before);

    const broadAuthor = await context.require("author_thermal_capability").execute({
      definition: generalized,
      parentCandidateId: weakId,
    });
    const broadId = String(broadAuthor.structuredContent?.id);
    const broadResult = await context.require("validate_thermal_capability").execute({ candidateId: broadId });
    const bornToolName = String(broadResult.structuredContent?.bornToolName);

    expect(broadResult.structuredContent?.authorityGranted).toBe(true);
    expect(foundry.getSnapshot().bornToolName).toBe(bornToolName);
    expect(foundry.getSnapshot().bornToolStatus).toBe("live");
    expect(context.tools.has(bornToolName)).toBe(true);
    expect([...context.tools]).toHaveLength(9);
    const certified = foundry.requireCandidate(broadId);
    expect(Object.isFrozen(certified.validation)).toBe(true);
    expect(Object.isFrozen(certified.validation?.cases)).toBe(true);
    expect(Object.isFrozen(certified.certificate)).toBe(true);
    expect(Object.isFrozen(certified.certificate?.executionArguments)).toBe(true);
    expect(context.require(bornToolName).inputSchema).toEqual({
      type: "object",
      properties: {},
      additionalProperties: false,
    });
    await expect(context.require(bornToolName).execute({ targetTemperature: 82 })).rejects.toThrow(
      /do not accept parameter overrides/,
    );

    const execution = await context.require(bornToolName).execute({});
    expect(execution.structuredContent?.canonicalArkChanged).toBe(true);
    expect(execution.structuredContent?.stable).toBe(true);
    const canary = execution.structuredContent?.invocationCanary as Record<string, unknown>;
    expect(canary.passed).toBe(true);
    expect(canary.passedCases).toBe(16);
    expect(canary.totalCases).toBe(16);
    expect(ark.getSnapshot().phase).toBe("stable");
    expect(context.tools.has(bornToolName)).toBe(true);
    expect(foundry.getSnapshot().bornToolStatus).toBe("executed");
    const executed = foundry.requireCandidate(broadId);
    expect(Object.isFrozen(executed.invocationCanaryValidation)).toBe(true);
    expect(Object.isFrozen(executed.invocationCanaryReceipt)).toBe(true);
    expect(executed.invocationCanaryReceipt?.validationDigest).toBe(canary.validationDigest);
    expect(validationCalls).toBe(3);

    const originalCanaryReceipt = executed.invocationCanaryReceipt!;
    executed.invocationCanaryReceipt = { ...originalCanaryReceipt, validationDigest: "tampered0" };
    expect(() => foundry.assertInvocationCanary(broadId)).toThrow(/receipt integrity verification failed/);
    executed.invocationCanaryReceipt = originalCanaryReceipt;
    expect(foundry.assertInvocationCanary(broadId).id).toBe(broadId);

    const lineage = await context.require("inspect_capability_lineage").execute({});
    const candidates = lineage.structuredContent?.candidates as Array<Record<string, unknown>>;
    expect(candidates).toHaveLength(2);
    expect(candidates[0].definition).toEqual(weak);
    expect(candidates[1].definition).toEqual(generalized);
    expect(JSON.stringify(candidates)).not.toContain("beforeHash");

    const stabilized = structuredClone(ark.getSnapshot());
    const secondExecution = await context.require(bornToolName).execute({});
    expect(secondExecution.structuredContent?.canonicalArkChanged).toBe(false);
    expect(secondExecution.structuredContent?.alreadyStable).toBe(true);
    expect(ark.getSnapshot()).toEqual(stabilized);
    expect(validationCalls).toBe(3);

    await unregister();
    expect(context.tools.size).toBe(0);
  }, 15_000);

  it("self-revokes a born tool when its zero-day canary fails and leaves the canonical Ark untouched", async () => {
    const context = new MemoryModelContext();
    const ark = new ArkStore(createHeroArk(0xa7c0ffee));
    const foundry = new FoundryStore();
    const failureCode: ValidationReport["cases"][number]["failureCodes"][number] = "CRITICAL_CELL_OVERHEATED";
    const validator = {
      validate: async (capability: Parameters<typeof validateThermalCapability>[0], seeds: number[]) => {
        const report = validateThermalCapability(capability, seeds);
        if (seeds.length !== 16) return report;
        const cases: ValidationReport["cases"] = report.cases.map((item, index) =>
          index === 0 ? { ...item, passed: false, failureCodes: [failureCode] } : item,
        );
        return {
          ...report,
          passed: false,
          passedCases: cases.filter((item) => item.passed).length,
          cases,
          failureClusters: [{ code: failureCode, worlds: 1 }],
        };
      },
    } as FleetValidator;
    const unregister = await registerLivingArkTools(context, ark, foundry, validator);
    const before = structuredClone(ark.getSnapshot());

    const authored = await context.require("author_thermal_capability").execute({ definition: generalized });
    const candidateId = String(authored.structuredContent?.id);
    const certified = await context.require("validate_thermal_capability").execute({ candidateId });
    const bornToolName = String(certified.structuredContent?.bornToolName);
    const bornTool = context.require(bornToolName);
    expect(context.tools.size).toBe(9);

    const blocked = await bornTool.execute({});
    expect(blocked.structuredContent?.canonicalArkChanged).toBe(false);
    expect(blocked.structuredContent?.authorityState).toBe("REVOKED");
    expect(ark.getSnapshot()).toEqual(before);
    expect(context.tools.has(bornToolName)).toBe(false);
    expect(context.tools.size).toBe(8);
    expect(foundry.getSnapshot().bornToolStatus).toBe("revoked");
    const revoked = foundry.requireCandidate(candidateId);
    expect(revoked.invocationCanaryReceipt?.passed).toBe(false);
    expect(revoked.invocationCanaryReceipt?.passedCases).toBe(15);
    expect(Object.isFrozen(revoked.invocationCanaryReceipt)).toBe(true);

    await unregister();
    expect(context.tools.size).toBe(0);
  }, 15_000);
});

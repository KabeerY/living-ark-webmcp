import type { ArkStore } from "../app/ArkStore";
import { hashSnapshot } from "../engine/hash";
import { summarizeArk } from "../engine/metrics";
import { OVERHEAT_THRESHOLD } from "../engine/metrics";
import { advanceThermalHorizon, THERMAL_HORIZON_TICKS } from "../engine/thermalHorizon";
import type { ArkEvent } from "../engine/types";
import type { FleetValidator } from "../foundry/FleetValidator";
import type { FoundryStore } from "../foundry/FoundryStore";
import type { CandidateRecord } from "../foundry/FoundryStore";
import { registerCoreTools } from "./coreTools";
import type { ModelContext, SiteTool, ToolResult } from "./types";

const EXTRA_TOOL_NAMES = [
  "read_arkscript_manual",
  "author_thermal_capability",
  "simulate_thermal_capability",
  "validate_thermal_capability",
  "inspect_capability_lineage",
] as const;

const capabilityDefinitionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "description", "parameters", "program"],
  properties: {
    name: { type: "string", pattern: "^[a-z][a-z0-9_]{2,47}$" },
    description: { type: "string", minLength: 18, maxLength: 320 },
    parameters: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "type", "minimum", "maximum", "default"],
        properties: {
          name: { type: "string", enum: ["targetTemperature", "materialBudget", "sourceReserve"] },
          description: { type: "string", minLength: 8, maxLength: 180 },
          type: { const: "number" },
          minimum: { type: "number" },
          maximum: { type: "number" },
          default: { type: "number" },
        },
      },
    },
    program: {
      type: "object",
      additionalProperties: false,
      required: [
        "targetSelector",
        "targetOrder",
        "sourceSelector",
        "sourceScope",
        "pathMode",
        "maxPathLength",
        "maxTargets",
      ],
      properties: {
        targetSelector: { type: "string", enum: ["critical_hotspots", "all_hotspots"] },
        targetOrder: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          description:
            "Bounded lexicographic ordering. Each field may appear once. Equal keys use an implicit id ascending tie-breaker.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["field", "direction"],
            properties: {
              field: {
                type: "string",
                enum: ["criticality", "temperature", "coolant", "id"],
                description: "Numeric cell field; criticality is encoded as false=0 and true=1.",
              },
              direction: { type: "string", enum: ["asc", "desc"] },
            },
          },
        },
        sourceSelector: { type: "string", enum: ["nearest_reservoir", "highest_coolant_reservoir"] },
        sourceScope: { type: "string", enum: ["active_thermal_component", "physical_component"] },
        pathMode: { type: "string", enum: ["active_only", "wake_dormant", "regrow_fractures"] },
        maxPathLength: { type: "integer", minimum: 1, maximum: 96 },
        maxTargets: { type: "integer", minimum: 1, maximum: 64 },
      },
    },
  },
} as const;

function result(text: string, structuredContent: Record<string, unknown>): ToolResult {
  return { content: [{ type: "text", text }], structuredContent };
}

function candidateSummary(candidate: CandidateRecord) {
  return {
    id: candidate.id,
    name: candidate.compiled.definition.name,
    version: candidate.version,
    parentId: candidate.parentId,
    hash: candidate.compiled.hash,
    definition: candidate.compiled.definition,
    compileReport: candidate.compiled.compileReport,
    preview: candidate.previewValidation
      ? {
          passedCases: candidate.previewValidation.passedCases,
          totalCases: candidate.previewValidation.totalCases,
          failureClusters: candidate.previewValidation.failureClusters,
        }
      : null,
    validation: candidate.validation
      ? {
          passed: candidate.validation.passed,
          passedCases: candidate.validation.passedCases,
          totalCases: candidate.validation.totalCases,
          suiteFingerprint: candidate.validation.suiteFingerprint,
          horizonTicks: candidate.validation.horizonTicks,
          invariantSet: candidate.validation.invariantSet,
          failureClusters: candidate.validation.failureClusters,
        }
      : null,
    certificate: candidate.certificate,
  };
}

function bornInputSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {},
    additionalProperties: false,
  };
}

function addWorldEvent(
  world: ReturnType<ArkStore["getSnapshot"]>,
  event: Omit<ArkEvent, "sequence" | "tick">,
): void {
  world.events.push({
    ...event,
    sequence: world.events.length + 1,
    tick: world.tick,
  });
}

export async function registerLivingArkTools(
  modelContext: ModelContext,
  arkStore: ArkStore,
  foundryStore: FoundryStore,
  validator: FleetValidator,
): Promise<() => Promise<void>> {
  const registration = new AbortController();
  const registerTool = (tool: SiteTool) => modelContext.registerTool(tool, { signal: registration.signal });

  try {
    await registerCoreTools(modelContext, arkStore.getSnapshot, registration.signal);
    const registered = new Set<string>(EXTRA_TOOL_NAMES);

  await registerTool({
    name: "read_arkscript_manual",
    description:
      "Read the complete bounded ArkScript thermal-capability contract, validation rules, and authority boundary. This tool is read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: () =>
      result(
        "ArkScript prototypes are inert declarative programs. They can select thermal targets and reservoirs, search bounded paths, wake dormant fibers, or regrow fractured paths. Only a 64/64 sealed-fleet certificate can create canonical execution authority.",
        {
          purpose:
            "Author a reusable thermal policy that generalizes across varying Ark topology, fractures, reserves, capacities, and target distributions.",
          authorityBoundary: {
            candidateCanMutateCanonicalArk: false,
            arbitraryJavaScript: false,
            domNetworkStorageClockAccess: false,
            certificationRequirement: "64/64 sealed worlds plus conservation, non-negativity, bounds, and deterministic replay",
          },
          definitionSchema: capabilityDefinitionSchema,
          strategyNotes: [
            "A route that works only inside the current active thermal component may fail when a critical sector is islanded.",
            "Regrowth consumes material and therefore needs a declared bounded materialBudget.",
            "Reservoir selection must retain the declared sourceReserve.",
            "targetOrder accepts one to three unique semantic sort keys. Keys are applied lexicographically, and exact ties always fall back to cell id ascending for deterministic replay.",
            "Ordering changes which selected cells consume a bounded maxTargets allowance; choose keys from observed world semantics and declared safety invariants.",
            "Certification advances every result through a 12-tick residual heat and diffusion horizon, then requires deterministic replay hash equality.",
            "maxTargets and maxPathLength are executable bounds, not documentation.",
          ],
        },
      ),
  });

  await registerTool({
    name: "author_thermal_capability",
    description:
      "Compile and store one inert ArkScript thermal capability. This does not validate, register, or execute it and cannot change the canonical Ark.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["definition"],
      properties: {
        definition: capabilityDefinitionSchema,
        parentCandidateId: { type: "string", description: "Optional parent candidate ID for an explicit revision lineage." },
      },
    },
    annotations: { readOnlyHint: false },
    execute: (args) => {
      const record = foundryStore.author(args.definition, typeof args.parentCandidateId === "string" ? args.parentCandidateId : null);
      return result(
        `Compiled ${record.compiled.definition.name} v${record.version} as inert candidate '${record.id}'. It has no canonical execution authority.`,
        candidateSummary(record),
      );
    },
  });

  await registerTool({
    name: "simulate_thermal_capability",
    description:
      "Execute an inert candidate against eight visible preview Arks. Preview runs never touch canonical state and do not grant authority.",
    inputSchema: {
      type: "object",
      properties: { candidateId: { type: "string" } },
      required: ["candidateId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: (args) => {
      if (typeof args.candidateId !== "string") throw new Error("candidateId is required.");
      const report = foundryStore.preview(args.candidateId);
      return result(
        `Preview result: ${report.passedCases}/${report.totalCases} visible Arks survived. This is not a certificate.`,
        {
          candidateId: args.candidateId,
          passedCases: report.passedCases,
          totalCases: report.totalCases,
          failureClusters: report.failureClusters,
          canonicalArkChanged: false,
          authorityGranted: false,
        },
      );
    },
  });

  const registerBornTool = async (candidate: CandidateRecord): Promise<string> => {
    const toolName = `${candidate.compiled.definition.name}_v${candidate.version}`;
    if (registered.has(toolName)) return toolName;
    foundryStore.assertCertified(candidate.id);
    await registerTool({
      name: toolName,
      description: `${candidate.compiled.definition.description} This live canonical tool executes the exact frozen arguments certified across 64 sealed counterfactual Arks; it accepts no overrides.`,
      inputSchema: bornInputSchema(),
      annotations: { readOnlyHint: false },
      execute: (rawArgs) => {
        if (Object.keys(rawArgs).length > 0) throw new Error("Certified born tools do not accept parameter overrides.");
        const before = arkStore.getSnapshot();
        const beforeMetrics = summarizeArk(before);
        if (before.phase === "stable" && beforeMetrics.overheatedCriticalCells === 0) {
          const unchanged = { revision: before.revision, hash: hashSnapshot(before), metrics: beforeMetrics };
          return result(
            `${toolName} is already holding the canonical Ark inside its certified critical-safety envelope; no second mutation was needed.`,
            {
              toolName,
              certificate: candidate.certificate,
              before: unchanged,
              after: unchanged,
              runtime: {
                operations: 0,
                graphVisits: 0,
                targetsAttempted: 0,
                targetsStabilized: 0,
                coolantMoved: 0,
                materialUsed: 0,
                pathsRegrown: 0,
                targetTemperature: candidate.certificate?.executionArguments.targetTemperature ?? 74,
                criticalHardTemperatureLimit: OVERHEAT_THRESHOLD,
                horizonTicks: 0,
                stableTicks: 0,
              },
              regrownEdgeIds: [],
              canonicalArkChanged: false,
              alreadyStable: true,
              stable: true,
            },
          );
        }
        const execution = foundryStore.executeCertified(candidate.id, before);
        const targetTemperature =
          candidate.certificate?.executionArguments.targetTemperature ??
          74;
        const horizon = advanceThermalHorizon(execution.world, OVERHEAT_THRESHOLD, THERMAL_HORIZON_TICKS);
        const finalWorld = horizon.world;
        const stable =
          horizon.stableTicks === horizon.ticks &&
          finalWorld.cells.every((cell) => !cell.critical || cell.temperature <= OVERHEAT_THRESHOLD + 1e-8);
        finalWorld.phase = stable ? "stable" : "critical";
        const regrownEdgeIds = finalWorld.edges
          .filter((edge, index) => {
            const previous = before.edges[index];
            return previous && (!previous.active || previous.fractured || previous.dormant || previous.network !== "thermal") && edge.active && !edge.fractured && !edge.dormant && edge.network === "thermal";
          })
          .map((edge) => edge.id);
        addWorldEvent(finalWorld, {
          type: "FIBER_REGROWN",
          message: `${toolName} regrew ${regrownEdgeIds.length} thermal fibers and moved ${execution.report.coolantMoved.toFixed(1)} coolant.`,
          edgeIds: regrownEdgeIds,
        });
        if (stable) {
          addWorldEvent(finalWorld, {
            type: "ARK_STABILIZED",
            message: `${toolName} held every critical cell below the ${OVERHEAT_THRESHOLD}-degree hard limit for ${horizon.ticks} delayed ticks after cooling toward ${targetTemperature} degrees.`,
          });
        }
        arkStore.replace(finalWorld);
        const afterMetrics = summarizeArk(finalWorld);
        return result(
          `${toolName} executed on the canonical Ark. Critical thermal stability is ${stable ? "ACHIEVED" : "NOT ACHIEVED"}; ${regrownEdgeIds.length} fibers were regrown.`,
          {
            toolName,
            certificate: candidate.certificate,
            before: { revision: before.revision, hash: hashSnapshot(before), metrics: beforeMetrics },
            after: { revision: finalWorld.revision, hash: hashSnapshot(finalWorld), metrics: afterMetrics },
            runtime: {
              ...execution.report,
              targetTemperature,
              criticalHardTemperatureLimit: OVERHEAT_THRESHOLD,
              horizonTicks: horizon.ticks,
              stableTicks: horizon.stableTicks,
            },
            regrownEdgeIds,
            canonicalArkChanged: true,
            stable,
          },
        );
      },
    });
    registered.add(toolName);
    foundryStore.markBorn(candidate.id, toolName);
    return toolName;
  };

  await registerTool({
    name: "validate_thermal_capability",
    description:
      "Attack one inert candidate across 64 sealed counterfactual Arks in an isolated worker. A perfect executable result earns a new versioned WebMCP tool in this same page session.",
    inputSchema: {
      type: "object",
      properties: { candidateId: { type: "string" } },
      required: ["candidateId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (args) => {
      if (typeof args.candidateId !== "string") throw new Error("candidateId is required.");
      const candidate = await foundryStore.validate(args.candidateId, validator);
      const report = candidate.validation;
      if (!report) throw new Error("Validator returned no report.");
      if (!report.passed) {
        return result(
          `Candidate v${candidate.version} was falsified: ${report.passedCases}/${report.totalCases} sealed Arks survived. Revise from the returned causal clusters.`,
          {
            ...candidateSummary(candidate),
            authorityGranted: false,
            canonicalArkChanged: false,
          },
        );
      }
      const toolName = await registerBornTool(candidate);
      return result(
        `Candidate v${candidate.version} passed ${report.passedCases}/${report.totalCases} sealed Arks. '${toolName}' has been born into the live WebMCP catalog; invoke it now on the canonical Ark.`,
        {
          ...candidateSummary(candidate),
          authorityGranted: true,
          canonicalArkChanged: false,
          bornToolName: toolName,
          sameSession: true,
        },
      );
    },
  });

  await registerTool({
    name: "inspect_capability_lineage",
    description: "Inspect every candidate version, parent, compile receipt, failure summary, certificate, and born-tool state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: () => {
      const snapshot = foundryStore.getSnapshot();
      return result(
        `${snapshot.candidates.length} candidate versions exist. ${snapshot.bornToolName ? `'${snapshot.bornToolName}' is live.` : "No capability has earned canonical authority."}`,
        {
          suite: { sealedWorlds: 64, fingerprint: snapshot.suiteFingerprint },
          candidates: snapshot.candidates.map(candidateSummary),
          bornToolName: snapshot.bornToolName,
          bornCandidateId: snapshot.bornCandidateId,
        },
      );
    },
  });

    return async () => {
      registration.abort();
    };
  } catch (error) {
    registration.abort();
    throw error;
  }
}

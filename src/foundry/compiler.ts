import { hashString } from "../engine/hash";
import {
  thermalCapabilitySchema,
  type CompiledThermalCapability,
  type ThermalCapabilityDefinition,
} from "./schema";

const MAX_PROGRAM_BYTES = 8_192;

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function compileThermalCapability(input: unknown): CompiledThermalCapability {
  const definition = thermalCapabilitySchema.parse(input);
  const serialized = canonicalize(definition);
  if (serialized.length > MAX_PROGRAM_BYTES) {
    throw new Error(`Capability exceeds the ${MAX_PROGRAM_BYTES}-byte program budget.`);
  }

  const frozen = deepFreeze(structuredClone(definition) as ThermalCapabilityDefinition);

  return {
    definition: frozen,
    hash: hashString(serialized),
    compileReport: {
      safe: true,
      serializedBytes: serialized.length,
      parameterCount: definition.parameters.length,
      staticBudget: {
        maxPathLength: definition.program.maxPathLength,
        maxTargets: definition.program.maxTargets,
        maxGraphVisits: definition.program.maxPathLength * definition.program.maxTargets * 128,
      },
    },
  };
}

export function defaultArguments(compiled: CompiledThermalCapability): Record<string, number> {
  return Object.fromEntries(compiled.definition.parameters.map((parameter) => [parameter.name, parameter.default]));
}

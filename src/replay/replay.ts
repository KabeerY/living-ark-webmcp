import { hashSnapshot, hashString } from "../engine/hash";
import { createHeroArk } from "../engine/heroArk";
import { compileThermalCapability } from "../foundry/compiler";
import { executeThermalCapability } from "../foundry/interpreter";
import type { CompiledThermalCapability } from "../foundry/schema";
import {
  REPLAY_ENGINE_VERSION,
  REPLAY_FORMAT_VERSION,
  REPLAY_GRAMMAR_VERSION,
  type ReplayActionInput,
  type ReplayCapabilityRecord,
  type ReplayFailure,
  type ReplayReceipt,
  type ReplayReceiptBody,
  type ReplayVerification,
} from "./types";

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function replayReceiptDigest(body: ReplayReceiptBody): string {
  return hashString(canonicalize(body));
}

function bodyOf(receipt: ReplayReceipt): ReplayReceiptBody {
  const { receiptDigest: _receiptDigest, ...body } = receipt;
  return body;
}

/**
 * Records real interpreter outputs from a seed and ordered capability calls.
 * It stores commands and hashes, never intermediate snapshots or visual frames.
 */
export function recordThermalReplay(initialSeed: number, actions: ReplayActionInput[]): ReplayReceipt {
  if (!Number.isSafeInteger(initialSeed) || initialSeed < 0 || initialSeed > 0xffff_ffff) {
    throw new Error("Replay seed must be an unsigned 32-bit integer.");
  }

  let world = createHeroArk(initialSeed);
  const initial = {
    seed: initialSeed,
    expectedRevision: world.revision,
    expectedStateHash: hashSnapshot(world),
  };
  const capabilityById = new Map<string, CompiledThermalCapability>();
  const capabilities: ReplayCapabilityRecord[] = [];
  const commands = actions.map((action, index) => {
    const compiled = compileThermalCapability(action.definition);
    const existing = capabilityById.get(action.candidateId);
    if (existing && existing.hash !== compiled.hash) {
      throw new Error(`Candidate ID ${action.candidateId} refers to more than one capability hash.`);
    }
    if (!existing) {
      capabilityById.set(action.candidateId, compiled);
      capabilities.push({
        candidateId: action.candidateId,
        candidateHash: compiled.hash,
        definition: structuredClone(compiled.definition),
      });
    }

    world = executeThermalCapability(world, compiled, structuredClone(action.args)).world;
    return {
      sequence: index + 1,
      type: "execute_thermal_capability" as const,
      candidateId: action.candidateId,
      args: structuredClone(action.args),
      expectedRevision: world.revision,
      expectedStateHash: hashSnapshot(world),
    };
  });

  const body: ReplayReceiptBody = {
    formatVersion: REPLAY_FORMAT_VERSION,
    engineVersion: REPLAY_ENGINE_VERSION,
    grammarVersion: REPLAY_GRAMMAR_VERSION,
    initial,
    capabilities,
    commands,
  };
  return { ...body, receiptDigest: replayReceiptDigest(body) };
}

function failed(failures: ReplayFailure[], commandsVerified = 0): ReplayVerification {
  return { matched: false, failures, commandsVerified };
}

/** Replays a receipt through the production generator, compiler, and interpreter. */
export function verifyThermalReplay(receipt: ReplayReceipt): ReplayVerification {
  const body = bodyOf(receipt);
  if (replayReceiptDigest(body) !== receipt.receiptDigest) {
    return failed([{ code: "RECEIPT_DIGEST_MISMATCH", message: "Receipt contents do not match its integrity digest." }]);
  }
  if (receipt.formatVersion !== REPLAY_FORMAT_VERSION) {
    return failed([{ code: "UNSUPPORTED_FORMAT", message: `Unsupported replay format ${receipt.formatVersion}.` }]);
  }
  if (receipt.engineVersion !== REPLAY_ENGINE_VERSION) {
    return failed([{ code: "UNSUPPORTED_ENGINE", message: `Unsupported engine ${receipt.engineVersion}.` }]);
  }
  if (receipt.grammarVersion !== REPLAY_GRAMMAR_VERSION) {
    return failed([{ code: "UNSUPPORTED_GRAMMAR", message: `Unsupported grammar ${receipt.grammarVersion}.` }]);
  }
  if (!Number.isSafeInteger(receipt.initial.seed) || receipt.initial.seed < 0 || receipt.initial.seed > 0xffff_ffff) {
    return failed([{ code: "INVALID_INITIAL_SEED", message: "Initial seed is not an unsigned 32-bit integer." }]);
  }

  let world = createHeroArk(receipt.initial.seed);
  if (world.revision !== receipt.initial.expectedRevision) {
    return failed([{ code: "INITIAL_REVISION_MISMATCH", message: `Initial revision is ${world.revision}, expected ${receipt.initial.expectedRevision}.` }]);
  }
  const initialHash = hashSnapshot(world);
  if (initialHash !== receipt.initial.expectedStateHash) {
    return failed([{ code: "INITIAL_STATE_HASH_MISMATCH", message: `Initial state hash is ${initialHash}, expected ${receipt.initial.expectedStateHash}.` }]);
  }

  const capabilities = new Map<string, CompiledThermalCapability>();
  for (const record of receipt.capabilities) {
    if (capabilities.has(record.candidateId)) {
      return failed([{ code: "DUPLICATE_CANDIDATE_ID", message: `Candidate ID ${record.candidateId} is duplicated.` }]);
    }
    let compiled: CompiledThermalCapability;
    try {
      compiled = compileThermalCapability(record.definition);
    } catch (error) {
      return failed([{ code: "CANDIDATE_HASH_MISMATCH", message: `Candidate ${record.candidateId} no longer compiles: ${String(error)}` }]);
    }
    if (compiled.hash !== record.candidateHash) {
      return failed([{ code: "CANDIDATE_HASH_MISMATCH", message: `Candidate ${record.candidateId} compiles to ${compiled.hash}, expected ${record.candidateHash}.` }]);
    }
    capabilities.set(record.candidateId, compiled);
  }

  for (let index = 0; index < receipt.commands.length; index += 1) {
    const command = receipt.commands[index];
    const sequence = index + 1;
    if (command.sequence !== sequence) {
      return failed([{ code: "INVALID_COMMAND_SEQUENCE", sequence, message: `Command position ${sequence} carries sequence ${command.sequence}.` }], index);
    }
    const capability = capabilities.get(command.candidateId);
    if (!capability) {
      return failed([{ code: "UNKNOWN_CANDIDATE", sequence, message: `Command ${sequence} references unknown candidate ${command.candidateId}.` }], index);
    }
    try {
      world = executeThermalCapability(world, capability, structuredClone(command.args)).world;
    } catch (error) {
      return failed([{ code: "COMMAND_EXECUTION_FAILED", sequence, message: `Command ${sequence} failed: ${String(error)}` }], index);
    }
    if (world.revision !== command.expectedRevision) {
      return failed([{ code: "REVISION_MISMATCH", sequence, message: `Command ${sequence} produced revision ${world.revision}, expected ${command.expectedRevision}.` }], index);
    }
    const stateHash = hashSnapshot(world);
    if (stateHash !== command.expectedStateHash) {
      return failed([{ code: "STATE_HASH_MISMATCH", sequence, message: `Command ${sequence} produced state hash ${stateHash}, expected ${command.expectedStateHash}.` }], index);
    }
  }

  return {
    matched: true,
    failures: [],
    commandsVerified: receipt.commands.length,
    finalRevision: world.revision,
    finalStateHash: hashSnapshot(world),
    world,
  };
}

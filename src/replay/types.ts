import type { ArkSnapshot } from "../engine/types";
import type { ThermalCapabilityDefinition } from "../foundry/schema";

export const REPLAY_FORMAT_VERSION = 1 as const;
export const REPLAY_ENGINE_VERSION = "living-ark-engine/1" as const;
export const REPLAY_GRAMMAR_VERSION = "arkscript-thermal/1" as const;

export type ReplayCapabilityRecord = {
  candidateId: string;
  candidateHash: string;
  definition: ThermalCapabilityDefinition;
};

export type ReplayCommand = {
  sequence: number;
  type: "execute_thermal_capability";
  candidateId: string;
  args: Record<string, number>;
  expectedRevision: number;
  expectedStateHash: string;
};

export type ReplayReceiptBody = {
  formatVersion: typeof REPLAY_FORMAT_VERSION;
  engineVersion: typeof REPLAY_ENGINE_VERSION;
  grammarVersion: typeof REPLAY_GRAMMAR_VERSION;
  initial: {
    seed: number;
    expectedRevision: number;
    expectedStateHash: string;
  };
  capabilities: ReplayCapabilityRecord[];
  commands: ReplayCommand[];
};

export type ReplayReceipt = ReplayReceiptBody & {
  receiptDigest: string;
};

export type ReplayActionInput = {
  candidateId: string;
  definition: unknown;
  args: Record<string, number>;
};

export type ReplayFailureCode =
  | "RECEIPT_DIGEST_MISMATCH"
  | "UNSUPPORTED_FORMAT"
  | "UNSUPPORTED_ENGINE"
  | "UNSUPPORTED_GRAMMAR"
  | "INVALID_INITIAL_SEED"
  | "INITIAL_REVISION_MISMATCH"
  | "INITIAL_STATE_HASH_MISMATCH"
  | "DUPLICATE_CANDIDATE_ID"
  | "CANDIDATE_HASH_MISMATCH"
  | "UNKNOWN_CANDIDATE"
  | "INVALID_COMMAND_SEQUENCE"
  | "COMMAND_EXECUTION_FAILED"
  | "REVISION_MISMATCH"
  | "STATE_HASH_MISMATCH";

export type ReplayFailure = {
  code: ReplayFailureCode;
  message: string;
  sequence?: number;
};

export type ReplayVerification = {
  matched: boolean;
  failures: ReplayFailure[];
  commandsVerified: number;
  finalRevision?: number;
  finalStateHash?: string;
  world?: ArkSnapshot;
};

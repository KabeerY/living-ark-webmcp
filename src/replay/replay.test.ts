import { describe, expect, it } from "vitest";
import { recordThermalReplay, replayReceiptDigest, verifyThermalReplay } from "./replay";
import type { ReplayReceipt, ReplayReceiptBody } from "./types";

const capability = {
  name: "restore_thermal_mesh",
  description: "Regrow bounded thermal routes and cool endangered Ark cells from available reservoirs.",
  parameters: [
    {
      name: "targetTemperature",
      description: "Cooling setpoint below the Ark hard thermal safety limit.",
      type: "number",
      minimum: 55,
      maximum: 82,
      default: 74,
    },
    {
      name: "materialBudget",
      description: "Maximum programmable matter available for thermal route regrowth.",
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
} as const;

function reseal(receipt: ReplayReceipt): ReplayReceipt {
  const { receiptDigest: _digest, ...body } = receipt;
  return { ...body, receiptDigest: replayReceiptDigest(body as ReplayReceiptBody) };
}

describe("deterministic replay receipts", () => {
  it("records commands, not frames, and reproduces every revision hash", () => {
    const receipt = recordThermalReplay(0xa7c0ffee, [
      {
        candidateId: "candidate:restore:v1",
        definition: capability,
        args: { targetTemperature: 74, materialBudget: 520, sourceReserve: 8 },
      },
      {
        candidateId: "candidate:restore:v1",
        definition: capability,
        args: { targetTemperature: 72, materialBudget: 300, sourceReserve: 10 },
      },
    ]);

    expect(receipt).not.toHaveProperty("frames");
    expect(receipt.capabilities).toHaveLength(1);
    expect(receipt.commands.map((command) => command.expectedRevision)).toEqual([2, 3]);

    const verification = verifyThermalReplay(receipt);
    expect(verification.matched, JSON.stringify(verification.failures)).toBe(true);
    expect(verification.commandsVerified).toBe(2);
    expect(verification.finalStateHash).toBe(receipt.commands[1].expectedStateHash);
  });

  it("detects receipt content tampering before execution", () => {
    const receipt = recordThermalReplay(717, [{
      candidateId: "candidate:restore:v1",
      definition: capability,
      args: { targetTemperature: 74, materialBudget: 520, sourceReserve: 8 },
    }]);
    const tampered = structuredClone(receipt);
    tampered.commands[0].args.targetTemperature = 80;

    const verification = verifyThermalReplay(tampered);
    expect(verification.matched).toBe(false);
    expect(verification.failures[0].code).toBe("RECEIPT_DIGEST_MISMATCH");
  });

  it("detects deterministic divergence even when a changed log is resealed", () => {
    const receipt = recordThermalReplay(991, [{
      candidateId: "candidate:restore:v1",
      definition: capability,
      args: { targetTemperature: 74, materialBudget: 520, sourceReserve: 8 },
    }]);
    const divergent = structuredClone(receipt);
    divergent.commands[0].expectedStateHash = "00000000";

    const verification = verifyThermalReplay(reseal(divergent));
    expect(verification.matched).toBe(false);
    expect(verification.failures[0]).toMatchObject({ code: "STATE_HASH_MISMATCH", sequence: 1 });
  });

  it("recompiles capability records and rejects definition drift", () => {
    const receipt = recordThermalReplay(1234, [{
      candidateId: "candidate:restore:v1",
      definition: capability,
      args: { targetTemperature: 74, materialBudget: 520, sourceReserve: 8 },
    }]);
    const changed = structuredClone(receipt);
    changed.capabilities[0].definition.program.maxTargets = 12;

    const verification = verifyThermalReplay(reseal(changed));
    expect(verification.matched).toBe(false);
    expect(verification.failures[0].code).toBe("CANDIDATE_HASH_MISMATCH");
  });
});

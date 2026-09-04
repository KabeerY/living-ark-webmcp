import { compileThermalCapability, defaultArguments } from "./compiler";
import { hashString } from "../engine/hash";
import { executeThermalCapability } from "./interpreter";
import type { CompiledThermalCapability } from "./schema";
import { validateThermalCapability, type ValidationReport } from "./validator";
import { THERMAL_HORIZON_TICKS } from "../engine/thermalHorizon";

export type CapabilityCertificate = {
  id: string;
  candidateId: string;
  candidateHash: string;
  suiteFingerprint: string;
  engineVersion: "ark-engine-0.1";
  passedCases: number;
  totalCases: number;
  horizonTicks: number;
  invariantSet: string[];
  replayDigest: string;
  validationDigest: string;
  executionArguments: Record<string, number>;
  issuedAt: string;
};

export type InvocationCanaryReceipt = {
  id: string;
  candidateId: string;
  candidateHash: string;
  certificateId: string;
  suiteFingerprint: string;
  engineVersion: "ark-engine-0.1";
  passed: boolean;
  passedCases: number;
  totalCases: number;
  horizonTicks: number;
  invariantSet: string[];
  failureClusters: ValidationReport["failureClusters"];
  replayDigest: string;
  validationDigest: string;
  checkedAt: string;
};

export type BornToolStatus = "live" | "checking" | "revoked" | "executed";

export type CandidateRecord = {
  id: string;
  version: number;
  parentId: string | null;
  compiled: CompiledThermalCapability;
  previewValidation: ValidationReport | null;
  validation: ValidationReport | null;
  certificate: CapabilityCertificate | null;
  invocationCanaryValidation: ValidationReport | null;
  invocationCanaryReceipt: InvocationCanaryReceipt | null;
};

export type FoundrySnapshot = {
  candidates: CandidateRecord[];
  suiteFingerprint: string | null;
  validatingCandidateId: string | null;
  bornToolName: string | null;
  bornCandidateId: string | null;
  bornToolStatus: BornToolStatus | null;
};

export const CERTIFICATION_FLEET_SIZE = 64;
export const INVOCATION_CANARY_SIZE = 16;

export type SeedFactory = (count: number) => number[];

function seedFingerprint(seeds: number[]): string {
  let hash = 0x811c9dc5;
  for (const seed of seeds) {
    hash ^= seed;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function certificateId(body: Omit<CapabilityCertificate, "id">): string {
  return `cert:${hashString(JSON.stringify(body))}`;
}

function canaryReceiptId(body: Omit<InvocationCanaryReceipt, "id">): string {
  return `canary:${hashString(JSON.stringify(body))}`;
}

function replayDigest(validation: ValidationReport): string {
  return seedFingerprint(validation.cases.map((item) => Number.parseInt(item.afterHash, 16) >>> 0));
}

function evidenceDigest(validation: ValidationReport): string {
  return hashString(JSON.stringify(validation));
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

function expectedFailureClusters(validation: ValidationReport): ValidationReport["failureClusters"] {
  const counts = new Map<string, number>();
  for (const item of validation.cases) {
    for (const code of item.failureCodes) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, worlds]) => ({ code: code as ValidationReport["failureClusters"][number]["code"], worlds }))
    .sort((left, right) => right.worlds - left.worlds || left.code.localeCompare(right.code));
}

function reportIsInternallyConsistent(
  validation: ValidationReport,
  capability: CompiledThermalCapability,
  suiteFingerprint: string,
  expectedCases: number,
): boolean {
  const countedPasses = validation.cases.filter((item) => item.passed).length;
  return (
    validation.candidateHash === capability.hash &&
    validation.suiteFingerprint === suiteFingerprint &&
    validation.passed === (countedPasses === expectedCases) &&
    validation.passedCases === countedPasses &&
    validation.totalCases === expectedCases &&
    validation.cases.length === expectedCases &&
    validation.horizonTicks === THERMAL_HORIZON_TICKS &&
    JSON.stringify(validation.failureClusters) === JSON.stringify(expectedFailureClusters(validation)) &&
    validation.cases.every(
      (item, index) =>
        item.index === index &&
        item.passed === (item.failureCodes.length === 0) &&
        item.horizonTicks === THERMAL_HORIZON_TICKS &&
        item.stableTicks >= 0 &&
        item.stableTicks <= THERMAL_HORIZON_TICKS &&
        (!item.passed || (item.stableTicks === THERMAL_HORIZON_TICKS && item.replayMatched)),
    )
  );
}

function freshCryptoSeeds(count: number): number[] {
  const seeds = new Set<number>();
  while (seeds.size < count) {
    const batch = crypto.getRandomValues(new Uint32Array(count - seeds.size));
    for (const seed of batch) seeds.add(seed);
  }
  return [...seeds];
}

export class FoundryStore {
  private readonly previewSeeds = [0x10a11ce, 0x20a11ce, 0x30a11ce, 0x40a11ce, 0x50a11ce, 0x60a11ce, 0x70a11ce, 0x80a11ce];
  private readonly seedFactory: SeedFactory;
  private listeners = new Set<() => void>();
  private snapshot: FoundrySnapshot;

  constructor(seedFactory: SeedFactory = freshCryptoSeeds) {
    this.seedFactory = seedFactory;
    this.snapshot = {
      candidates: [],
      suiteFingerprint: null,
      validatingCandidateId: null,
      bornToolName: null,
      bornCandidateId: null,
      bornToolStatus: null,
    };
  }

  getSnapshot = (): FoundrySnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(next: FoundrySnapshot): void {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  private freshSeeds(count: number): number[] {
    const seeds = this.seedFactory(count);
    if (
      seeds.length !== count ||
      new Set(seeds).size !== count ||
      seeds.some((seed) => !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff)
    ) {
      throw new Error(`Seed factory must return ${count} unique unsigned 32-bit integers.`);
    }
    return [...seeds];
  }

  author(input: unknown, parentId: string | null = null): CandidateRecord {
    const compiled = compileThermalCapability(input);
    const siblings = this.snapshot.candidates.filter(
      (candidate) => candidate.compiled.definition.name === compiled.definition.name,
    );
    if (parentId && !this.snapshot.candidates.some((candidate) => candidate.id === parentId)) {
      throw new Error(`Parent candidate '${parentId}' does not exist.`);
    }
    const version = siblings.length + 1;
    const record: CandidateRecord = {
      id: `${compiled.definition.name}:v${version}:${compiled.hash}`,
      version,
      parentId,
      compiled,
      previewValidation: null,
      validation: null,
      certificate: null,
      invocationCanaryValidation: null,
      invocationCanaryReceipt: null,
    };
    this.emit({ ...this.snapshot, candidates: [...this.snapshot.candidates, record] });
    return record;
  }

  preview(candidateId: string): ValidationReport {
    const candidate = this.requireCandidate(candidateId);
    const previewValidation = validateThermalCapability(candidate.compiled, this.previewSeeds);
    const updated = { ...candidate, previewValidation };
    this.emit({
      ...this.snapshot,
      candidates: this.snapshot.candidates.map((item) => (item.id === candidateId ? updated : item)),
    });
    return previewValidation;
  }

  async validate(candidateId: string, validator: { validate: (capability: CompiledThermalCapability, seeds: number[]) => Promise<ValidationReport> }): Promise<CandidateRecord> {
    const candidate = this.requireCandidate(candidateId);
    const hiddenSeeds = this.freshSeeds(CERTIFICATION_FLEET_SIZE);
    const suiteFingerprint = seedFingerprint(hiddenSeeds);
    this.emit({ ...this.snapshot, suiteFingerprint, validatingCandidateId: candidateId });
    try {
      const workerValidation = await validator.validate(candidate.compiled, hiddenSeeds);
      if (!reportIsInternallyConsistent(workerValidation, candidate.compiled, suiteFingerprint, CERTIFICATION_FLEET_SIZE)) {
        throw new Error("Fleet validator returned an internally inconsistent report.");
      }
      const validation = deepFreeze(structuredClone(workerValidation));
      const certificateBody: Omit<CapabilityCertificate, "id"> | null = validation.passed
        ? {
            candidateId,
            candidateHash: candidate.compiled.hash,
            suiteFingerprint: validation.suiteFingerprint,
            engineVersion: "ark-engine-0.1",
            passedCases: validation.passedCases,
            totalCases: validation.totalCases,
            horizonTicks: validation.horizonTicks,
            invariantSet: validation.invariantSet,
            replayDigest: replayDigest(validation),
            validationDigest: evidenceDigest(validation),
            executionArguments: defaultArguments(candidate.compiled),
            issuedAt: new Date().toISOString(),
          }
        : null;
      const certificate: CapabilityCertificate | null = certificateBody
        ? deepFreeze({ id: certificateId(certificateBody), ...certificateBody })
        : null;
      const updated = { ...candidate, validation, certificate };
      this.emit({
        ...this.snapshot,
        candidates: this.snapshot.candidates.map((item) => (item.id === candidateId ? updated : item)),
        validatingCandidateId: null,
      });
      return updated;
    } catch (error) {
      this.emit({ ...this.snapshot, validatingCandidateId: null });
      throw error;
    }
  }

  markBorn(candidateId: string, toolName: string): void {
    this.assertCertified(candidateId);
    this.emit({ ...this.snapshot, bornCandidateId: candidateId, bornToolName: toolName, bornToolStatus: "live" });
  }

  async runInvocationCanary(
    candidateId: string,
    validator: { validate: (capability: CompiledThermalCapability, seeds: number[]) => Promise<ValidationReport> },
  ): Promise<InvocationCanaryReceipt> {
    if (this.snapshot.bornCandidateId !== candidateId || !this.snapshot.bornToolName) {
      throw new Error("Only the capability currently born into the live catalog may run an invocation canary.");
    }
    const candidate = this.assertCertified(candidateId);
    const certificate = candidate.certificate!;
    const seeds = this.freshSeeds(INVOCATION_CANARY_SIZE);
    const suiteFingerprint = seedFingerprint(seeds);
    this.emit({ ...this.snapshot, bornToolStatus: "checking" });
    try {
      const workerValidation = await validator.validate(candidate.compiled, seeds);
      if (!reportIsInternallyConsistent(workerValidation, candidate.compiled, suiteFingerprint, INVOCATION_CANARY_SIZE)) {
        throw new Error("Invocation canary returned an internally inconsistent report.");
      }
      const validation = deepFreeze(structuredClone(workerValidation));
      const body: Omit<InvocationCanaryReceipt, "id"> = {
        candidateId,
        candidateHash: candidate.compiled.hash,
        certificateId: certificate.id,
        suiteFingerprint,
        engineVersion: "ark-engine-0.1",
        passed: validation.passed,
        passedCases: validation.passedCases,
        totalCases: validation.totalCases,
        horizonTicks: validation.horizonTicks,
        invariantSet: validation.invariantSet,
        failureClusters: validation.failureClusters,
        replayDigest: replayDigest(validation),
        validationDigest: evidenceDigest(validation),
        checkedAt: new Date().toISOString(),
      };
      const receipt = deepFreeze({ id: canaryReceiptId(body), ...body });
      const updated = {
        ...candidate,
        invocationCanaryValidation: validation,
        invocationCanaryReceipt: receipt,
      };
      this.emit({
        ...this.snapshot,
        candidates: this.snapshot.candidates.map((item) => (item.id === candidateId ? updated : item)),
        bornToolStatus: receipt.passed ? "live" : "revoked",
      });
      return receipt;
    } catch (error) {
      this.emit({ ...this.snapshot, bornToolStatus: "live" });
      throw error;
    }
  }

  assertInvocationCanary(candidateId: string): CandidateRecord {
    if (
      this.snapshot.bornCandidateId !== candidateId ||
      !this.snapshot.bornToolName ||
      this.snapshot.bornToolStatus === "revoked"
    ) {
      throw new Error("Capability is not the current live born tool.");
    }
    const candidate = this.assertCertified(candidateId);
    const validation = candidate.invocationCanaryValidation;
    const receipt = candidate.invocationCanaryReceipt;
    if (!validation || !receipt?.passed || !candidate.certificate) {
      throw new Error("Capability has not passed a fresh invocation canary.");
    }
    const { id, ...body } = receipt;
    const valid =
      id === canaryReceiptId(body) &&
      receipt.candidateId === candidate.id &&
      receipt.candidateHash === candidate.compiled.hash &&
      receipt.certificateId === candidate.certificate.id &&
      receipt.engineVersion === "ark-engine-0.1" &&
      receipt.passedCases === INVOCATION_CANARY_SIZE &&
      receipt.totalCases === INVOCATION_CANARY_SIZE &&
      receipt.horizonTicks === THERMAL_HORIZON_TICKS &&
      reportIsInternallyConsistent(validation, candidate.compiled, receipt.suiteFingerprint, INVOCATION_CANARY_SIZE) &&
      validation.passedCases === receipt.passedCases &&
      validation.totalCases === receipt.totalCases &&
      validation.horizonTicks === receipt.horizonTicks &&
      JSON.stringify(validation.invariantSet) === JSON.stringify(receipt.invariantSet) &&
      JSON.stringify(validation.failureClusters) === JSON.stringify(receipt.failureClusters) &&
      replayDigest(validation) === receipt.replayDigest &&
      evidenceDigest(validation) === receipt.validationDigest;
    if (!valid) throw new Error("Invocation canary receipt integrity verification failed.");
    return candidate;
  }

  markExecuted(candidateId: string): void {
    this.assertInvocationCanary(candidateId);
    this.emit({ ...this.snapshot, bornToolStatus: "executed" });
  }

  assertCertified(candidateId: string): CandidateRecord {
    const candidate = this.requireCandidate(candidateId);
    const certificate = candidate.certificate;
    const validation = candidate.validation;
    if (!certificate || !validation?.passed) {
      throw new Error("Candidate does not hold a valid fleet certificate.");
    }
    const { id, ...body } = certificate;
    const definitionHash = compileThermalCapability(candidate.compiled.definition).hash;
    const valid =
      id === certificateId(body) &&
      definitionHash === candidate.compiled.hash &&
      certificate.candidateId === candidate.id &&
      certificate.candidateHash === candidate.compiled.hash &&
      certificate.suiteFingerprint === validation.suiteFingerprint &&
      certificate.engineVersion === "ark-engine-0.1" &&
      certificate.passedCases === CERTIFICATION_FLEET_SIZE &&
      certificate.totalCases === CERTIFICATION_FLEET_SIZE &&
      certificate.horizonTicks === THERMAL_HORIZON_TICKS &&
      reportIsInternallyConsistent(validation, candidate.compiled, certificate.suiteFingerprint, CERTIFICATION_FLEET_SIZE) &&
      validation.passed &&
      validation.passedCases === certificate.passedCases &&
      validation.totalCases === certificate.totalCases &&
      validation.horizonTicks === certificate.horizonTicks &&
      JSON.stringify(validation.invariantSet) === JSON.stringify(certificate.invariantSet) &&
      replayDigest(validation) === certificate.replayDigest &&
      evidenceDigest(validation) === certificate.validationDigest &&
      JSON.stringify(defaultArguments(candidate.compiled)) === JSON.stringify(certificate.executionArguments);
    if (!valid) throw new Error("Fleet certificate integrity verification failed.");
    return candidate;
  }

  executeCertified(candidateId: string, world: Parameters<typeof executeThermalCapability>[0]) {
    const candidate = this.assertInvocationCanary(candidateId);
    return executeThermalCapability(world, candidate.compiled, candidate.certificate!.executionArguments);
  }

  requireCandidate(candidateId: string): CandidateRecord {
    const candidate = this.snapshot.candidates.find((item) => item.id === candidateId);
    if (!candidate) throw new Error(`Candidate '${candidateId}' does not exist.`);
    return candidate;
  }
}

export const foundryStore = new FoundryStore();

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

export type CandidateRecord = {
  id: string;
  version: number;
  parentId: string | null;
  compiled: CompiledThermalCapability;
  previewValidation: ValidationReport | null;
  validation: ValidationReport | null;
  certificate: CapabilityCertificate | null;
};

export type FoundrySnapshot = {
  candidates: CandidateRecord[];
  suiteFingerprint: string;
  validatingCandidateId: string | null;
  bornToolName: string | null;
  bornCandidateId: string | null;
};

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

function reportCanIssueCertificate(
  validation: ValidationReport,
  capability: CompiledThermalCapability,
  suiteFingerprint: string,
): boolean {
  return (
    validation.passed &&
    validation.candidateHash === capability.hash &&
    validation.suiteFingerprint === suiteFingerprint &&
    validation.passedCases === 64 &&
    validation.totalCases === 64 &&
    validation.cases.length === 64 &&
    validation.horizonTicks === THERMAL_HORIZON_TICKS &&
    validation.failureClusters.length === 0 &&
    validation.cases.every(
      (item, index) =>
        item.index === index &&
        item.passed &&
        item.failureCodes.length === 0 &&
        item.horizonTicks === THERMAL_HORIZON_TICKS &&
        item.stableTicks === THERMAL_HORIZON_TICKS &&
        item.replayMatched,
    )
  );
}

export class FoundryStore {
  private readonly hiddenSeeds: number[];
  private readonly previewSeeds = [0x10a11ce, 0x20a11ce, 0x30a11ce, 0x40a11ce, 0x50a11ce, 0x60a11ce, 0x70a11ce, 0x80a11ce];
  private listeners = new Set<() => void>();
  private snapshot: FoundrySnapshot;

  constructor() {
    this.hiddenSeeds = Array.from(crypto.getRandomValues(new Uint32Array(64)));
    this.snapshot = {
      candidates: [],
      suiteFingerprint: seedFingerprint(this.hiddenSeeds),
      validatingCandidateId: null,
      bornToolName: null,
      bornCandidateId: null,
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
    this.emit({ ...this.snapshot, validatingCandidateId: candidateId });
    try {
      const workerValidation = await validator.validate(candidate.compiled, this.hiddenSeeds);
      if (workerValidation.passed && !reportCanIssueCertificate(workerValidation, candidate.compiled, this.snapshot.suiteFingerprint)) {
        throw new Error("Fleet validator returned an internally inconsistent passing report.");
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
    this.emit({ ...this.snapshot, bornCandidateId: candidateId, bornToolName: toolName });
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
      certificate.suiteFingerprint === this.snapshot.suiteFingerprint &&
      certificate.engineVersion === "ark-engine-0.1" &&
      certificate.passedCases === 64 &&
      certificate.totalCases === 64 &&
      certificate.horizonTicks === THERMAL_HORIZON_TICKS &&
      reportCanIssueCertificate(validation, candidate.compiled, this.snapshot.suiteFingerprint) &&
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
    const candidate = this.assertCertified(candidateId);
    return executeThermalCapability(world, candidate.compiled, candidate.certificate!.executionArguments);
  }

  requireCandidate(candidateId: string): CandidateRecord {
    const candidate = this.snapshot.candidates.find((item) => item.id === candidateId);
    if (!candidate) throw new Error(`Candidate '${candidateId}' does not exist.`);
    return candidate;
  }
}

export const foundryStore = new FoundryStore();

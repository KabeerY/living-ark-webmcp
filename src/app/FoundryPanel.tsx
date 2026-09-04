import type { ArkSnapshot } from "../engine/types";
import type { CandidateRecord, FoundrySnapshot } from "../foundry/FoundryStore";

type FoundryPanelProps = {
  foundry: FoundrySnapshot;
  ark: ArkSnapshot;
  siteTools: "waiting" | "live" | "unavailable";
  onClose: () => void;
};

function candidateState(candidate: CandidateRecord, validatingCandidateId: string | null): string {
  if (validatingCandidateId === candidate.id) return "UNDER ATTACK";
  if (candidate.certificate) return "CERTIFIED";
  if (candidate.validation && !candidate.validation.passed) return "FALSIFIED";
  if (candidate.previewValidation) return "PREVIEWED";
  return "INERT";
}

function shortHash(value: string | null | undefined, fallback = "UNOPENED"): string {
  if (!value) return fallback;
  return value.length > 14 ? `${value.slice(0, 7)}…${value.slice(-6)}` : value;
}

export function FoundryPanel({ foundry, ark, siteTools, onClose }: FoundryPanelProps) {
  const latest = foundry.candidates.at(-1) ?? null;
  const report = latest?.validation ?? null;
  const preview = latest?.previewValidation ?? null;
  const validating = Boolean(latest && foundry.validatingCandidateId === latest.id);
  const certified = Boolean(latest?.certificate);
  const acted = ark.phase === "stable";
  const bornAlive = Boolean(foundry.bornToolName && foundry.bornToolStatus !== "revoked");
  const canary = latest?.invocationCanaryReceipt ?? null;
  const canaryFact =
    foundry.bornToolStatus === "checking"
      ? "ZERO-DAY CHECKING 16"
      : canary
        ? `ZERO-DAY ${canary.passedCases}/${canary.totalCases} ${canary.passed ? "PASSED" : "REVOKED"}`
        : "ZERO-DAY 16 PENDING";
  const steps = ["Observe", "Author", "Attack", "Earn", "Act"];
  const activeStep = acted
    ? steps.length
    : bornAlive || foundry.bornToolStatus === "revoked"
      ? 3
      : report
        ? 2
        : latest
          ? 1
          : 0;

  return (
    <aside className="foundry-panel" aria-label="Capability Foundry">
      <header className="foundry-panel__header">
        <div>
          <span className="eyebrow">NATIVE AGENT WORKSPACE</span>
          <h2>Capability Foundry</h2>
        </div>
        <button onClick={onClose} aria-label="Close Capability Foundry">×</button>
      </header>

      <div className="foundry-rule">
        <span className={`signal ${siteTools === "live" ? "live" : ""}`} />
        <p>
          Prototypes are inert. A policy must survive a fresh <strong>64 / 64</strong> Fleet to enter the catalog,
          then <strong>16 / 16</strong> zero-day worlds before it may write.
        </p>
      </div>

      <ol className="foundry-steps" aria-label="Capability lifecycle">
        {steps.map((step, index) => (
          <li key={step} className={index < activeStep ? "done" : index === activeStep ? "active" : ""}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>

      {!latest ? (
        <div className="foundry-empty">
          <div className="foundry-empty__orb"><i /><i /><i /></div>
          <span className="eyebrow">WAITING FOR A VISITING AGENT</span>
          <h3>The Ark has no repair verb.</h3>
          <p>The agent must inspect the crisis, learn bounded ArkScript, and author a capability this world does not yet possess.</p>
          <div className="authority-boundary">
            <span>Candidate authority</span><strong>NONE</strong>
            <span>Canonical writes</span><strong>LOCKED</strong>
          </div>
        </div>
      ) : (
        <>
          {foundry.candidates.length > 1 && (
            <section className="lineage" aria-label="Capability revision lineage">
              <span className="eyebrow">REVISION LINEAGE</span>
              <div className="lineage__rail">
                {foundry.candidates.map((candidate, index) => {
                  const candidateReport = candidate.validation;
                  const state = candidate.certificate ? "certified" : candidateReport ? "failed" : "inert";
                  return (
                    <div key={candidate.id} className={`lineage__node ${state}`}>
                      <span>V{candidate.version}</span>
                      <strong>
                        {candidateReport
                          ? `${candidateReport.passedCases}/${candidateReport.totalCases}`
                          : "INERT"}
                      </strong>
                      <small>{candidate.certificate ? "CERTIFIED" : candidateReport ? "FALSIFIED" : "PROTOTYPE"}</small>
                      {index < foundry.candidates.length - 1 && <i aria-hidden="true">→</i>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="candidate-stage">
            <div className="candidate-stage__heading">
              <div>
                <span className="eyebrow">LATEST PROTOTYPE · V{latest.version}</span>
                <h3>{latest.compiled.definition.name.replaceAll("_", " ")}</h3>
              </div>
              <strong className={`candidate-state ${certified ? "certified" : report && !report.passed ? "failed" : ""}`}>
                {candidateState(latest, foundry.validatingCandidateId)}
              </strong>
            </div>
            <p>{latest.compiled.definition.description}</p>
            <div className="policy-chips">
              <span>{latest.compiled.definition.program.targetSelector.replaceAll("_", " ")}</span>
              <span>{latest.compiled.definition.program.pathMode.replaceAll("_", " ")}</span>
              <span>{latest.compiled.definition.program.sourceScope.replaceAll("_", " ")}</span>
              <span>≤ {latest.compiled.definition.program.maxTargets} targets</span>
            </div>
            <div className="candidate-receipt">
              <span>COMPILED {latest.compiled.compileReport.serializedBytes} B</span>
              <span>HASH {shortHash(latest.compiled.hash)}</span>
              <span>
                CANONICAL AUTHORITY{" "}
                {acted
                  ? "EXERCISED"
                  : foundry.bornToolStatus === "revoked"
                    ? "REVOKED"
                    : certified
                      ? "CANARY-GATED"
                      : "0"}
              </span>
            </div>
          </section>

          {preview && (
            <section className="preview-strip">
              <div><span className="eyebrow">VISIBLE SANDBOX</span><strong>{preview.passedCases} / {preview.totalCases}</strong></div>
              <div className="preview-worlds">
                {preview.cases.map((item) => <i key={item.index} className={item.passed ? "passed" : "failed"} />)}
              </div>
              <span>Preview is evidence, never authority.</span>
            </section>
          )}

          <section className={`fleet ${validating ? "fleet--running" : ""}`}>
            <div className="fleet__heading">
              <div>
                <span className="eyebrow">COUNTERFACTUAL FLEET</span>
                <strong>{validating ? "ATTACKING 64 HIDDEN REGIMES" : report ? `${report.passedCases} / ${report.totalCases} SURVIVED` : "SEALED · NOT YET RUN"}</strong>
              </div>
              <div><span>SUITE</span><code>{shortHash(report?.suiteFingerprint ?? foundry.suiteFingerprint)}</code></div>
            </div>
            <div className="fleet-grid" aria-label="64 sealed validation worlds">
              {Array.from({ length: 64 }, (_, index) => {
                const validationCase = report?.cases[index];
                const state = validationCase ? (validationCase.passed ? "passed" : "failed") : validating ? "scanning" : "sealed";
                return (
                  <i
                    key={index}
                    className={state}
                    style={{ animationDelay: `${index * 13}ms` }}
                    title={validationCase ? `World ${index + 1}: ${validationCase.passed ? "survived" : validationCase.failureCodes.join(", ")}` : `Sealed world ${index + 1}`}
                  />
                );
              })}
            </div>
            {report && report.failureClusters.length > 0 && (
              <div className="failure-clusters">
                {report.failureClusters.map((cluster) => (
                  <div key={cluster.code}>
                    <span>{cluster.code.replaceAll("_", " ")}</span>
                    <strong>{cluster.worlds} worlds</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          {latest.certificate && (
            <section className="certificate">
              <div className="certificate__seal">✦</div>
              <div>
                <span className="eyebrow">EXECUTABLE CERTIFICATE</span>
                <h3>Capability survived the Fleet.</h3>
                <p>{shortHash(latest.certificate.id)} · {latest.certificate.engineVersion}</p>
                <div className="certificate__facts">
                  <span>{latest.certificate.horizonTicks} DELAYED TICKS</span>
                  <span>REPLAY {shortHash(latest.certificate.replayDigest)}</span>
                  <span>PROOF {shortHash(latest.certificate.validationDigest)}</span>
                  <span>{canaryFact}</span>
                </div>
              </div>
              <strong>64/64</strong>
            </section>
          )}

          <section
            className={`birth-slot ${bornAlive ? "birth-slot--alive" : ""} ${foundry.bornToolStatus === "revoked" ? "birth-slot--revoked" : ""}`}
          >
            <span className="eyebrow">LIVE WEBMCP CATALOG</span>
            <strong>{foundry.bornToolName ?? "EMPTY CAPABILITY SLOT"}</strong>
            <p>
              {foundry.bornToolStatus === "revoked"
                ? "Zero-day canary failed. The verb unregistered itself before any canonical write."
                : foundry.bornToolStatus === "checking"
                  ? "Catalog verb is attacking a fresh 16-world canary before canonical execution."
                  : foundry.bornToolStatus === "executed"
                    ? "Invocation receipt sealed. The certified verb changed the canonical Ark."
                    : foundry.bornToolName
                      ? "Born in this browser session. Canonical execution remains zero-day gated."
                      : "No prototype has earned a callable name."}
            </p>
          </section>
        </>
      )}

    </aside>
  );
}

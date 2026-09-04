import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { hashSnapshot } from "../engine/hash";
import { summarizeArk } from "../engine/metrics";
import type { SystemLens } from "../engine/types";
import { FleetValidator } from "../foundry/FleetValidator";
import { foundryStore } from "../foundry/FoundryStore";
import { ArkRenderer, type ArkRendererContract } from "../render";
import { registerLivingArkTools } from "../webmcp/livingArkTools";
import { arkStore } from "./ArkStore";
import { FoundryPanel } from "./FoundryPanel";

const LENSES: Array<{ id: SystemLens; label: string; key: string }> = [
  { id: "living", label: "Living", key: "0" },
  { id: "thermal", label: "Thermal", key: "1" },
  { id: "energy", label: "Energy", key: "2" },
  { id: "atmosphere", label: "Atmosphere", key: "3" },
  { id: "structure", label: "Structure", key: "4" },
];

export function App() {
  const snapshot = useSyncExternalStore(arkStore.subscribe, arkStore.getSnapshot);
  const foundry = useSyncExternalStore(foundryStore.subscribe, foundryStore.getSnapshot);
  const metrics = useMemo(() => summarizeArk(snapshot), [snapshot]);
  const stateHash = useMemo(() => hashSnapshot(snapshot), [snapshot]);
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ArkRendererContract | null>(null);
  const previousCandidateCount = useRef(0);
  const [lens, setLens] = useState<SystemLens>("living");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [siteTools, setSiteTools] = useState<"waiting" | "live" | "unavailable">("waiting");
  const [foundryOpen, setFoundryOpen] = useState(false);

  const selected = selectedId === null ? null : snapshot.cells[selectedId];
  const arkStable = snapshot.phase === "stable";
  const bornToolRegistered = Boolean(foundry.bornToolName && foundry.bornToolStatus !== "revoked");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new ArkRenderer({ host, snapshot, lens, onSelectCell: setSelectedId });
    rendererRef.current = renderer;
    void renderer.init();
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.transitionToSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (
      foundry.candidates.length > previousCandidateCount.current ||
      foundry.validatingCandidateId ||
      foundry.bornToolStatus === "checking" ||
      foundry.bornToolStatus === "revoked"
    ) {
      setFoundryOpen(true);
    }
    previousCandidateCount.current = foundry.candidates.length;
  }, [foundry.bornToolStatus, foundry.candidates.length, foundry.validatingCandidateId]);

  useEffect(() => {
    if (!arkStable || !foundry.bornToolName || foundry.bornToolStatus !== "executed") return;
    const revealWorld = window.setTimeout(() => setFoundryOpen(false), 620);
    return () => window.clearTimeout(revealWorld);
  }, [arkStable, foundry.bornToolName, foundry.bornToolStatus, snapshot.revision]);

  useEffect(() => {
    rendererRef.current?.setLens(lens);
  }, [lens]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const requested = LENSES.find((item) => item.key === event.key);
      if (requested) setLens(requested.id);
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        const distance = event.shiftKey ? 120 : 58;
        rendererRef.current?.panBy(
          key === "a" ? -distance : key === "d" ? distance : 0,
          key === "w" ? -distance : key === "s" ? distance : 0,
        );
      }
      if (event.key.toLowerCase() === "h") rendererRef.current?.frameArk();
      if (event.key === "Escape") {
        setSelectedId(null);
        rendererRef.current?.setSelectedCell(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let disposed = false;
    let unregister: (() => Promise<void>) | null = null;
    let validator: FleetValidator | null = null;
    let attempts = 0;

    const detect = async () => {
      if (document.modelContext?.registerTool) {
        validator = new FleetValidator();
        unregister = await registerLivingArkTools(document.modelContext, arkStore, foundryStore, validator);
        if (!disposed) setSiteTools("live");
        return;
      }
      attempts += 1;
      if (attempts < 20 && !disposed) {
        window.setTimeout(() => void detect(), 250);
      } else if (!disposed) {
        setSiteTools("unavailable");
      }
    };
    void detect();

    return () => {
      disposed = true;
      void unregister?.();
      validator?.destroy();
    };
  }, []);

  return (
    <main className={`ark-app lens-${lens} ${arkStable ? "is-stable" : "is-critical"}`}>
      <div className="world-host" ref={hostRef} aria-label="Interactive Living Ark world" />
      <div className="space-vignette" />

      <header className="mission-bar">
        <div className="mission-title">
          <span className="eyebrow">LIVING ARK · {arkStable ? "SURVIVAL STATE" : "EMERGENCY STASIS"}</span>
          <h1>{arkStable ? "The Ark is alive." : "Keep the Ark alive."}</h1>
        </div>
        <div className={`phase-block ${arkStable ? "phase-block--stable" : ""}`}>
          <span className={`signal ${arkStable ? "live" : "danger"}`} />
          <div>
            <span>{arkStable ? "THERMAL MESH" : "ION CASCADE"}</span>
            <strong>{arkStable ? "STABLE" : "CRITICAL"}</strong>
          </div>
        </div>
        <div className="vitals" aria-label="Ark vital statistics">
          <Vital label="Stability" value={`${Math.round(metrics.stability * 100)}%`} danger={!arkStable} />
          <Vital label="Critical peak" value={`${Math.round(metrics.peakCriticalTemperature)}°`} danger={!arkStable} />
          <Vital label="Coolant" value={Math.round(metrics.totalCoolant).toLocaleString()} />
        </div>
      </header>

      <aside className={`crisis-card ${arkStable ? "crisis-card--resolved" : ""}`}>
        <div className="crisis-card__top">
          <span className="sector-glyph">✦</span>
          <div>
            <span className="eyebrow">{arkStable ? "CAPABILITY EXECUTED" : "ACTIVE FAILURE"}</span>
            <strong>{arkStable ? "Thermal routes regrown" : "Thermal Choir severed"}</strong>
          </div>
        </div>
        <p>
          {arkStable
            ? `${foundry.bornToolName ?? "The born capability"} passed its zero-day canary and held every critical system below the hard limit through the delayed horizon.`
            : "Heat is crossing the starboard mesh toward the Cryovault. No canonical repair capability exists."}
        </p>
        <div className="crisis-chain">
          <span>{arkStable ? "12-TICK PROOF" : "ION IMPACT"}</span><i />
          <span>{arkStable ? "64/64 + 16/16" : `${metrics.fracturedEdges} FRACTURES`}</span><i />
          <span>{metrics.overheatedCriticalCells} CRITICAL HOT</span>
        </div>
      </aside>

      {selected && (
        <aside className="inspector">
          <button
            className="inspector__close"
            onClick={() => {
              setSelectedId(null);
              rendererRef.current?.setSelectedCell(null);
            }}
            aria-label="Close cell inspector"
          >
            ×
          </button>
          <span className="eyebrow">CELL {String(selected.id).padStart(3, "0")}</span>
          <h2>{selected.sector}</h2>
          <p>{selected.kind.replace(/^./, (letter) => letter.toUpperCase())} cell</p>
          <dl>
            <Metric label="Temperature" value={`${selected.temperature.toFixed(1)}°`} hot={selected.temperature > 85 + 1e-8} />
            <Metric label="Coolant" value={selected.coolant.toFixed(1)} />
            <Metric label="Energy" value={selected.energy.toFixed(1)} />
            <Metric label="Integrity" value={`${Math.round(selected.integrity * 100)}%`} hot={selected.integrity < 0.55} />
          </dl>
          <button className="frame-button" onClick={() => rendererRef.current?.frameCell(selected.id)}>
            Frame this cell
          </button>
        </aside>
      )}

      <nav className="lens-bar" aria-label="Ark system lenses">
        {LENSES.map((item) => (
          <button
            key={item.id}
            className={lens === item.id ? "active" : ""}
            onClick={() => setLens(item.id)}
            aria-pressed={lens === item.id}
          >
            <kbd>{item.key}</kbd>
            <span className="lens-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {foundryOpen && (
        <FoundryPanel foundry={foundry} ark={snapshot} siteTools={siteTools} onClose={() => setFoundryOpen(false)} />
      )}

      <button
        className="foundry-dock"
        onClick={() => setFoundryOpen((open) => !open)}
        aria-expanded={foundryOpen}
        aria-label="Toggle Capability Foundry"
      >
        <div className="foundry-dock__status">
          <span className={`signal ${siteTools === "live" ? "live" : ""}`} />
          <div>
            <span className="eyebrow">CAPABILITY FOUNDRY</span>
            <strong>
              {siteTools === "live"
                ? `${8 + (bornToolRegistered ? 1 : 0)} native tools · ${foundry.validatingCandidateId ? "fleet running" : foundry.bornToolStatus === "checking" ? "zero-day canary" : foundry.bornToolStatus === "revoked" ? "born verb revoked" : foundry.bornToolStatus === "executed" ? "receipt sealed" : foundry.candidates.length ? `${foundry.candidates.length} prototype${foundry.candidates.length === 1 ? "" : "s"}` : "awaiting agent"}`
                : siteTools === "waiting"
                  ? "Detecting Site Tools…"
                  : "Visual preview · Site Tools unavailable"}
            </strong>
          </div>
        </div>
        <div className="tool-slot">
          <span>ARK VOCABULARY</span>
          <strong className={bornToolRegistered ? "born" : ""}>
            {foundry.bornToolStatus === "revoked"
              ? `REVOKED · ${foundry.bornToolName}`
              : foundry.bornToolName ?? "NO REPAIR VERB"}
          </strong>
        </div>
      </button>

      <footer className="status-footer">
        <span>DRAG / WASD TO EXPLORE · SCROLL TO DESCEND · H TO FRAME ARK</span>
        <span>REV {snapshot.revision} · TICK {snapshot.tick} · {stateHash}</span>
      </footer>
    </main>
  );
}

function Vital({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={danger ? "vital vital--danger" : "vital"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ label, value, hot = false }: { label: string; value: string; hot?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={hot ? "hot" : ""}>{value}</dd>
    </div>
  );
}

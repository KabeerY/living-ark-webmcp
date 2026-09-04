# Living Ark — implemented product and system architecture

Status: **working vertical slice verified in a native WebMCP browser**  
Mission: **Keep the Ark alive.**  
Public idea: **The world teaches an agent a new power.**

Living Ark is not a game with a few convenience tools attached. It is a live application whose vocabulary can expand only when a visiting agent proves a new behavior against the application's executable laws.

The complete implemented loop is:

```text
inspect live semantic state
→ author inert ArkScript candidate
→ preview against 8 worlds
→ attack against 64 sealed worlds
→ reject or issue executable certificate
→ dynamically register a new WebMCP tool
→ same agent invokes the born tool
→ canonical engine state and visible Ark recover together
```

## 1. Product contract

An ion storm has fractured the Ark's thermal mesh. Heat is moving toward the Cryovault and Sunwell. The initial WebMCP catalog can inspect the Ark and create/test bounded thermal policies, but it intentionally has no canonical repair action.

The visiting browser agent is the capability author. There is no hidden internal model, prewritten winning call, shell, arbitrary JavaScript evaluator, DOM mutation tool, or generic `execute_program` escape hatch.

Only a candidate that survives every sealed world earns a versioned tool such as:

```text
stabilize_thermal_mesh_v2
```

That tool executes the exact certified program with the exact certified arguments. Its public input schema is `{}` so the proof cannot be invalidated by a post-certification override.

### Non-negotiable invariants

1. Candidate compilation grants no canonical authority.
2. Preview and Fleet execution operate only on generated clones.
3. Validation uses the production interpreter and thermal horizon, not an LLM/rubric judgment.
4. Hidden seeds and hidden world dumps are never returned through WebMCP.
5. A failed candidate returns aggregate causal failure clusters and cannot change revision or state hash.
6. A passing certificate binds candidate, suite, engine, invariants, replay evidence, and default arguments.
7. Tool birth is a real same-session `document.modelContext.registerTool` call.
8. Canonical execution is possible only through the born tool.
9. A repeated call against an already stable Ark is an idempotent no-op.
10. Pixi and React are projections of canonical snapshots; neither is simulation truth.

## 2. Runtime topology

```text
External browser agent
        │ typed WebMCP calls
        ▼
document.modelContext
        │
        ├── Core inspectors ───────────────► ArkStore (canonical snapshot)
        │                                      │
        └── Capability Foundry                  ├── React HUD
              │                                └── Pixi renderer
              ├── compiler
              ├── preview interpreter
              └── FleetValidator Web Worker
                         │
                  ValidationReport
                         │
                  certificate verifier
                         │
                  dynamic born tool
                         │
                  production interpreter
                         │
                  12-tick thermal horizon
                         │
                  ArkStore replacement
```

### Authority zones

| Zone | Reads canonical state | Mutates canonical state | Executes candidate IR |
|---|---:|---:|---:|
| Inspector tools | Yes | No | No |
| Authoring compiler | No | No | No |
| Visible preview | Clone only | No | Yes |
| Sealed Fleet worker | Generated worlds only | No | Yes |
| Certificate verifier | Metadata/evidence | No | No |
| Born tool | Yes | Yes, once certified | Certified program only |

There is no route from candidate JSON directly to `ArkStore.replace`.

## 3. Canonical Ark model

`createHeroArk(seed)` deterministically generates the complete world:

- 1,536 × 864 world coordinate space;
- 766 semantic cells in the default hero seed;
- stable cell and edge IDs;
- ten named sectors;
- thermal, energy, atmosphere, and structural edge types;
- seeded temperature, coolant, energy, atmosphere, matter, and integrity;
- active, fractured, and dormant network states;
- four initial causal crisis events;
- revision, tick, phase, and content-derived state hash.

The implementation uses immutable boundary snapshots containing typed `ArkCell[]`, `ArkEdge[]`, and `ArkEvent[]` records. Candidate execution begins with a deep clone. No engine step reads the DOM, renderer, clock, network, storage, or ambient randomness.

### Named sectors

| Sector | Function and visible landmark |
|---|---|
| Hull Skin | Living shell plates and exterior tendrils |
| Navigation Crown | Forward sensing and route control |
| Verdant Ring | Food/oxygen ecology and garden terraces |
| Sunwell | Central reactor organ |
| Thermal Choir | Pumps, heat exchange, and hero fracture scar |
| Cryovault | Population cryopods and critical thermal stakes |
| Atmosphere Lungs | Paired breathing membranes |
| Fabrication Reef | Programmable-matter machinery |
| Memory Reef | Crystal record structures |
| Reservoirs | Coolant cisterns feeding the thermal mesh |

### Hero start state

For seed `0xa7c0ffee`:

```text
revision                  1
tick                      184
phase                     critical
state hash                d45f29e8
fractured edges           127
critical cells > 85°C     5
all cells > 85°C          28
critical peak             110.488°C
```

Canonical physics is held in emergency stasis while the agent observes and authors. A born-tool invocation applies one bounded interpreter execution followed by twelve deterministic delayed thermal ticks.

## 4. ArkScript thermal grammar

ArkScript is bounded declarative JSON validated by a strict Zod schema. It is not JavaScript.

The shipped grammar is intentionally small:

```ts
type ThermalCapabilityDefinition = {
  name: string;
  description: string;
  parameters: Array<{
    name: "targetTemperature" | "materialBudget" | "sourceReserve";
    description: string;
    type: "number";
    minimum: number;
    maximum: number;
    default: number;
  }>;
  program: {
    targetSelector: "critical_hotspots" | "all_hotspots";
    targetOrder: Array<{
      field: "criticality" | "temperature" | "coolant" | "id";
      direction: "asc" | "desc";
    }>;
    sourceSelector: "nearest_reservoir" | "highest_coolant_reservoir";
    sourceScope: "active_thermal_component" | "physical_component";
    pathMode: "active_only" | "wake_dormant" | "regrow_fractures";
    maxPathLength: number;
    maxTargets: number;
  };
};
```

`targetOrder` is a generic one-to-three-clause lexicographic ordering with unique fields and a deterministic cell-ID tie-break. It does not contain a solution-shaped `protect_critical_first` primitive.

### Compiler boundary

The compiler:

- rejects unknown keys and unknown enum values;
- validates finite parameter bounds and defaults;
- requires `targetTemperature`;
- requires `materialBudget` for fracture regrowth;
- rejects duplicate parameters and duplicate ordering fields;
- caps path length at 96 and targets at 64;
- caps serialized program size at 8,192 bytes;
- derives a static graph-visit budget;
- content-addresses the canonical definition; and
- deep-freezes the compiled definition.

### Interpreter behavior

The interpreter:

1. clones the source world;
2. selects bounded hot targets;
3. applies the declared deterministic ordering;
4. builds only the permitted adjacency graph;
5. chooses reservoirs using the declared selector/scope;
6. performs bounded cost/path search;
7. fails individual targets closed when no route or budget exists;
8. activates a path only inside material budget;
9. conserves coolant while moving it to the target; and
10. emits a new tick/revision on the clone.

## 5. Counterfactual Fleet and certification

### Preview

Eight fixed public seeds let an agent test a candidate without authority. Results include per-world pass/fail state and aggregate failure clusters. Preview success is explicitly not a certificate.

### Sealed Fleet

Each page session creates 64 hidden seeds with `crypto.getRandomValues`. The seeds are sent to a dedicated Web Worker with the frozen compiled candidate. The worker returns evidence, never the seeds or full hidden worlds.

Each validation case runs twice through the same production interpreter and twelve-tick horizon. A case passes only if all of these hold:

- every critical cell is at or below the 85°C hard limit after the delayed horizon;
- the cell remained safe for all 12 delayed ticks;
- coolant is conserved within numerical tolerance;
- coolant, energy, and matter remain non-negative;
- material use remains inside the declared budget;
- graph visits remain inside the compile-time budget; and
- replay produces the same final state hash.

The 74°C policy target and the 85°C world invariant are deliberately distinct. Certification enforces the world's hard safety law, not an invented verifier objective.

### Certificate integrity

A certificate is issued only for an internally consistent exact 64/64 report. It binds:

- candidate ID and candidate hash;
- random suite fingerprint;
- engine version;
- 64/64 pass counts;
- 12-tick horizon;
- invariant set;
- replay digest;
- complete validation-evidence digest;
- frozen execution arguments; and
- issuance time.

The certificate ID hashes its full body. Before registration and every canonical execution, `FoundryStore.assertCertified` recompiles the definition and rechecks the certificate, validation cases, digests, suite, engine, counts, horizon, replay flags, and arguments. Evidence and certificate objects are deep-frozen.

## 6. WebMCP surface

The initial catalog contains exactly eight tools:

| Tool | Canonical mutation | Purpose |
|---|---:|---|
| `inspect_ark` | No | Global revision, hash, phase, resources, and exact crisis metrics |
| `inspect_crisis` | No | Causal event chain, critical cells, hard limit, and recovery status |
| `inspect_sector` | No | Bounded semantic slice for one named sector |
| `read_arkscript_manual` | No | Complete grammar, authority boundary, and strategy semantics |
| `author_thermal_capability` | No | Compile/store one inert version, optionally linked to a parent |
| `simulate_thermal_capability` | No | Execute against eight preview worlds |
| `validate_thermal_capability` | No | Attack against the sealed Fleet and possibly grant authority |
| `inspect_capability_lineage` | No | Candidate versions, failures, certificate, and born-tool state |

All registrations share one `AbortController`. Aborting the signal removes both the initial tools and any same-session born tool; there is no invented `unregisterTool` API.

### Dynamic birth

After a valid certificate:

1. the certificate is reverified;
2. the page derives `<candidate_name>_v<version>`;
3. it registers a new zero-argument WebMCP tool;
4. that closure captures the certified candidate and frozen arguments;
5. the Foundry records the born candidate/tool name; and
6. the current browser agent can refresh its tool snapshot and call it immediately.

The born tool rejects every non-empty input object. On first execution it returns exact before/after revisions, hashes, metrics, runtime use, regrown edge IDs, certificate, and stable status. If the Ark is already inside its certified critical-safety envelope, it returns an explicit no-op receipt.

## 7. One state, two projections

The React HUD and Pixi renderer subscribe to the same `ArkStore` snapshot.

The born-tool execution does not directly set UI labels. It replaces the canonical world returned by the engine. React then derives the mission bar, crisis card, vital metrics, revision, hash, and Foundry state. Pixi interpolates the same before/after cells and edges over a 2.9-second recovery sweep.

Changed edges reveal at deterministic stagger points. Temperatures, coolant, and integrity interpolate. Flow packets follow active thermal edges. Heat motes derive from current hot cells. At transition completion, the Thermal Choir swaps from scorched to recovered art because canonical phase is `stable`.

### Visual layers

Back to front:

1. deterministic seeded starfield;
2. code-drawn living hull and structural plates;
3. canonical sector masses;
4. irregular inhabited deck islands and visual arteries;
5. modular original pixel-art landmarks;
6. canonical network edges and flows;
7. semantic cells/selection targets;
8. breathing organs, moving cargo, and caretaker drones;
9. heat, fracture, and recovery effects;
10. accessible React HUD and Capability Foundry.

Living mode hides most graph nodes so the vessel reads as a world. Thermal, Energy, Atmosphere, and Structure lenses reveal the dense 766-cell diagnostic projection. Camera drag, wheel/pinch zoom, WASD movement, cell framing, and whole-Ark framing are real interactions.

## 8. Implemented repository boundaries

```text
src/
  app/
    App.tsx                 React shell, tool lifecycle, HUD
    ArkStore.ts             canonical snapshot store
    FoundryPanel.tsx        lineage, preview, Fleet, certificate, birth
  engine/
    heroArk.ts              seeded world/crisis generator
    thermalHorizon.ts       delayed thermal dynamics
    metrics.ts              exact global and critical metrics
    hash.ts                 content-derived state hashes
    types.ts                canonical data contract
  foundry/
    schema.ts               strict ArkScript grammar
    compiler.ts             validation, freezing, static budgets
    interpreter.ts          production bounded executor
    validator.ts            invariants and deterministic replay
    validator.worker.ts     isolated 64-world execution
    FleetValidator.ts       worker request lifecycle
    FoundryStore.ts         lineage, evidence, certificates, authority
  webmcp/
    coreTools.ts            semantic inspectors
    livingArkTools.ts       author/preview/validate/birth/execute loop
    types.ts                official WebMCP type integration
  render/
    ArkRenderer.ts          Pixi world, camera, lenses, recovery
    atlas.ts                runtime palette/background keyed atlas
  replay/
    replay.ts               independent receipt record/verify module
```

`probe/` and `probe2/` remain immutable historical primitive tests. They are not imported by the product.

## 9. Verification

The automated suite covers:

- deterministic generation and hero-state invariants;
- preview isolation from canonical state;
- bounded interpreter behavior;
- generic target ordering;
- delayed horizon and replay equality;
- exact certificate issuance requirements;
- forged passing-report rejection;
- frozen validation/certificate/argument evidence;
- weak-policy rejection and unchanged canonical state;
- same-session dynamic tool birth;
- override rejection;
- canonical recovery;
- repeated-call idempotence;
- AbortController registration cleanup; and
- replay-receipt tamper detection.

An additional generalization test executes the reference strategy over four disjoint 64-world Fleets (256 worlds, each with an independent replay) and requires every world to maintain all invariants.

The native-browser run and exact observed metrics are recorded in `docs/VERIFICATION.md`.

## 10. Current deliberate limits

These are boundaries, not hidden TODO claims:

- The shipped capability grammar is thermal-only.
- Certificates and born tools are session-scoped; a full page reload creates a fresh Ark/Fleet and resets the catalog.
- The hero simulation is synthetic and deterministic by design; it is not presented as a physical engineering model.
- The hard certified safety invariant concerns critical cells. Global hot-cell counts are returned separately and never conflated with critical safety.
- Audio and persistent IndexedDB lineage are not shipped.
- Browsers without native `document.modelContext` receive the complete visual world but cannot perform the capability-birth loop.

## 11. Acceptance gate

The build is acceptable only while all of these remain true:

1. A fresh browser agent can infer the mission from the page and initial tools.
2. A plausible local policy is falsified for an intelligible generalization failure.
3. Falsification never changes canonical revision/hash.
4. The returned evidence is enough to revise without revealing hidden worlds.
5. Passing changes the browser's live WebMCP catalog.
6. Frozen certified arguments cannot be overridden.
7. The same agent invokes the born tool without refresh/reconnect.
8. The canonical engine—not a UI flag—causes recovery.
9. The recovered world, HUD, tool results, revision, and hash agree.
10. Removing WebMCP destroys the agent-authored capability-birth loop rather than leaving the product essentially intact.

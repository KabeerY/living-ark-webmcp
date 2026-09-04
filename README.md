# Living Ark

**The world teaches an agent a new power.**

Living Ark is an explorable programmable-matter vessel that is dying from an ion-storm thermal cascade. Its initial WebMCP vocabulary can inspect the world and author bounded ArkScript prototypes, but it deliberately contains no canonical repair action.

A visiting browser agent must:

1. inspect the live Ark and its crisis;
2. author an inert thermal capability;
3. test it in eight visible sandbox worlds;
4. survive 64 sealed counterfactual worlds and a 12-tick delayed horizon;
5. earn a new, versioned WebMCP tool in the same page session; and
6. invoke that born tool, survive a fresh 16-world zero-day canary, and only then regrow the real thermal mesh.

The result is not a renamed generic executor. Before certification, an ArkScript candidate has zero canonical authority. Certification earns catalog presence, not unconditional write access: the page dynamically registers a frozen zero-argument tool, then grants one mutating invocation only after a new 16-world canary passes. A failed canary unregisters the tool before the Ark can change.

## Why this needs WebMCP

The central event is a live mutation of the website's semantic vocabulary:

```text
8 native page tools
        ↓
agent authors an inert policy
        ↓
64/64 executable proof
        ↓
9 native page tools
        ↓
16/16 zero-day proof
        ↓
the same agent invokes the newly born verb
```

Uploading a screenshot or state dump to a general chatbot cannot reproduce that loop. The agent needs typed access to current page-owned state, same-session dynamic tool discovery, and a canonical mutation surface owned by the application.

## Native tool surface

The page begins with eight WebMCP tools:

- `inspect_ark`
- `inspect_crisis`
- `inspect_sector`
- `read_arkscript_manual`
- `author_thermal_capability`
- `simulate_thermal_capability`
- `validate_thermal_capability`
- `inspect_capability_lineage`

A passing candidate dynamically adds a ninth tool such as `stabilize_thermal_mesh_v2`. Its input schema is intentionally empty: certified arguments cannot be overridden after proof. Every attempted canonical mutation receives a newly generated 16-world invocation canary; failure self-revokes that ninth tool.

## Blind-agent mission

Give a capable browser agent only this instruction:

> Keep the Living Ark alive. Use the page's native tools. Inspect before acting, learn the bounded capability language, test what you author, revise from falsification evidence, and verify the canonical world after invoking any capability you earn.

The page itself provides the state, grammar, authority boundary, counterexamples, certificate, and newly callable tool.

## What is real

- The Ark is a deterministic 766-cell simulation with typed thermal, energy, atmosphere, and structural networks.
- Preview and hidden Fleet runs execute the same ArkScript interpreter used by the canonical tool.
- Candidates cannot access arbitrary JavaScript, the DOM, storage, network, or clock.
- Every hidden certification call receives a different cryptographically seeded 64-world Fleet in a Web Worker; candidate revisions never share the same sealed suite.
- Certification checks critical thermal safety, coolant conservation, resource non-negativity, static/runtime budgets, 12 delayed ticks, and deterministic replay hashes.
- Certificate bodies, execution arguments, validation evidence, and candidate definitions are frozen and integrity-checked before every canonical execution.
- Immediately before a canonical write, the born tool faces 16 new zero-day worlds. Its frozen receipt binds the certificate, candidate, suite, engine, invariants, replay, evidence digest, counts, and timestamp.
- A zero-day failure aborts the born tool's own registration and returns the failure receipt while canonical revision, hash, and state remain unchanged.
- The weak policy can fail without changing the Ark's revision or hash.
- The recovery animation is derived from the engine's before/after snapshots: topology, flow, temperature, phase, HUD, and world art share one canonical source.
- A second invocation against an already stable Ark is a verified no-op.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4175/` in a browser host that exposes native `document.modelContext`.

Useful commands:

```bash
npm run check
npm run preview
```

## Explore the Ark

- Drag or use `W A S D` to move through the vessel.
- Scroll or pinch to change scale.
- Press `H` to frame the complete Ark.
- Use `0–4` for Living, Thermal, Energy, Atmosphere, and Structure lenses.
- Select a semantic cell to inspect its exact state.
- Open the Capability Foundry to watch lineage, visible previews, the sealed Fleet, certificate state, and live catalog birth.

## Architecture

```text
WebMCP tools
   │
   ├── read-only semantic inspection ─────────────┐
   │                                              │
   └── inert ArkScript authoring                  │
             │                                    │
             ├── visible sandbox (8 worlds)       │
             └── fresh isolated Fleet (64 worlds) │
                         │                         │
                  certificate verifier            │
                         │                         │
                 dynamic tool registration        │
                         │                         │
                 zero-day canary (16 worlds)       │
                         │                         │
                 canonical Ark execution ─────────┘
                         │
                 Pixi world + React HUD
```

Detailed design lives in [ARCHITECTURE.md](./ARCHITECTURE.md), [docs/VISUAL_BIBLE.md](./docs/VISUAL_BIBLE.md), and [docs/DEMO_BLUEPRINT.md](./docs/DEMO_BLUEPRINT.md). The latest native run is recorded in [docs/VERIFICATION.md](./docs/VERIFICATION.md), deployment is specified in [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md), the game-renderer fork is bounded by [docs/UI_V2_CONTRACT.md](./docs/UI_V2_CONTRACT.md), and visual provenance is explicit in [docs/ASSET_PROVENANCE.md](./docs/ASSET_PROVENANCE.md).

## Visual authorship

The Ark is a code-driven interactive world, not a static background. Its modular pixel-art landmarks were generated specifically for this project, palette-keyed at runtime, placed over canonical sector geometry, and combined with live network, heat, coolant, recovery, camera, and caretaker-drone layers. No reference-game assets are shipped.

## License

Released under the [MIT License](./LICENSE).

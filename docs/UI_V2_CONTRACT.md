# Living Ark game-renderer contract

The current renderer is a verified fallback. A visual fork should replace only the renderer exported by `src/render/index.ts`; the simulation, stores, Foundry, WebMCP tools, validator workers, schemas, tests, and canonical state must remain untouched.

## Required class surface

The replacement must implement `ArkRendererContract` from `src/render/contract.ts` and accept the same `ArkRendererOptions`. `App.tsx` owns the renderer lifecycle and calls:

- `init()` once after mounting;
- `transitionToSnapshot(snapshot)` whenever canonical Ark state changes;
- `setLens(lens)` for Living, Thermal, Energy, Atmosphere, and Structure views;
- `setSelectedCell`, `frameCell`, `frameArk`, and `panBy` for navigation; and
- `destroy()` on teardown.

Keep the new implementation in its own directory, such as `src/render/game-v2/`, and switch it through the single export in `src/render/index.ts`. Do not delete the fallback until the replacement passes visual and behavioral comparison.

## Non-negotiable state mapping

The game world is not a decorative background. Every room, hazard, repair, temperature cue, network flow, and recovery animation must be derived from the supplied `ArkSnapshot`. All ten sectors must remain spatially and semantically distinguishable. The critical-to-stable transition must visibly follow the canonical recovery sweep rather than jump to a pre-rendered success scene. Selecting a visible cell must call `onSelectCell(cellId)` with a real cell from the snapshot.

## Target visual experience

Build an original, cohesive side-cutaway pixel-art starship at a consistent tile scale and perspective: connected rooms and walkable corridors, doors, pipes, platforms, hull depth, parallax space, warm practical lighting, animated machinery, organic life-support systems, coolant motion, drones or inhabitants, and a small caretaker avatar. It should feel like an authored browser game world, not a dashboard, one full-scene image, or independent atlas crops layered over polygons. Preserve the accessible React HUD and Capability Foundry above the canvas, and keep keyboard, pointer, touch, responsive, reduced-motion, and 60-fps behavior usable.

## Acceptance gate

The fork is acceptable only when the initial crisis, active validation, recovery sweep, and stable state are visually distinct; all five lenses still work; navigation and selection still work; `npm run check` remains green; and a deployed HTTPS build exposes the same native WebMCP tool lifecycle as local development.

# Visual asset provenance

Living Ark ships no copied game art, stock spaceship tiles, or assets from the visual references listed in the design bible.

## Moodframe

- File: `docs/assets/living-ark-moodframe-v1.png`
- Purpose: early composition and material-language exploration only
- Production use: **none**; it is not a page background or rendered layer
- Prompt record: `docs/assets/living-ark-moodframe-v1.prompt.txt`
- SHA-256: `397cc5a3fffc30df770e61003d7c08c66331797644bb97f938667726e11a9173`

## Modular sprite atlas

- File: `src/assets/living-ark-sprite-atlas-v1.png`
- Dimensions: 1536×1024
- Grid: 6 columns × 10 rows
- Purpose: original modular landmarks for hull, gardens, atmosphere lungs, Sunwell, Memory Reef, Fabrication Reef, Cryovault, reservoirs, and critical/recovered Thermal Choir states
- SHA-256: `0a85f1356c45ef42a11a2e2f3d95ddff7ee1444757ec34f5bbd43a690b8e5729`

The image generator returned an RGB atlas with a baked near-neutral background despite two alpha-removal passes. The repository preserves that source and `src/render/atlas.ts` performs a narrow runtime key only on near-neutral bright pixels. Warm ivory sprite pixels are retained because their channel spread is outside the background threshold.

The atlas is not the world. `ArkRenderer.ts` places its cells over code-authored hull/deck geometry and combines them with canonical networks, semantic cells, heat, flow, recovery, camera, and ambient-life layers.

## Typography

- Fraunces Variable is bundled from `@fontsource-variable/fraunces` under its upstream SIL Open Font License.
- IBM Plex Sans and IBM Plex Mono are bundled from their `@fontsource` packages under their upstream SIL Open Font Licenses.

Only the required application weights are imported. No runtime request is made to Google Fonts or another font CDN.

## Code-authored visual material

The following are generated entirely by application code:

- hull silhouette, plates, ribs, and tendrils;
- seeded starfield;
- sector geometry and inhabited deck islands;
- arteries and live semantic network edges;
- system-lens cells and selection markers;
- coolant packets and heat motes;
- recovery wave and progressive edge reveal;
- breathing, fabrication cargo, cryopod lights, and caretaker drones;
- all React HUD and Capability Foundry interface elements.

# Living Ark — visual and interaction bible

Status: design direction and visual QA criteria. For the exact shipped implementation and deliberate omissions, use `ARCHITECTURE.md` and `docs/VERIFICATION.md`.

Status: preproduction direction locked  
Moodframe: [`assets/living-ark-moodframe-v1.png`](assets/living-ark-moodframe-v1.png)  
Generation prompt: [`assets/living-ark-moodframe-v1.prompt.txt`](assets/living-ark-moodframe-v1.prompt.txt)

The moodframe is an original direction study, not a production screenshot or a source of final sprites. It establishes the Ark's silhouette, living-machine material language, warm interior life, and the legible collision between coral heat and teal recovery. Production art must simplify it into a true game-readable pixel hierarchy.

## 1. Art thesis

> A warm ancestral organism carrying a civilization through a cold universe—and learning a new reflex in front of you.

The Ark must never feel like a grey naval spaceship, a purple cyberpunk dashboard, or a factory grid with decorative vines. Its machinery should feel grown, repaired, inherited, and inhabited.

Three distances must all work:

1. **Macro:** one unforgettable living silhouette and one obvious damaged region.
2. **Sector:** organs, chambers, and resource networks with clear function.
3. **Cell:** animated valves, membranes, motes, fluid packets, fractures, and repair fibers.

The user explores by moving through scale, not by walking an avatar.

## 2. Reference synthesis

These are studies of visual mechanisms, not styles or assets to copy.

| Reference | Keep | Reject |
|---|---|---|
| [Eastward](https://store.steampowered.com/app/977880/Eastward/) | Dense environmental storytelling, warm pools of light, cool shadows, handcrafted lived-in spaces | Character-led RPG framing and unrelated sprite language |
| [Kingdom Two Crowns](https://www.kingdomthegame.com/) | Cinematic negative space, layered parallax, silhouettes, reflected light, patient ambient motion | Side-scrolling composition and minimal system topology |
| [Oxygen Not Included](https://www.klei.com/games/oxygen-not-included) | One-click resource lenses that make complex networks instantly readable | Dense management chrome and cartoon colony tone |
| [Noita](https://noitagame.com/) | Material consequences that visibly propagate through pixels; fire/liquid causality | Chaotic combat and unreadable full-screen particle noise |
| [Space Haven](https://spacehaven.net/) | Ship cutaway, readable rooms, useful macro-to-local inspection | Rigid rectangular colony grid and conventional human crew loop |

Our synthesis is:

```text
warm inhabited detail
+ cinematic depth and breathing room
+ exact system overlays
+ visible material causality
+ explorable ship-scale cutaway
= a living machine-native world
```

## 3. Composition

### Default frame

- The Ark occupies 68–82% of the world viewport.
- Its long axis runs slightly upward from left to right, never perfectly horizontal.
- The Sunwell sits off-center so the silhouette feels grown rather than diagrammed.
- Deep space remains visible around every side of the hull.
- The crisis region covers roughly one quarter of the ship: enough to read instantly without erasing the healthy Ark.
- The Foundry panel overlays or compresses no more than 34% of the screen when open.

### World layers from back to front

1. Far star dust: nearly static, tiny cool points.
2. Near nebula silhouettes: extremely slow parallax, broad low-contrast forms.
3. Exterior hull shadow: the stable macro silhouette.
4. Interior sector floors and membranes.
5. Cell machinery and authored props.
6. Resource networks and system-lens overlays.
7. State effects: heat shimmer, steam, sparks, coolant motes, regrowth.
8. Foreground shell ribs, antennae, drifting debris, and vignette.
9. Crisp DOM mission/status UI.

The background moves less than the Ark; foreground debris moves more. Camera movement should feel deep even though the simulation is 2D.

## 4. Pixel grammar

### World scale

- Base tile: 16 × 16 source pixels.
- Large organs: 4–12 tiles across.
- Small props: 8 × 8 or 16 × 16.
- Network fibers: 2 px resting width, 3–4 px when active or selected.
- Source world: approximately 1536 × 864 px before camera scaling.
- Logical viewport: 960 × 540; CSS scales it to the available area.
- Texture sampling: nearest neighbor.
- Camera settles on integer pixels and preferred zoom stops: macro, sector, cell.
- Smooth zoom may interpolate between stops, but the final resting frame must be pixel crisp.

### Cluster discipline

- Large surfaces use quiet color masses; detail concentrates around function and damage.
- Every material gets a consistent highlight direction: upper-left warm key light, lower-right cool occlusion.
- One-pixel noise is forbidden unless it is an intentional mote, star, spark, or material grain.
- Outlines are colored ramps, not universal black.
- Dithering is reserved for broad nebula, glass, and temperature transitions.
- No sprite may introduce an unapproved palette color.

### Palette

The runtime palette should be indexed and limited. The following values define the first ramp pass:

| Role | Hex | Use |
|---|---|---|
| Abyss | `#090D18` | Deep space and maximum contrast |
| Night blue | `#111A2A` | Near-space and deepest hull shadow |
| Hull ink | `#1C2431` | Interior outline and unlit structure |
| Warm shadow | `#3B2C32` | Organic occlusion |
| Terracotta | `#7B4036` | Fabrication cells and aged ceramic |
| Oxidized brass | `#A66A38` | Machine ribs and conduits |
| Ember | `#D85B3F` | Damage and high heat |
| Sun amber | `#F1AD52` | Energy, cabin light, capability birth |
| Warm cream | `#F3DFC0` | Shell highlights and stable life |
| Moss dark | `#244A3C` | Verdant shadow |
| Moss | `#5F8F58` | Living systems |
| Life mint | `#9BCB83` | Healthy biological highlights |
| Coolant dark | `#14545E` | Inactive thermal channels |
| Coolant teal | `#37AFA5` | Active coolant and recovery |
| Coolant light | `#8BE0C9` | Selected flow and successful repair |
| Alarm red | `#D83C3E` | Hard failure only |
| White heat | `#FFF0C9` | Tiny hottest cores; never large UI surfaces |
| Ion violet | `#6F5A91` | Storm atmosphere only; never the brand color |

Warm amber and cream represent inhabited stability. Teal represents cooling and newly learned control. Coral-to-white represents dangerous heat. Red is used only for actual failure, not routine selection.

## 5. Material language

| Material | Shape language | Motion |
|---|---|---|
| Living shell | Overlapping bone/ceramic plates, asymmetrical seams | Slow two-pixel breathing and seam flex |
| Thermal fibers | Branching translucent veins with copper anchors | Directional teal packets and soft pressure pulse |
| Energy lattice | Radial brass filaments and amber nodes | Quicker warm pulse, never laser beams |
| Atmosphere membranes | Paired sacs, bellows, translucent curtains | Slow inhale/exhale deformation |
| Programmable matter | Terracotta cells with dormant gold nuclei | Buds, bridges, and hardens during regrowth |
| Gardens | Dense moss masses, ponds, tiny lamps | Leaf shimmer and water glint |
| Damage | Broken silhouette, exposed hot core, drifting fragments | Directional sparks, heat shimmer, particulate loss |
| Certified capability | New golden dendrite in the Memory Reef | Grows once, then joins the Ark's resting pulse |

## 6. Semantic exploration

There is no avatar. The camera is the exploratory body.

### Controls

- Drag or WASD: pan.
- Wheel, trackpad pinch, or `Q`/`E`: zoom.
- Double-click a sector: frame it.
- Click a cell or edge: inspect it.
- `1` thermal, `2` energy, `3` atmosphere, `4` structure: system lenses.
- `F`: follow the active crisis or recovery wave.
- `H`: return to whole-Ark framing.
- `Esc`: clear selection or close the Foundry panel.

Controls appear as a brief unobtrusive hint and then fade. Every mouse action has a keyboard equivalent.

### Semantic zoom

| Level | Visible information | Hidden information |
|---|---|---|
| Macro | Ark silhouette, sector health, active crisis, four system rhythms | Individual valves and labels |
| Sector | Named organs, major edges, flows, critical cells, local damage | Decorative cell internals |
| Cell | Exact cell values, edge capacity/flow, material state, local causal history | Unrelated sector detail |

Labels fade in by level; they do not scale as baked text. DOM inspection cards remain sharp at every zoom.

### System lenses

Switching a lens desaturates non-relevant layers rather than hiding them. The active network gains color, flow packets, direction chevrons, and capacity thickness. Damaged edges keep a broken silhouette so the viewer understands topology rather than seeing floating colored lines.

The default “living” view is beautiful. Lenses are analytical views. The demo returns to living view for the capability-birth and recovery payoff.

## 7. The six visual states

### Calm

- Low-amplitude shell breathing.
- Warm cabins and garden glints.
- Slow energy pulse from Sunwell.
- Sparse teal coolant packets.
- Quiet parallax starfield.

### Critical

- One region loses its normal rhythm.
- Coral heat propagates edge by edge toward critical cells.
- Hairline shell cracks and drifting hot fragments appear.
- Local lights dim; the whole screen does not flash red.
- The camera settles with the hot sector and endangered target in one composition.

### Prototype

- The Memory Reef grows a dim, incomplete dendrite for candidate v1.
- The Foundry panel opens with a human-readable strategy summary.
- Candidate status is visually provisional: thin outline, no gold pulse.

### Falsified

- The Counterfactual Fleet shows 64 tiny Ark silhouettes in an 8 × 8 field.
- Runs animate in fast waves, not as a loading spinner.
- Failed arks retain a tiny red fracture at the causal region.
- The lineage branch for that candidate stops and displays clustered reasons.

### Capability born

- All 64 counterfactual arks settle into warm light.
- A golden thread draws from the Fleet into the Memory Reef.
- The incomplete dendrite becomes a permanent organ.
- A short title appears: `POWER ACQUIRED`, followed by the exact born tool name.
- The Ark emits one low-frequency pulse; no confetti.

### Recovery

- The same agent invokes the new verb.
- A teal pathfinding pulse tests possible routes; rejected routes fade quickly.
- Selected programmable cells wake gold, regrow fibers, and connect the isolated region.
- Coolant packets travel through the actual chosen edges.
- Heat retreats cell by cell; rooms relight behind the wave.
- The Cryovault and reactor return below their hard limits.
- The camera pulls back only after the repaired topology is visible.
- Final state is warm, alive, and moving forward—not a green dashboard.

## 8. Interface anatomy

### Resting shell

The world owns the screen. Permanent UI is limited to:

- top-left mission: `KEEP THE ARK ALIVE`;
- top-center phase and Ark revision;
- top-right three critical vital values;
- bottom-left current system lens;
- bottom-right collapsed Capability Foundry status;
- a tiny WebMCP live indicator that confirms the native API without becoming sponsor-logo chrome.

### Sector inspector

A compact anchored card appears near the selection but moves away from important world geometry. It shows:

- sector/cell name;
- state and one-line function;
- exact relevant quantities;
- inbound/outbound network summary;
- causal history in three events maximum;
- the stable semantic ID returned by WebMCP.

It never offers canonical repair buttons. Human UI and agent authority follow the same boundary.

### Capability Foundry panel

The panel is a warm dark instrument tray, not a terminal.

It contains four vertically connected stages:

1. Prototype summary in readable pseudocode.
2. Compiler and hard-budget receipt.
3. Counterfactual Fleet and failure clusters.
4. Capability lineage and born-tool state.

Raw JSON is available behind `View ArkScript` for technical judges but is not the primary composition.

### Typography

- Display/title: Fraunces, used sparingly for Ark identity and major state transitions.
- Instrument/body: IBM Plex Sans.
- IDs, values, tool names, and program summaries: IBM Plex Mono.
- Fonts are bundled locally for demo reliability.
- Pixel lettering is limited to hand-drawn world signage and never used for paragraphs.

Minimum UI text is 13 CSS px; critical values and state changes use 16–22 px. Text contrast is tested independently of glow.

## 9. Motion grammar

Every animation must belong to one of four causes:

| Cause | Motion grammar |
|---|---|
| Living | Slow expansion/contraction, drift, irregular but bounded cycles |
| Flow | Directional packets, pressure pulse, edge-width response |
| Damage | Outward fracture, jitter, sparks following force direction |
| Learning | Inward gathering, branching growth, stable golden pulse |

Animations without a state cause are removed.

### Timing

- Hover/select: 100–180 ms.
- Panel transition: 220–320 ms.
- Camera sector move: 650–900 ms with interruptible easing.
- Validation wave across 64 arks: 1.4–2.2 s.
- Capability birth: 1.8–2.8 s.
- Full recovery: 4–7 s.
- Ambient biological cycles: 2.4–8 s, deliberately unsynchronized.

Reduced-motion mode replaces camera sweeps and particles with crossfades, edge highlights, and stepped state transitions.

## 10. Sound grammar

Sound is procedural and tied to truth:

- Sunwell energy: low warm pulse.
- Coolant: filtered water/glass texture whose rate tracks total flow.
- Atmosphere: soft breath/noise layer.
- Damage: short dry ceramic crack and unstable beating interval.
- Validation: 64 quiet ticks grouped into waves, not arcade beeps.
- Capability birth: unresolved interval gathers into a warm resolved chord.
- Recovery: spatially traveling chime follows repaired sectors.

There is no constant dramatic soundtrack. Silence and the return of a healthy Ark rhythm make the transformation more powerful.

## 11. Asset pipeline

1. Keep the moodframe as composition and material reference only.
2. Author a locked indexed palette and three light ramps.
3. Build the whole-Ark silhouette and sector masks first.
4. Create one complete vertical slice: Sunwell, Thermal Choir, and one damaged Hull Skin region.
5. Validate macro, sector, and cell zoom before expanding asset count.
6. Author modular 16 × 16 tiles, 32 × 32 organs, and 4-frame ambient loops.
7. Build networks and state overlays in code so they always match simulation truth.
8. Pack stable art into texture atlases; keep high-count effects in dedicated atlases/particle containers.
9. Run palette, stray-alpha, frame-size, duplicate, and nearest-neighbor checks during build.
10. Capture golden screenshots at all six visual states after every major art pass.

Generated art may accelerate exploration, but every shipped sprite must be original, palette-constrained, grid-aligned, and visually inspected. No reference-game assets or stock spaceship tiles enter the repository.

## 12. Visual quality gates

The build does not pass visual review unless:

1. A new viewer can point to the failing region within two seconds.
2. The Ark reads as alive before any text appears.
3. The silhouette remains identifiable at thumbnail size.
4. Thermal, energy, atmosphere, and structure lenses are distinguishable without relying only on hue.
5. The repaired path can be traced from source to endangered sector.
6. The 64-world validation reads as many executable worlds, not decorative cards.
7. Tool birth changes the world itself, not only a toast or log.
8. The interface stays subordinate to the Ark.
9. A still image from calm, critical, and recovered states is clearly different.
10. No screen resembles a generic neon SaaS dashboard, terminal, or existing spaceship-management game.

## 13. Immediate vertical-slice target

Before building the full ship, create one fully polished 30-second slice:

1. Whole-Ark macro view with ambient life.
2. Camera descends into Thermal Choir.
3. Ion fracture propagates toward Cryovault.
4. System lens exposes the broken component.
5. Counterfactual Fleet falsifies one candidate and certifies the next.
6. Capability organ grows in Memory Reef.
7. Born tool invocation regrows a real path and cools the target.
8. Camera returns to a stable, breathing Ark.

If this slice is not beautiful and causally readable, adding more sectors or tools is forbidden. Quality multiplies from the vertical slice; it cannot be rescued by scale.

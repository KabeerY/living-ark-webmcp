# Living Ark verification record

This file records a real native-browser execution, not expected or mocked output.

## Automated checks

Run on 2026-09-04:

```text
npm run build
✓ 846 modules transformed
✓ production bundle built

npm test -- --run
✓ 5 test files
✓ 16 tests
```

The tests cover deterministic world generation, interpreter isolation, validation, certificate integrity, forged-report rejection, tool lifecycle cleanup, frozen born-tool arguments, canonical recovery, repeat-invocation idempotence, and replay-receipt tamper detection. The reference strategy also passed four disjoint 64-world Fleets: 256 additional worlds, each with an independent deterministic replay.

## Native WebMCP browser run

Host: Codex in-app browser with native WebMCP support  
Origin: `http://127.0.0.1:4175`  
Run date: 2026-09-04

### 1. Initial canonical world

```text
revision                    1
state hash                  d45f29e8
phase                       critical
fractured edges             127
critical cells > 85°C       5
all cells > 85°C            28
critical peak               110.488°C
coolant                     18437.54113019537
```

The browser discovered eight native WebMCP tools.

### 2. Plausible but local policy

The first candidate used only active thermal paths and local reservoirs.

```text
visible preview             0 / 8
sealed Fleet                5 / 64
largest failure cluster     critical cell overheated: 58 worlds
authority granted           false
canonical revision          unchanged
canonical hash              unchanged
```

The exact hidden Fleet fingerprint for this run was `9821d855`. A new random sealed suite is created per page session.

### 3. Generalized revision

The child revision used physical-component search, bounded fracture regrowth, high-coolant sources, and lexicographic criticality/temperature ordering.

```text
visible preview             8 / 8
sealed Fleet                64 / 64
delayed horizon             12 / 12 stable ticks
authority granted           true
born tool                   stabilize_thermal_mesh_v2
certificate                 cert:5da944cb
validation digest           d6650040
canonical state changed     false
```

The live catalog changed from eight to nine tools without a refresh or reconnect.

### 4. Authority tamper test

Calling the born tool with `{ "targetTemperature": 82 }` was rejected:

```text
Certified born tools do not accept parameter overrides.
```

The canonical revision and hash remained unchanged.

### 5. Canonical execution

The same browser-agent session invoked `stabilize_thermal_mesh_v2` with its empty input object.

```text
revision                    1 → 2
state hash                  d45f29e8 → 7af73af9
phase                       critical → stable
fractured edges             127 → 112
critical cells > 85°C       5 → 0
critical peak               110.488°C → 61.731°C
all cells > 85°C            28 → 1
coolant                     18437.54113019537 → 18437.54113019537
fibers regrown              78
coolant moved               531.965
material used               515 / 520
delayed stability           12 / 12 ticks
```

The one remaining globally hot cell was non-critical. The certified hard invariant is explicitly critical-system safety; the global and critical metrics are kept separate in tools and UI.

### 6. Repeat invocation

A second invocation returned `alreadyStable: true`, `canonicalArkChanged: false`, zero operations, and the same revision/hash. The stabilized world was not mutated again.

## Visual correspondence

During the 2.9-second recovery sweep:

- the Foundry automatically clears the world view;
- changed edges reveal progressively rather than all at once;
- coolant packets move along active thermal routes;
- heat motes retreat from the threatened cells;
- the damaged Thermal Choir art is replaced only after canonical phase becomes `stable`;
- the crisis card, mission bar, vital metrics, capability dock, revision, and hash all update from the same snapshot.

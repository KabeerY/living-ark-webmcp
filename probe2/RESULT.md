# Fatal Probe 02 — PASS

Date: 2026-09-03  
Host: Codex in-app browser with native WebMCP support  
Page: top-level `http://localhost:4174/`  
Hidden-suite fingerprint shown by page: `eafe3854263e…`  
Refresh/reconnect during trajectory: none

## Question

Can a browsing agent author a capability that did not previously exist, have a
live page safely compile and falsify it across hidden executable worlds, revise
it from failure evidence, earn a new WebMCP verb, discover that verb in the same
session, and use it to transform canonical page state?

## Initial authority boundary

The initial live tool catalog contained exactly:

- `inspect_energy_world`
- `read_capability_language`
- `define_energy_capability`
- `validate_energy_capability`

There was no energy-balancing tool, generic program executor, primitive per-cell
mutation tool, or arbitrary-JavaScript path. `define_energy_capability` could
only compile and store inert candidates. Only a 64/64 validation result could
grant canonical execution authority by registering a new tool.

## Observed trajectory

1. The agent inspected the unstable canonical world: 49 connected cells, five
   cells below reserve 20, deficit 75, surplus 90, total energy 995.
2. The agent read the complete bounded JSON IR grammar and validation contract.
3. The agent authored `balance_energy_network_v1`, an adjacent-donor strategy
   with one bounded donor attempt per receiver.
4. Static compilation accepted 27 whitelisted AST nodes and 1,377 serialized
   bytes. The candidate still had no canonical execution authority.
5. The sealed evaluator falsified v1 on every hidden world: **0/64**. Energy
   remained deterministic, conserved, non-negative, and inside runtime budgets;
   the failure was specifically an inability to reach surplus elsewhere in the
   connected component.
6. From that failure evidence, the agent authored v2. It expanded donor search
   from `adjacent` to `same_component` and repeated donor selection under a hard
   64-iteration bound until each receiver was satisfied or no donor remained.
7. Static compilation accepted v2 as 27 whitelisted AST nodes and 1,433 bytes.
8. v2 passed **64/64** sealed hidden worlds, including stability, exact energy
   conservation, non-negativity, deterministic replay, and runtime budgets.
9. Only after that result, the page dynamically registered
   `balance_energy_network_v2` with a typed `minimumReserve` parameter.
10. The active browser notified the same agent trajectory that its tool catalog
    had changed; the new tool appeared alongside the four original tools.
11. Without refresh or reconnection, the same agent invoked the born tool with
    `minimumReserve: 20`.
12. The born capability made six semantic transfers, moved exactly 75 energy,
    conserved the total at 995, and transformed canonical stability from 44/49
    to **49/49** cells.

## Final born-tool result

```json
{
  "tool": "balance_energy_network_v2",
  "invocation": 1,
  "runtime": {
    "operations": 1141,
    "transfers": 6,
    "energyMoved": 75
  },
  "before": {
    "cellsBelowReserve": 5,
    "totalDeficit": 75,
    "totalEnergy": 995,
    "stable": false
  },
  "after": {
    "cellsBelowReserve": 0,
    "totalDeficit": 0,
    "totalEnergy": 995,
    "stable": true
  },
  "gate2Pass": true
}
```

## Independent engine checks

`node probe2/engine.test.mjs` produced:

```json
{
  "weak": "0/64",
  "generalized": "64/64",
  "canonicalStable": true,
  "canonicalTransfers": 6,
  "unsafeProgramRejected": true
}
```

## What this proves

The entire proposed causal mechanism executed in a real native WebMCP page:

```text
WORLD GAP
→ AGENT-AUTHORED SAFE IR
→ HIDDEN-WORLD FALSIFICATION
→ AGENT REVISION
→ GENERALIZATION PROOF
→ DYNAMIC WEBMCP TOOL BIRTH
→ SAME-SESSION DISCOVERY
→ BORN-TOOL INVOCATION
→ VISIBLE CANONICAL TRANSFORMATION
```

## Evidence boundary

This was a mechanism-validation experiment, not an independent model benchmark.
The same Codex task implemented the safe interpreter and later acted as the
browsing agent, so it knew the public grammar and evaluator family. The exact 64
hidden seeds were generated cryptographically after page load and were never
exposed through the agent tools; v1 was genuinely rejected and v2 was revised
from returned diagnostics.

Before claiming model-general autonomous invention, repeat the mission with a
fresh agent that has not seen the source and in the exact ChatGPT Site Tools
release used for judging. The current result is sufficient to establish that
the complete WebMCP mechanism is executable rather than speculative.

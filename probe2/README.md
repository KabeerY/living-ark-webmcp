# Fatal Probe 02 — verified capability genesis

This probe tests the complete candidate mechanism beyond dynamic registration:

1. A live world lacks an energy-balancing action.
2. The browsing agent reads a constrained JSON capability language.
3. The agent authors a program; no application code generates it.
4. A safe compiler rejects unknown operations, keys, unbounded loops, undeclared
   parameters, oversized ASTs, and unsafe identifiers.
5. The browser executes the program across 64 sealed, randomized hidden worlds.
6. Weak programs receive failure diagnostics and must be revised.
7. Only a 64/64 deterministic, conserving, non-negative program becomes a new
   versioned WebMCP tool.
8. The same agent must discover and invoke the born tool without refresh.
9. The canonical 7x7 world must visibly stabilize.

No arbitrary JavaScript, `eval`, network access, DOM access, generic program
executor, or pre-authored balancing tool is available.

## Run

```sh
python3 -m http.server 4174 --directory probe2
```

Then open `http://localhost:4174/` in a browser with native WebMCP support and
send the one-turn mission printed on the page.

## Pass boundary

The page must record:

- at least one `CANDIDATE_COMPILED` event;
- a `CANDIDATE_FALSIFIED` or validation attempt;
- `GENERALIZATION_PROVED` with 64/64 hidden worlds;
- `CAPABILITY_BORN` after validation, never before;
- `BORN_TOOL_USED` in the same page session;
- final canonical stability of 49/49 cells.

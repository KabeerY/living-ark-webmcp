# Fatal Probe 01 — PASS

Date: 2026-09-03  
Host: Codex in-app browser with native WebMCP support  
Page: top-level `http://localhost:4173/`  
Refresh/reconnect between calls: none

## Question

Can one browsing-agent trajectory invoke an existing WebMCP tool, receive a
live tool-catalog update caused by that invocation, and then invoke the newly
registered tool against the same page state?

## Observed sequence

1. The browser detected native `document.modelContext`; the page installed no
   polyfill.
2. The initial catalog contained exactly:
   - `inspect_dynamic_tool_probe`
   - `birth_increment_capability`
3. The agent invoked `birth_increment_capability`.
4. Its handler registered a separate typed tool named
   `increment_world_by_7`.
5. Without a reload or reconnection, the browser notified the same active
   agent trajectory that the catalog now contained all three tools.
6. The agent fetched the changed catalog and invoked
   `increment_world_by_7`.
7. The new tool changed the canonical browser-side world value from `0` to
   `7`.
8. The page rendered `PASS` and recorded both tool invocations plus the tool
   birth in its event log.

## Tool results

Birth result:

```json
{
  "created": true,
  "registeredTool": "increment_world_by_7",
  "nextRequiredAction": "invoke_the_newly_registered_tool_in_this_same_session",
  "refreshAllowed": false,
  "expectedWorldValueAfterOneInvocation": 7
}
```

Born-tool result:

```json
{
  "tool": "increment_world_by_7",
  "worldValue": 7,
  "bornToolInvocations": 1,
  "proof": "same_session_born_tool_invoked"
}
```

## Verdict boundary

This passes the browser primitive on the tested integrated WebMCP host:
same-page, same-session dynamic discovery and invocation work.

It does **not** yet prove the larger product thesis. The tool implementation in
this probe is intentionally pre-authored. Separate gates remain for agent-authored
safe capability IR, generalization testing, and a world whose transformation has
real emotional and judge-facing force.

Before final submission, repeat this exact probe once in the precise ChatGPT
Site Tools release/build used for judging if it differs from the tested host.

# WebMCP same-session dynamic-tool probe

This is a deliberately tiny fatal probe for one browser behavior:

1. ChatGPT discovers the initial `birth_increment_capability` tool.
2. Calling it registers a new `increment_world_by_7` tool at runtime.
3. Without a page refresh, reconnection, or new conversation, the same ChatGPT
   turn discovers and invokes the born tool.
4. The browser-side canonical value changes from `0` to `7`.

The page does not install a WebMCP polyfill. Seeing `Native WebMCP: AVAILABLE`
therefore confirms that the host browser supplied `document.modelContext`.

## Run

```sh
python3 -m http.server 4173 --directory probe
```

Open `http://localhost:4173/` in ChatGPT's supported in-app browser and send the
exact one-turn prompt displayed by the page.

## Verdict

- **PASS:** the event log contains `TOOL_EXECUTED birth_increment_capability`,
  `TOOL_BORN increment_world_by_7`, and then `TOOL_EXECUTED
  increment_world_by_7`; the world value is exactly `7`.
- **HALFWAY:** the new tool registered but ChatGPT did not invoke it in the same
  turn/session.
- **FAIL/UNAVAILABLE:** the native API is absent, registration errors, or a
  refresh/reconnection is required before invocation.

const state = {
  worldValue: 0,
  capabilityBorn: false,
  birthInvocations: 0,
  bornToolInvocations: 0,
  toolChangeEvents: 0,
  events: [],
};

const ui = {
  apiStatus: document.querySelector("#api-status"),
  apiDetail: document.querySelector("#api-detail"),
  toolStatus: document.querySelector("#tool-status"),
  worldValue: document.querySelector("#world-value"),
  verdict: document.querySelector("#verdict"),
  verdictDetail: document.querySelector("#verdict-detail"),
  eventLog: document.querySelector("#event-log"),
  copyPrompt: document.querySelector("#copy-prompt"),
  testPrompt: document.querySelector("#test-prompt"),
  downloadLog: document.querySelector("#download-log"),
};

function logEvent(type, message, data = {}) {
  const entry = {
    sequence: state.events.length + 1,
    timestamp: new Date().toISOString(),
    type,
    message,
    data,
  };

  state.events.push(entry);
  const item = document.createElement("li");
  item.innerHTML = `
    <span class="event-sequence">${String(entry.sequence).padStart(2, "0")}</span>
    <span class="event-type">${type}</span>
    <span class="event-message"></span>
    <time>${entry.timestamp.slice(11, 23)}</time>
  `;
  item.querySelector(".event-message").textContent = message;
  ui.eventLog.append(item);
  item.scrollIntoView({ block: "nearest" });
}

function render() {
  ui.toolStatus.textContent = state.capabilityBorn ? "REGISTERED" : "ABSENT";
  ui.toolStatus.className = `value ${state.capabilityBorn ? "success" : ""}`;
  ui.worldValue.textContent = String(state.worldValue);

  if (state.bornToolInvocations > 0 && state.worldValue === 7) {
    ui.verdict.textContent = "PASS";
    ui.verdict.className = "value success";
    ui.verdictDetail.textContent = "The born tool executed and mutated canonical state";
  } else if (state.capabilityBorn) {
    ui.verdict.textContent = "HALFWAY";
    ui.verdict.className = "value warning";
    ui.verdictDetail.textContent = "Tool registered; waiting for same-session invocation";
  } else if (state.birthInvocations > 0) {
    ui.verdict.textContent = "ERROR";
    ui.verdict.className = "value failure";
    ui.verdictDetail.textContent = "Birth was invoked but registration did not complete";
  }
}

function result(text, structuredContent) {
  return {
    content: [{ type: "text", text }],
    structuredContent,
  };
}

async function waitForNativeModelContext(timeoutMs = 10000) {
  const startedAt = performance.now();

  while (performance.now() - startedAt < timeoutMs) {
    if (document.modelContext?.registerTool) {
      return document.modelContext;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Native document.modelContext was not found within 10 seconds.");
}

async function registerBornCapability(modelContext) {
  if (state.capabilityBorn) {
    return false;
  }

  await modelContext.registerTool({
    name: "increment_world_by_7",
    title: "Increment canonical world by seven",
    description:
      "A capability born during this live session. Invoke exactly once to add 7 to the canonical world value and prove same-session dynamic WebMCP tool discovery.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
    },
    execute() {
      state.bornToolInvocations += 1;
      state.worldValue += 7;
      logEvent("TOOL_EXECUTED", "Born tool increment_world_by_7 changed the world", {
        invocation: state.bornToolInvocations,
        worldValue: state.worldValue,
      });
      render();

      return result(`Born capability executed. Canonical world value is now ${state.worldValue}.`, {
        tool: "increment_world_by_7",
        worldValue: state.worldValue,
        bornToolInvocations: state.bornToolInvocations,
        proof: "same_session_born_tool_invoked",
      });
    },
  });

  state.capabilityBorn = true;
  logEvent("TOOL_BORN", "Registered new page-native tool increment_world_by_7", {
    tool: "increment_world_by_7",
    birthInvocation: state.birthInvocations,
  });
  render();
  return true;
}

async function initialize() {
  logEvent("PAGE_LOADED", "Probe page loaded; no born capability exists");

  try {
    const modelContext = await waitForNativeModelContext();
    ui.apiStatus.textContent = "AVAILABLE";
    ui.apiStatus.className = "value success";
    ui.apiDetail.textContent = "Native document.modelContext detected; no polyfill installed";
    logEvent("API_DETECTED", "Native document.modelContext.registerTool is available");

    modelContext.addEventListener?.("toolchange", () => {
      state.toolChangeEvents += 1;
      logEvent("TOOLCHANGE", "document.modelContext emitted toolchange", {
        count: state.toolChangeEvents,
      });
    });

    await modelContext.registerTool({
      name: "inspect_dynamic_tool_probe",
      title: "Inspect dynamic tool probe",
      description:
        "Read the current state of the same-session dynamic WebMCP tool-birth probe, including whether the born tool exists and whether it has executed.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
      },
      execute() {
        logEvent("TOOL_EXECUTED", "Initial tool inspect_dynamic_tool_probe read probe state");
        return result(
          `Capability born: ${state.capabilityBorn}. World value: ${state.worldValue}. Born-tool invocations: ${state.bornToolInvocations}.`,
          {
            capabilityBorn: state.capabilityBorn,
            worldValue: state.worldValue,
            birthInvocations: state.birthInvocations,
            bornToolInvocations: state.bornToolInvocations,
            toolChangeEvents: state.toolChangeEvents,
          },
        );
      },
    });

    await modelContext.registerTool({
      name: "birth_increment_capability",
      title: "Birth increment capability",
      description:
        "Register a genuinely new page-native WebMCP tool named increment_world_by_7 during this live session. After this returns, immediately discover and invoke that new tool without refreshing or reconnecting.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
      },
      async execute() {
        state.birthInvocations += 1;
        logEvent("TOOL_EXECUTED", "Initial tool birth_increment_capability was invoked", {
          invocation: state.birthInvocations,
        });

        const created = await registerBornCapability(modelContext);
        return result(
          created
            ? "Created and registered increment_world_by_7. This is now a separate WebMCP tool; invoke it immediately without refreshing the page or beginning a new conversation."
            : "increment_world_by_7 was already registered. Invoke that separate tool now.",
          {
            created,
            registeredTool: "increment_world_by_7",
            nextRequiredAction: "invoke_the_newly_registered_tool_in_this_same_session",
            refreshAllowed: false,
            expectedWorldValueAfterOneInvocation: 7,
          },
        );
      },
    });

    logEvent("INITIAL_TOOLS_READY", "Registered the two initial probe tools", {
      tools: ["inspect_dynamic_tool_probe", "birth_increment_capability"],
    });
  } catch (error) {
    ui.apiStatus.textContent = "UNAVAILABLE";
    ui.apiStatus.className = "value failure";
    ui.apiDetail.textContent = error.message;
    logEvent("FATAL_ERROR", error.message, { stack: error.stack });
  }
}

ui.copyPrompt.addEventListener("click", async () => {
  await navigator.clipboard.writeText(ui.testPrompt.textContent.trim());
  const previous = ui.copyPrompt.textContent;
  ui.copyPrompt.textContent = "Copied";
  setTimeout(() => {
    ui.copyPrompt.textContent = previous;
  }, 1200);
});

ui.downloadLog.addEventListener("click", () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    location: window.location.href,
    state: {
      worldValue: state.worldValue,
      capabilityBorn: state.capabilityBorn,
      birthInvocations: state.birthInvocations,
      bornToolInvocations: state.bornToolInvocations,
      toolChangeEvents: state.toolChangeEvents,
    },
    events: state.events,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "webmcp-same-session-probe.json";
  anchor.click();
  URL.revokeObjectURL(url);
});

render();
initialize();

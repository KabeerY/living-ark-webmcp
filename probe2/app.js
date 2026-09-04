import {
  cloneWorld,
  compileCapability,
  createCanonicalWorld,
  createHiddenSuite,
  executeCapability,
  summarizeWorld,
  validateCapability,
} from "./engine.mjs";

const state = {
  canonicalWorld: createCanonicalWorld(),
  hiddenSeeds: Array.from(crypto.getRandomValues(new Uint32Array(64))),
  hiddenSuite: null,
  suiteFingerprint: "pending",
  candidates: [],
  bornToolName: null,
  bornCandidateId: null,
  bornToolInvocations: 0,
  events: [],
  modelContext: null,
};

state.hiddenSuite = createHiddenSuite(state.hiddenSeeds);

const ui = {
  apiDot: document.querySelector("#api-dot"),
  apiStatus: document.querySelector("#api-status"),
  stabilityValue: document.querySelector("#stability-value"),
  stabilityDetail: document.querySelector("#stability-detail"),
  candidateCount: document.querySelector("#candidate-count"),
  suiteFingerprint: document.querySelector("#suite-fingerprint"),
  bornTool: document.querySelector("#born-tool"),
  bornToolDetail: document.querySelector("#born-tool-detail"),
  verdict: document.querySelector("#verdict"),
  verdictDetail: document.querySelector("#verdict-detail"),
  energyGrid: document.querySelector("#energy-grid"),
  candidateList: document.querySelector("#candidate-list"),
  eventLog: document.querySelector("#event-log"),
  missionPrompt: document.querySelector("#mission-prompt"),
  copyPrompt: document.querySelector("#copy-prompt"),
  downloadEvidence: document.querySelector("#download-evidence"),
};

function callResult(text, structuredContent) {
  return {
    content: [{ type: "text", text }],
    structuredContent,
  };
}

function addEvent(type, message, data = {}) {
  const event = {
    sequence: state.events.length + 1,
    timestamp: new Date().toISOString(),
    type,
    message,
    data,
  };
  state.events.push(event);
  const row = document.createElement("li");
  row.innerHTML = `
    <span class="sequence">${String(event.sequence).padStart(2, "0")}</span>
    <span class="event-type">${event.type}</span>
    <span class="event-message"></span>
    <time>${event.timestamp.slice(11, 23)}</time>
  `;
  row.querySelector(".event-message").textContent = message;
  ui.eventLog.append(row);
}

function energyClass(energy, reserve) {
  if (energy < reserve) return "deficit";
  if (energy > reserve) return "surplus";
  return "reserve";
}

function renderGrid() {
  ui.energyGrid.style.setProperty("--columns", state.canonicalWorld.width);
  ui.energyGrid.replaceChildren();
  for (const cell of state.canonicalWorld.cells) {
    const node = document.createElement("div");
    node.className = `energy-cell ${energyClass(cell.energy, state.canonicalWorld.targetReserve)}`;
    node.dataset.cellId = String(cell.id);
    node.innerHTML = `<span>${cell.id}</span><strong>${Math.round(cell.energy * 100) / 100}</strong>`;
    ui.energyGrid.append(node);
  }
}

function renderCandidates() {
  ui.candidateCount.textContent = String(state.candidates.length);
  ui.candidateList.replaceChildren();
  if (state.candidates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Waiting for the agent's first program…";
    ui.candidateList.append(empty);
    return;
  }

  for (const candidate of state.candidates) {
    const article = document.createElement("article");
    const status = candidate.validation
      ? candidate.validation.passed
        ? "verified"
        : "failed"
      : "compiled";
    article.className = `candidate ${status}`;
    article.innerHTML = `
      <div class="candidate-topline">
        <span>${candidate.toolName}</span>
        <strong>${status.toUpperCase()}</strong>
      </div>
      <p></p>
      <div class="candidate-metrics">
        <span>${candidate.compileReport.astNodes} AST nodes</span>
        <span>${candidate.compileReport.serializedBytes} bytes</span>
        <span>${candidate.validation ? `${candidate.validation.passedCases}/${candidate.validation.totalCases} worlds` : "not tested"}</span>
      </div>
    `;
    article.querySelector("p").textContent = candidate.definition.description;
    ui.candidateList.append(article);
  }
}

function renderStatus() {
  const summary = summarizeWorld(state.canonicalWorld);
  const satisfied = summary.cellCount - summary.cellsBelowReserve;
  ui.stabilityValue.textContent = `${satisfied} / ${summary.cellCount}`;
  ui.stabilityDetail.textContent = summary.stable
    ? "all cells satisfy reserve"
    : `${summary.cellsBelowReserve} cells collapsing · ${summary.totalDeficit} deficit`;
  ui.bornTool.textContent = state.bornToolName ?? "NONE";
  ui.bornToolDetail.textContent = state.bornToolName ? "published into live tool catalog" : "requires 64 / 64";

  if (summary.stable && state.bornToolInvocations > 0) {
    ui.verdict.textContent = "PASS";
    ui.verdict.className = "success";
    ui.verdictDetail.textContent = "Born capability stabilized canonical state";
  } else if (state.bornToolName) {
    ui.verdict.textContent = "BORN";
    ui.verdict.className = "warning";
    ui.verdictDetail.textContent = "Waiting for same-session invocation";
  } else if (state.candidates.some((candidate) => candidate.validation?.passed === false)) {
    ui.verdict.textContent = "FALSIFIED";
    ui.verdict.className = "failure";
    ui.verdictDetail.textContent = "Weak candidate rejected; revision required";
  } else if (state.candidates.length > 0) {
    ui.verdict.textContent = "COMPILED";
    ui.verdict.className = "neutral";
    ui.verdictDetail.textContent = "Candidate awaits hidden-world validation";
  }
  renderGrid();
  renderCandidates();
}

async function fingerprintSeeds() {
  const bytes = new TextEncoder().encode(JSON.stringify(state.hiddenSeeds));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  state.suiteFingerprint = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  ui.suiteFingerprint.textContent = `sealed · ${state.suiteFingerprint.slice(0, 12)}`;
}

function parameterSchema(parameters) {
  return {
    type: "object",
    properties: Object.fromEntries(
      parameters.map((parameter) => [
        parameter.name,
        {
          type: "number",
          description: parameter.description,
          minimum: parameter.minimum,
          maximum: parameter.maximum,
        },
      ]),
    ),
    required: parameters.map((parameter) => parameter.name),
    additionalProperties: false,
  };
}

async function registerBornTool(candidate) {
  if (state.bornToolName) {
    throw new Error(`A capability has already been born as '${state.bornToolName}'.`);
  }

  await state.modelContext.registerTool({
    name: candidate.toolName,
    title: `Born capability: ${candidate.definition.name}`,
    description: `${candidate.definition.description} This tool was authored by the browsing agent and earned registration by passing 64 hidden deterministic worlds.`,
    inputSchema: parameterSchema(candidate.definition.parameters),
    annotations: { readOnlyHint: false },
    execute(args) {
      const before = summarizeWorld(state.canonicalWorld, args.minimumReserve);
      const runtime = executeCapability(state.canonicalWorld, candidate.compiled, args);
      const after = summarizeWorld(state.canonicalWorld, args.minimumReserve);
      state.bornToolInvocations += 1;
      addEvent("BORN_TOOL_USED", `${candidate.toolName} transformed the canonical live world`, {
        invocation: state.bornToolInvocations,
        before,
        after,
        runtime,
      });
      renderStatus();
      document.body.classList.add("world-transformed");
      return callResult(
        `${candidate.toolName} executed. ${after.cellsBelowReserve} cells remain below ${args.minimumReserve}; canonical stability is ${after.stable ? "ACHIEVED" : "NOT ACHIEVED"}.`,
        {
          tool: candidate.toolName,
          invocation: state.bornToolInvocations,
          before,
          after,
          runtime: {
            operations: runtime.operations,
            transfers: runtime.transfers,
            energyMoved: runtime.energyMoved,
          },
          gate2Pass: after.stable,
        },
      );
    },
  });

  state.bornToolName = candidate.toolName;
  state.bornCandidateId = candidate.id;
  addEvent("CAPABILITY_BORN", `${candidate.toolName} entered the live WebMCP tool catalog`, {
    candidateId: candidate.id,
    validation: candidate.validation,
  });
  renderStatus();
}

function nextVersion(name) {
  return state.candidates.filter((candidate) => candidate.definition.name === name).length + 1;
}

function languageReference() {
  return {
    purpose:
      "Author a reusable energy-redistribution algorithm. The safe interpreter can inspect semantic cells, search donors through topology, loop with hard limits, and transfer energy. It cannot execute JavaScript, access DOM/network/storage, or invoke arbitrary functions.",
    capabilityShape: {
      name: "snake_case identifier",
      description: "12–320 characters",
      parameters: [
        {
          name: "minimumReserve",
          type: "number",
          minimum: 1,
          maximum: 50,
          description: "Requested energy floor for every cell",
        },
      ],
      program: { op: "sequence", steps: ["statement", "..."] },
    },
    statements: {
      sequence: { op: "sequence", steps: ["statement"] },
      for_each_receiver: {
        op: "for_each_receiver",
        condition: "expression evaluated with ref receiver",
        order: "energy_asc | id_asc",
        body: "statement",
      },
      while: {
        op: "while",
        condition: "expression",
        maxIterations: "integer 1–64",
        body: "statement",
      },
      let: { op: "let", name: "variable_name", value: "expression" },
      break_if_null: { op: "break_if_null", value: "expression" },
      transfer: { op: "transfer", from: "cell expression", to: "cell expression", amount: "numeric expression" },
    },
    expressions: {
      param: { op: "param", name: "declared_parameter" },
      field: { op: "field", ref: "receiver | cell | variable_name", field: "energy | id | x | y" },
      reference: { op: "ref", name: "receiver | cell | variable_name" },
      variable: { op: "var", name: "variable_name" },
      binary: { op: "add | sub | lt | lte | gt | gte | eq", left: "expression", right: "expression" },
      aggregate: { op: "min | max", values: ["expression", "..."] },
      select_donor: {
        op: "select_donor",
        receiverRef: "receiver",
        scope: "adjacent | same_component",
        condition: "expression evaluated with ref cell plus receiver",
        order: "surplus_desc | distance_asc",
      },
    },
    runtimeLimits: {
      arbitraryJavaScript: false,
      networkAccess: false,
      domAccess: false,
      loopsBounded: true,
      note: "Use break_if_null inside while when no eligible donor remains.",
    },
    validationContract: [
      "Every cell must reach minimumReserve.",
      "Total energy must be exactly conserved.",
      "No cell may become negative.",
      "Two executions on the same world must produce identical final state.",
      "The program must remain inside compile-time and runtime budgets.",
      "Passing threshold is 64/64 sealed hidden worlds.",
    ],
  };
}

async function waitForNativeModelContext(timeoutMs = 10_000) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (document.modelContext?.registerTool) return document.modelContext;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Native document.modelContext was not found within 10 seconds.");
}

async function initializeWebMCP() {
  addEvent("PAGE_LOADED", "Gate 2 loaded with a fresh sealed hidden suite");
  await fingerprintSeeds();

  try {
    state.modelContext = await waitForNativeModelContext();
    ui.apiDot.classList.add("available");
    ui.apiStatus.textContent = "Native WebMCP available · no polyfill";
    addEvent("API_DETECTED", "Native document.modelContext.registerTool is available");

    await state.modelContext.registerTool({
      name: "inspect_energy_world",
      title: "Inspect the unstable energy world",
      description:
        "Inspect the canonical live energy lattice, its topology, stability goal, deficit cells, and surplus cells. This tool cannot mutate the world.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute() {
        const summary = summarizeWorld(state.canonicalWorld);
        addEvent("WORLD_INSPECTED", "Agent inspected canonical energy state", summary);
        return callResult(
          `Canonical world has ${summary.cellCount} connected cells. ${summary.cellsBelowReserve} are below reserve ${summary.minimumReserve}; total deficit ${summary.totalDeficit}; total surplus ${summary.totalSurplus}. No balancing capability exists.`,
          {
            goal: "Every connected cell must hold at least minimumReserve while total energy is conserved and no energy becomes negative.",
            topology: "Undirected connected 7x7 lattice. Dynamic capabilities may reason over adjacency or full connected components.",
            ...summary,
          },
        );
      },
    });

    await state.modelContext.registerTool({
      name: "read_capability_language",
      title: "Read the safe capability language",
      description:
        "Return the complete whitelisted JSON IR grammar, execution limits, and hidden-world validation contract. Read this before authoring a capability.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute() {
        addEvent("LANGUAGE_READ", "Agent requested the bounded capability grammar");
        return callResult(
          "Returned the complete safe capability IR. Author a program using only these statements and expressions, then submit it to define_energy_capability.",
          languageReference(),
        );
      },
    });

    await state.modelContext.registerTool({
      name: "define_energy_capability",
      title: "Define a candidate energy capability",
      description:
        "Compile an agent-authored capability written in the page's safe JSON IR. This only stores a candidate; it cannot execute against canonical state and does not create a WebMCP tool until hidden validation passes.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Stable snake_case capability name." },
          description: { type: "string", description: "General behavior promised by this capability." },
          parameters: {
            type: "array",
            description: "Bounded numeric parameters used by the program.",
            items: { type: "object", additionalProperties: true },
          },
          program: {
            type: "object",
            description: "Program AST using only the grammar from read_capability_language.",
            additionalProperties: true,
          },
        },
        required: ["name", "description", "parameters", "program"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute(definition) {
        try {
          const compiled = compileCapability(definition);
          const version = nextVersion(definition.name);
          const candidate = {
            id: `candidate-${state.candidates.length + 1}`,
            version,
            toolName: `${definition.name}_v${version}`,
            ...compiled,
            compiled,
            authoredAt: new Date().toISOString(),
            validation: null,
          };
          state.candidates.push(candidate);
          addEvent("CANDIDATE_COMPILED", `${candidate.toolName} passed static safety compilation`, {
            candidateId: candidate.id,
            compileReport: candidate.compileReport,
          });
          renderStatus();
          return callResult(
            `${candidate.toolName} compiled safely but has no execution authority. Validate ${candidate.id} against the sealed suite next.`,
            {
              candidateId: candidate.id,
              candidateToolNameIfVerified: candidate.toolName,
              compileReport: candidate.compileReport,
              canonicalExecutionAllowed: false,
              nextRequiredAction: "call_validate_energy_capability",
            },
          );
        } catch (error) {
          addEvent("COMPILE_REJECTED", "Unsafe or invalid candidate rejected", { error: error.message });
          return { isError: true, ...callResult(`Candidate rejected by the safe compiler: ${error.message}`, { compiled: false, error: error.message }) };
        }
      },
    });

    await state.modelContext.registerTool({
      name: "validate_energy_capability",
      title: "Falsify a candidate on hidden worlds",
      description:
        "Run a compiled candidate across 64 sealed hidden energy worlds. Weak candidates receive aggregate failure diagnostics. A 64/64 candidate is automatically published as a genuinely new WebMCP tool.",
      inputSchema: {
        type: "object",
        properties: {
          candidateId: { type: "string", description: "Candidate id returned by define_energy_capability." },
        },
        required: ["candidateId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      async execute({ candidateId }) {
        const candidate = state.candidates.find((entry) => entry.id === candidateId);
        if (!candidate) {
          return { isError: true, ...callResult(`Unknown candidate '${candidateId}'.`, { candidateId, found: false }) };
        }
        if (candidate.validation) {
          return callResult(
            `${candidate.toolName} was already validated: ${candidate.validation.passedCases}/${candidate.validation.totalCases}.`,
            { candidateId, validation: candidate.validation, bornToolName: state.bornToolName },
          );
        }

        const validation = validateCapability(candidate.compiled, state.hiddenSuite);
        candidate.validation = validation;
        addEvent(
          validation.passed ? "GENERALIZATION_PROVED" : "CANDIDATE_FALSIFIED",
          `${candidate.toolName}: ${validation.passedCases}/${validation.totalCases} hidden worlds passed`,
          { candidateId, validation },
        );

        if (validation.passed) {
          await registerBornTool(candidate);
        }
        renderStatus();
        return callResult(
          validation.passed
            ? `${candidate.toolName} passed 64/64 sealed worlds and has been registered as a new live WebMCP tool. Discover and invoke ${candidate.toolName} now on the same page without refreshing.`
            : `${candidate.toolName} was falsified: ${validation.passedCases}/${validation.totalCases} hidden worlds passed. Use the diagnostics to author a revised candidate; do not retry the unchanged program.`,
          {
            candidateId,
            validation,
            registeredTool: validation.passed ? candidate.toolName : null,
            sameSessionInvocationRequired: validation.passed,
          },
        );
      },
    });

    addEvent("INITIAL_TOOLS_READY", "Published four primitive WebMCP tools; no balancing verb exists", {
      tools: [
        "inspect_energy_world",
        "read_capability_language",
        "define_energy_capability",
        "validate_energy_capability",
      ],
    });
  } catch (error) {
    ui.apiDot.classList.add("unavailable");
    ui.apiStatus.textContent = `WebMCP unavailable · ${error.message}`;
    addEvent("FATAL_ERROR", error.message, { stack: error.stack });
  }
}

ui.copyPrompt.addEventListener("click", async () => {
  await navigator.clipboard.writeText(ui.missionPrompt.textContent.trim());
  ui.copyPrompt.textContent = "Copied";
  setTimeout(() => {
    ui.copyPrompt.textContent = "Copy mission";
  }, 1200);
});

ui.downloadEvidence.addEventListener("click", () => {
  const exportState = {
    exportedAt: new Date().toISOString(),
    suiteFingerprint: state.suiteFingerprint,
    canonicalWorld: state.canonicalWorld,
    candidates: state.candidates.map(({ compiled, ...candidate }) => candidate),
    bornToolName: state.bornToolName,
    bornCandidateId: state.bornCandidateId,
    bornToolInvocations: state.bornToolInvocations,
    events: state.events,
  };
  const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "gate-2-verified-capability-genesis.json";
  anchor.click();
  URL.revokeObjectURL(url);
});

renderStatus();
initializeWebMCP();

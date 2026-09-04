export const ENGINE_LIMITS = Object.freeze({
  maxProgramBytes: 18_000,
  maxAstDepth: 14,
  maxAstNodes: 240,
  maxRuntimeOperations: 20_000,
  maxWhileIterations: 64,
  maxTransfers: 1_024,
});

const STATEMENT_OPS = new Set([
  "sequence",
  "for_each_receiver",
  "while",
  "let",
  "break_if_null",
  "transfer",
]);

const EXPRESSION_OPS = new Set([
  "param",
  "field",
  "ref",
  "var",
  "add",
  "sub",
  "min",
  "max",
  "lt",
  "lte",
  "gt",
  "gte",
  "eq",
  "select_donor",
]);

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertKnownKeys(node, keys, path) {
  for (const key of Object.keys(node)) {
    invariant(keys.includes(key), `${path} contains forbidden key '${key}'.`);
  }
}

function assertIdentifier(value, path) {
  invariant(
    typeof value === "string" && /^[A-Za-z][A-Za-z0-9_]{0,47}$/.test(value),
    `${path} must be a safe identifier of at most 48 characters.`,
  );
  invariant(!["__proto__", "constructor", "prototype"].includes(value), `${path} is forbidden.`);
}

function assertCapabilityName(value, path) {
  invariant(
    typeof value === "string" && /^[a-z][a-z0-9_]{0,47}$/.test(value),
    `${path} must match ^[a-z][a-z0-9_]{0,47}$.`,
  );
}

function validateExpression(expression, context, path, depth) {
  invariant(depth <= ENGINE_LIMITS.maxAstDepth, `${path} exceeds the AST depth budget.`);
  invariant(isPlainObject(expression), `${path} must be an expression object.`);
  invariant(EXPRESSION_OPS.has(expression.op), `${path}.op '${expression.op}' is not allowed.`);
  context.nodes += 1;
  invariant(context.nodes <= ENGINE_LIMITS.maxAstNodes, "Program exceeds the AST node budget.");

  switch (expression.op) {
    case "param":
      assertKnownKeys(expression, ["op", "name"], path);
      assertIdentifier(expression.name, `${path}.name`);
      invariant(context.parameters.has(expression.name), `${path} references undeclared parameter '${expression.name}'.`);
      return;

    case "field":
      assertKnownKeys(expression, ["op", "ref", "field"], path);
      assertIdentifier(expression.ref, `${path}.ref`);
      invariant(["energy", "id", "x", "y"].includes(expression.field), `${path}.field is not readable.`);
      return;

    case "ref":
    case "var":
      assertKnownKeys(expression, ["op", "name"], path);
      assertIdentifier(expression.name, `${path}.name`);
      return;

    case "add":
    case "sub":
    case "lt":
    case "lte":
    case "gt":
    case "gte":
    case "eq":
      assertKnownKeys(expression, ["op", "left", "right"], path);
      validateExpression(expression.left, context, `${path}.left`, depth + 1);
      validateExpression(expression.right, context, `${path}.right`, depth + 1);
      return;

    case "min":
    case "max":
      assertKnownKeys(expression, ["op", "values"], path);
      invariant(Array.isArray(expression.values) && expression.values.length >= 1 && expression.values.length <= 8, `${path}.values must contain 1–8 expressions.`);
      expression.values.forEach((value, index) =>
        validateExpression(value, context, `${path}.values[${index}]`, depth + 1),
      );
      return;

    case "select_donor":
      assertKnownKeys(expression, ["op", "receiverRef", "scope", "condition", "order"], path);
      assertIdentifier(expression.receiverRef, `${path}.receiverRef`);
      invariant(["adjacent", "same_component"].includes(expression.scope), `${path}.scope must be adjacent or same_component.`);
      invariant(["surplus_desc", "distance_asc"].includes(expression.order), `${path}.order is invalid.`);
      validateExpression(expression.condition, context, `${path}.condition`, depth + 1);
      return;
  }
}

function validateStatement(statement, context, path, depth) {
  invariant(depth <= ENGINE_LIMITS.maxAstDepth, `${path} exceeds the AST depth budget.`);
  invariant(isPlainObject(statement), `${path} must be a statement object.`);
  invariant(STATEMENT_OPS.has(statement.op), `${path}.op '${statement.op}' is not allowed.`);
  context.nodes += 1;
  invariant(context.nodes <= ENGINE_LIMITS.maxAstNodes, "Program exceeds the AST node budget.");

  switch (statement.op) {
    case "sequence":
      assertKnownKeys(statement, ["op", "steps"], path);
      invariant(Array.isArray(statement.steps) && statement.steps.length >= 1 && statement.steps.length <= 32, `${path}.steps must contain 1–32 statements.`);
      statement.steps.forEach((step, index) =>
        validateStatement(step, context, `${path}.steps[${index}]`, depth + 1),
      );
      return;

    case "for_each_receiver":
      assertKnownKeys(statement, ["op", "condition", "order", "body"], path);
      invariant(["energy_asc", "id_asc"].includes(statement.order), `${path}.order is invalid.`);
      validateExpression(statement.condition, context, `${path}.condition`, depth + 1);
      validateStatement(statement.body, context, `${path}.body`, depth + 1);
      return;

    case "while":
      assertKnownKeys(statement, ["op", "condition", "maxIterations", "body"], path);
      invariant(Number.isInteger(statement.maxIterations) && statement.maxIterations >= 1 && statement.maxIterations <= ENGINE_LIMITS.maxWhileIterations, `${path}.maxIterations must be 1–${ENGINE_LIMITS.maxWhileIterations}.`);
      validateExpression(statement.condition, context, `${path}.condition`, depth + 1);
      validateStatement(statement.body, context, `${path}.body`, depth + 1);
      return;

    case "let":
      assertKnownKeys(statement, ["op", "name", "value"], path);
      assertIdentifier(statement.name, `${path}.name`);
      validateExpression(statement.value, context, `${path}.value`, depth + 1);
      return;

    case "break_if_null":
      assertKnownKeys(statement, ["op", "value"], path);
      validateExpression(statement.value, context, `${path}.value`, depth + 1);
      return;

    case "transfer":
      assertKnownKeys(statement, ["op", "from", "to", "amount"], path);
      validateExpression(statement.from, context, `${path}.from`, depth + 1);
      validateExpression(statement.to, context, `${path}.to`, depth + 1);
      validateExpression(statement.amount, context, `${path}.amount`, depth + 1);
      return;
  }
}

export function compileCapability(definition) {
  invariant(isPlainObject(definition), "Capability definition must be an object.");
  assertKnownKeys(definition, ["name", "description", "parameters", "program"], "definition");
  assertCapabilityName(definition.name, "definition.name");
  invariant(typeof definition.description === "string" && definition.description.trim().length >= 12 && definition.description.length <= 320, "definition.description must contain 12–320 characters.");
  invariant(Array.isArray(definition.parameters) && definition.parameters.length >= 1 && definition.parameters.length <= 8, "definition.parameters must contain 1–8 entries.");

  const parameterNames = new Set();
  for (const [index, parameter] of definition.parameters.entries()) {
    invariant(isPlainObject(parameter), `definition.parameters[${index}] must be an object.`);
    assertKnownKeys(parameter, ["name", "description", "type", "minimum", "maximum"], `definition.parameters[${index}]`);
    assertIdentifier(parameter.name, `definition.parameters[${index}].name`);
    invariant(!parameterNames.has(parameter.name), `Duplicate parameter '${parameter.name}'.`);
    invariant(parameter.type === "number", `Only bounded number parameters are allowed.`);
    invariant(typeof parameter.description === "string" && parameter.description.length >= 6 && parameter.description.length <= 160, `Parameter '${parameter.name}' needs a 6–160 character description.`);
    invariant(Number.isFinite(parameter.minimum) && Number.isFinite(parameter.maximum) && parameter.minimum < parameter.maximum, `Parameter '${parameter.name}' needs finite minimum < maximum.`);
    parameterNames.add(parameter.name);
  }

  const serialized = JSON.stringify(definition);
  invariant(serialized.length <= ENGINE_LIMITS.maxProgramBytes, "Capability exceeds the serialized byte budget.");

  const context = { nodes: 0, parameters: parameterNames };
  validateStatement(definition.program, context, "definition.program", 0);

  return {
    definition: JSON.parse(serialized),
    compileReport: {
      safe: true,
      astNodes: context.nodes,
      serializedBytes: serialized.length,
      allowedStatementOps: [...STATEMENT_OPS],
      allowedExpressionOps: [...EXPRESSION_OPS],
    },
  };
}

export function cloneWorld(world) {
  return {
    ...world,
    cells: world.cells.map((cell) => ({ ...cell })),
    edges: world.edges.map((edge) => [...edge]),
  };
}

function makeGraph(world) {
  const neighbors = new Map(world.cells.map((cell) => [cell.id, []]));
  for (const [left, right] of world.edges) {
    neighbors.get(left)?.push(right);
    neighbors.get(right)?.push(left);
  }
  for (const adjacent of neighbors.values()) {
    adjacent.sort((a, b) => a - b);
  }
  return neighbors;
}

function shortestDistance(graph, start, target) {
  if (start === target) return 0;
  const queue = [[start, 0]];
  const seen = new Set([start]);
  for (let index = 0; index < queue.length; index += 1) {
    const [current, distance] = queue[index];
    for (const next of graph.get(current) ?? []) {
      if (next === target) return distance + 1;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([next, distance + 1]);
      }
    }
  }
  return Number.POSITIVE_INFINITY;
}

function componentFor(graph, start) {
  const queue = [start];
  const seen = new Set([start]);
  for (let index = 0; index < queue.length; index += 1) {
    for (const next of graph.get(queue[index]) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function valueFromRef(context, name) {
  if (Object.prototype.hasOwnProperty.call(context.refs, name)) return context.refs[name];
  if (Object.prototype.hasOwnProperty.call(context.vars, name)) return context.vars[name];
  return null;
}

function evaluateExpression(expression, context) {
  context.runtime.operations += 1;
  invariant(context.runtime.operations <= ENGINE_LIMITS.maxRuntimeOperations, "Runtime operation budget exceeded.");

  switch (expression.op) {
    case "param":
      return context.params[expression.name];
    case "field": {
      const ref = valueFromRef(context, expression.ref);
      return ref == null ? null : ref[expression.field];
    }
    case "ref":
      return valueFromRef(context, expression.name);
    case "var":
      return context.vars[expression.name] ?? null;
    case "add":
      return Number(evaluateExpression(expression.left, context)) + Number(evaluateExpression(expression.right, context));
    case "sub":
      return Number(evaluateExpression(expression.left, context)) - Number(evaluateExpression(expression.right, context));
    case "min":
      return Math.min(...expression.values.map((value) => Number(evaluateExpression(value, context))));
    case "max":
      return Math.max(...expression.values.map((value) => Number(evaluateExpression(value, context))));
    case "lt":
      return Number(evaluateExpression(expression.left, context)) < Number(evaluateExpression(expression.right, context));
    case "lte":
      return Number(evaluateExpression(expression.left, context)) <= Number(evaluateExpression(expression.right, context));
    case "gt":
      return Number(evaluateExpression(expression.left, context)) > Number(evaluateExpression(expression.right, context));
    case "gte":
      return Number(evaluateExpression(expression.left, context)) >= Number(evaluateExpression(expression.right, context));
    case "eq":
      return evaluateExpression(expression.left, context) === evaluateExpression(expression.right, context);
    case "select_donor": {
      const receiver = valueFromRef(context, expression.receiverRef);
      if (!receiver) return null;
      const allowedIds =
        expression.scope === "adjacent"
          ? new Set(context.graph.get(receiver.id) ?? [])
          : componentFor(context.graph, receiver.id);
      const candidates = context.world.cells.filter((cell) => {
        if (cell.id === receiver.id || !allowedIds.has(cell.id)) return false;
        const child = { ...context, refs: { ...context.refs, cell } };
        return Boolean(evaluateExpression(expression.condition, child));
      });
      if (expression.order === "surplus_desc") {
        const reserve = Number(context.params.minimumReserve ?? 0);
        candidates.sort((a, b) => b.energy - reserve - (a.energy - reserve) || a.id - b.id);
      } else {
        candidates.sort(
          (a, b) => shortestDistance(context.graph, receiver.id, a.id) - shortestDistance(context.graph, receiver.id, b.id) || a.id - b.id,
        );
      }
      return candidates[0] ?? null;
    }
    default:
      throw new Error(`Unsupported expression '${expression.op}'.`);
  }
}

function executeStatement(statement, context) {
  context.runtime.operations += 1;
  invariant(context.runtime.operations <= ENGINE_LIMITS.maxRuntimeOperations, "Runtime operation budget exceeded.");

  switch (statement.op) {
    case "sequence":
      for (const step of statement.steps) {
        const signal = executeStatement(step, context);
        if (signal) return signal;
      }
      return null;

    case "for_each_receiver": {
      const receivers = context.world.cells.filter((cell) =>
        Boolean(evaluateExpression(statement.condition, { ...context, refs: { ...context.refs, receiver: cell } })),
      );
      if (statement.order === "energy_asc") {
        receivers.sort((a, b) => a.energy - b.energy || a.id - b.id);
      } else {
        receivers.sort((a, b) => a.id - b.id);
      }
      for (const receiver of receivers) {
        const child = {
          ...context,
          refs: { ...context.refs, receiver },
          vars: { ...context.vars },
        };
        const signal = executeStatement(statement.body, child);
        if (signal) return signal;
      }
      return null;
    }

    case "while": {
      for (let iteration = 0; iteration < statement.maxIterations; iteration += 1) {
        if (!evaluateExpression(statement.condition, context)) return null;
        const signal = executeStatement(statement.body, context);
        if (signal === "break") return null;
      }
      return null;
    }

    case "let":
      context.vars[statement.name] = evaluateExpression(statement.value, context);
      return null;

    case "break_if_null":
      return evaluateExpression(statement.value, context) == null ? "break" : null;

    case "transfer": {
      const from = evaluateExpression(statement.from, context);
      const to = evaluateExpression(statement.to, context);
      const requested = Number(evaluateExpression(statement.amount, context));
      invariant(from && to && from !== to, "Transfer needs distinct existing cells.");
      invariant(Number.isFinite(requested) && requested >= 0, "Transfer amount must be finite and non-negative.");
      invariant(context.runtime.transfers < ENGINE_LIMITS.maxTransfers, "Transfer budget exceeded.");
      const amount = Math.min(requested, from.energy);
      from.energy -= amount;
      to.energy += amount;
      context.runtime.transfers += 1;
      context.runtime.energyMoved += amount;
      context.runtime.trace.push({ from: from.id, to: to.id, amount });
      return null;
    }

    default:
      throw new Error(`Unsupported statement '${statement.op}'.`);
  }
}

export function executeCapability(world, compiledCapability, params) {
  const definition = compiledCapability.definition ?? compiledCapability;
  for (const parameter of definition.parameters) {
    const value = params[parameter.name];
    invariant(typeof value === "number" && Number.isFinite(value), `Parameter '${parameter.name}' must be a finite number.`);
    invariant(value >= parameter.minimum && value <= parameter.maximum, `Parameter '${parameter.name}' must be between ${parameter.minimum} and ${parameter.maximum}.`);
  }

  const runtime = { operations: 0, transfers: 0, energyMoved: 0, trace: [] };
  const context = {
    world,
    params,
    refs: {},
    vars: {},
    graph: makeGraph(world),
    runtime,
  };
  executeStatement(definition.program, context);
  return runtime;
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function graphDistance(world, left, right) {
  return shortestDistance(makeGraph(world), left, right);
}

export function createHiddenWorld(seed, index = 0) {
  const random = mulberry32(seed >>> 0);
  const width = 4 + Math.floor(random() * 5);
  const height = 4 + Math.floor(random() * 5);
  const minimumReserve = 12 + Math.floor(random() * 19);
  const cells = Array.from({ length: width * height }, (_, id) => ({
    id,
    x: id % width,
    y: Math.floor(id / width),
    energy: minimumReserve,
  }));

  const edges = [];
  const edgeKeys = new Set();
  const addEdge = (left, right) => {
    const key = left < right ? `${left}:${right}` : `${right}:${left}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      edges.push([left, right]);
    }
  };

  for (let id = 1; id < cells.length; id += 1) {
    const x = id % width;
    const parents = [];
    if (x > 0) parents.push(id - 1);
    if (id >= width) parents.push(id - width);
    addEdge(id, parents[Math.floor(random() * parents.length)]);
  }
  for (const cell of cells) {
    if (cell.x + 1 < width && random() < 0.34) addEdge(cell.id, cell.id + 1);
    if (cell.y + 1 < height && random() < 0.34) addEdge(cell.id, cell.id + width);
  }

  const world = {
    id: `hidden-${index + 1}`,
    width,
    height,
    targetReserve: minimumReserve,
    cells,
    edges,
  };
  const allIds = cells.map((cell) => cell.id);
  const receiverCount = 1 + Math.floor(random() * Math.min(5, Math.max(1, cells.length / 5)));
  const receiverIds = [];
  for (const candidate of shuffled(allIds, random)) {
    if (receiverIds.length >= receiverCount) break;
    if (receiverIds.every((existing) => graphDistance(world, existing, candidate) >= 2)) {
      receiverIds.push(candidate);
    }
  }
  if (receiverIds.length === 0) receiverIds.push(Math.floor(random() * cells.length));

  let totalDeficit = 0;
  for (const receiverId of receiverIds) {
    const deficit = 3 + Math.floor(random() * Math.max(4, minimumReserve - 3));
    cells[receiverId].energy -= deficit;
    totalDeficit += deficit;
  }

  const donorCandidates = allIds.filter(
    (id) => !receiverIds.includes(id) && receiverIds.every((receiverId) => graphDistance(world, receiverId, id) >= 2),
  );
  const donors = shuffled(donorCandidates.length ? donorCandidates : allIds.filter((id) => !receiverIds.includes(id)), random).slice(
    0,
    Math.min(1 + Math.floor(random() * 4), Math.max(1, donorCandidates.length)),
  );
  let remaining = totalDeficit + 2 + Math.floor(random() * 9);
  donors.forEach((donorId, donorIndex) => {
    const slots = donors.length - donorIndex;
    const share = donorIndex === donors.length - 1 ? remaining : Math.max(1, Math.floor(remaining / slots));
    cells[donorId].energy += share;
    remaining -= share;
  });

  return world;
}

export function createHiddenSuite(seeds) {
  return seeds.map((seed, index) => createHiddenWorld(seed, index));
}

export function createCanonicalWorld() {
  const width = 7;
  const height = 7;
  const reserve = 20;
  const cells = Array.from({ length: width * height }, (_, id) => ({
    id,
    x: id % width,
    y: Math.floor(id / width),
    energy: reserve,
  }));
  const edges = [];
  for (const cell of cells) {
    if (cell.x + 1 < width) edges.push([cell.id, cell.id + 1]);
    if (cell.y + 1 < height) edges.push([cell.id, cell.id + width]);
  }

  const deficits = new Map([
    [8, 3],
    [12, 7],
    [24, 1],
    [36, 5],
    [40, 9],
  ]);
  for (const [id, energy] of deficits) cells[id].energy = energy;

  const donors = new Map([
    [0, 45],
    [6, 45],
    [42, 45],
    [48, 35],
  ]);
  for (const [id, energy] of donors) cells[id].energy = energy;

  return {
    id: "canonical-live-world",
    width,
    height,
    targetReserve: reserve,
    cells,
    edges,
  };
}

export function summarizeWorld(world, reserve = world.targetReserve) {
  const below = world.cells.filter((cell) => cell.energy < reserve);
  const above = world.cells.filter((cell) => cell.energy > reserve);
  const totalEnergy = world.cells.reduce((sum, cell) => sum + cell.energy, 0);
  return {
    id: world.id,
    dimensions: `${world.width}x${world.height}`,
    cellCount: world.cells.length,
    edgeCount: world.edges.length,
    minimumReserve: reserve,
    totalEnergy,
    cellsBelowReserve: below.length,
    totalDeficit: below.reduce((sum, cell) => sum + (reserve - cell.energy), 0),
    surplusCells: above.length,
    totalSurplus: above.reduce((sum, cell) => sum + (cell.energy - reserve), 0),
    stable: below.length === 0,
    exceptionalCells: world.cells
      .filter((cell) => cell.energy !== reserve)
      .map(({ id, x, y, energy }) => ({ id, x, y, energy })),
  };
}

function sameEnergyState(left, right) {
  return left.cells.every((cell, index) => Math.abs(cell.energy - right.cells[index].energy) < 1e-9);
}

export function validateCapability(compiledCapability, suite) {
  const cases = [];
  for (const source of suite) {
    const first = cloneWorld(source);
    const second = cloneWorld(source);
    const beforeTotal = source.cells.reduce((sum, cell) => sum + cell.energy, 0);
    let firstRuntime;
    let secondRuntime;
    let executionError = null;
    try {
      const params = { minimumReserve: source.targetReserve };
      firstRuntime = executeCapability(first, compiledCapability, params);
      secondRuntime = executeCapability(second, compiledCapability, params);
    } catch (error) {
      executionError = error.message;
    }

    const afterTotal = first.cells.reduce((sum, cell) => sum + cell.energy, 0);
    const remaining = first.cells.filter((cell) => cell.energy < source.targetReserve);
    const nonNegative = first.cells.every((cell) => cell.energy >= -1e-9);
    const conserved = Math.abs(beforeTotal - afterTotal) < 1e-9;
    const deterministic = !executionError && sameEnergyState(first, second);
    const stable = !executionError && remaining.length === 0;
    const passed = stable && nonNegative && conserved && deterministic;
    cases.push({
      id: source.id,
      passed,
      executionError,
      stable,
      nonNegative,
      conserved,
      deterministic,
      remainingDeficitCells: remaining.length,
      remainingDeficit: remaining.reduce((sum, cell) => sum + (source.targetReserve - cell.energy), 0),
      transfers: firstRuntime?.transfers ?? 0,
      operations: firstRuntime?.operations ?? 0,
    });
  }

  const passedCases = cases.filter((testCase) => testCase.passed);
  const failedCases = cases.filter((testCase) => !testCase.passed);
  const failureReasons = {
    unstable: failedCases.filter((testCase) => !testCase.stable).length,
    nonConserving: failedCases.filter((testCase) => !testCase.conserved).length,
    nonDeterministic: failedCases.filter((testCase) => !testCase.deterministic).length,
    negativeEnergy: failedCases.filter((testCase) => !testCase.nonNegative).length,
    executionError: failedCases.filter((testCase) => testCase.executionError).length,
  };
  const passed = failedCases.length === 0;

  return {
    passed,
    totalCases: cases.length,
    passedCases: passedCases.length,
    failedCases: failedCases.length,
    failureReasons,
    aggregateRemainingDeficit: failedCases.reduce((sum, testCase) => sum + testCase.remainingDeficit, 0),
    diagnostics: passed
      ? [
          "All hidden worlds reached the requested reserve.",
          "Energy was conserved and remained non-negative in every world.",
          "Repeated execution produced identical final states in every world.",
        ]
      : [
          `${failedCases.length}/${cases.length} hidden worlds failed at least one invariant.`,
          failureReasons.unstable > 0
            ? "Under-reserve receivers frequently retained deficits even though surplus existed elsewhere in their connected component. Reconsider donor reach and repeated donor selection."
            : "Stability succeeded; inspect the remaining invariant failures.",
          failureReasons.executionError > 0
            ? `Execution errors occurred: ${failedCases.find((testCase) => testCase.executionError)?.executionError}`
            : "The capability executed within the safe runtime budget.",
        ],
    samples: failedCases.slice(0, 3).map((testCase) => ({
      case: testCase.id,
      remainingDeficitCells: testCase.remainingDeficitCells,
      remainingDeficit: testCase.remainingDeficit,
      transfers: testCase.transfers,
      operations: testCase.operations,
      executionError: testCase.executionError,
    })),
  };
}

import assert from "node:assert/strict";
import {
  cloneWorld,
  compileCapability,
  createCanonicalWorld,
  createHiddenSuite,
  executeCapability,
  summarizeWorld,
  validateCapability,
} from "./engine.mjs";

const parameter = {
  name: "minimumReserve",
  description: "Requested energy floor for every connected cell",
  type: "number",
  minimum: 1,
  maximum: 50,
};

const minimumReserve = { op: "param", name: "minimumReserve" };
const receiverEnergy = { op: "field", ref: "receiver", field: "energy" };
const donorEnergy = { op: "field", ref: "donor", field: "energy" };
const receiverNeedsEnergy = { op: "lt", left: receiverEnergy, right: minimumReserve };
const donorHasSurplus = {
  op: "gt",
  left: { op: "field", ref: "cell", field: "energy" },
  right: minimumReserve,
};

function candidate(scope, maxIterations) {
  return {
    name: "balance_energy_network",
    description:
      scope === "adjacent"
        ? "Fill deficient cells from one immediately adjacent surplus donor."
        : "Generalize energy balancing across every connected component while preserving each donor reserve.",
    parameters: [parameter],
    program: {
      op: "sequence",
      steps: [
        {
          op: "for_each_receiver",
          condition: receiverNeedsEnergy,
          order: "energy_asc",
          body: {
            op: "while",
            condition: receiverNeedsEnergy,
            maxIterations,
            body: {
              op: "sequence",
              steps: [
                {
                  op: "let",
                  name: "donor",
                  value: {
                    op: "select_donor",
                    receiverRef: "receiver",
                    scope,
                    condition: donorHasSurplus,
                    order: "surplus_desc",
                  },
                },
                { op: "break_if_null", value: { op: "var", name: "donor" } },
                {
                  op: "transfer",
                  from: { op: "ref", name: "donor" },
                  to: { op: "ref", name: "receiver" },
                  amount: {
                    op: "min",
                    values: [
                      { op: "sub", left: minimumReserve, right: receiverEnergy },
                      { op: "sub", left: donorEnergy, right: minimumReserve },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    },
  };
}

const seeds = Array.from({ length: 64 }, (_, index) => (0x9e3779b9 * (index + 1)) >>> 0);
const suite = createHiddenSuite(seeds);

const weak = compileCapability(candidate("adjacent", 1));
const weakValidation = validateCapability(weak, suite);
assert.equal(weakValidation.passed, false, "Adjacent-only candidate should be falsified.");
assert.ok(weakValidation.failedCases > 0);

const generalized = compileCapability(candidate("same_component", 64));
const strongValidation = validateCapability(generalized, suite);
assert.equal(strongValidation.passed, true, JSON.stringify(strongValidation, null, 2));
assert.equal(strongValidation.passedCases, 64);

const canonical = createCanonicalWorld();
const beforeTotal = summarizeWorld(canonical).totalEnergy;
const runtime = executeCapability(canonical, generalized, { minimumReserve: 20 });
const after = summarizeWorld(canonical);
assert.equal(after.stable, true);
assert.equal(after.totalEnergy, beforeTotal);
assert.ok(runtime.transfers > 0);

assert.throws(
  () =>
    compileCapability({
      ...candidate("same_component", 64),
      program: { op: "eval_javascript", source: "document.body.remove()" },
    }),
  /not allowed/,
);

console.log(
  JSON.stringify(
    {
      weak: `${weakValidation.passedCases}/${weakValidation.totalCases}`,
      generalized: `${strongValidation.passedCases}/${strongValidation.totalCases}`,
      canonicalStable: after.stable,
      canonicalTransfers: runtime.transfers,
      unsafeProgramRejected: true,
    },
    null,
    2,
  ),
);

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/recommendation-engine.ts", import.meta.url), "utf8");
const catalog = JSON.parse(await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"));
const compiled = ts.transpileModule(source.replace(/^import .*;$/gm, ""), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module = { exports: {} };
new Function("exports", "module", compiled)(module.exports, module);
const { recommendStartingKit } = module.exports;

function intent(activity, overrides = {}) {
  return {
    schemaVersion: 1,
    activity,
    trip: { duration: "weekend", climate: "mild-variable", terrain: activity === "camping" ? "maintained" : "rugged", groupSize: 2, ...overrides.trip },
    shopper: { experienceLevel: "beginner", purchasePriority: "balanced", ...overrides.shopper },
  };
}

for (const activity of ["camping", "hiking", "backpacking"]) {
  test(`creates a traceable ${activity} starting kit from the SLI-69 contract`, () => {
    const result = recommendStartingKit(intent(activity), catalog.products);
    assert.equal(result.intent.schemaVersion, 1);
    assert.equal(result.scope, "starting-kit");
    assert.ok(result.recommendations.length > 0);
    for (const item of result.recommendations) {
      assert.ok(item.reason.includes(item.product.name));
      assert.ok(item.trace.ruleId);
      assert.ok(item.trace.matchedSignals.includes(`activity:${activity}`));
      assert.ok(item.product.activities.includes(activity));
      assert.notEqual(item.product.availability.status, "out-of-stock");
    }
  });
}

test("reports a suitable product that is unavailable instead of recommending it", () => {
  const hiking = intent("hiking", { trip: { duration: "day-trip", climate: "wet", terrain: "maintained", groupSize: 2 } });
  const result = recommendStartingKit(hiking, catalog.products.filter((product) => product.id === "KIT-0014"));
  assert.ok(result.gaps.some((gap) => gap.category === "footwear" && gap.status === "unavailable"));
  assert.ok(result.recommendations.every((item) => item.product.availability.status !== "out-of-stock"));
});

test("reports when no suitable catalog product exists", () => {
  const result = recommendStartingKit(intent("camping", { trip: { duration: "multi-day", climate: "cold", terrain: "snow-ice", groupSize: 8 } }), catalog.products);
  assert.ok(result.gaps.some((gap) => gap.status === "no-suitable-product"));
});

test("purchase priority deterministically changes selection where catalog values support it", () => {
  const base = intent("backpacking", { shopper: { experienceLevel: "intermediate", purchasePriority: "lower-price" } });
  const cheaper = recommendStartingKit(base, catalog.products).recommendations.find((item) => item.category === "sleeping-bags");
  const lighter = recommendStartingKit({ ...base, shopper: { ...base.shopper, purchasePriority: "lower-weight" } }, catalog.products).recommendations.find((item) => item.category === "sleeping-bags");
  assert.ok(cheaper && lighter);
  assert.ok(cheaper.product.price <= lighter.product.price);
  assert.ok(lighter.product.filterAttributes.weightGrams <= cheaper.product.filterAttributes.weightGrams);
});

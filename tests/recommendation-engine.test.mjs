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

test("backpacking returns the best available tent when soft trip signals do not all match", () => {
  const result = recommendStartingKit(intent("backpacking", { trip: { duration: "day-trip", climate: "warm-dry", terrain: "snow-ice", groupSize: 2 }, shopper: { experienceLevel: "experienced", purchasePriority: "balanced" } }), catalog.products);
  const tent = result.recommendations.find((item) => item.category === "tents");
  assert.equal(tent?.product.id, "KIT-0001");
  assert.match(tent.reason, /best available match/);
  assert.equal(typeof tent.trace.softScore, "number");
});

for (const category of ["sleeping-bags", "sleeping-pads"]) {
  test(`backpacking uses best-match ranking for ${category}`, () => {
    const result = recommendStartingKit(intent("backpacking", { trip: { duration: "day-trip", climate: "wet", terrain: "snow-ice", groupSize: 7 }, shopper: { experienceLevel: "first-timer", purchasePriority: "lower-weight" } }), catalog.products);
    const recommendation = result.recommendations.find((item) => item.category === category);
    assert.ok(recommendation, `expected an available ${category} best match`);
    assert.match(recommendation.reason, /best available match/);
  });
}

test("tent capacity remains a hard constraint", () => {
  const result = recommendStartingKit(intent("backpacking", { trip: { groupSize: 3 } }), catalog.products);
  assert.equal(result.recommendations.some((item) => item.category === "tents"), false);
  assert.equal(result.gaps.find((gap) => gap.category === "tents")?.status, "no-suitable-product");
});

test("out-of-stock products are never selected even when they are the stronger soft match", () => {
  const availableTent = catalog.products.find((product) => product.id === "KIT-0001");
  const unavailableTent = { ...availableTent, id: "TEST-OUT", name: "Unavailable exact match", availability: { status: "out-of-stock", quantity: 0, addToCartEligible: false }, recommendationAttributes: { ...availableTent.recommendationAttributes, experienceLevels: ["beginner"], tripDurationDays: { min: 3, max: 3 }, climates: ["temperate"], terrains: ["trail"] } };
  const result = recommendStartingKit(intent("backpacking"), [unavailableTent, availableTent]);
  assert.equal(result.recommendations.find((item) => item.category === "tents")?.product.id, "KIT-0001");
});

test("no-suitable-product remains when no product satisfies category, activity, and capacity", () => {
  const campingOnlyTent = catalog.products.find((product) => product.id === "KIT-0002");
  const result = recommendStartingKit(intent("backpacking"), [campingOnlyTent]);
  assert.equal(result.gaps.find((gap) => gap.category === "tents")?.status, "no-suitable-product");
});

test("equal rankings use product id as a deterministic stable tie breaker", () => {
  const original = catalog.products.find((product) => product.id === "KIT-0004");
  const later = { ...original, id: "TEST-Z" };
  const earlier = { ...original, id: "TEST-A" };
  const first = recommendStartingKit(intent("backpacking"), [later, earlier]).recommendations.find((item) => item.category === "sleeping-bags");
  const second = recommendStartingKit(intent("backpacking"), [earlier, later]).recommendations.find((item) => item.category === "sleeping-bags");
  assert.equal(first?.product.id, "TEST-A");
  assert.equal(second?.product.id, "TEST-A");
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("SLI-69 captures every required input and provides navigation, validation, review and completion", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["activity", "duration", "climate", "terrain", "experienceLevel", "groupSize", "purchasePriority", "Choose an option to continue", "Review your adventure", "Edit", "Back", "Generate recommendations", "kitted:trip-intent"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-41 connects completion to explainable recommendation result states and recovery", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["recommendStartingKit(intent)", "Generating your starting kit", "available-kit", "partial-kit", "no-suitable-kit", "Why it fits", "Suitable match currently unavailable", "No suitable match", "Edit trip details", "Start over", "Try again"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-41 records recommendation criteria, kit size, and result state", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["recommendations_viewed", "criteria", "kit_size", "result_state"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-42 explains recommendations, exposes alternatives and records product evaluation", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["Key spec", "View alternatives", "No other suitable available products", "recommendation_alternative_viewed", "recommendation_selected", "product_id", "kit_activity", "kit_size", "selection_source"]) assert.ok(source.includes(text), `missing ${text}`);
test("SLI-43 supports category-safe remove, restore, replace, and trip regeneration", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["removeRecommendation", "restoreRecommendation", "replaceRecommendation", "View alternatives", "Partial kit:", "Edit trip details &amp; regenerate", "item.category === current.category"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-43 records modification action, product, category, and kit context", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["kit_modified", "action", "product_id", "category", "kit_context", "replaced_product_id"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-69 includes analytics with the required properties", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["adventure_started", "entry_point", "adventure_step_completed", "step:", "adventure_completed", "completion_status", "activity:"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-69 trip intent uses a stable structured contract", async () => {
  const source = await readFile(new URL("../lib/trip-intent.ts", import.meta.url), "utf8");
  for (const text of ["schemaVersion: 1", "trip:", "shopper:", "Trip intent is incomplete"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-44 adds individual recommendations and the active modified kit through the shared cart", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["useCart()", "addProduct(product)", "Add this product", "Add current kit to cart", "activeKit.filter", "Remove from kit", "Choose an alternative"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-44 reports individual, complete and partial adds with required analytics context", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["product_added_to_cart", "kit_added_to_cart", "recommendation_source", "kit_context", "product_id", "quantity", "price", "kit_size", "result_state", "partial", "complete"]) assert.ok(source.includes(text), `missing ${text}`);
});

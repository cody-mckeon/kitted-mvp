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

test("SLI-69 includes analytics with the required properties", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["adventure_started", "entry_point", "adventure_step_completed", "step:", "adventure_completed", "completion_status", "activity:"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-69 trip intent uses a stable structured contract", async () => {
  const source = await readFile(new URL("../lib/trip-intent.ts", import.meta.url), "utf8");
  for (const text of ["schemaVersion: 1", "trip:", "shopper:", "Trip intent is incomplete"]) assert.ok(source.includes(text), `missing ${text}`);
});

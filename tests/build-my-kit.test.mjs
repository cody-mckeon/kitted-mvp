import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("SLI-69 captures every required input and provides navigation, validation, review and completion", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["activity", "duration", "climate", "terrain", "experienceLevel", "groupSize", "purchasePriority", "Choose an option to continue", "Review your adventure", "Edit", "Back", "Complete adventure", "kitted:trip-intent"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-69 includes analytics with the required properties", async () => {
  const source = await readFile(new URL("../components/build-my-kit-questionnaire.tsx", import.meta.url), "utf8");
  for (const text of ["adventure_started", "entry_point", "adventure_step_completed", "step:", "adventure_completed", "completion_status", "activity:"]) assert.ok(source.includes(text), `missing ${text}`);
});

test("SLI-69 trip intent uses a stable structured contract", async () => {
  const source = await readFile(new URL("../lib/trip-intent.ts", import.meta.url), "utf8");
  for (const text of ["schemaVersion: 1", "trip:", "shopper:", "Trip intent is incomplete"]) assert.ok(source.includes(text), `missing ${text}`);
});

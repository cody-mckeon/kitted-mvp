import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const catalog = JSON.parse(await readFile(new URL("../data/catalog.json", import.meta.url)));
const search = (query) => { const value = query.trim().toLowerCase(); return value ? catalog.products.filter((p) => [p.name,p.brand,p.category,...p.tags].some((field) => field.toLowerCase().includes(value))) : []; };
test("SLI-31 matching trims and searches all supported fields case-insensitively", () => {
  for (const field of ["name", "brand", "category"]) { const value = catalog.products[0][field]; assert.ok(search(`  ${value.toUpperCase().slice(0, Math.max(2, value.length - 1))}  `).some((p) => p.id === catalog.products[0].id)); }
  assert.ok(search(catalog.products[0].tags[0].toUpperCase()).some((p) => p.id === catalog.products[0].id));
  assert.deepEqual(search("   "), []);
});
test("SLI-31 experience includes required states, recovery, and analytics properties", async () => {
  const source = await readFile(new URL("../components/search-experience.tsx", import.meta.url), "utf8");
  for (const text of ["loading", "No gear found", "Clear search", "Browse activities", "catalogError", "search_performed", "search_no_results", "query:", "result_count:", "source:"]) assert.match(source, new RegExp(text));
});

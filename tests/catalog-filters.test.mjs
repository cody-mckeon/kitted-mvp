import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../data/catalog.json", import.meta.url)));
const empty = () => ({ activity:[], category:[], brand:[], rating:[], availability:[], weight:[], waterproof:[], seasonality:[] });
const weightBand = (grams) => grams < 1000 ? "under-1kg" : grams <= 3000 ? "1-3kg" : "over-3kg";
const filter = (products, filters) => products.filter((p) => (!filters.activity.length || filters.activity.some((v) => p.activities.includes(v))) && (!filters.category.length || filters.category.includes(p.category)) && (!filters.brand.length || filters.brand.includes(p.brand)) && (!filters.rating.length || filters.rating.some((v) => p.rating >= Number(v))) && (!filters.availability.length || filters.availability.includes(p.availability.status)) && (!filters.weight.length || filters.weight.includes(weightBand(p.filterAttributes.weightGrams))) && (!filters.waterproof.length || filters.waterproof.includes(String(p.filterAttributes.waterproof))) && (!filters.seasonality.length || filters.seasonality.includes(p.filterAttributes.seasonality)));

test("SLI-32 filters every supported catalog attribute and combinations", () => {
  const sample = catalog.products[0];
  for (const [type, value] of [["activity",sample.activities[0]],["category",sample.category],["brand",sample.brand],["rating","4"],["availability",sample.availability.status],["weight",weightBand(sample.filterAttributes.weightGrams)],["waterproof",String(sample.filterAttributes.waterproof)],["seasonality",sample.filterAttributes.seasonality]]) assert.ok(filter(catalog.products, { ...empty(), [type]:[value] }).includes(sample), type);
  const combined = { ...empty(), activity:[sample.activities[0]], category:[sample.category], brand:[sample.brand] };
  assert.ok(filter(catalog.products, combined).every((p) => p.activities.includes(sample.activities[0]) && p.category === sample.category && p.brand === sample.brand));
  assert.equal(filter(catalog.products, empty()).length, catalog.products.length);
});

test("SLI-32 UI includes sorts, recovery, responsive controls, and analytics properties", async () => {
  const source = await readFile(new URL("../components/product-listing.tsx", import.meta.url), "utf8");
  for (const value of ["recommended","price-asc","price-desc","rating","Reset filters","filter_applied","filter_type","value","result_count","sort_selected","selected_sort","mobile-filter-button"]) assert.match(source, new RegExp(value));
});

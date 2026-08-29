import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../data/catalog.json", import.meta.url)));
const supported = ["camping", "hiking", "backpacking", "snowboarding", "skiing", "mountain-biking"];

test("every SLI-61 activity resolves products from the local catalog", () => {
  for (const activity of supported) {
    assert.ok(catalog.products.some((product) => product.activities.includes(activity)), `${activity} has products`);
  }
});

test("catalog activity values stay within the supported homepage taxonomy", () => {
  for (const product of catalog.products) for (const activity of product.activities) assert.ok(supported.includes(activity));
});

test("SLI-62 global navigation uses the shared activity taxonomy and required analytics source", async () => {
  const navigation = await readFile(new URL("../components/global-navigation.tsx", import.meta.url), "utf8");
  assert.match(navigation, /activities\.map/);
  assert.match(navigation, /category_selected/);
  assert.match(navigation, /source: "global_navigation"/);
  assert.doesNotMatch(navigation, /const activities\s*=/);
});

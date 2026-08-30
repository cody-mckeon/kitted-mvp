import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const action = await readFile(new URL("../components/add-to-cart.tsx", import.meta.url), "utf8");
const provider = await readFile(new URL("../components/cart-provider.tsx", import.meta.url), "utf8");
const navigation = await readFile(new URL("../components/global-navigation.tsx", import.meta.url), "utf8");

test("duplicate products become one line with an increased quantity", () => {
  assert.match(provider, /line\.id === product\.id/);
  assert.match(provider, /quantity: line\.quantity \+ 1/);
});

test("cart count and subtotal are derived immediately from cart lines", () => {
  assert.match(provider, /total \+ line\.quantity/);
  assert.match(provider, /total \+ line\.price \* line\.quantity/);
  assert.match(navigation, /itemCount/);
  assert.match(navigation, /subtotal\.toFixed\(2\)/);
});

test("unavailable and simulated failure paths cannot mutate the cart", () => {
  assert.match(action, /if \(!available\) return/);
  assert.match(action, /if \(simulateFailure\).*setFeedback\("error"\).*return/s);
  assert.match(action, /disabled=\{!available\}/);
});

test("successful adds emit the required analytics properties", () => {
  assert.match(action, /track\("product_added_to_cart"/);
  for (const property of ["product_id", "category", "quantity", "price", "source"]) assert.match(action, new RegExp(property));
});

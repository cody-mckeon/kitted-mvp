import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalog = JSON.parse(await readFile(new URL("../data/catalog.json", import.meta.url), "utf8"));
const page = await readFile(new URL("../app/products/[id]/page.tsx", import.meta.url), "utf8");
const analytics = await readFile(new URL("../components/product-viewed-analytics.tsx", import.meta.url), "utf8");
const addToCart = await readFile(new URL("../components/add-to-cart.tsx", import.meta.url), "utf8");

test("catalog includes products for available and unavailable detail states", () => {
  assert.ok(catalog.products.some((product) => product.availability.addToCartEligible));
  assert.ok(catalog.products.some((product) => !product.availability.addToCartEligible));
});

test("product detail derives its content from catalog fields and guards optional specifications", () => {
  for (const field of ["product.image", "product.name", "product.brand", "product.price", "product.rating", "product.reviewCount", "product.availability", "product.specifications"]) assert.match(page, new RegExp(field.replace(".", "\\.")));
  assert.match(page, /entry\[1\] !== undefined/);
  assert.match(addToCart, /disabled=\{!available\}/);
});

test("product viewed analytics contains required properties", () => {
  assert.match(analytics, /track\("product_viewed"/);
  for (const property of ["product_id", "category", "source", "availability"]) assert.match(analytics, new RegExp(property));
});

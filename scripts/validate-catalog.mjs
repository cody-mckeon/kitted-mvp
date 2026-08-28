import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const catalogUrl = new URL("../data/catalog.json", import.meta.url);
const catalog = JSON.parse(readFileSync(catalogUrl, "utf8"));
const errors = [];
const allowedActivities = new Set(["camping", "hiking", "backpacking"]);
const allowedStatuses = new Set(["in-stock", "low-stock", "out-of-stock"]);
const allowedCategories = new Set(["tents", "sleeping-bags", "sleeping-pads", "backpacks", "footwear", "apparel", "cookware", "lighting", "hydration", "navigation", "safety", "trekking-poles"]);
const allowedSeasons = new Set(["all-season", "three-season", "summer", "winter"]);
const required = ["id", "name", "brand", "category", "activities", "description", "price", "rating", "reviewCount", "image", "availability", "tags", "specifications", "filterAttributes", "recommendationAttributes"];

if (catalog.schemaVersion !== 1) errors.push("schemaVersion must be 1");
if (!Array.isArray(catalog.products) || catalog.products.length < 25 || catalog.products.length > 40) errors.push("catalog must contain 25-40 products");

const ids = new Set();
for (const [index, product] of (catalog.products ?? []).entries()) {
  const at = `products[${index}]`;
  for (const field of required) if (product[field] === undefined || product[field] === null || product[field] === "") errors.push(`${at}.${field} is required`);
  if (!/^KIT-\d{4}$/.test(product.id ?? "")) errors.push(`${at}.id is invalid`);
  if (ids.has(product.id)) errors.push(`${at}.id is duplicated`); else ids.add(product.id);
  if (!allowedCategories.has(product.category)) errors.push(`${at}.category is invalid`);
  if (!Array.isArray(product.activities) || !product.activities.length || product.activities.some((value) => !allowedActivities.has(value))) errors.push(`${at}.activities is invalid`);
  if (!(Number.isFinite(product.price) && product.price > 0 && Math.abs(product.price - Math.round(product.price * 100) / 100) < 1e-9)) errors.push(`${at}.price must be a positive two-decimal number`);
  if (!(Number.isFinite(product.rating) && product.rating >= 0 && product.rating <= 5)) errors.push(`${at}.rating must be between 0 and 5`);
  if (!(Number.isInteger(product.reviewCount) && product.reviewCount >= 0)) errors.push(`${at}.reviewCount is invalid`);
  if (!product.image?.src || !product.image?.alt) errors.push(`${at}.image is incomplete`);
  if (!allowedStatuses.has(product.availability?.status) || !Number.isInteger(product.availability?.quantity) || product.availability.quantity < 0) errors.push(`${at}.availability is invalid`);
  const available = product.availability?.status !== "out-of-stock";
  if (product.availability?.addToCartEligible !== available || (available !== (product.availability?.quantity > 0))) errors.push(`${at}.availability fields are inconsistent`);
  if (!Array.isArray(product.tags) || product.tags.length < 2 || product.tags.some((tag) => !tag.trim())) errors.push(`${at}.tags must contain searchable values`);
  if (!product.specifications || Object.keys(product.specifications).length < 2) errors.push(`${at}.specifications needs at least two values`);
  if (!(Number.isInteger(product.filterAttributes?.weightGrams) && product.filterAttributes.weightGrams > 0) || typeof product.filterAttributes?.waterproof !== "boolean" || !allowedSeasons.has(product.filterAttributes?.seasonality)) errors.push(`${at}.filterAttributes is incomplete or invalid`);
  const recommendation = product.recommendationAttributes;
  if (!recommendation || !recommendation.experienceLevels?.length || !recommendation.climates?.length || !recommendation.terrains?.length || !recommendation.groupSizes?.length || !["low", "medium", "high"].includes(recommendation.packWeightPriority) || !(recommendation.tripDurationDays?.min >= 1 && recommendation.tripDurationDays?.max >= recommendation.tripDurationDays.min)) errors.push(`${at}.recommendationAttributes is incomplete or invalid`);
}

for (const activity of allowedActivities) if (!catalog.products?.some((product) => product.activities.includes(activity))) errors.push(`activity ${activity} has no products`);
if (!catalog.products?.some((product) => product.availability.status === "out-of-stock")) errors.push("catalog needs an out-of-stock product");
if (!catalog.products?.some((product) => product.availability.status === "low-stock")) errors.push("catalog needs a low-stock product");

if (errors.length) {
  console.error(`Catalog validation failed (${errors.length} error${errors.length === 1 ? "" : "s"}):\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  const categories = new Set(catalog.products.map(({ category }) => category));
  console.log(`Catalog valid: ${catalog.products.length} products, ${categories.size} categories, ${ids.size} unique IDs.`);
}

export { catalog };

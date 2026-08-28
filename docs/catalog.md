# MVP catalog data

The Kitted catalog is local prototype seed data. Prices, reviews, and inventory are illustrative; it is not a production commerce model and has no CMS, PIM, database, or inventory service dependency.

## Files and usage

- `data/catalog.json` is the consumer-ready dataset. It contains 31 representative products spanning camping, hiking, and backpacking.
- `data/catalog.schema.json` is the JSON Schema (Draft 2020-12) contract and is the source of truth for field names, allowed taxonomy values, and basic constraints.
- `scripts/validate-catalog.mjs` performs dataset-wide and cross-field checks that JSON Schema alone cannot express conveniently.
- Run `npm test` (or `npm run validate:catalog`) after changing either data file.

Consumers should load `products` from the catalog root. `schemaVersion` is an integer so a future incompatible change can be detected explicitly.

## Taxonomy

Activities use only `camping`, `hiking`, and `backpacking`. A product may support more than one activity. Categories use stable kebab-case values:

`tents`, `sleeping-bags`, `sleeping-pads`, `backpacks`, `footwear`, `apparel`, `cookware`, `lighting`, `hydration`, `navigation`, `safety`, and `trekking-poles`.

Availability uses `in-stock`, `low-stock`, or `out-of-stock`. `quantity` and `addToCartEligible` deliberately repeat the state needed by product-detail and cart controls: an out-of-stock item must have quantity zero and cannot be added; either available state must have positive quantity and can be added.

## Search, filters, and sorting

Deterministic search should normalize case and match the query against `name`, `brand`, `category`, and `tags`. The data guarantees at least two tags per product. Descriptions are display content and are intentionally not part of the required search contract.

The common Sprint 1 filter inputs are:

- top-level `activities`, `category`, `brand`, `rating`, and `availability.status`;
- `filterAttributes.weightGrams`, `waterproof`, and `seasonality` on every product;
- optional category-relevant `capacityLiters`, `personCapacity`, and `sizeRange`.

Sort directly on numeric `price` or `rating`. The recommended/default ordering is the stable order in `products`; this avoids embedding a recommendation algorithm in the catalog task.

## Product detail fields

Every record supplies display-ready name, brand, description, price, rating, review count, image reference and alt text, availability, and at least two key specifications. Image paths are stable references for future assets; this catalog task does not create the downstream product UI or image library.

## Recommendation readiness

`recommendationAttributes` contains only the normalized signals anticipated by later deterministic rules: experience levels, inclusive trip-duration range, climates, terrains, suitable group sizes, and pack-weight priority. These fields are data inputs, not recommendation behavior. Later work can score or select records without changing the product shape.

## Validation coverage

The validator exits nonzero and lists record paths when it finds:

- a product count outside 25–40, missing required values, malformed or duplicate IDs;
- missing/invalid search fields, numeric price/rating/review data, image metadata, specifications, or filter and recommendation attributes;
- inconsistent availability, quantity, and add-to-cart eligibility;
- missing activity coverage or a catalog without both low-stock and out-of-stock examples.

The checked-in sample currently includes all three activities, all 12 categories, multiple stock states, valid sortable numbers, category-specific filters where applicable, and complete product-detail content.

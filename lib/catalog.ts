import catalog from "@/data/catalog.json";

export const activities = [
  { slug: "camping", name: "Camping", eyebrow: "Sleep under open skies", tone: "pine" },
  { slug: "hiking", name: "Hiking", eyebrow: "Find your next trail", tone: "clay" },
  { slug: "backpacking", name: "Backpacking", eyebrow: "Go farther with less", tone: "gold" },
  { slug: "snowboarding", name: "Snowboarding", eyebrow: "Make fresh tracks", tone: "ice" },
  { slug: "skiing", name: "Skiing", eyebrow: "Chase the next run", tone: "sky" },
  { slug: "mountain-biking", name: "Mountain Biking", eyebrow: "Ride beyond the road", tone: "moss" },
] as const;

export type ActivitySlug = (typeof activities)[number]["slug"];
export type Product = (typeof catalog.products)[number];
export type CatalogFilters = {
  activity: string[]; category: string[]; brand: string[]; rating: string[];
  availability: string[]; weight: string[]; waterproof: string[]; seasonality: string[];
};
export type CatalogSort = "recommended" | "price-asc" | "price-desc" | "rating";

export const emptyCatalogFilters = (): CatalogFilters => ({ activity: [], category: [], brand: [], rating: [], availability: [], weight: [], waterproof: [], seasonality: [] });

const weightBand = (grams: number) => grams < 1000 ? "under-1kg" : grams <= 3000 ? "1-3kg" : "over-3kg";

export function filterAndSortProducts(products: Product[], filters: CatalogFilters, sort: CatalogSort): Product[] {
  const matches = products.filter((product) =>
    (!filters.activity.length || filters.activity.some((value) => product.activities.includes(value as ActivitySlug))) &&
    (!filters.category.length || filters.category.includes(product.category)) &&
    (!filters.brand.length || filters.brand.includes(product.brand)) &&
    (!filters.rating.length || filters.rating.some((value) => product.rating >= Number(value))) &&
    (!filters.availability.length || filters.availability.includes(product.availability.status)) &&
    (!filters.weight.length || filters.weight.includes(weightBand(product.filterAttributes.weightGrams))) &&
    (!filters.waterproof.length || filters.waterproof.includes(String(product.filterAttributes.waterproof))) &&
    (!filters.seasonality.length || filters.seasonality.includes(product.filterAttributes.seasonality))
  );
  return matches.map((product, index) => ({ product, index })).sort((a, b) => {
    if (sort === "price-asc") return a.product.price - b.product.price || a.index - b.index;
    if (sort === "price-desc") return b.product.price - a.product.price || a.index - b.index;
    if (sort === "rating") return b.product.rating - a.product.rating || a.index - b.index;
    return a.index - b.index;
  }).map(({ product }) => product);
}

export function getActivity(slug: string) {
  return activities.find((activity) => activity.slug === slug);
}

export function getProductsByActivity(slug: string): Product[] {
  return catalog.products.filter((product) => product.activities.includes(slug as ActivitySlug));
}

export function searchProducts(query: string): Product[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];
  return catalog.products.filter((product) =>
    [product.name, product.brand, product.category, ...product.tags].some((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    ),
  );
}

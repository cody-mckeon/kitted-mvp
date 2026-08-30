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

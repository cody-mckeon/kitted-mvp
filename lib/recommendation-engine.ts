import catalog from "@/data/catalog.json";
import type { Product } from "@/lib/catalog";
import type { TripIntent } from "@/lib/trip-intent";

type GuidedActivity = "camping" | "hiking" | "backpacking";
type ProductCategory = Product["category"];

export type RecommendationRuleTrace = {
  ruleId: string;
  category: ProductCategory;
  matchedSignals: string[];
};

export type ProductRecommendation = {
  category: ProductCategory;
  product: Product;
  reason: string;
  trace: RecommendationRuleTrace;
};

export type RecommendationGap = {
  category: ProductCategory;
  reason: string;
  status: "unavailable" | "no-suitable-product";
  trace: RecommendationRuleTrace;
};

export type RecommendationResult = {
  schemaVersion: 1;
  intent: TripIntent;
  scope: "starting-kit";
  recommendations: ProductRecommendation[];
  gaps: RecommendationGap[];
};

type CategoryRule = { id: string; category: ProductCategory; why: string };

const BASE_RULES: Record<GuidedActivity, CategoryRule[]> = {
  camping: [
    { id: "camping-shelter", category: "tents", why: "adds practical campground shelter" },
    { id: "camping-sleep", category: "sleeping-bags", why: "adds an overnight sleep layer" },
    { id: "camping-pad", category: "sleeping-pads", why: "adds ground insulation and comfort" },
    { id: "camping-cooking", category: "cookware", why: "adds a practical meal setup" },
    { id: "camping-light", category: "lighting", why: "adds light around camp" },
    { id: "camping-hydration", category: "hydration", why: "adds water carrying or treatment" },
    { id: "camping-safety", category: "safety", why: "adds a basic safety item" },
  ],
  hiking: [
    { id: "hiking-pack", category: "backpacks", why: "adds day-trip carrying capacity" },
    { id: "hiking-footwear", category: "footwear", why: "adds trail-appropriate footwear" },
    { id: "hiking-hydration", category: "hydration", why: "adds trail hydration" },
    { id: "hiking-navigation", category: "navigation", why: "adds a navigation aid" },
    { id: "hiking-safety", category: "safety", why: "adds a basic safety item" },
  ],
  backpacking: [
    { id: "backpacking-shelter", category: "tents", why: "adds packable overnight shelter" },
    { id: "backpacking-sleep", category: "sleeping-bags", why: "adds a backcountry sleep layer" },
    { id: "backpacking-pad", category: "sleeping-pads", why: "adds ground insulation" },
    { id: "backpacking-pack", category: "backpacks", why: "adds multi-day carrying capacity" },
    { id: "backpacking-footwear", category: "footwear", why: "adds trail-appropriate footwear" },
    { id: "backpacking-cooking", category: "cookware", why: "adds a packable meal setup" },
    { id: "backpacking-light", category: "lighting", why: "adds overnight lighting" },
    { id: "backpacking-hydration", category: "hydration", why: "adds water carrying or treatment" },
    { id: "backpacking-navigation", category: "navigation", why: "adds a navigation aid" },
    { id: "backpacking-safety", category: "safety", why: "adds a basic safety item" },
  ],
};

const durationDays = { "day-trip": 1, overnight: 2, weekend: 3, "multi-day": 5 } as const;
const climates = { "warm-dry": ["dry", "hot"], "mild-variable": ["temperate"], cold: ["cold"], wet: ["wet"] } as const;
const experience = { "first-timer": "beginner", beginner: "beginner", intermediate: "intermediate", experienced: "advanced" } as const;

function terrainSignals(intent: TripIntent): string[] {
  if (intent.trip.terrain === "maintained") return intent.activity === "camping" ? ["campground"] : ["trail"];
  if (intent.trip.terrain === "rugged") return ["trail", "forest"];
  return ["mountain"];
}

function rulesFor(intent: TripIntent): CategoryRule[] {
  if (!(intent.activity in BASE_RULES)) return [];
  const rules = [...BASE_RULES[intent.activity as GuidedActivity]];
  if (["wet", "cold", "mild-variable"].includes(intent.trip.climate)) rules.push({ id: "climate-apparel", category: "apparel", why: "adds a layer for the selected climate" });
  if (["rugged", "alpine", "snow-ice"].includes(intent.trip.terrain) && intent.activity !== "camping") rules.push({ id: "terrain-poles", category: "trekking-poles", why: "adds support for demanding terrain" });
  return rules;
}

function isSuitable(product: Product, intent: TripIntent): boolean {
  const attrs = product.recommendationAttributes;
  const days = durationDays[intent.trip.duration];
  const sharedItem = product.category === "tents" || product.category === "cookware";
  return product.activities.includes(intent.activity)
    && days >= attrs.tripDurationDays.min && days <= attrs.tripDurationDays.max
    && climates[intent.trip.climate].some((value) => attrs.climates.includes(value))
    && terrainSignals(intent).some((value) => attrs.terrains.includes(value))
    && attrs.experienceLevels.includes(experience[intent.shopper.experienceLevel])
    && (!sharedItem || attrs.groupSizes.includes(Math.min(intent.trip.groupSize, 8)))
    && (product.category !== "tents" || !product.filterAttributes.personCapacity || product.filterAttributes.personCapacity >= intent.trip.groupSize);
}

function priorityValue(product: Product, intent: TripIntent): number {
  if (intent.shopper.purchasePriority === "lower-price") return product.price;
  if (intent.shopper.purchasePriority === "lower-weight") return product.filterAttributes.weightGrams;
  if (intent.shopper.purchasePriority === "comfort") return -product.rating;
  const desired = intent.activity === "camping" ? "low" : "high";
  return product.recommendationAttributes.packWeightPriority === desired ? 0 : 1;
}

function matchedSignals(intent: TripIntent): string[] {
  return [
    `activity:${intent.activity}`,
    `duration:${intent.trip.duration}`,
    `climate:${intent.trip.climate}`,
    `terrain:${intent.trip.terrain}`,
    `experience:${intent.shopper.experienceLevel}`,
    `group-size:${intent.trip.groupSize}`,
    `priority:${intent.shopper.purchasePriority}`,
  ];
}

/** Build a deterministic starting kit. Passing products makes stock and catalog edge cases directly testable. */
export function recommendStartingKit(intent: TripIntent, products: Product[] = catalog.products): RecommendationResult {
  const recommendations: ProductRecommendation[] = [];
  const gaps: RecommendationGap[] = [];

  for (const rule of rulesFor(intent)) {
    const trace = { ruleId: rule.id, category: rule.category, matchedSignals: matchedSignals(intent) };
    const suitable = products.filter((product) => product.category === rule.category && isSuitable(product, intent));
    const available = suitable.filter((product) => product.availability.status !== "out-of-stock" && product.availability.addToCartEligible && product.availability.quantity > 0);
    available.sort((a, b) => priorityValue(a, intent) - priorityValue(b, intent) || b.rating - a.rating || a.id.localeCompare(b.id));
    const product = available[0];
    if (product) {
      recommendations.push({ category: rule.category, product, reason: `${rule.why}; ${intent.shopper.purchasePriority} priority selected ${product.name}.`, trace });
    } else {
      const status = suitable.length ? "unavailable" : "no-suitable-product";
      gaps.push({ category: rule.category, status, reason: status === "unavailable" ? `Suitable ${rule.category} matched ${rule.id}, but none are currently available.` : `No ${rule.category} matched ${rule.id} and all trip-intent constraints.`, trace });
    }
  }

  return { schemaVersion: 1, intent, scope: "starting-kit", recommendations, gaps };
}

import catalog from "@/data/catalog.json";
import type { Product } from "@/lib/catalog";
import type { TripIntent } from "@/lib/trip-intent";

type GuidedActivity = "camping" | "hiking" | "backpacking";
type ProductCategory = Product["category"];

export type RecommendationRuleTrace = {
  ruleId: string;
  category: ProductCategory;
  matchedSignals: string[];
  softScore?: number;
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

function satisfiesHardConstraints(product: Product, category: ProductCategory, intent: TripIntent): boolean {
  return product.category === category
    && product.activities.includes(intent.activity)
    && product.availability.status !== "out-of-stock"
    && product.availability.addToCartEligible
    && product.availability.quantity > 0
    && (product.category !== "tents" || (product.filterAttributes.personCapacity ?? 0) >= intent.trip.groupSize);
}

function matchingSoftSignals(product: Product, intent: TripIntent): string[] {
  const attrs = product.recommendationAttributes;
  const days = durationDays[intent.trip.duration];
  const signals: string[] = [];

  if (days >= attrs.tripDurationDays.min && days <= attrs.tripDurationDays.max) signals.push(`duration:${intent.trip.duration}`);
  if (climates[intent.trip.climate].some((value) => attrs.climates.includes(value))) signals.push(`climate:${intent.trip.climate}`);
  if (terrainSignals(intent).some((value) => attrs.terrains.includes(value))) signals.push(`terrain:${intent.trip.terrain}`);
  if (attrs.experienceLevels.includes(experience[intent.shopper.experienceLevel])) signals.push(`experience:${intent.shopper.experienceLevel}`);
  if (product.category !== "tents" && attrs.groupSizes.includes(Math.min(intent.trip.groupSize, 8))) signals.push(`group-size:${intent.trip.groupSize}`);
  return signals;
}

function wasOnlyUnavailable(product: Product, category: ProductCategory, intent: TripIntent): boolean {
  return product.activities.includes(intent.activity)
    && product.category === category
    && (product.category !== "tents" || (product.filterAttributes.personCapacity ?? 0) >= intent.trip.groupSize);
}

function priorityValue(product: Product, intent: TripIntent): number {
  if (intent.shopper.purchasePriority === "lower-price") return product.price;
  if (intent.shopper.purchasePriority === "lower-weight") return product.filterAttributes.weightGrams;
  if (intent.shopper.purchasePriority === "comfort") return -product.rating;
  const desired = intent.activity === "camping" ? "low" : "high";
  return product.recommendationAttributes.packWeightPriority === desired ? 0 : 1;
}

function compareCandidates(a: Product, b: Product, intent: TripIntent): number {
  const scoreDifference = matchingSoftSignals(b, intent).length - matchingSoftSignals(a, intent).length;
  return scoreDifference
    || priorityValue(a, intent) - priorityValue(b, intent)
    || b.rating - a.rating
    || a.id.localeCompare(b.id);
}

function recommendationFor(product: Product, rule: CategoryRule, intent: TripIntent): ProductRecommendation {
  const softSignals = matchingSoftSignals(product, intent);
  const trace = { ruleId: rule.id, category: rule.category, matchedSignals: [`activity:${intent.activity}`, ...softSignals, `priority:${intent.shopper.purchasePriority}`], softScore: softSignals.length };
  const matchedSummary = softSignals.length ? softSignals.map((signal) => signal.split(":")[0]).join(", ") : "the available catalog options";
  return { category: rule.category, product, reason: `${rule.why}; ${product.name} is an available match based on ${matchedSummary}, with ${intent.shopper.purchasePriority} used to rank otherwise similar matches.`, trace };
}

/** Return the other valid products for a recommendation, in the same deterministic rank order. */
export function getRecommendationAlternatives(recommendation: ProductRecommendation, intent: TripIntent, products?: Product[]): Product[];
export function getRecommendationAlternatives(intent: TripIntent, recommendation: ProductRecommendation, products?: Product[]): ProductRecommendation[];
export function getRecommendationAlternatives(intentOrRecommendation: TripIntent | ProductRecommendation, recommendationOrIntent: ProductRecommendation | TripIntent, products: Product[] = catalog.products): Product[] | ProductRecommendation[] {
  const recommendationFirst = "product" in intentOrRecommendation;
  const intent = recommendationFirst ? recommendationOrIntent as TripIntent : intentOrRecommendation as TripIntent;
  const recommendation = recommendationFirst ? intentOrRecommendation : recommendationOrIntent as ProductRecommendation;
  const rule = rulesFor(intent).find((candidate) => candidate.category === recommendation.category);
  if (!rule) return [];
  const alternatives = products
    .filter((product) => product.id !== recommendation.product.id && satisfiesHardConstraints(product, rule.category, intent))
    .sort((a, b) => compareCandidates(a, b, intent));
  return recommendationFirst ? alternatives : alternatives.map((product) => recommendationFor(product, rule, intent));
}

/** Build a deterministic starting kit. Passing products makes stock and catalog edge cases directly testable. */
export function recommendStartingKit(intent: TripIntent, products: Product[] = catalog.products): RecommendationResult {
  const recommendations: ProductRecommendation[] = [];
  const gaps: RecommendationGap[] = [];

  for (const rule of rulesFor(intent)) {
    const available = products.filter((product) => satisfiesHardConstraints(product, rule.category, intent));
    available.sort((a, b) => compareCandidates(a, b, intent));
    const product = available[0];
    if (product) {
      const recommendation = recommendationFor(product, rule, intent);
      recommendation.reason = recommendation.reason.replace("an available match", "the best available match");
      recommendations.push(recommendation);
    } else {
      const unavailable = products.some((product) => wasOnlyUnavailable(product, rule.category, intent));
      const status = unavailable ? "unavailable" : "no-suitable-product";
      const trace = { ruleId: rule.id, category: rule.category, matchedSignals: [`activity:${intent.activity}`] };
      gaps.push({ category: rule.category, status, reason: status === "unavailable" ? `No available, add-to-cart eligible ${rule.category} satisfies the required activity and capacity.` : `No ${rule.category} satisfies the required activity and capacity.`, trace });
    }
  }

  return { schemaVersion: 1, intent, scope: "starting-kit", recommendations, gaps };
}

import type { ActivitySlug } from "@/lib/catalog";

export const tripIntentOptions = {
  activity: ["camping", "hiking", "backpacking", "snowboarding", "skiing", "mountain-biking"],
  duration: ["day-trip", "overnight", "weekend", "multi-day"],
  climate: ["warm-dry", "mild-variable", "cold", "wet"],
  terrain: ["maintained", "rugged", "alpine", "snow-ice"],
  experienceLevel: ["first-timer", "beginner", "intermediate", "experienced"],
  purchasePriority: ["lower-price", "lower-weight", "comfort", "balanced"],
} as const;

export type TripIntentAnswers = {
  activity: ActivitySlug | "";
  duration: (typeof tripIntentOptions.duration)[number] | "";
  climate: (typeof tripIntentOptions.climate)[number] | "";
  terrain: (typeof tripIntentOptions.terrain)[number] | "";
  experienceLevel: (typeof tripIntentOptions.experienceLevel)[number] | "";
  groupSize: number | null;
  purchasePriority: (typeof tripIntentOptions.purchasePriority)[number] | "";
};

export type TripIntent = {
  schemaVersion: 1;
  activity: ActivitySlug;
  trip: { duration: Exclude<TripIntentAnswers["duration"], "">; climate: Exclude<TripIntentAnswers["climate"], "">; terrain: Exclude<TripIntentAnswers["terrain"], "">; groupSize: number };
  shopper: { experienceLevel: Exclude<TripIntentAnswers["experienceLevel"], "">; purchasePriority: Exclude<TripIntentAnswers["purchasePriority"], ""> };
};

export const emptyTripIntentAnswers = (): TripIntentAnswers => ({ activity: "", duration: "", climate: "", terrain: "", experienceLevel: "", groupSize: null, purchasePriority: "" });

export function createTripIntent(answers: TripIntentAnswers): TripIntent {
  if (!answers.activity || !answers.duration || !answers.climate || !answers.terrain || !answers.experienceLevel || !answers.purchasePriority || !answers.groupSize || answers.groupSize < 1) throw new Error("Trip intent is incomplete");
  return { schemaVersion: 1, activity: answers.activity, trip: { duration: answers.duration, climate: answers.climate, terrain: answers.terrain, groupSize: answers.groupSize }, shopper: { experienceLevel: answers.experienceLevel, purchasePriority: answers.purchasePriority } };
}

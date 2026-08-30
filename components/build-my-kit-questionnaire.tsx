"use client";

import { useRef, useState } from "react";
import { activities } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import { getRecommendationAlternatives, recommendStartingKit, type RecommendationResult } from "@/lib/recommendation-engine";
import { createTripIntent, emptyTripIntentAnswers, tripIntentOptions, type TripIntent, type TripIntentAnswers } from "@/lib/trip-intent";
import { ProductCard } from "@/components/product-card";

type AnswerKey = keyof TripIntentAnswers;
type Step = { key: AnswerKey; title: string; hint: string; options?: readonly string[] };
const steps: Step[] = [
  { key: "activity", title: "What are you getting into?", hint: "Choose the activity at the center of your trip.", options: tripIntentOptions.activity },
  { key: "duration", title: "How long will you be out?", hint: "Count the time you expect to spend outdoors.", options: tripIntentOptions.duration },
  { key: "climate", title: "What weather are you planning for?", hint: "Choose the conditions you are most likely to encounter.", options: tripIntentOptions.climate },
  { key: "terrain", title: "What kind of terrain?", hint: "Pick the closest match for most of your route.", options: tripIntentOptions.terrain },
  { key: "experienceLevel", title: "How experienced are you?", hint: "There is no wrong answer—we use this to understand your needs.", options: tripIntentOptions.experienceLevel },
  { key: "groupSize", title: "How many people are going?", hint: "Include yourself. Enter a group size from 1 to 20." },
  { key: "purchasePriority", title: "What matters most when you buy?", hint: "Choose one priority for this trip.", options: tripIntentOptions.purchasePriority },
];
const labels: Record<string, string> = { camping:"Camping", hiking:"Hiking", backpacking:"Backpacking", snowboarding:"Snowboarding", skiing:"Skiing", "mountain-biking":"Mountain biking", "day-trip":"Day trip", overnight:"Overnight", weekend:"Weekend (2–3 nights)", "multi-day":"Multi-day (4+ nights)", "warm-dry":"Warm and dry", "mild-variable":"Mild and variable", cold:"Cold", wet:"Wet or rainy", maintained:"Maintained paths or campground", rugged:"Rugged or uneven", alpine:"Alpine or exposed", "snow-ice":"Snow and ice", "first-timer":"First timer", beginner:"Beginner", intermediate:"Intermediate", experienced:"Experienced", "lower-price":"Lower price", "lower-weight":"Lower weight", comfort:"Comfort", balanced:"Balanced" };
const answerLabels: Record<AnswerKey, string> = { activity:"Activity", duration:"Trip duration", climate:"Weather or climate", terrain:"Terrain", experienceLevel:"Experience level", groupSize:"Group size", purchasePriority:"Purchase priority" };

function keySpecification(product: RecommendationResult["recommendations"][number]["product"]): string | null {
  const specifications = product.specifications as Record<string, string | number | boolean | undefined>;
  const categorySpecs: Record<string, Array<[string, string, string]>> = { tents: [["personCapacity", "Sleeps", " people"]], "sleeping-bags": [["temperatureRatingC", "Temperature rating", "°C"]], "sleeping-pads": [["rValue", "R-value", ""]], backpacks: [["capacityLiters", "Capacity", " L"]], footwear: [["waterproof", "Waterproof", ""]] };
  for (const [key, label, suffix] of categorySpecs[product.category] ?? []) {
    const value = key in product.filterAttributes ? (product.filterAttributes as Record<string, unknown>)[key] : specifications[key];
    if (value !== undefined && value !== null) return `${label}: ${typeof value === "boolean" ? (value ? "Yes" : "No") : `${value}${suffix}`}`;
  }
  return product.filterAttributes.weightGrams ? `Weight: ${product.filterAttributes.weightGrams.toLocaleString()} g` : null;
}

export function BuildMyKitQuestionnaire() {
  const [answers, setAnswers] = useState(emptyTripIntentAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<TripIntent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [recommendationError, setRecommendationError] = useState("");
  const [openAlternatives, setOpenAlternatives] = useState<Record<string, boolean>>({});
  const started = useRef(false);
  const entryPoint = useRef(typeof window === "undefined" ? "direct" : new URLSearchParams(window.location.search).get("entry") || "direct");
  const step = steps[stepIndex];

  function valid(key: AnswerKey) { const value = answers[key]; return key === "groupSize" ? typeof value === "number" && value >= 1 && value <= 20 : Boolean(value); }
  function setAnswer(key: AnswerKey, value: string | number | null) { setAnswers((current) => ({ ...current, [key]: value })); setError(""); }
  function next() {
    if (!valid(step.key)) { setError(step.key === "groupSize" ? "Enter a group size from 1 to 20." : "Choose an option to continue."); return; }
    if (step.key === "activity" && !started.current) { track("adventure_started", { activity: String(answers.activity), entry_point: entryPoint.current }); started.current = true; }
    track("adventure_step_completed", { activity: String(answers.activity), step: step.key, completion_status: "completed" });
    if (stepIndex === steps.length - 1) setReviewing(true); else setStepIndex((value) => value + 1);
  }
  async function submit() {
    let intent: TripIntent;
    try {
      intent = createTripIntent(answers);
    } catch {
      setError("We couldn't complete your trip details. Review your answers and try again.");
      return;
    }
    setCompleted(intent);
    setGenerating(true);
    setRecommendationError("");
    track("adventure_completed", { activity: intent.activity, completion_status: "completed" });
    window.dispatchEvent(new CustomEvent("kitted:trip-intent", { detail: intent }));
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      const recommendations = recommendStartingKit(intent);
      const resultState = recommendations.recommendations.length === 0 ? "no-suitable-kit" : recommendations.gaps.length ? "partial-kit" : "available-kit";
      setResult(recommendations);
      track("recommendations_viewed", {
        criteria: JSON.stringify(intent),
        kit_size: recommendations.recommendations.length,
        result_state: resultState,
      });
    } catch {
      setRecommendationError("We couldn't generate your starting kit. Your trip details are safe—please try again.");
    } finally {
      setGenerating(false);
    }
  }
  function reset() { setAnswers(emptyTripIntentAnswers()); setStepIndex(0); setReviewing(false); setCompleted(null); setResult(null); setGenerating(false); setRecommendationError(""); setOpenAlternatives({}); setError(""); started.current = false; }
  function editTrip() { setCompleted(null); setResult(null); setRecommendationError(""); setReviewing(true); }

  if (generating) return <main className="kit-results-page"><section className="kit-generating" aria-live="polite" aria-busy="true"><div className="kit-loader" aria-hidden="true" /><p className="kicker">Building from your trip details</p><h1>Generating your starting kit…</h1><p>We’re matching available catalog gear to your activity, conditions, experience, group size, and purchase priority.</p></section></main>;

  if (completed && recommendationError) return <main className="kit-results-page"><section className="state-card" role="alert"><div className="state-icon" aria-hidden="true">!</div><p className="kicker">Something went wrong</p><h1>We couldn’t build your kit.</h1><p>{recommendationError}</p><div className="state-actions"><button className="button" type="button" onClick={submit}>Try again</button><button className="back-button" type="button" onClick={editTrip}>Edit trip details</button></div></section></main>;

  if (completed && result) {
    const state = result.recommendations.length === 0 ? "no-suitable-kit" : result.gaps.length ? "partial-kit" : "available-kit";
    const criteria = [labels[completed.activity], labels[completed.trip.duration], labels[completed.trip.climate], labels[completed.trip.terrain]];
    const analyticsContext = { kit_activity: completed.activity, kit_size: result.recommendations.length, kit_scope: result.scope, criteria: JSON.stringify(completed) };
    const selectProduct = (productId: string, category: string, selectionSource: string) => track("recommendation_selected", { product_id: productId, recommendation_category: category, selection_source: selectionSource, ...analyticsContext });
    return <main className="kit-results-page">
      <header className="kit-results-hero"><p className="kicker">Based on your trip details</p><h1>{state === "available-kit" ? "Your recommended starting kit" : state === "partial-kit" ? "Your partial starting kit" : "No suitable starting kit found"}</h1><p>{state === "available-kit" ? "We found an available match for every category in this starting kit." : state === "partial-kit" ? "We found useful matches, but some categories have no suitable available product." : "The current catalog does not have suitable available matches for these trip details."}</p><ul aria-label="Trip criteria">{criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}<li>{completed.trip.groupSize} {completed.trip.groupSize === 1 ? "person" : "people"}</li><li>{labels[completed.shopper.experienceLevel]}</li><li>{labels[completed.shopper.purchasePriority]} priority</li></ul><div className="kit-actions"><button className="button secondary-button" type="button" onClick={editTrip}>Edit trip details</button><button className="back-button" type="button" onClick={reset}>Start over</button></div></header>
      {result.recommendations.length > 0 && <section className="kit-products" aria-labelledby="kit-products-title"><div className="results-heading"><div><p className="kicker">Recommended gear</p><h2 id="kit-products-title">{result.recommendations.length} catalog {result.recommendations.length === 1 ? "match" : "matches"}</h2></div><p>A focused starting point—not a claim of everything you need.</p></div><div className="kit-product-grid">{result.recommendations.map((recommendation) => {
        const alternatives = getRecommendationAlternatives(recommendation, completed);
        const specification = keySpecification(recommendation.product);
        const isOpen = Boolean(openAlternatives[recommendation.category]);
        return <div className="kit-recommendation" key={recommendation.category}><ProductCard product={recommendation.product} source="recommended-kit" onSelect={() => selectProduct(recommendation.product.id, recommendation.category, "recommended-product")} /><div className="recommendation-reason"><strong>Why it fits</strong><p>{recommendation.reason}</p>{specification && <p className="key-spec"><strong>Key spec</strong> {specification}</p>}</div>{alternatives.length > 0 ? <div className="alternative-section"><button className="alternative-toggle" type="button" aria-expanded={isOpen} aria-controls={`alternatives-${recommendation.category}`} onClick={() => { setOpenAlternatives((current) => ({ ...current, [recommendation.category]: !isOpen })); if (!isOpen) track("recommendation_alternative_viewed", { product_id: recommendation.product.id, recommendation_category: recommendation.category, alternative_product_ids: alternatives.map((product) => product.id).join(","), alternative_count: alternatives.length, ...analyticsContext }); }}>{isOpen ? "Hide alternatives" : "View alternatives"}</button>{isOpen && <div className="alternatives" id={`alternatives-${recommendation.category}`}><p>Other available matches, ranked using the same trip criteria. Viewing one won’t change your kit.</p>{alternatives.map((alternative) => <div className="alternative-card" key={alternative.id}><ProductCard product={alternative} source="recommendation-alternative" onSelect={() => selectProduct(alternative.id, recommendation.category, "alternative-product")} />{keySpecification(alternative) && <p className="alternative-spec"><strong>Key spec</strong> {keySpecification(alternative)}</p>}</div>)}</div>}</div> : <p className="no-alternatives">No other suitable available products match this category and trip.</p>}</div>;
      })}</div></section>}
      {result.gaps.length > 0 && <section className="kit-gaps" aria-labelledby="kit-gaps-title"><p className="kicker">Catalog gaps</p><h2 id="kit-gaps-title">{state === "no-suitable-kit" ? "No suitable products available" : "Still needed for this starting kit"}</h2><div>{result.gaps.map((gap) => <article key={`${gap.category}-${gap.trace.ruleId}`}><span aria-hidden="true">!</span><div><h3>{gap.category.replaceAll("-", " ")}</h3><strong>{gap.status === "unavailable" ? "Suitable match currently unavailable" : "No suitable match"}</strong><p>{gap.reason}</p></div></article>)}</div></section>}
    </main>;
  }

  if (reviewing) return <main className="questionnaire-page"><section className="questionnaire-shell"><p className="kicker">Review your adventure</p><h1>Does everything look right?</h1><p className="questionnaire-intro">Edit any answer before generating your recommendations.</p><dl className="review-list">{steps.map((item, index) => <div key={item.key}><dt>{answerLabels[item.key]}</dt><dd>{item.key === "groupSize" ? `${answers.groupSize} ${answers.groupSize === 1 ? "person" : "people"}` : labels[String(answers[item.key])]}<button type="button" onClick={() => { setStepIndex(index); setReviewing(false); setError(""); }}>Edit <span className="sr-only">{answerLabels[item.key]}</span></button></dd></div>)}</dl>{error && <p className="questionnaire-error" role="alert">{error}</p>}<div className="questionnaire-actions"><button className="back-button" type="button" onClick={() => { setReviewing(false); setStepIndex(steps.length - 1); }}>Back</button><button className="button" type="button" onClick={submit}>Generate recommendations</button></div></section></main>;

  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  return <main className="questionnaire-page"><section className="questionnaire-shell"><div className="questionnaire-progress"><span>Step {stepIndex + 1} of {steps.length}</span><span>{progress}%</span><div><i style={{ width: `${progress}%` }} /></div></div><p className="kicker">Build my kit</p><h1>{step.title}</h1><p className="questionnaire-intro">{step.hint}</p><fieldset className="questionnaire-options"><legend className="sr-only">{step.title}</legend>{step.options ? step.options.map((option) => <label key={option} className={answers[step.key] === option ? "selected" : ""}><input type="radio" name={step.key} value={option} checked={answers[step.key] === option} onChange={() => setAnswer(step.key, option)} /><span><strong>{labels[option]}</strong>{step.key === "activity" && <small>{activities.find((activity) => activity.slug === option)?.eyebrow}</small>}</span></label>) : <label className="group-size"><span>Number of people</span><input type="number" min="1" max="20" inputMode="numeric" value={answers.groupSize ?? ""} onChange={(event) => setAnswer("groupSize", event.target.value === "" ? null : Number(event.target.value))} /></label>}</fieldset>{error && <p className="questionnaire-error" role="alert">{error}</p>}<div className="questionnaire-actions"><button className="back-button" type="button" disabled={stepIndex === 0} onClick={() => { setStepIndex((value) => Math.max(0, value - 1)); setError(""); }}>Back</button><button className="button" type="button" onClick={next}>{stepIndex === steps.length - 1 ? "Review answers" : "Continue"}</button></div></section></main>;
}

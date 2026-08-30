"use client";

import { useRef, useState } from "react";
import { activities, products, type Product } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import { getRecommendationAlternatives, recommendStartingKit, type RecommendationResult } from "@/lib/recommendation-engine";
import { getRecommendationAlternatives, recommendStartingKit, type ProductRecommendation, type RecommendationResult } from "@/lib/recommendation-engine";
import { createTripIntent, emptyTripIntentAnswers, tripIntentOptions, type TripIntent, type TripIntentAnswers } from "@/lib/trip-intent";
import { ProductCard } from "@/components/product-card";
import { useCart } from "@/components/cart-provider";

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
  const { addProduct, lines, subtotal } = useCart();
  const [answers, setAnswers] = useState(emptyTripIntentAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<TripIntent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [removed, setRemoved] = useState<ProductRecommendation[]>([]);
  const [alternativesFor, setAlternativesFor] = useState<string | null>(null);
  const [recommendationError, setRecommendationError] = useState("");
  const [activeKit, setActiveKit] = useState<RecommendationResult["recommendations"]>([]);
  const [cartFeedback, setCartFeedback] = useState("");
  const [cartFeedbackKind, setCartFeedbackKind] = useState<"success" | "error">("success");
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
      setActiveKit(recommendations.recommendations);
      setRemoved([]);
      setAlternativesFor(null);
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
  function reset() { setAnswers(emptyTripIntentAnswers()); setStepIndex(0); setReviewing(false); setCompleted(null); setResult(null); setActiveKit([]); setCartFeedback(""); setGenerating(false); setRecommendationError(""); setError(""); started.current = false; }
  function editTrip() { setCompleted(null); setResult(null); setActiveKit([]); setCartFeedback(""); setRecommendationError(""); setReviewing(true); }

  function isAvailable(product: Product) {
    return product.availability.status !== "out-of-stock" && product.availability.addToCartEligible && product.availability.quantity > 0;
  }
  function analytics(product: Product, kitSize: number) {
    return { recommendation_source: "build_my_kit", kit_context: "starting-kit", activity: completed?.activity ?? "unknown", product_id: product.id, quantity: 1, price: product.price, kit_size: kitSize };
  }
  function addRecommendation(product: Product) {
    if (!completed || !isAvailable(product)) { setCartFeedbackKind("error"); setCartFeedback(`${product.name} is unavailable and was not added.`); return; }
    addProduct(product);
    track("product_added_to_cart", analytics(product, activeKit.length));
    const quantity = (lines.find((line) => line.id === product.id)?.quantity ?? 0) + 1;
    setCartFeedbackKind("success");
    setCartFeedback(`${product.name} added. Quantity: ${quantity}. Cart subtotal: $${(subtotal + product.price).toFixed(2)}.`);
  }
  function addKit() {
    if (!completed || !result || activeKit.length === 0) { setCartFeedbackKind("error"); setCartFeedback("There are no products in this kit to add."); return; }
    const eligible = activeKit.filter(({ product }) => isAvailable(product));
    eligible.forEach(({ product }) => { addProduct(product); track("product_added_to_cart", analytics(product, activeKit.length)); });
    const price = eligible.reduce((total, { product }) => total + product.price, 0);
    const partial = eligible.length !== activeKit.length || activeKit.length !== result.recommendations.length || result.gaps.length > 0;
    track("kit_added_to_cart", { recommendation_source: "build_my_kit", kit_context: "starting-kit", activity: completed.activity, product_ids: eligible.map(({ product }) => product.id).join(","), quantity: eligible.length, price, kit_size: activeKit.length, result_state: partial ? "partial" : "complete" });
    setCartFeedbackKind(eligible.length ? "success" : "error");
    setCartFeedback(eligible.length ? `${eligible.length} ${eligible.length === 1 ? "product" : "products"} added from your ${partial ? "partial" : "complete"} kit. Cart subtotal: $${(subtotal + price).toFixed(2)}.` : "The products in this kit are unavailable and were not added.");
  }
  function removeRecommendation(category: string) { setActiveKit((kit) => kit.filter((item) => item.category !== category)); setCartFeedback(""); }
  function replaceRecommendation(category: string, productId: string) {
    const replacement = products.find((product) => product.id === productId);
    if (!replacement || !isAvailable(replacement)) return;
    setActiveKit((kit) => kit.map((item) => item.category === category ? { ...item, product: replacement, reason: `You selected ${replacement.name} as the available alternative for this category.` } : item));
    setCartFeedback("");
  function reset() { setAnswers(emptyTripIntentAnswers()); setStepIndex(0); setReviewing(false); setCompleted(null); setResult(null); setGenerating(false); setRecommendationError(""); setOpenAlternatives({}); setError(""); started.current = false; }
  function editTrip() { setCompleted(null); setResult(null); setRecommendationError(""); setReviewing(true); }
  function reset() { setAnswers(emptyTripIntentAnswers()); setStepIndex(0); setReviewing(false); setCompleted(null); setResult(null); setRemoved([]); setAlternativesFor(null); setGenerating(false); setRecommendationError(""); setError(""); started.current = false; }
  function editTrip() { setCompleted(null); setResult(null); setRemoved([]); setAlternativesFor(null); setRecommendationError(""); setReviewing(true); }

  function modificationProperties(action: "remove" | "replace" | "restore", recommendation: ProductRecommendation, kitSize: number) {
    return { action, product_id: recommendation.product.id, category: recommendation.category, kit_context: completed?.activity ?? "unknown", kit_size: kitSize };
  }
  function removeRecommendation(recommendation: ProductRecommendation) {
    if (!result) return;
    const recommendations = result.recommendations.filter((item) => item.category !== recommendation.category);
    setResult({ ...result, recommendations });
    setRemoved((current) => [...current.filter((item) => item.category !== recommendation.category), recommendation]);
    setAlternativesFor(null);
    track("kit_modified", modificationProperties("remove", recommendation, recommendations.length));
  }
  function restoreRecommendation(recommendation: ProductRecommendation) {
    if (!result || result.recommendations.some((item) => item.category === recommendation.category)) return;
    const recommendations = [...result.recommendations, recommendation];
    setResult({ ...result, recommendations });
    setRemoved((current) => current.filter((item) => item.category !== recommendation.category));
    track("kit_modified", modificationProperties("restore", recommendation, recommendations.length));
  }
  function replaceRecommendation(current: ProductRecommendation, replacement: ProductRecommendation) {
    if (!result) return;
    const recommendations = result.recommendations.map((item) => item.category === current.category ? replacement : item);
    setResult({ ...result, recommendations });
    setAlternativesFor(null);
    track("kit_modified", { ...modificationProperties("replace", replacement, recommendations.length), replaced_product_id: current.product.id });
  }

  if (generating) return <main className="kit-results-page"><section className="kit-generating" aria-live="polite" aria-busy="true"><div className="kit-loader" aria-hidden="true" /><p className="kicker">Building from your trip details</p><h1>Generating your starting kit…</h1><p>We’re matching available catalog gear to your activity, conditions, experience, group size, and purchase priority.</p></section></main>;

  if (completed && recommendationError) return <main className="kit-results-page"><section className="state-card" role="alert"><div className="state-icon" aria-hidden="true">!</div><p className="kicker">Something went wrong</p><h1>We couldn’t build your kit.</h1><p>{recommendationError}</p><div className="state-actions"><button className="button" type="button" onClick={submit}>Try again</button><button className="back-button" type="button" onClick={editTrip}>Edit trip details</button></div></section></main>;

  if (completed && result) {
    const state = result.recommendations.length === 0 && removed.length === 0 ? "no-suitable-kit" : result.gaps.length || removed.length ? "partial-kit" : "available-kit";
    const criteria = [labels[completed.activity], labels[completed.trip.duration], labels[completed.trip.climate], labels[completed.trip.terrain]];
    const analyticsContext = { kit_activity: completed.activity, kit_size: result.recommendations.length, kit_scope: result.scope, criteria: JSON.stringify(completed) };
    const selectProduct = (productId: string, category: string, selectionSource: string) => track("recommendation_selected", { product_id: productId, recommendation_category: category, selection_source: selectionSource, ...analyticsContext });
    return <main className="kit-results-page">
      <header className="kit-results-hero"><p className="kicker">Based on your trip details</p><h1>{state === "available-kit" ? "Your recommended starting kit" : state === "partial-kit" ? "Your partial starting kit" : "No suitable starting kit found"}</h1><p>{state === "available-kit" ? "We found an available match for every category in this starting kit." : state === "partial-kit" ? "We found useful matches, but some categories have no suitable available product." : "The current catalog does not have suitable available matches for these trip details."}</p><ul aria-label="Trip criteria">{criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}<li>{completed.trip.groupSize} {completed.trip.groupSize === 1 ? "person" : "people"}</li><li>{labels[completed.shopper.experienceLevel]}</li><li>{labels[completed.shopper.purchasePriority]} priority</li></ul><div className="kit-actions">{activeKit.length > 0 && <button className="button" type="button" onClick={addKit}>Add current kit to cart</button>}<button className="button secondary-button" type="button" onClick={editTrip}>Edit trip details</button><button className="back-button" type="button" onClick={reset}>Start over</button></div>{cartFeedback && <p className={`kit-cart-feedback ${cartFeedbackKind}`} role="status" aria-live="polite">{cartFeedback}</p>}</header>
      {result.recommendations.length > 0 && <section className="kit-products" aria-labelledby="kit-products-title"><div className="results-heading"><div><p className="kicker">Recommended gear</p><h2 id="kit-products-title">{activeKit.length} {activeKit.length === 1 ? "product" : "products"} in your current kit</h2></div><p>A focused starting point—not a claim of everything you need.</p></div><div className="kit-product-grid">{activeKit.map((recommendation) => { const alternatives = products.filter((product) => product.category === recommendation.category && product.id !== recommendation.product.id && product.activities.includes(completed.activity) && isAvailable(product)); return <div className="kit-recommendation" key={recommendation.category}><ProductCard product={recommendation.product} source="recommended-kit" /><div className="recommendation-reason"><strong>Why it fits</strong><p>{recommendation.reason}</p></div><div className="recommendation-controls"><button className="button" type="button" onClick={() => addRecommendation(recommendation.product)}>Add this product</button><button className="back-button" type="button" onClick={() => removeRecommendation(recommendation.category)}>Remove from kit</button>{alternatives.length > 0 && <label>Choose an alternative<select value="" onChange={(event) => replaceRecommendation(recommendation.category, event.target.value)}><option value="" disabled>Replace this product</option>{alternatives.map((product) => <option key={product.id} value={product.id}>{product.name} — ${product.price.toFixed(2)}</option>)}</select></label>}</div></div>; })}</div>{activeKit.length === 0 && <div className="kit-empty" role="status"><h3>Your current kit is empty.</h3><p>Removed products will not be added to your cart. Edit your trip or start over to build another kit.</p></div>}</section>}
      <header className="kit-results-hero"><p className="kicker">Based on your trip details</p><h1>{state === "available-kit" ? "Your recommended starting kit" : state === "partial-kit" ? "Your partial starting kit" : "No suitable starting kit found"}</h1><p>{state === "available-kit" ? "We found an available match for every category in this starting kit." : state === "partial-kit" ? "We found useful matches, but some categories have no suitable available product." : "The current catalog does not have suitable available matches for these trip details."}</p><ul aria-label="Trip criteria">{criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}<li>{completed.trip.groupSize} {completed.trip.groupSize === 1 ? "person" : "people"}</li><li>{labels[completed.shopper.experienceLevel]}</li><li>{labels[completed.shopper.purchasePriority]} priority</li></ul><div className="kit-actions"><button className="button secondary-button" type="button" onClick={editTrip}>Edit trip details</button><button className="back-button" type="button" onClick={reset}>Start over</button></div></header>
      {result.recommendations.length > 0 && <section className="kit-products" aria-labelledby="kit-products-title"><div className="results-heading"><div><p className="kicker">Recommended gear</p><h2 id="kit-products-title">{result.recommendations.length} catalog {result.recommendations.length === 1 ? "match" : "matches"}</h2></div><p>A focused starting point—not a claim of everything you need.</p></div><div className="kit-product-grid">{result.recommendations.map((recommendation) => {
        const alternatives = getRecommendationAlternatives(recommendation, completed);
        const specification = keySpecification(recommendation.product);
        const isOpen = Boolean(openAlternatives[recommendation.category]);
        return <div className="kit-recommendation" key={recommendation.category}><ProductCard product={recommendation.product} source="recommended-kit" onSelect={() => selectProduct(recommendation.product.id, recommendation.category, "recommended-product")} /><div className="recommendation-reason"><strong>Why it fits</strong><p>{recommendation.reason}</p>{specification && <p className="key-spec"><strong>Key spec</strong> {specification}</p>}</div>{alternatives.length > 0 ? <div className="alternative-section"><button className="alternative-toggle" type="button" aria-expanded={isOpen} aria-controls={`alternatives-${recommendation.category}`} onClick={() => { setOpenAlternatives((current) => ({ ...current, [recommendation.category]: !isOpen })); if (!isOpen) track("recommendation_alternative_viewed", { product_id: recommendation.product.id, recommendation_category: recommendation.category, alternative_product_ids: alternatives.map((product) => product.id).join(","), alternative_count: alternatives.length, ...analyticsContext }); }}>{isOpen ? "Hide alternatives" : "View alternatives"}</button>{isOpen && <div className="alternatives" id={`alternatives-${recommendation.category}`}><p>Other available matches, ranked using the same trip criteria. Viewing one won’t change your kit.</p>{alternatives.map((alternative) => <div className="alternative-card" key={alternative.id}><ProductCard product={alternative} source="recommendation-alternative" onSelect={() => selectProduct(alternative.id, recommendation.category, "alternative-product")} />{keySpecification(alternative) && <p className="alternative-spec"><strong>Key spec</strong> {keySpecification(alternative)}</p>}</div>)}</div>}</div> : <p className="no-alternatives">No other suitable available products match this category and trip.</p>}</div>;
      })}</div></section>}
      <header className="kit-results-hero"><p className="kicker">Based on your trip details</p><h1>{state === "available-kit" ? "Your recommended starting kit" : state === "partial-kit" ? "Your partial starting kit" : "No suitable starting kit found"}</h1><p>{state === "available-kit" ? "We found an available match for every category in this starting kit." : state === "partial-kit" ? "This kit is partial because an item was removed or a category has no suitable available product." : "The current catalog does not have suitable available matches for these trip details."}</p><ul aria-label="Trip criteria">{criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}<li>{completed.trip.groupSize} {completed.trip.groupSize === 1 ? "person" : "people"}</li><li>{labels[completed.shopper.experienceLevel]}</li><li>{labels[completed.shopper.purchasePriority]} priority</li></ul><div className="kit-actions"><button className="button secondary-button" type="button" onClick={editTrip}>Edit trip details &amp; regenerate</button><button className="back-button" type="button" onClick={reset}>Start over</button></div></header>
      {removed.length > 0 && <section className="removed-items" aria-live="polite"><p><strong>Partial kit:</strong> {removed.length} {removed.length === 1 ? "item has" : "items have"} been removed.</p>{removed.map((item) => <div key={item.category}><span><strong>{item.product.name}</strong> ({item.category.replaceAll("-", " ")})</span><button type="button" onClick={() => restoreRecommendation(item)}>Restore</button></div>)}</section>}
      {result.recommendations.length > 0 && <section className="kit-products" aria-labelledby="kit-products-title"><div className="results-heading"><div><p className="kicker">Recommended gear</p><h2 id="kit-products-title">{result.recommendations.length} catalog {result.recommendations.length === 1 ? "match" : "matches"}</h2></div><p>A focused starting point—not a claim of everything you need.</p></div><div className="kit-product-grid">{result.recommendations.map((recommendation) => { const alternatives = getRecommendationAlternatives(completed, recommendation); return <div className="kit-recommendation" key={recommendation.category}><ProductCard product={recommendation.product} source="recommended-kit" /><div className="recommendation-reason"><strong>Why it fits</strong><p>{recommendation.reason}</p></div><div className="recommendation-actions"><button type="button" onClick={() => removeRecommendation(recommendation)}>Remove</button>{alternatives.length > 0 && <button type="button" aria-expanded={alternativesFor === recommendation.category} onClick={() => setAlternativesFor((current) => current === recommendation.category ? null : recommendation.category)}>View alternatives ({alternatives.length})</button>}</div>{alternativesFor === recommendation.category && <div className="kit-alternatives"><strong>Choose another {recommendation.category.replaceAll("-", " ")}</strong>{alternatives.map((alternative) => <article key={alternative.product.id}><ProductCard product={alternative.product} source="recommended-kit-alternative" /><p>{alternative.reason}</p><button className="button" type="button" onClick={() => replaceRecommendation(recommendation, alternative)}>Replace with {alternative.product.name}</button></article>)}</div>}</div>; })}</div></section>}
      {result.gaps.length > 0 && <section className="kit-gaps" aria-labelledby="kit-gaps-title"><p className="kicker">Catalog gaps</p><h2 id="kit-gaps-title">{state === "no-suitable-kit" ? "No suitable products available" : "Still needed for this starting kit"}</h2><div>{result.gaps.map((gap) => <article key={`${gap.category}-${gap.trace.ruleId}`}><span aria-hidden="true">!</span><div><h3>{gap.category.replaceAll("-", " ")}</h3><strong>{gap.status === "unavailable" ? "Suitable match currently unavailable" : "No suitable match"}</strong><p>{gap.reason}</p></div></article>)}</div></section>}
    </main>;
  }

  if (reviewing) return <main className="questionnaire-page"><section className="questionnaire-shell"><p className="kicker">Review your adventure</p><h1>Does everything look right?</h1><p className="questionnaire-intro">Edit any answer before generating your recommendations.</p><dl className="review-list">{steps.map((item, index) => <div key={item.key}><dt>{answerLabels[item.key]}</dt><dd>{item.key === "groupSize" ? `${answers.groupSize} ${answers.groupSize === 1 ? "person" : "people"}` : labels[String(answers[item.key])]}<button type="button" onClick={() => { setStepIndex(index); setReviewing(false); setError(""); }}>Edit <span className="sr-only">{answerLabels[item.key]}</span></button></dd></div>)}</dl>{error && <p className="questionnaire-error" role="alert">{error}</p>}<div className="questionnaire-actions"><button className="back-button" type="button" onClick={() => { setReviewing(false); setStepIndex(steps.length - 1); }}>Back</button><button className="button" type="button" onClick={submit}>Generate recommendations</button></div></section></main>;

  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  return <main className="questionnaire-page"><section className="questionnaire-shell"><div className="questionnaire-progress"><span>Step {stepIndex + 1} of {steps.length}</span><span>{progress}%</span><div><i style={{ width: `${progress}%` }} /></div></div><p className="kicker">Build my kit</p><h1>{step.title}</h1><p className="questionnaire-intro">{step.hint}</p><fieldset className="questionnaire-options"><legend className="sr-only">{step.title}</legend>{step.options ? step.options.map((option) => <label key={option} className={answers[step.key] === option ? "selected" : ""}><input type="radio" name={step.key} value={option} checked={answers[step.key] === option} onChange={() => setAnswer(step.key, option)} /><span><strong>{labels[option]}</strong>{step.key === "activity" && <small>{activities.find((activity) => activity.slug === option)?.eyebrow}</small>}</span></label>) : <label className="group-size"><span>Number of people</span><input type="number" min="1" max="20" inputMode="numeric" value={answers.groupSize ?? ""} onChange={(event) => setAnswer("groupSize", event.target.value === "" ? null : Number(event.target.value))} /></label>}</fieldset>{error && <p className="questionnaire-error" role="alert">{error}</p>}<div className="questionnaire-actions"><button className="back-button" type="button" disabled={stepIndex === 0} onClick={() => { setStepIndex((value) => Math.max(0, value - 1)); setError(""); }}>Back</button><button className="button" type="button" onClick={next}>{stepIndex === steps.length - 1 ? "Review answers" : "Continue"}</button></div></section></main>;
}

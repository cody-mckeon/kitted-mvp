"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { activities } from "@/lib/catalog";
import { deviceContext, track } from "@/lib/analytics";
import { createTripIntent, emptyTripIntentAnswers, tripIntentOptions, type TripIntent, type TripIntentAnswers } from "@/lib/trip-intent";

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

export function BuildMyKitQuestionnaire() {
  const [answers, setAnswers] = useState(emptyTripIntentAnswers);
  const [stepIndex, setStepIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<TripIntent | null>(null);
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
  function submit() {
    try {
      const intent = createTripIntent(answers);
      setCompleted(intent);
      track("adventure_completed", { activity: intent.activity, completion_status: "completed" });
      window.dispatchEvent(new CustomEvent("kitted:trip-intent", { detail: intent }));
    } catch {
      setError("We couldn't complete your trip details. Review your answers and try again.");
    }
  }
  function reset() { setAnswers(emptyTripIntentAnswers()); setStepIndex(0); setReviewing(false); setCompleted(null); setError(""); started.current = false; }

  if (completed) return <main className="questionnaire-page"><section className="questionnaire-complete" aria-live="polite"><p className="kicker">Adventure captured</p><h1>Your trip details are ready.</h1><p>Your structured trip intent is ready for the next stage. Product recommendations are not part of this prototype step.</p><details><summary>Inspect trip-intent payload</summary><pre data-testid="trip-intent-payload">{JSON.stringify(completed, null, 2)}</pre></details><div className="questionnaire-actions"><button className="button secondary-button" onClick={reset}>Start over</button><Link className="button" href={`/activities/${completed.activity}`}>Browse {labels[completed.activity]}</Link></div></section></main>;

  if (reviewing) return <main className="questionnaire-page"><section className="questionnaire-shell"><p className="kicker">Review your adventure</p><h1>Does everything look right?</h1><p className="questionnaire-intro">Edit any answer before completing your trip details.</p><dl className="review-list">{steps.map((item, index) => <div key={item.key}><dt>{answerLabels[item.key]}</dt><dd>{item.key === "groupSize" ? `${answers.groupSize} ${answers.groupSize === 1 ? "person" : "people"}` : labels[String(answers[item.key])]}<button type="button" onClick={() => { setStepIndex(index); setReviewing(false); setError(""); }}>Edit <span className="sr-only">{answerLabels[item.key]}</span></button></dd></div>)}</dl>{error && <p className="questionnaire-error" role="alert">{error}</p>}<div className="questionnaire-actions"><button className="back-button" type="button" onClick={() => { setReviewing(false); setStepIndex(steps.length - 1); }}>Back</button><button className="button" type="button" onClick={submit}>Complete adventure</button></div></section></main>;

  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  return <main className="questionnaire-page"><section className="questionnaire-shell"><div className="questionnaire-progress"><span>Step {stepIndex + 1} of {steps.length}</span><span>{progress}%</span><div><i style={{ width: `${progress}%` }} /></div></div><p className="kicker">Build my kit</p><h1>{step.title}</h1><p className="questionnaire-intro">{step.hint}</p><fieldset className="questionnaire-options"><legend className="sr-only">{step.title}</legend>{step.options ? step.options.map((option) => <label key={option} className={answers[step.key] === option ? "selected" : ""}><input type="radio" name={step.key} value={option} checked={answers[step.key] === option} onChange={() => setAnswer(step.key, option)} /><span><strong>{labels[option]}</strong>{step.key === "activity" && <small>{activities.find((activity) => activity.slug === option)?.eyebrow}</small>}</span></label>) : <label className="group-size"><span>Number of people</span><input type="number" min="1" max="20" inputMode="numeric" value={answers.groupSize ?? ""} onChange={(event) => setAnswer("groupSize", event.target.value === "" ? null : Number(event.target.value))} /></label>}</fieldset>{error && <p className="questionnaire-error" role="alert">{error}</p>}<div className="questionnaire-actions"><button className="back-button" type="button" disabled={stepIndex === 0} onClick={() => { setStepIndex((value) => Math.max(0, value - 1)); setError(""); }}>Back</button><button className="button" type="button" onClick={next}>{stepIndex === steps.length - 1 ? "Review answers" : "Continue"}</button></div></section></main>;
}

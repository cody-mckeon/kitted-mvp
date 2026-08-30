"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductListing } from "@/components/product-listing";
import { deviceContext, track } from "@/lib/analytics";
import { activities, searchProducts, type Product } from "@/lib/catalog";

type SearchState = "default" | "loading" | "results" | "empty" | "invalid" | "error";

export function SearchExperience({ initialQuery, simulateError }: { initialQuery: string; simulateError: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery.trim());
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<SearchState>(initialQuery.trim() ? "loading" : "default");
  const runId = useRef(0);

  function runSearch(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      runId.current += 1; setSubmittedQuery(""); setProducts([]); setState("invalid"); router.replace("/search"); return;
    }
    setQuery(trimmed); setSubmittedQuery(trimmed); setState("loading");
    router.replace(`/search?q=${encodeURIComponent(trimmed)}${simulateError ? "&catalogError=1" : ""}`);
  }

  useEffect(() => {
    if (!submittedQuery) return;
    const currentRun = ++runId.current;
    const timer = window.setTimeout(() => {
      if (currentRun !== runId.current) return;
      if (simulateError) { setProducts([]); setState("error"); return; }
      const matches = searchProducts(submittedQuery);
      setProducts(matches); setState(matches.length ? "results" : "empty");
      const properties = { query: submittedQuery, result_count: matches.length, source: "search_page", device_context: deviceContext() };
      track("search_performed", properties);
      if (!matches.length) track("search_no_results", properties);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [submittedQuery, simulateError]);

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); runSearch(query); }
  function clearSearch() { runId.current += 1; setQuery(""); setSubmittedQuery(""); setProducts([]); setState("default"); router.replace("/search"); }
  function retrySearch() {
    setState("loading");
    router.replace(`/search?q=${encodeURIComponent(submittedQuery)}`);
  }

  return <main className="search-page">
    <section className="search-hero"><p className="kicker">Search the collection</p><h1>Find your gear</h1><form className="catalog-search" role="search" onSubmit={submit} noValidate><label htmlFor="catalog-query">Search by product, brand, or category</label><div><input id="catalog-query" name="q" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “tent” or “Northstar”" aria-describedby={state === "invalid" ? "search-validation" : undefined} aria-invalid={state === "invalid"} /><button type="submit">Search</button></div>{state === "invalid" && <p className="validation-message" id="search-validation" role="alert">Enter a search term to find gear.</p>}</form></section>
    {state === "default" && <section className="search-default"><p>Search product names, brands, categories, and gear tags.</p><Link href="/#activities">Or browse all activities →</Link></section>}
    {state === "loading" && <section className="search-results" aria-live="polite" aria-busy="true"><span className="sr-only">Searching the catalog</span><div className="results-heading skeleton search-heading-skeleton" /><div className="product-grid">{[1, 2, 3, 4].map((item) => <div className="card-skeleton skeleton" key={item} />)}</div></section>}
    {state === "results" && <ProductListing products={products} heading={`Results for “${submittedQuery}”`} source="search" />}
    {state === "empty" && <section className="state-card" aria-live="polite"><span className="state-icon" aria-hidden="true">⌕</span><h2>No gear found</h2><p>We couldn’t find anything for “{submittedQuery}”. Try another term or explore an activity.</p><div className="state-actions"><button className="button" type="button" onClick={clearSearch}>Clear search</button><Link href="/#activities">Browse activities</Link></div><div className="recovery-links">{activities.map((activity) => <Link href={`/activities/${activity.slug}`} key={activity.slug}>{activity.name}</Link>)}</div></section>}
    {state === "error" && <section className="state-card" role="alert"><span className="state-icon" aria-hidden="true">!</span><h2>We couldn’t search the catalog</h2><p>Something went wrong while reading our local collection. Please try again.</p><div className="state-actions"><button className="button" type="button" onClick={retrySearch}>Try again</button><Link href="/#activities">Browse activities</Link></div></section>}
  </main>;
}

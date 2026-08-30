"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { deviceContext, track } from "@/lib/analytics";
import { activities, emptyCatalogFilters, filterAndSortProducts, type CatalogFilters, type CatalogSort, type Product } from "@/lib/catalog";

const labels: Record<string, string> = { "in-stock":"In stock", "low-stock":"Low stock", "out-of-stock":"Out of stock", "under-1kg":"Under 1 kg", "1-3kg":"1–3 kg", "over-3kg":"Over 3 kg", true:"Waterproof", false:"Not waterproof", "all-season":"All season", "three-season":"Three season", summer:"Summer", winter:"Winter" };
const filterLabels: Record<keyof CatalogFilters, string> = { activity:"Activity", category:"Category", brand:"Brand", rating:"Rating", availability:"Availability", weight:"Weight", waterproof:"Waterproof", seasonality:"Seasonality" };
const slugLabel = (value: string) => labels[value] ?? value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const unique = (values: string[]) => [...new Set(values)];

export function ProductListing({ products, heading, source = "catalog" }: { products: Product[]; heading: string; source?: string }) {
  const [filters, setFilters] = useState<CatalogFilters>(emptyCatalogFilters);
  const [sort, setSort] = useState<CatalogSort>("recommended");
  const [mobileOpen, setMobileOpen] = useState(false);
  const results = useMemo(() => filterAndSortProducts(products, filters, sort), [products, filters, sort]);
  const activeCount = Object.values(filters).reduce((count, values) => count + values.length, 0);
  const options: Record<keyof CatalogFilters, string[]> = {
    activity: activities.map(({ slug }) => slug).filter((slug) => products.some((product) => product.activities.includes(slug))),
    category: unique(products.map((product) => product.category)), brand: unique(products.map((product) => product.brand)).sort(),
    rating: ["4", "4.5"].filter((value) => products.some((product) => product.rating >= Number(value))),
    availability: unique(products.map((product) => product.availability.status)),
    weight: ["under-1kg", "1-3kg", "over-3kg"].filter((band) => filterAndSortProducts(products, { ...emptyCatalogFilters(), weight:[band] }, "recommended").length),
    waterproof: unique(products.map((product) => String(product.filterAttributes.waterproof))),
    seasonality: unique(products.map((product) => product.filterAttributes.seasonality)),
  };
  function toggle(type: keyof CatalogFilters, value: string) {
    const current = filters[type]; const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    const nextFilters = { ...filters, [type]: next }; setFilters(nextFilters);
    const resultCount = filterAndSortProducts(products, nextFilters, sort).length;
    track("filter_applied", { filter_type:type, value, result_count:resultCount, device_context:deviceContext() });
  }
  function clear() { setFilters(emptyCatalogFilters()); setMobileOpen(false); }
  function selectSort(value: CatalogSort) { setSort(value); track("sort_selected", { selected_sort:value, result_count:filterAndSortProducts(products, filters, value).length, device_context:deviceContext() }); }
  const controls = <div className="filter-groups">
    {Object.entries(options).map(([type, values]) => values.length > 1 && <fieldset key={type}><legend>{filterLabels[type as keyof CatalogFilters]}</legend>{values.map((value) => <label key={value}><input type="checkbox" checked={filters[type as keyof CatalogFilters].includes(value)} onChange={() => toggle(type as keyof CatalogFilters, value)} /> <span>{type === "rating" ? `${value}+ stars` : slugLabel(value)}</span></label>)}</fieldset>)}
  </div>;
  return <section className="products-section catalog-listing" aria-live="polite">
    <div className="listing-toolbar"><button className="mobile-filter-button" type="button" onClick={() => setMobileOpen(true)}>Filters{activeCount ? ` (${activeCount})` : ""}</button><label className="sort-control">Sort by<select value={sort} onChange={(event) => selectSort(event.target.value as CatalogSort)}><option value="recommended">Recommended</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="rating">Rating</option></select></label></div>
    <div className="listing-layout"><aside className={`filters-panel ${mobileOpen ? "mobile-open" : ""}`} aria-label="Product filters"><div className="filter-header"><h2>Filters</h2><button type="button" onClick={clear} disabled={!activeCount}>Clear all</button><button className="filter-close" type="button" aria-label="Close filters" onClick={() => setMobileOpen(false)}>×</button></div>{controls}<button className="button filter-done" type="button" onClick={() => setMobileOpen(false)}>Show {results.length} results</button></aside><div className="listing-results"><div className="results-heading"><h2>{heading}</h2><p>{results.length} {results.length === 1 ? "product" : "products"}</p></div>{results.length ? <div className="product-grid">{results.map((product) => <ProductCard product={product} source={source} key={product.id} />)}</div> : <div className="zero-results"><span className="state-icon" aria-hidden="true">⌁</span><h3>No products match</h3><p>Try removing a filter or reset them all to see the full collection.</p><button className="button" type="button" onClick={clear}>Reset filters</button></div>}</div></div>
  </section>;
}

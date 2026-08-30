"use client";

import Link from "next/link";

export default function ProductError({ reset }: { error: Error; reset: () => void }) {
  return <main className="product-detail-page"><section className="state-card" role="alert"><span className="state-icon" aria-hidden="true">!</span><h1>We couldn’t load this product</h1><p>Something went wrong while reading the product details. Please try again or keep browsing.</p><div className="state-actions"><button className="button" type="button" onClick={reset}>Try again</button><Link href="/#activities">Browse activities</Link></div></section></main>;
}

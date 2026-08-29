"use client";

import Link from "next/link";

export default function ErrorState({ reset }: { reset: () => void }) {
  return <main className="listing-page"><section className="state-card" role="alert"><span className="state-icon">!</span><h1>We couldn’t load this gear</h1><p>The local catalog hit a snag. Try again, or head home to choose another activity.</p><div className="state-actions"><button className="button" onClick={reset}>Try again</button><Link href="/">Back to home</Link></div></section></main>;
}

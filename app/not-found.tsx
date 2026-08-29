import Link from "next/link";
export default function NotFound() { return <main className="listing-page"><section className="state-card"><span className="state-icon">?</span><h1>That activity isn’t on our map</h1><p>Choose one of our six supported activities and keep exploring.</p><Link className="button" href="/#activities">Browse activities</Link></section></main>; }

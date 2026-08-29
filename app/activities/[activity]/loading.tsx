export default function Loading() {
  return <main className="listing-page" aria-busy="true" aria-label="Loading activity"><div className="skeleton hero-skeleton" /><div className="skeleton-grid">{Array.from({ length: 6 }, (_, index) => <div className="skeleton card-skeleton" key={index} />)}</div></main>;
}

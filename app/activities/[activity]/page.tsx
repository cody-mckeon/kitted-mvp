import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { getActivity, getProductsByActivity } from "@/lib/catalog";

export default async function ActivityPage({ params }: { params: Promise<{ activity: string }> }) {
  const { activity: slug } = await params;
  const activity = getActivity(slug);
  if (!activity) notFound();
  const products = getProductsByActivity(slug);

  return (
    <main className="listing-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>{activity.name}</span></nav>
      <header className={`listing-hero ${activity.tone}`}><p className="kicker">Shop by activity</p><h1>{activity.name}</h1><p>{activity.eyebrow}. Explore field-ready picks from the Kitted collection.</p></header>
      {products.length === 0 ? (
        <section className="state-card" aria-live="polite"><span className="state-icon">⌁</span><h2>No gear here yet</h2><p>We’re still building this collection. Choose another activity to keep exploring.</p><Link className="button" href="/#activities">Browse all activities</Link></section>
      ) : (
        <section className="products-section"><div className="results-heading"><h2>Gear for {activity.name.toLowerCase()}</h2><p>{products.length} {products.length === 1 ? "product" : "products"}</p></div><div className="product-grid">
          {products.map((product) => <ProductCard product={product} key={product.id} />)}
        </div></section>
      )}
    </main>
  );
}

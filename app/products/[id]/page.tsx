import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailImage } from "@/components/product-detail-image";
import { ProductViewedAnalytics } from "@/components/product-viewed-analytics";
import { getProductById } from "@/lib/catalog";

const availabilityLabels: Record<string, string> = { "in-stock": "In stock", "low-stock": "Low stock", "out-of-stock": "Out of stock" };
const specificationLabels: Record<string, string> = {
  floorMaterial: "Floor material", peakHeightCm: "Peak height", temperatureRatingC: "Temperature rating",
  insulation: "Insulation", capacityLiters: "Capacity", lengthCm: "Length", widthCm: "Width",
  material: "Material", frameMaterial: "Frame material", drivetrain: "Drivetrain",
};

function displaySpecification(key: string, value: string | number | boolean) {
  if (key.endsWith("Cm")) return `${value} cm`;
  if (key.endsWith("Liters")) return `${value} L`;
  if (key === "temperatureRatingC") return `${value}°C`;
  return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ source?: string; catalogError?: string }> }) {
  const [{ id }, { source = "direct", catalogError }] = await Promise.all([params, searchParams]);
  if (catalogError === "1") throw new Error("Simulated product catalog error");
  const product = getProductById(id);
  if (!product) notFound();
  const available = product.availability.addToCartEligible && product.availability.status !== "out-of-stock";
  const specifications = Object.entries(product.specifications).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== null && entry[1] !== "");

  return <main className="product-detail-page">
    <ProductViewedAnalytics productId={product.id} category={product.category} source={source} availability={product.availability.status} />
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href={`/activities/${product.activities[0]}`}>{product.activities[0].replaceAll("-", " ")}</Link><span>/</span><span>{product.name}</span></nav>
    <article className="product-detail">
      <ProductDetailImage src={product.image?.src} alt={product.image?.alt} category={product.category} />
      <div className="product-summary">
        <p className="product-brand">{product.brand}</p><h1>{product.name}</h1>
        <div className="product-rating" aria-label={`${product.rating} out of 5 stars, ${product.reviewCount} sample reviews`}><span aria-hidden="true">★</span> <strong>{product.rating}</strong> <span>({product.reviewCount} reviews)</span></div>
        <p className="product-price">${product.price.toFixed(2)}</p><p className="product-description">{product.description}</p>
        <div className={`availability ${available ? "available" : "unavailable"}`}><strong>{availabilityLabels[product.availability.status] ?? product.availability.status}</strong>{product.availability.status === "low-stock" && <span> — only {product.availability.quantity} left</span>}{!available && <p>This product is currently unavailable. Check back soon.</p>}</div>
        <button className="button add-to-cart" type="button" disabled={!available}>{available ? "Add to cart" : "Unavailable"}</button>
        <p className="prototype-note">Cart functionality is coming next.</p>
      </div>
      {specifications.length > 0 && <section className="product-specifications"><p className="kicker">Product details</p><h2>Key specifications</h2><dl>{specifications.map(([key, value]) => <div key={key}><dt>{specificationLabels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</dt><dd>{displaySpecification(key, value)}</dd></div>)}</dl></section>}
    </article>
  </main>;
}

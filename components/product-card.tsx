import type { Product } from "@/lib/catalog";
import Link from "next/link";

export function ProductCard({ product, source = "catalog", onSelect }: { product: Product; source?: string; onSelect?: () => void }) {
  return <article className="product-card"><Link className="product-card-link" href={`/products/${product.id}?source=${encodeURIComponent(source)}`} onClick={onSelect}><div className="product-image"><span>{product.category.replaceAll("-", " ")}</span></div><div className="product-info"><p>{product.brand}</p><h3>{product.name}</h3><div><strong>${product.price.toFixed(2)}</strong><span>★ {product.rating} <small>({product.reviewCount})</small></span></div>{product.availability.status === "out-of-stock" && <mark>Out of stock</mark>}</div></Link></article>;
}

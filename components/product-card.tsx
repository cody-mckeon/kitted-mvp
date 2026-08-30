import type { Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  return <article className="product-card"><div className="product-image"><span>{product.category.replaceAll("-", " ")}</span></div><div className="product-info"><p>{product.brand}</p><h3>{product.name}</h3><div><strong>${product.price.toFixed(2)}</strong><span>★ {product.rating} <small>({product.reviewCount})</small></span></div>{product.availability.status === "out-of-stock" && <mark>Out of stock</mark>}</div></article>;
}

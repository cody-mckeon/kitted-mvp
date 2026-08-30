"use client";
import { useState } from "react";
import { deviceContext, track } from "@/lib/analytics";
import { type CartProduct, useCart } from "@/components/cart-provider";

type Props = { product: CartProduct; available: boolean; source: string; simulateFailure?: boolean };

export function AddToCart({ product, available, source, simulateFailure = false }: Props) {
  const { addProduct, lines, subtotal } = useCart();
  const [feedback, setFeedback] = useState<"idle" | "success" | "error">("idle");
  const line = lines.find((item) => item.id === product.id);

  function handleAdd() {
    if (!available) return;
    if (simulateFailure) { setFeedback("error"); return; }
    addProduct(product);
    setFeedback("success");
    track("product_added_to_cart", { product_id: product.id, category: product.category, quantity: 1, price: product.price, source, device_context: deviceContext() });
  }

  return <div className="add-to-cart-area">
    <button className="button add-to-cart" type="button" disabled={!available} onClick={handleAdd}>{available ? "Add to cart" : "Unavailable"}</button>
    <div className="cart-feedback" role="status" aria-live="polite">
      {feedback === "success" && <p className="cart-success"><strong>Added to cart.</strong> {product.name} quantity: {line?.quantity ?? 1}. Cart subtotal: ${subtotal.toFixed(2)}.</p>}
      {feedback === "error" && <p className="cart-error"><strong>We couldn’t add this item.</strong> Your cart has not changed. Please try again.</p>}
      {!available && <p className="cart-unavailable">This item cannot be added while it is unavailable.</p>}
    </div>
  </div>;
}

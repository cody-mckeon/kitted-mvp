"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function ProductViewedAnalytics({ productId, category, source, availability }: { productId: string; category: string; source: string; availability: string }) {
  useEffect(() => {
    track("product_viewed", { product_id: productId, category, source, availability });
  }, [productId, category, source, availability]);
  return null;
}

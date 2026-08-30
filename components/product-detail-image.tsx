"use client";

import { useState } from "react";

export function ProductDetailImage({ src, alt, category }: { src?: string; alt?: string; category: string }) {
  const [failed, setFailed] = useState(!src);

  return <div className="product-detail-image">
    {!failed ? <img src={src} alt={alt || ""} onError={() => setFailed(true)} /> : <div className="product-image-placeholder" role="img" aria-label={`${category.replaceAll("-", " ")} image unavailable`}><span aria-hidden="true">⌁</span><p>Image coming soon</p></div>}
  </div>;
}

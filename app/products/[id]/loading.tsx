export default function ProductLoading() {
  return <main className="product-detail-page" aria-busy="true"><span className="sr-only">Loading product details</span><div className="product-detail product-detail-loading"><div className="skeleton detail-image-skeleton" /><div><div className="skeleton detail-line short" /><div className="skeleton detail-title-skeleton" /><div className="skeleton detail-line" /><div className="skeleton detail-line" /></div></div></main>;
}

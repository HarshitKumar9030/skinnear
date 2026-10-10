"use client";

import type { Product } from "@/domain/schemas";
import { formatMoney } from "@/domain/regions";
import { ProductImage } from "./ProductImage";
import { SaveProductButton } from "./SaveProductButton";

export function LibraryProductCard({ product, currency }: { product: Product; currency: string }) {
  return (
    <article className="library-card">
      <ProductImage product={product} />
      <small>{product.brand} · {product.size}</small>
      <h3>{product.name}</h3>
      <strong>{formatMoney(product.referencePrice, currency)} <small>estimate</small></strong>
      <ul>{product.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
      {product.reviewNote ? <p>{product.reviewNote}</p> : null}
      {product.usageNote ? <p>{product.usageNote}</p> : null}
      <SaveProductButton id={product.id} name={product.name} />
      <a href={product.sourceUrl} target="_blank" rel="noreferrer">Brand & ingredients ↗</a>
    </article>
  );
}

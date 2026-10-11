"use client";

import type { Product } from "@/domain/schemas";
import { formatMoney } from "@/domain/regions";
import { ProductImage } from "./ProductImage";
import { Button } from "@/components/ui/Button";

export function ProductAlternatives({
  products,
  currency,
  busy,
  onChoose,
}: {
  products: Product[];
  currency: string;
  busy: boolean;
  onChoose: (id: string) => Promise<void>;
}) {
  return (
    <details className="product-alternatives">
      <summary>
        Explore {new Set(products.map((product) => product.brand)).size} brands · {products.length}{" "}
        alternatives
      </summary>
      <p>These choices fit your preferences and keep the current routine within budget.</p>
      <div className="alternative-grid">
        {products.map((product) => (
          <article className="alternative-card" key={product.id}>
            <ProductImage product={product} />
            <div>
              <span className="alternative-brand">{product.brand}</span>
              <h4>{product.name}</h4>
              <small>
                {product.size} · {formatMoney(product.referencePrice, currency)} estimate
              </small>
            </div>
            {product.benefits?.length ? <p>{product.benefits[0]}</p> : null}
            <Button variant="secondary" disabled={busy} onClick={() => onChoose(product.id)}>
              Use this product
            </Button>
          </article>
        ))}
      </div>
    </details>
  );
}

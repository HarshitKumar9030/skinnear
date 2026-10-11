"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/domain/schemas";
import { CATEGORY_LABELS } from "@/domain/sample";

/** Stable image area with a useful fallback for older catalogs or unavailable brand assets. */
export function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`product-image ${product.tone}`}>
      {product.imageUrl && !failed ? (
        <Image
          src={product.imageUrl}
          alt={`${product.brand} ${product.name} packaging`}
          width={160}
          height={160}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span>
          {product.brand}
          <small>{CATEGORY_LABELS[product.category]}</small>
        </span>
      )}
    </div>
  );
}

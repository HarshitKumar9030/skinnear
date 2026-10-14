import { ArrowRight, Check } from "lucide-react";
import type { RoutineItem } from "@/domain/schemas";
import { CATEGORY_LABELS } from "@/domain/sample";
import { formatMoney } from "@/domain/regions";
import { ProductImage } from "./ProductImage";

export function BudgetProductChange({
  item,
  previous,
  currency,
}: {
  item: RoutineItem;
  previous?: RoutineItem;
  currency: string;
}) {
  const { product, reason } = item;
  const kept = previous?.product.id === product.id;
  return (
    <li className="budget-product-change" data-changed={!kept}>
      <ProductImage product={product} />
      <div className="budget-product-copy">
        <span className="budget-product-step">
          {CATEGORY_LABELS[product.category]}{" "}
          <span className={`budget-change-label ${kept ? "is-kept" : ""}`}>
            {kept ? <Check size={11} aria-hidden /> : <ArrowRight size={11} aria-hidden />}
            {kept ? "Keep" : previous ? "Swap" : "Add"}
          </span>
        </span>
        <small>{product.brand}</small>
        <strong>{product.name}</strong>
        {previous && !kept ? (
          <span className="budget-product-previous">In place of {previous.product.name}</span>
        ) : null}
        <details>
          <summary>Why it fits</summary>
          <p>{reason}</p>
        </details>
      </div>
      <span className="budget-product-price">{formatMoney(product.referencePrice, currency)}</span>
    </li>
  );
}

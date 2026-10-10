"use client";
import { useState } from "react";
import { Sun, Moon, Printer } from "lucide-react";
import type { Product } from "@/domain/schemas";
import { formatMoney } from "@/domain/regions";
import type { PortableRoutine } from "@/services/PortableRoutineService";
import { ProductImage } from "./ProductImage";
import { SaveProductButton } from "./SaveProductButton";
import { PlanActions } from "./PlanActions";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";

export function PortablePlanBoard({
  snapshot,
  products,
}: {
  snapshot: PortableRoutine;
  products: Product[];
}) {
  const [time, setTime] = useState("all");
  const [checked, setChecked] = useState<string[]>([]);
  const total = products.reduce(
    (sum, product) => sum + product.referencePrice,
    0,
  );
  const visible = products.filter((product) =>
    time === "morning"
      ? product.category !== "retinoid" && !product.eveningOnly
      : time === "evening"
        ? product.category !== "sunscreen"
        : true,
  );
  return (
    <section className="portable-plan shell">
      <span className="treatment-eyebrow">
        SkinNear · Shared{" "}
        {snapshot.kind === "list" ? "product list" : "routine"}
      </span>
      <h1>Care you can come back to.</h1>
      <p>
        A shared product snapshot, not an assessment of your skin. Check
        suitability and current labels before using an active.
      </p>
      <div className="portable-summary">
        <strong>
          {formatMoney(total, snapshot.currency)}{" "}
          <small>
            {snapshot.budget
              ? `/ ${formatMoney(snapshot.budget, snapshot.currency)} budget`
              : "wishlist total"}
          </small>
        </strong>
        <p>
          Planning estimates, not live prices.{" "}
          {snapshot.kind === "list"
            ? "Saving a product does not add it to a routine or establish a need for it."
            : "Shipping and local price differences are not included."}
        </p>
      </div>
      <div className="workspace-actions">
        <PlanActions snapshot={snapshot} products={products} />
        <Button variant="text" onClick={() => window.print()}>
          <Printer size={16} /> Print / Save as PDF
        </Button>
      </div>
      <div className="routine-time-tabs">
        {[
          { id: "all", label: "All products" },
          { id: "morning", label: "Morning", icon: Sun },
          { id: "evening", label: "Evening", icon: Moon },
        ].map((tab) => (
          <button
            key={tab.id}
            aria-pressed={time === tab.id}
            onClick={() => setTime(tab.id)}
          >
            {tab.icon ? <tab.icon size={17} /> : null}
            {tab.label}
          </button>
        ))}
        <span aria-live="polite">
          {checked.length} of {products.length} checked
        </span>
      </div>
      <div className="library-grid">
        {visible.map((product) => (
          <article
            className={`library-card ${checked.includes(product.id) ? "is-checked" : ""}`}
            key={product.id}
          >
            <ProductImage product={product} />
            <small>
              {product.brand} · {product.size}
            </small>
            <h3>{product.name}</h3>
            <strong>
              {formatMoney(product.referencePrice, snapshot.currency)}{" "}
              <small>estimate</small>
            </strong>
            <p>
              {product.usageNote ||
                "Follow the current label and check ingredients before use."}
            </p>
            <Checkbox
              checked={checked.includes(product.id)}
              onChange={(event) =>
                setChecked((old) =>
                  event.target.checked
                    ? [...old, product.id]
                    : old.filter((id) => id !== product.id),
                )
              }
            >
              Mark this step complete
            </Checkbox>
            <SaveProductButton id={product.id} name={product.name} />
            <a href={product.sourceUrl} target="_blank" rel="noreferrer">
              Brand & ingredients ↗
            </a>
          </article>
        ))}
      </div>
      <p className="routine-footnote">
        Deep, painful or scarring acne needs a dermatologist. Shared plans do
        not include anyone&apos;s skin scores, health answers, location or
        selfie. Checklist progress stays in this viewing session.
      </p>
    </section>
  );
}

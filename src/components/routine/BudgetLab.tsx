"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ChevronDown, Check, SlidersHorizontal } from "lucide-react";
import type { Preferences, Routine, SkinAnalysis } from "@/domain/schemas";
import type { BudgetComparison, BudgetScenario } from "@/domain/budget-lab";
import { formatMoney } from "@/domain/regions";
import { CATEGORY_LABELS } from "@/domain/sample";
import { SkinNearApi } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "./ProductImage";

interface Props {
  routine: Routine;
  analysis: SkinAnalysis;
  preferences: Preferences;
  excludedProductIds: string[];
  busy: boolean;
  onApply: (scenario: BudgetScenario) => Promise<void>;
}

export function BudgetLab({
  routine,
  analysis,
  preferences,
  excludedProductIds,
  busy,
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState<BudgetComparison | null>(null);
  const [selected, setSelected] = useState(0);
  const request = useRef<AbortController | null>(null);
  const chart = useRef<SVGSVGElement>(null);
  const scenario = comparison?.scenarios[selected];
  const money = (value: number) => formatMoney(value, preferences.currency);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (
      !open ||
      !comparison ||
      !chart.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("gsap").then(({ gsap }) => {
      if (disposed || !chart.current) return;
      const context = gsap.context(
        () =>
          gsap.from(".budget-lab-bar", {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 0.65,
            stagger: 0.12,
            ease: "power2.out",
          }),
        chart.current,
      );
      cleanup = () => context.revert();
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [comparison, open]);

  async function explore() {
    setOpen(true);
    if (comparison || loading) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const result = await new SkinNearApi().post<BudgetComparison>(
        "/api/routine/compare",
        { analysis, preferences, excludedProductIds },
        controller.signal,
      );
      if (!controller.signal.aborted) setComparison(result);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Comparison unavailable. Please retry.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const delta = scenario ? Math.round((routine.total - scenario.routine.total) * 100) / 100 : 0;
  return (
    <section className="budget-lab" aria-label="Budget Lab">
      <button
        type="button"
        className="budget-lab-toggle"
        aria-expanded={open}
        aria-controls="budget-lab-content"
        disabled={busy}
        onClick={() => (open ? setOpen(false) : void explore())}
      >
        <span className="budget-lab-icon">
          <SlidersHorizontal size={24} aria-hidden />
        </span>
        <span>
          <small>Budget Lab</small>
          <strong>Could your routine cost less?</strong>
          <span>Compare the trade-offs before you shop.</span>
        </span>
        <ChevronDown
          size={20}
          aria-hidden
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
      {open ? (
        <div id="budget-lab-content" className="budget-lab-content">
          {loading ? (
            <p role="status">Rebuilding three baskets around your skin insights...</p>
          ) : null}
          {error ? (
            <div role="alert">
              <p>{error}</p>
              <Button variant="secondary" onClick={() => void explore()}>
                Retry comparison
              </Button>
            </div>
          ) : null}
          {comparison ? (
            <>
              <p className="budget-lab-intro">
                Same skin insights. Same preferences. Three ways to stay within{" "}
                {money(comparison.cap)}.
              </p>
              <svg
                ref={chart}
                className="budget-lab-chart"
                viewBox="0 0 600 110"
                aria-hidden="true"
              >
                {comparison.scenarios.map((option, index) => (
                  <g key={option.id} transform={`translate(0 ${index * 36})`}>
                    <text x="0" y="21" fill="#272138" fontSize="12">
                      {option.label}
                    </text>
                    <rect x="145" y="4" width="455" height="24" rx="12" fill="#ece7f3" />
                    <rect
                      className="budget-lab-bar"
                      x="145"
                      y="4"
                      width={
                        option.routine.feasible
                          ? Math.max(0, (option.routine.total / comparison.cap) * 455)
                          : 0
                      }
                      height="24"
                      rx="12"
                      fill={index === selected ? "#7959c7" : "#b7a6d9"}
                    />
                  </g>
                ))}
              </svg>
              <div className="budget-lab-options" aria-label="Compare routine options">
                {comparison.scenarios.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected === index}
                    disabled={busy}
                    onClick={() => setSelected(index)}
                  >
                    <span>
                      {option.label}
                      {selected === index ? <Check size={16} aria-hidden /> : null}
                    </span>
                    <strong>
                      {option.routine.feasible ? money(option.routine.total) : "Does not fit yet"}
                    </strong>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
              {comparison.scenarios[1].routine.feasible &&
              comparison.scenarios[2].routine.feasible &&
              JSON.stringify(
                comparison.scenarios[1].routine.items.map((item) => item.product.id),
              ) ===
                JSON.stringify(
                  comparison.scenarios[2].routine.items.map((item) => item.product.id),
                ) ? (
                <p className="field-note">
                  More spending room doesn’t change these picks. Keep the difference.
                </p>
              ) : null}
              {scenario ? (
                <div
                  className="budget-lab-preview"
                  role="region"
                  aria-label={`${scenario.label} preview`}
                >
                  {scenario.routine.feasible ? (
                    <>
                      <div className="budget-lab-result">
                        <ArrowDownRight size={22} aria-hidden />
                        <strong>
                          {delta > 0
                            ? `${money(delta)} less than your current basket`
                            : delta < 0
                              ? `${money(-delta)} more, still within the cap`
                              : "No extra spending for this basket"}
                        </strong>
                      </div>
                      <p className="field-note">
                        {scenario.id === "essentials"
                          ? "This option leaves out extra actives. Applying it turns off treatment consent."
                          : "Your treatment consent and suitability checks still apply."}{" "}
                        Manual product picks are replaced when you apply.
                      </p>
                      <ul className="budget-lab-products">
                        {scenario.routine.items.map(({ product, reason }) => (
                          <li key={product.id}>
                            <ProductImage product={product} />
                            <div>
                              <small>
                                {product.brand} · {CATEGORY_LABELS[product.category]}
                              </small>
                              <strong>{product.name}</strong>
                              <span>{money(product.referencePrice)}</span>
                              <details>
                                <summary>Why this step?</summary>
                                <p>{reason}</p>
                              </details>
                            </div>
                            <span className="budget-lab-change">
                              {routine.items.some((item) => item.product.id === product.id)
                                ? "Keep"
                                : routine.items.some(
                                      (item) => item.product.category === product.category,
                                    )
                                  ? "Swap"
                                  : "Add"}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {!scenario.routine.items.length ? (
                        <p>You already own the essentials. No new purchases needed.</p>
                      ) : null}
                      {routine.items
                        .filter(
                          (item) =>
                            !scenario.routine.items.some(
                              (next) => next.product.category === item.product.category,
                            ),
                        )
                        .map((item) => (
                          <p className="field-note" key={item.product.id}>
                            Leave out: {item.product.name}
                          </p>
                        ))}
                      <Button onClick={() => void onApply(scenario)} loading={busy}>
                        Use {scenario.label.toLowerCase()} <Check size={17} />
                      </Button>
                    </>
                  ) : (
                    <p role="status">{scenario.routine.message}</p>
                  )}
                </div>
              ) : null}
              <p className="field-note">
                Planning prices. Spending more does not predict better skin results.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

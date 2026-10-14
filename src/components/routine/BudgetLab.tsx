"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronDown, Check, SlidersHorizontal } from "lucide-react";
import type { Preferences, Routine, SkinAnalysis } from "@/domain/schemas";
import type { BudgetComparison, BudgetScenario } from "@/domain/budget-lab";
import { formatMoney } from "@/domain/regions";
import { SkinNearApi } from "@/lib/client-api";
import { Button } from "@/components/ui/Button";
import { BudgetSavingsSummary } from "./BudgetSavingsSummary";
import { useBudgetMotion } from "@/hooks/useBudgetMotion";
import { BudgetProductChange } from "./BudgetProductChange";

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
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState<BudgetComparison | null>(null);
  const [selected, setSelected] = useState(0);
  const request = useRef<AbortController | null>(null);
  const scenario = comparison?.scenarios[selected];
  useBudgetMotion(root, open, selected, !!comparison);
  const money = (value: number) => formatMoney(value, preferences.currency);

  useEffect(() => () => request.current?.abort(), []);
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

  const samePicks =
    comparison &&
    comparison.scenarios[1].routine.feasible &&
    comparison.scenarios[2].routine.feasible &&
    comparison.scenarios[1].routine.items.map((item) => item.product.id).join("|") ===
      comparison.scenarios[2].routine.items.map((item) => item.product.id).join("|");
  return (
    <section ref={root} className="budget-lab" aria-label="Budget Lab" data-open={open}>
      <button
        type="button"
        className="budget-lab-toggle"
        aria-expanded={open}
        aria-controls="budget-lab-content"
        disabled={busy}
        onClick={() => (open ? setOpen(false) : void explore())}
      >
        <span className="budget-lab-icon">
          <SlidersHorizontal size={23} aria-hidden />
        </span>
        <span className="budget-lab-title">
          <small>THE BUDGET LAB</small>
          <strong>A little less. Still your routine.</strong>
          <span>Find the swaps worth making.</span>
        </span>
        <span className="budget-lab-toggle-action">
          {open ? "Close" : "Compare"}
          <ChevronDown
            size={17}
            aria-hidden
            style={{ transform: open ? "rotate(180deg)" : undefined }}
          />
        </span>
      </button>
      <div className="budget-lab-disclosure" aria-hidden={!open} inert={!open}>
        <div className="budget-lab-disclosure-inner">
          <div id="budget-lab-content" className="budget-lab-content">
            {loading ? (
              <div className="budget-lab-loading" role="status">
                <span className="budget-search-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>Finding a little more room in your budget...</span>
              </div>
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
                <div
                  className="budget-lab-options"
                  aria-label="Compare routine options"
                  style={{ "--budget-active": selected } as CSSProperties}
                >
                  <span className="budget-plan-indicator" aria-hidden="true" />
                  {comparison.scenarios.map((option, index) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected === index}
                      disabled={busy}
                      onClick={() => setSelected(index)}
                    >
                      <span className="budget-option-heading">
                        {option.label}
                        <span className="budget-option-check">
                          {selected === index ? <Check size={13} aria-hidden /> : null}
                        </span>
                      </span>
                      <strong>
                        {option.routine.feasible ? money(option.routine.total) : "No full basket"}
                      </strong>
                      <small>
                        {option.id === "essentials"
                          ? "Just the basics"
                          : option.id === "balanced"
                            ? "A smaller spending cap"
                            : "Room for your preferences"}
                      </small>
                    </button>
                  ))}
                </div>
                {scenario ? (
                  <div
                    className="budget-lab-preview"
                    role="region"
                    aria-label={`${scenario.label} preview`}
                  >
                    {scenario.routine.feasible ? (
                      <>
                        <div className="budget-lab-comparison">
                          <BudgetSavingsSummary
                            current={routine.total}
                            next={scenario.routine.total}
                            cap={comparison.cap}
                            currency={preferences.currency}
                          />
                          <div className="budget-lab-basket">
                            <div className="budget-basket-heading">
                              <h3>Your everyday lineup</h3>
                              <span>
                                {scenario.routine.items.length}{" "}
                                {scenario.routine.items.length === 1 ? "product" : "products"}
                              </span>
                            </div>
                            <ul className="budget-lab-products">
                              {scenario.routine.items.map((item) => (
                                <BudgetProductChange
                                  key={item.product.id}
                                  item={item}
                                  previous={routine.items.find(
                                    (previous) =>
                                      previous.product.category === item.product.category,
                                  )}
                                  currency={preferences.currency}
                                />
                              ))}
                            </ul>
                            {!scenario.routine.items.length ? (
                              <p className="field-note">
                                You already own the essentials. No new purchases needed.
                              </p>
                            ) : null}
                            {routine.items
                              .filter(
                                (item) =>
                                  !scenario.routine.items.some(
                                    (next) => next.product.category === item.product.category,
                                  ),
                              )
                              .map((item) => (
                                <p className="budget-removed" key={item.product.id}>
                                  Leaving out <strong>{item.product.name}</strong>
                                </p>
                              ))}
                          </div>
                        </div>
                        <div className="budget-lab-apply">
                          <div>
                            <span>Like this balance?</span>
                            <small>
                              {scenario.id === "essentials"
                                ? "Replaces manual picks and removes extra actives."
                                : "Replaces manual picks. Your treatment preferences carry over."}
                            </small>
                          </div>
                          <Button onClick={() => void onApply(scenario)} loading={busy}>
                            Use this routine <ArrowRight size={17} />
                          </Button>
                        </div>
                        <details className="budget-lab-notes">
                          <summary>What changes when I apply?</summary>
                          <p>
                            {scenario.id === "essentials"
                              ? "Extra actives are left out and treatment consent is turned off."
                              : "Your treatment consent and suitability checks still apply."}{" "}
                            Manual product picks are replaced. Prices are planning estimates.
                          </p>
                        </details>
                      </>
                    ) : (
                      <div className="budget-lab-unavailable">
                        <h3>This cap needs a rethink.</h3>
                        <p>{scenario.routine.message}</p>
                        <span>Your current routine stays as it is.</span>
                      </div>
                    )}
                  </div>
                ) : null}
                {samePicks ? (
                  <p className="budget-lab-insight">
                    <Check size={14} aria-hidden />
                    The smaller and full caps pick the same products. Keep the difference.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { AnimatedMoney } from "@/components/ui/AnimatedMoney";
import { formatMoney } from "@/domain/regions";

export function BudgetSavingsSummary({
  current,
  next,
  cap,
  currency,
}: {
  current: number;
  next: number;
  cap: number;
  currency: string;
}) {
  const art = useRef<SVGSVGElement>(null);
  const difference = Math.round((current - next) * 100) / 100;
  const money = (value: number) => formatMoney(value, currency);

  useEffect(() => {
    if (!art.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let stop: (() => void) | undefined;
    void import("gsap").then(({ gsap }) => {
      if (disposed || !art.current) return;
      const context = gsap.matchMedia(art.current);
      context.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".saving-coin", {
          y: -30,
          rotation: -7,
          transformOrigin: "center",
          opacity: 0,
          duration: 0.65,
          stagger: 0.1,
          ease: "back.out(1.3)",
        });
        gsap.from(".saving-leaf", {
          scale: 0.15,
          rotation: -24,
          transformOrigin: "bottom left",
          duration: 0.7,
          ease: "back.out(1.5)",
        });
        gsap.from(".saving-stem", {
          strokeDashoffset: 1,
          duration: 0.65,
          delay: 0.15,
          ease: "power2.out",
        });
        gsap.from(".saving-loose-coin", {
          y: -24,
          x: 8,
          rotation: 70,
          transformOrigin: "center",
          opacity: 0,
          duration: 0.7,
          delay: 0.2,
          ease: "back.out(1.5)",
        });
      });
      stop = () => context.revert();
    });
    return () => {
      disposed = true;
      stop?.();
    };
  }, [next]);

  return (
    <aside className="budget-savings" aria-label="Basket price comparison">
      <svg ref={art} viewBox="0 0 140 100" aria-hidden="true">
        <ellipse cx="67" cy="85" rx="52" ry="9" fill="#c7dacf" />
        {[0, 1, 2].map((index) => (
          <g className="saving-coin" key={index} transform={`translate(0 ${-index * 13})`}>
            <path d="M28 63v10c0 17 76 17 76 0V63" fill={index === 1 ? "#8bad99" : "#a6c3af"} />
            <ellipse cx="66" cy="63" rx="38" ry="11" fill={index === 1 ? "#d6e6dc" : "#e9f1ec"} />
            <path d="M52 63h28" stroke="#729581" strokeWidth="3" strokeLinecap="round" />
          </g>
        ))}
        <path
          className="saving-leaf"
          d="M98 44c-4-20 13-31 27-30 0 19-10 31-27 30Z"
          fill="#6b927b"
        />
        <path
          className="saving-stem"
          pathLength="1"
          strokeDasharray="1"
          d="m98 46 17-21"
          stroke="#e9f1ec"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g className="saving-loose-coin">
          <circle cx="119" cy="75" r="9" fill="#b8d0bf" />
          <path
            d="M116 72h6m-6 6h6m-3-9v12"
            stroke="#6b927b"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div className="budget-savings-headline">
        <small>
          {difference > 0
            ? "Back in your budget"
            : difference < 0
              ? "Added to your basket"
              : next === 0
                ? "Nothing new to buy"
                : "Your basket stays at"}
        </small>
        <strong>
          <AnimatedMoney
            value={difference === 0 ? next : Math.abs(difference)}
            currency={currency}
          />
        </strong>
        <p>
          {difference > 0
            ? "A little saved. The essentials stay."
            : difference < 0
              ? "A different mix, within your limit."
              : "Keep the room in your budget."}
        </p>
      </div>
      <dl className="budget-savings-totals">
        <div>
          <dt>Current basket</dt>
          <dd>{money(current)}</dd>
        </div>
        <div>
          <dt>This option</dt>
          <dd>{money(next)}</dd>
        </div>
      </dl>
      <span className="budget-savings-cap">
        Your spending cap <strong>{money(cap)}</strong>
      </span>
    </aside>
  );
}

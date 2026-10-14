"use client";

import { useEffect, useRef } from "react";
import { formatMoney } from "@/domain/regions";

/** Animate only the visual copy; assistive technology receives the exact amount. */
export function AnimatedMoney({ value, currency }: { value: number; currency: string }) {
  const visual = useRef<HTMLSpanElement>(null);
  const formatted = formatMoney(value, currency);

  useEffect(() => {
    const element = visual.current;
    if (!element) return;
    element.textContent = formatted;
    let disposed = false;
    let stop: (() => void) | undefined;
    void import("gsap").then(({ gsap }) => {
      if (disposed) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const counter = { value: 0 };
        gsap.to(counter, {
          value,
          duration: 0.65,
          ease: "power2.out",
          onUpdate: () => {
            element.textContent = formatMoney(counter.value, currency);
          },
        });
        return () => {
          element.textContent = formatted;
        };
      });
      stop = () => media.revert();
    });
    return () => {
      disposed = true;
      stop?.();
      element.textContent = formatted;
    };
  }, [value, currency, formatted]);

  return (
    <>
      <span className="visually-hidden">{formatted}</span>
      <span ref={visual} aria-hidden="true">
        {formatted}
      </span>
    </>
  );
}

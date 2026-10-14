"use client";

import { useEffect, type RefObject } from "react";

/** Bounded, scoped transitions; interrupted selections revert before the next reveal. */
export function useBudgetMotion(
  root: RefObject<HTMLElement | null>,
  open: boolean,
  selected: number,
  ready: boolean,
) {
  useEffect(() => {
    if (!open || !ready || !root.current) return;
    const element = root.current;
    let disposed = false;
    let stop: (() => void) | undefined;
    void import("gsap").then(({ gsap }) => {
      if (disposed) return;
      const media = gsap.matchMedia(element);
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const rows = element.querySelectorAll(".budget-product-change[data-changed='true']");
        const labels = element.querySelectorAll(".budget-change-label:not(.is-kept)");
        if (rows.length)
          gsap.fromTo(
            rows,
            { opacity: 0, x: 10 },
            {
              opacity: 1,
              x: 0,
              duration: 0.35,
              stagger: 0.06,
              ease: "power2.out",
              clearProps: "opacity,transform",
            },
          );
        if (labels.length)
          gsap.fromTo(
            labels,
            { scale: 0.8 },
            {
              scale: 1,
              duration: 0.35,
              stagger: 0.06,
              ease: "back.out(1.6)",
              clearProps: "transform",
            },
          );
      });
      stop = () => media.revert();
    });
    return () => {
      disposed = true;
      stop?.();
    };
  }, [root, open, selected, ready]);
}

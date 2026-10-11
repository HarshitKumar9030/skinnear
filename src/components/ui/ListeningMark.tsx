"use client";

import { useEffect, useRef } from "react";

/** Motion belongs to the SVG, never to playback controls. */
export function ListeningMark({ playing }: { playing: boolean }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!playing || !ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let disposed = false;
    let stop: (() => void) | undefined;
    void import("gsap").then(({ gsap }) => {
      if (disposed || !ref.current) return;
      const context = gsap.context(() => {
        gsap.to("rect", {
          scaleY: 0.35,
          transformOrigin: "center",
          duration: 0.6,
          stagger: 0.035,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }, ref.current);
      stop = () => context.revert();
    });
    return () => {
      disposed = true;
      stop?.();
    };
  }, [playing]);

  return (
    <svg ref={ref} className="voice-wave" viewBox="0 0 132 36" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => {
        const height = 8 + ((index * 13) % 27);
        return (
          <rect
            key={index}
            x={index * 7.3}
            y={(36 - height) / 2}
            width="3.5"
            height={height}
            rx="1.75"
          />
        );
      })}
    </svg>
  );
}

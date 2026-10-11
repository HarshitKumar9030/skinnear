"use client";

import { useEffect, useRef } from "react";
import type { StepAnimationController } from "@/services/StepAnimationController";

const steps = [
  { label: "Scan your skin", detail: "Start with a selfie" },
  { label: "Make it yours", detail: "Set your preferences" },
  { label: "Find your routine", detail: "Explore your products" },
];

export function StepIndicator({ step = 0 }: { step?: number }) {
  const root = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let disposed = false;
    let animation: StepAnimationController | undefined;
    import("@/services/StepAnimationController").then(({ StepAnimationController }) => {
      if (!disposed) animation = new StepAnimationController(node);
    });
    return () => {
      disposed = true;
      animation?.dispose();
    };
  }, [step]);
  return (
    <ol className="steps" ref={root} aria-label="Your skincare journey">
      {steps.map(({ label, detail }, index) => (
        <li
          key={label}
          aria-current={index === step ? "step" : undefined}
          data-step-state={index < step ? "complete" : index === step ? "current" : "upcoming"}
        >
          <span className="step-number">
            <svg viewBox="0 0 40 40" aria-hidden="true" className="step-symbol">
              {index < step ? (
                <path
                  data-step-check
                  d="M12 20l6 6 11-13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : index === step ? (
                <circle
                  data-step-ring
                  cx="20"
                  cy="20"
                  r="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="107"
                  strokeDashoffset="23"
                  transform="rotate(-90 20 20)"
                />
              ) : null}
            </svg>
            {index >= step ? <span>{index + 1}</span> : null}
          </span>
          <span className="step-copy">
            <strong>{label}</strong>
            <small>{index < step ? "Completed" : detail}</small>
          </span>
          <span className="step-dot" aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
}

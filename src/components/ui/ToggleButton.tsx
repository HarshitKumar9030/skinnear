"use client";

import type { ButtonHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { useAnimatedButton } from "@/hooks/useAnimatedButton";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean };

export function ToggleButton({ selected, children, className = "", ...props }: Props) {
  const ref = useAnimatedButton();
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={`toggle-button ${className}`}
    >
      <span className="button-feedback" aria-hidden="true" />
      <span className="toggle-check" aria-hidden="true">
        <Check size={14} />
      </span>
      {children}
    </button>
  );
}

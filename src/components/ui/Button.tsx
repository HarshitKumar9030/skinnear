"use client";

import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { useAnimatedButton } from "@/hooks/useAnimatedButton";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "text"; loading?: boolean };
export function Button({ children, variant = "primary", className = "", loading = false, disabled, ...props }: Props) {
  const ref = useAnimatedButton(loading);
  return <button {...props} ref={ref} aria-busy={loading} data-state={loading ? "loading" : disabled ? "disabled" : "ready"} disabled={disabled || loading} className={`button button-${variant} ${className}`}>
    <span className="button-feedback" aria-hidden="true" />
    <span className="button-content">{loading ? <LoaderCircle size={18} data-button-loader aria-hidden /> : null}{children}</span>
  </button>;
}

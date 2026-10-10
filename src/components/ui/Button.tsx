import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "text"; loading?: boolean };
export function Button({ children, variant = "primary", className = "", loading = false, disabled, ...props }: Props) {
  return <button {...props} aria-busy={loading} data-state={loading ? "loading" : disabled ? "disabled" : "ready"} disabled={disabled || loading} className={`button button-${variant} ${className}`}>
    {loading ? <LoaderCircle size={18} className="spin" aria-hidden /> : null}{children}
  </button>;
}

import type { ButtonHTMLAttributes } from "react";
import { Check } from "lucide-react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean };

export function ToggleButton({ selected, children, className = "", ...props }: Props) {
  return <button {...props} type="button" aria-pressed={selected} className={`toggle-button ${className}`}>
    <span className="toggle-check" aria-hidden="true"><Check size={14} /></span>{children}
  </button>;
}

import type { InputHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { children: ReactNode; className?: string };

/** Keeps native checkbox semantics and keyboard behavior beneath a custom control. */
export function Checkbox({ children, className = "", ...props }: Props) {
  return <label className={`custom-checkbox ${className}`}>
    <input {...props} type="checkbox" />
    <span className="checkbox-mark" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
    <span className="checkbox-copy">{children}</span>
  </label>;
}

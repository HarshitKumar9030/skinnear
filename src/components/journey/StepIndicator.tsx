import { Check } from "lucide-react";

export function StepIndicator({ step = 0 }: { step?: number }) {
  return <ol className="steps" aria-label="Your skincare journey">
    {["Scan your skin", "Make it yours", "Find your routine"].map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} className={index <= step ? "step-active" : ""}>
      <span className="step-number">{index < step ? <Check size={16} aria-hidden /> : index + 1}</span><span>{label}</span>
    </li>)}
  </ol>;
}

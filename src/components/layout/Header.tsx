"use client";

import { Flower, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Header({
  onHome,
  onRoutine,
  onSample,
  disabled,
}: {
  onHome: () => void;
  onRoutine: () => void;
  onSample: () => void;
  disabled: boolean;
}) {
  return (
    <header className="site-header shell">
      <button className="wordmark" onClick={onHome} aria-label="SkinNear home" disabled={disabled}>
        <Flower size={34} strokeWidth={2.5} />
        <span>SkinNear</span>
      </button>
      <nav aria-label="Main navigation">
        <button onClick={onRoutine} disabled={disabled}>
          Your routine
        </button>
        <a href="#how-it-works">How it works</a>
      </nav>
      <Button variant="secondary" className="header-cta" onClick={onSample} disabled={disabled}>
        Sample experience <ArrowRight size={17} />
      </Button>
    </header>
  );
}

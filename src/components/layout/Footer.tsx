"use client";

import { Flower, ArrowUpRight, ArrowUp } from "lucide-react";

export function Footer({
  onProducts,
  onRoutine,
  disabled = false,
}: {
  onProducts: () => void;
  onRoutine: () => void;
  disabled?: boolean;
}) {
  return (
    <footer className="site-footer shell">
      <div className="footer-main">
        <div>
          <div className="footer-brand">
            <Flower size={28} aria-hidden />
            <span>SkinNear</span>
          </div>
          <p>
            A little understanding.
            <br />
            Care that fits your everyday.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <button onClick={onProducts} disabled={disabled}>
            Products & saved list <ArrowUpRight size={16} aria-hidden />
          </button>
          <button onClick={onRoutine} disabled={disabled}>
            Your routine <ArrowUpRight size={16} aria-hidden />
          </button>
          <a href="#how-it-works">
            How it works <ArrowUpRight size={16} aria-hidden />
          </a>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>SkinNear · Skincare within reach</span>
        <button
          aria-label="Back to top"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
            })
          }
        >
          Back to top <ArrowUp size={15} aria-hidden />
        </button>
      </div>
    </footer>
  );
}

import { gsap } from "gsap";

/** Short progress feedback; static final state remains available without motion. */
export class StepAnimationController {
  private readonly media: gsap.MatchMedia;

  constructor(root: HTMLElement) {
    this.media = gsap.matchMedia(root);
    this.media.add("(prefers-reduced-motion: no-preference)", () => {
      const select = gsap.utils.selector(root);
      gsap.fromTo(
        select('[data-step-state="current"]'),
        { y: 4, opacity: 0.6 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
      );
      gsap.fromTo(
        select('[data-step-state="current"] .step-number'),
        { scale: 0.8 },
        { scale: 1, duration: 0.6, ease: "back.out(1.8)" },
      );
      gsap.fromTo(
        select("[data-step-ring]"),
        { attr: { "stroke-dashoffset": 107 } },
        { attr: { "stroke-dashoffset": 23 }, duration: 0.8, ease: "power2.out" },
      );
      const checks = select("[data-step-check]");
      if (checks.length)
        gsap.fromTo(
          checks,
          { attr: { "stroke-dasharray": 29, "stroke-dashoffset": 29 } },
          { attr: { "stroke-dashoffset": 0 }, duration: 0.5, stagger: 0.12, ease: "power2.out" },
        );
    });
  }

  dispose() {
    this.media.revert();
  }
}

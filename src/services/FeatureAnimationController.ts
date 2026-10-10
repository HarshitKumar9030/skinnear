import { gsap } from "gsap";

/** Owns scoped SVG timelines and their viewport, motion-preference, and page lifecycle. */
export class FeatureAnimationController {
  private readonly media: gsap.MatchMedia;
  private readonly timelines = new Map<SVGSVGElement, gsap.core.Timeline>();
  private readonly visible = new Set<SVGSVGElement>();
  private observer?: IntersectionObserver;
  private paused = false;

  constructor(private readonly root: HTMLElement) {
    this.media = gsap.matchMedia(root);
    this.media.add("(prefers-reduced-motion: no-preference)", () => {
      root.querySelectorAll<SVGSVGElement>("[data-feature-scene]").forEach((svg) => {
        const timeline = this.createTimeline(svg);
        this.timelines.set(svg, timeline);
      });
      if (typeof IntersectionObserver !== "undefined") {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const svg = entry.target as SVGSVGElement;
            if (entry.isIntersecting) this.visible.add(svg); else this.visible.delete(svg);
          });
          this.sync();
        }, { threshold: 0.25 });
        this.timelines.forEach((_, svg) => this.observer?.observe(svg));
      } else this.timelines.forEach((_, svg) => this.visible.add(svg));
      this.sync();
      return () => {
        this.observer?.disconnect();
        this.timelines.clear();
        this.visible.clear();
        root.dataset.motionState = "reduced";
      };
    });
    root.dataset.motionState ||= "reduced";
    document.addEventListener("visibilitychange", this.sync);
  }

  setPaused(paused: boolean) { this.paused = paused; this.sync(); }

  private readonly sync = () => {
    this.timelines.forEach((timeline, svg) => {
      const playing = !this.paused && !document.hidden && this.visible.has(svg);
      if (playing) timeline.play(); else timeline.pause();
      svg.dataset.motionState = playing ? "playing" : "paused";
    });
    this.root.dataset.motionState = !this.timelines.size ? "reduced" : this.paused ? "paused" : "enabled";
  };

  private createTimeline(svg: SVGSVGElement): gsap.core.Timeline {
    const select = gsap.utils.selector(svg);
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.2, defaults: { ease: "power2.inOut" } });
    switch (svg.dataset.featureScene) {
      case "scan":
        tl.set(select("[data-scan-marks]"), { opacity: 1 })
          .fromTo(select("[data-scan-beam]"), { y: -25, opacity: 0 }, { y: 65, opacity: 1, duration: 2 })
          .fromTo(select("[data-scan-marks] circle"), { scale: 0, opacity: 0, transformOrigin: "center" }, { scale: 1, opacity: 1, stagger: .18, duration: .45 }, .8)
          .fromTo(select("[data-scan-mesh]"), { opacity: 0 }, { opacity: .5, duration: .8 }, .8)
          .fromTo(select("[data-scan-result]"), { x: -8, opacity: 0 }, { x: 0, opacity: 1, stagger: .2, duration: .6 }, 1.8)
          .to(select("[data-scan-beam]"), { opacity: 0, duration: .4 }, 2.1)
          .to(select("[data-scan-result], [data-scan-marks], [data-scan-mesh]"), { opacity: 0, duration: .5 }, 4.3);
        break;
      case "budget":
        tl.fromTo(select("[data-budget-coin]"), { y: -22, scale: 1, opacity: 0 }, { y: 0, opacity: 1, stagger: .3, duration: .7, ease: "back.out(1.5)" })
          .to(select("[data-budget-coin]"), { y: 54, scale: .6, opacity: 0, transformOrigin: "center", stagger: .25, duration: .65 }, 1.4)
          .fromTo(select("[data-budget-meter]"), { attr: { width: 5 } }, { attr: { width: 49 }, duration: 1.4 }, .6)
          .fromTo(select("[data-budget-check]"), { scale: .65, opacity: 0, transformOrigin: "center" }, { scale: 1, opacity: 1, duration: .6, ease: "back.out(1.8)" }, 2)
          .fromTo(select("[data-budget-check-path]"), { attr: { "stroke-dasharray": 30, "stroke-dashoffset": 30 } }, { attr: { "stroke-dashoffset": 0 }, duration: .5 }, 2.3)
          .to(select("[data-budget-check]"), { opacity: 0, duration: .4 }, 4.3);
        break;
      case "shopping": {
        const route = svg.querySelector<SVGPathElement>("[data-shopping-route]")!;
        const length = route.getTotalLength();
        tl.fromTo(route, { opacity: 1, attr: { "stroke-dasharray": length, "stroke-dashoffset": length } }, { opacity: 1, attr: { "stroke-dashoffset": 0 }, duration: 1.8 }, .6)
          .fromTo(select("[data-shopping-pin]"), { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: "back.out(2)" }, 0)
          .fromTo(select("[data-shopping-pulse]"), { scale: .6, opacity: .8, transformOrigin: "center" }, { scale: 2, opacity: 0, duration: 1.2 }, .5)
          .fromTo(select("[data-shopping-store]"), { y: 8, opacity: .3 }, { y: 0, opacity: 1, duration: .5 }, 2)
          .fromTo(select("[data-shopping-bag]"), { y: 9, scale: .7, opacity: 0, transformOrigin: "center" }, { y: 0, scale: 1, opacity: 1, duration: .6, ease: "back.out(1.6)" }, 2.4)
          .fromTo(select("[data-shopping-delivery]"), { x: 0, y: 0, opacity: 0 }, { x: 55, y: 0, opacity: 1, duration: .7, ease: "none" }, .8)
          .to(select("[data-shopping-delivery]"), { x: 68, y: -50, duration: .6, ease: "none" }, 1.5)
          .to(select("[data-shopping-delivery]"), { x: 151, y: -50, duration: .8, ease: "power1.out" }, 2.1)
          .to(select("[data-shopping-delivery]"), { opacity: 0, duration: .4 }, 3.1)
          .to(select("[data-shopping-bag], [data-shopping-route]"), { opacity: 0, duration: .5 }, 4.3);
        break;
      }
      case "upload":
        tl.fromTo(select("[data-upload-ring]"), { scale: .8, opacity: .8, transformOrigin: "center" }, { scale: 1.45, opacity: 0, duration: 1.6 })
          .fromTo(select("[data-upload-lens]"), { scale: 1, transformOrigin: "center" }, { scale: .75, duration: .5, repeat: 1, yoyo: true }, .4)
          .fromTo(select("[data-upload-photo]"), { y: 10, rotation: -8, opacity: .3, transformOrigin: "center" }, { y: 0, rotation: -4, opacity: 1, duration: .9, ease: "back.out(1.5)" }, .5)
          .fromTo(select("[data-upload-spark]"), { scale: .6, opacity: .2, transformOrigin: "center" }, { scale: 1, opacity: 1, duration: .5, repeat: 1, yoyo: true }, 1)
          .to(select("[data-upload-photo]"), { y: -3, duration: .8, repeat: 1, yoyo: true }, 2);
        break;
    }
    return tl;
  }

  dispose() {
    document.removeEventListener("visibilitychange", this.sync);
    this.media.revert();
    delete this.root.dataset.motionState;
    this.root.querySelectorAll("[data-feature-scene]").forEach((svg) => svg.removeAttribute("data-motion-state"));
  }
}

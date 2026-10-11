import { gsap } from "gsap";

/** GSAP button feedback shared by primary actions and pressed choice controls. */
export class ButtonAnimationController {
  private readonly media: gsap.MatchMedia;

  constructor(button: HTMLButtonElement) {
    this.media = gsap.matchMedia(button);
    this.media.add("(prefers-reduced-motion: no-preference)", (context) => {
      const feedback = button.querySelector<HTMLElement>(".button-feedback");
      const icons = button.querySelectorAll<SVGElement>(
        ".button-content > svg:not([data-button-loader])",
      );
      let hovered = false;
      context.add("hover", () => {
        if (button.disabled) return;
        gsap.to(button, {
          y: -3,
          scale: 1.025,
          duration: 0.35,
          ease: "back.out(2)",
          overwrite: "auto",
        });
        if (icons.length)
          gsap.to(icons, { x: 2, y: -1, duration: 0.3, ease: "power2.out", overwrite: "auto" });
      });
      context.add("rest", () => {
        gsap.to(button, {
          y: 0,
          scale: 1,
          duration: 0.4,
          ease: "elastic.out(1, 0.5)",
          overwrite: "auto",
        });
        if (icons.length) gsap.to(icons, { x: 0, y: 0, duration: 0.3, overwrite: "auto" });
      });
      context.add("press", () => {
        if (button.disabled) return;
        gsap.to(button, {
          y: 0,
          scale: 0.96,
          duration: 0.12,
          ease: "power2.out",
          overwrite: "auto",
        });
        if (feedback)
          gsap.fromTo(
            feedback,
            { scale: 0.25, opacity: 0.24 },
            { scale: 1.5, opacity: 0, duration: 0.65, ease: "power2.out", overwrite: true },
          );
      });
      const enter = (event: PointerEvent) => {
        if (event.pointerType === "mouse") {
          hovered = true;
          context.hover();
        }
      };
      const leave = () => {
        hovered = false;
        context.rest();
      };
      const press = () => context.press();
      const release = () => {
        if (hovered) context.hover();
        else context.rest();
      };
      const keydown = (event: KeyboardEvent) => {
        if (!event.repeat && (event.key === "Enter" || event.key === " ")) context.press();
      };
      const keyup = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") context.rest();
      };
      const loader = button.querySelector("[data-button-loader]");
      if (loader)
        gsap.to(loader, {
          rotation: 360,
          transformOrigin: "center",
          duration: 1,
          repeat: -1,
          ease: "none",
        });
      button.addEventListener("pointerenter", enter);
      button.addEventListener("pointerleave", leave);
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", leave);
      button.addEventListener("keydown", keydown);
      button.addEventListener("keyup", keyup);
      button.addEventListener("blur", leave);
      return () => {
        button.removeEventListener("pointerenter", enter);
        button.removeEventListener("pointerleave", leave);
        button.removeEventListener("pointerdown", press);
        button.removeEventListener("pointerup", release);
        button.removeEventListener("pointercancel", leave);
        button.removeEventListener("keydown", keydown);
        button.removeEventListener("keyup", keyup);
        button.removeEventListener("blur", leave);
      };
    });
  }

  dispose() {
    this.media.revert();
  }
}

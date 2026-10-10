"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { FeatureIllustration, type FeatureScene } from "./FeatureIllustration";
import type { FeatureAnimationController } from "@/services/FeatureAnimationController";

const features = [
  { title: "Understand your skin.", description: "Visible skin insights, explained simply. A thoughtful starting point for your everyday care.", scene: "scan" as const, tone: "lavender" },
  { title: "Stay within budget.", description: "Plan the whole routine, not just one product. Use what you own and explore alternatives.", scene: "budget" as const, tone: "sage" },
  { title: "Shop closer to home.", description: "Discover regional seller listings. Check stock and delivery directly with the retailer.", scene: "shopping" as const, tone: "rose" },
];

function FeatureCard({ title, description, scene, tone, index }: { title: string; description: string; scene: FeatureScene; tone: string; index: number }) {
  return <article className={`feature-card ${tone}`}><span className="feature-index">0{index + 1}</span><FeatureIllustration scene={scene} /><h3>{title}</h3><p>{description}</p></article>;
}

export function HowItWorks() {
  const cards = useRef<HTMLDivElement>(null);
  const animation = useRef<FeatureAnimationController | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => {
    const node = cards.current;
    if (!node) return;
    let disposed = false;
    // SVGs render immediately; GSAP is loaded separately from the initial screen.
    import("@/services/FeatureAnimationController").then(({ FeatureAnimationController }) => {
      if (disposed) return;
      animation.current = new FeatureAnimationController(node);
      animation.current.setPaused(pausedRef.current);
    });
    return () => { disposed = true; animation.current?.dispose(); animation.current = null; };
  }, []);
  function toggleMotion() {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    animation.current?.setPaused(pausedRef.current);
  }
  return <section className="how-it-works shell" id="how-it-works">
    <div className="feature-heading"><h2>A routine made for real life.</h2><button className="feature-motion-toggle" onClick={toggleMotion} aria-pressed={paused}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "Play animations" : "Pause animations"}</button></div>
    <div className="feature-columns" ref={cards}>{features.map((feature, index) => <FeatureCard key={feature.title} {...feature} index={index} />)}</div>
  </section>;
}

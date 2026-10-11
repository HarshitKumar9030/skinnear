"use client";

import { useEffect, useRef } from "react";
import { FeatureIllustration } from "./FeatureIllustration";
import type { FeatureAnimationController } from "@/services/FeatureAnimationController";

export function AnimatedScanMark() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let disposed = false;
    let animation: FeatureAnimationController | undefined;
    import("@/services/FeatureAnimationController").then(({ FeatureAnimationController }) => {
      if (!disposed) animation = new FeatureAnimationController(node);
    });
    return () => {
      disposed = true;
      animation?.dispose();
    };
  }, []);
  return (
    <div ref={root} className="animated-scan-mark">
      <FeatureIllustration scene="upload" />
    </div>
  );
}

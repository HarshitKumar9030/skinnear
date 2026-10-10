"use client";

import { useEffect, useRef } from "react";
import type { ButtonAnimationController } from "@/services/ButtonAnimationController";

export function useAnimatedButton(loading = false) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let disposed = false;
    let animation: ButtonAnimationController | undefined;
    import("@/services/ButtonAnimationController").then(({ ButtonAnimationController }) => {
      if (!disposed) animation = new ButtonAnimationController(node);
    });
    return () => { disposed = true; animation?.dispose(); };
  }, [loading]);
  return ref;
}

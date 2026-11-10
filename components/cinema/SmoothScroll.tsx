"use client";

import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window { __lenis?: Lenis }
}

/** Inertial, film-like scrolling. Disabled for users who prefer reduced motion. */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.085, // long, fluid glide
      smoothWheel: true,
    });
    window.__lenis = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useRef, useState } from "react";

export interface Scene { id: string; title: string }

/**
 * Minimal scene index on the right edge: one tick per scene, the current one
 * long and red, with its name. Scenes are passed in (no DOM scraping), and
 * state only changes when the active scene changes — not on every scroll frame.
 */
export default function SceneHUD({ scenes }: { scenes: Scene[] }) {
  const [active, setActive] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const pick = () => {
      ticking.current = false;
      const mid = window.innerHeight * 0.5;
      let idx = 0;
      scenes.forEach((s, i) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= mid) idx = i;
      });
      setActive((prev) => (prev === idx ? prev : idx));
    };
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(pick);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scenes]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { duration: 1.4 });
    else el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav aria-label="Scenes" className="hidden lg:flex fixed right-5 top-1/2 -translate-y-1/2 z-40 flex-col items-end gap-3.5">
      {scenes.map((s, i) => (
        <button
          key={s.id}
          onClick={() => jump(s.id)}
          className="group flex items-center gap-3 cursor-pointer"
          aria-label={`Scene ${i + 1}: ${s.title}`}
          aria-current={i === active ? "step" : undefined}
        >
          <span
            className={`font-mono text-[9px] uppercase tracking-[0.3em] transition-opacity duration-300 ${
              i === active ? "opacity-100 text-bone" : "opacity-0 group-hover:opacity-100 text-bone/50"
            }`}
          >
            {String(i + 1).padStart(2, "0")} {s.title}
          </span>
          <span
            className="block h-px transition-all duration-500"
            style={{ width: i === active ? 32 : 12, background: i === active ? "#E10600" : "rgba(241,241,241,0.3)" }}
          />
        </button>
      ))}
    </nav>
  );
}

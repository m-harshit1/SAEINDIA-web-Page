"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HERO, LIGHT_STEP, type HeroClock } from "./heroTimeline";
import { CINE_EASE } from "./primitives";
import TachLoader from "./TachLoader";

type Phase = "card" | "lights" | "title" | "story";

/**
 * Type layer for the cold open, locked to the shared hero clock:
 *   card   — B-26 rev-counter loader driven by real download progress (TachLoader)
 *   lights — five start lights come on one by one; lights out = the drop
 *   title  — B-26 slams in on impact, live speedo during the race
 *   story  — the line that hands over to the scroll story
 */
export default function HeroOverlay({
  hero, load, bytes, onSkip,
}: {
  hero: React.RefObject<HeroClock>;
  load: React.RefObject<number>;
  bytes: React.RefObject<{ loaded: number; total: number }>;
  onSkip: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("card");
  const [litCount, setLitCount] = useState(0);
  const speedo = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const h = hero.current;
      const t = h?.started ? h.t : -1;
      const next: Phase = t < HERO.lights ? "card" : t < HERO.impact ? "lights" : t < HERO.rewind ? "title" : "story";
      setPhase((p) => (p === next ? p : next));

      // Start lights: one every LIGHT_STEP, all out at the drop.
      const lit = t < HERO.lights || t >= HERO.drop ? 0 : Math.min(5, 1 + Math.floor((t - HERO.lights) / LIGHT_STEP));
      setLitCount((c) => (c === lit ? c : lit));

      if (speedo.current) {
        const u = Math.min(1, Math.max(0, (t - HERO.race) / (HERO.rewind - HERO.race - 0.4)));
        speedo.current.textContent = (75.2 * (1 - Math.pow(1 - u, 3))).toFixed(1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hero, load]);

  const chars = ["B", "—", "2", "6"];

  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-20 pointer-events-none select-none"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      {/* Letterbox */}
      <motion.div className="absolute inset-x-0 top-0 bg-black" initial={{ height: "0vh" }} animate={{ height: "7vh" }} exit={{ height: "0vh" }} transition={{ duration: 0.9, ease: CINE_EASE }} />
      <motion.div className="absolute inset-x-0 bottom-0 bg-black" initial={{ height: "0vh" }} animate={{ height: "7vh" }} exit={{ height: "0vh" }} transition={{ duration: 0.9, ease: CINE_EASE }} />

      <AnimatePresence mode="wait">
        {/* ── Title card: B-26's rev counter is the loader ── */}
        {phase === "card" && (
          <motion.div
            key="card"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.8 } }}
            exit={{ opacity: 0, scale: 1.12, transition: { duration: 0.45, ease: CINE_EASE } }}
          >
            <TachLoader hero={hero} load={load} bytes={bytes} />
          </motion.div>
        )}

        {/* ── Start lights ───────────────────────────────── */}
        {phase === "lights" && (
          <motion.div
            key="lights"
            className="absolute inset-x-0 top-[13vh] flex flex-col items-center"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: CINE_EASE } }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
          >
            <div className="glass flex gap-3 sm:gap-4 px-5 py-4 rounded-full">
              {[0, 1, 2, 3, 4].map((i) => {
                const on = i < litCount;
                return (
                  <span
                    key={i}
                    className="relative w-7 h-7 sm:w-9 sm:h-9 rounded-full transition-all duration-100"
                    style={{
                      background: on
                        ? "radial-gradient(circle at 35% 30%, #FFD2C8 0%, #FF3A1A 28%, #C20500 62%, #5A0200 100%)"
                        : "radial-gradient(circle at 35% 30%, #3A3A3E 0%, #151517 55%, #050506 100%)",
                      boxShadow: on
                        ? "0 0 22px 4px rgba(255,40,10,0.75), inset 0 1px 1px rgba(255,255,255,0.5)"
                        : "inset 0 1px 1px rgba(255,255,255,0.12), inset 0 -2px 4px rgba(0,0,0,0.8)",
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.4em] text-white/70">
              {litCount === 0 ? "Lights out" : "Stand by"}
            </p>
          </motion.div>
        )}

        {/* ── Impact title + race ────────────────────────── */}
        {phase === "title" && (
          <motion.div key="title" className="absolute inset-0" exit={{ opacity: 0, transition: { duration: 0.35 } }}>
            {/* Lower-third title card: credit · title · speed, sharing one baseline under the car */}
            <div className="absolute inset-x-5 sm:inset-x-10 top-[19vh] sm:top-auto sm:bottom-[calc(7vh+5vh)] grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end justify-items-center sm:justify-items-stretch gap-4">
              <motion.div
                className="hidden sm:block pb-2"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.25, ease: CINE_EASE }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/55">Off-road racer</p>
                <p className="mt-1.5 font-display font-medium text-white/90 text-lg tracking-[-0.01em]">
                  <span className="text-apex-red">●</span> Season 2025–26
                </p>
              </motion.div>

              <h1
                className="gloss-text-static whitespace-nowrap font-display font-semibold tracking-[-0.06em] leading-[0.82] text-center text-[clamp(4.5rem,11vw,10.5rem)]"
                aria-label="B-26"
              >
                {chars.map((c, i) => (
                  <motion.span
                    key={i}
                    className={`inline-block ${c === "—" ? "[-webkit-text-fill-color:#E10600]" : ""}`}
                    initial={{ y: "-40%", scale: 1.5, opacity: 0 }}
                    animate={{ y: "0%", scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 26, mass: 0.9, delay: i * 0.045 }}
                  >
                    {c}
                  </motion.span>
                ))}
              </h1>

              <motion.div
                className="hidden sm:block text-right pb-2"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: HERO.race - HERO.impact - 0.1, ease: CINE_EASE }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/55">Speed</p>
                <p className="mt-1 font-display font-medium text-white tabular-nums tracking-[-0.03em] text-4xl leading-none">
                  <span ref={speedo}>0.0</span>
                  <span className="text-sm text-white/55 ml-1.5 tracking-normal font-normal">km/h</span>
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ── Handover line ──────────────────────────────── */}
        {phase === "story" && (
          <motion.div
            key="story"
            className="absolute inset-0 flex items-start sm:items-end justify-center px-6 pt-[20vh] sm:pt-0 sm:pb-[16vh] text-center"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: CINE_EASE } }}
            exit={{ opacity: 0 }}
          >
            <p className="font-display font-medium text-white tracking-[-0.03em] text-3xl sm:text-5xl">
              But every machine <span className="font-serif-i gloss-red tracking-[-0.01em]">starts as a story.</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onSkip}
        className="btn-glass pointer-events-auto absolute right-5 sm:right-10 top-[calc(7vh+16px)] rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/85 cursor-pointer"
      >
        Skip intro
      </button>
    </motion.div>
  );
}

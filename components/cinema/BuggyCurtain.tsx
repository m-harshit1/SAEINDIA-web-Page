"use client";

import React, { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

export interface CurtainRun { id: number; label: string; color: string }

const CLOSE_S = 0.28;
const HOLD_S = 0.08;
const OPEN_S = 0.72; // quick, high-speed buggy sprint across the screen
/** Buggy length: a real hero on every screen — ~a third of desktop, ~60% of a phone. */
const buggyWidth = (W: number) => Math.round(Math.min(460, Math.max(220, W < 768 ? W * 0.6 : W * 0.32)));

/**
 * Tab-change transition: a velvet curtain draws closed, the page swaps behind it, then the B-26
 * races along the curtain's edge and drives it back to the side — revealing the new page in its
 * wake. Desktop: left → right. Phones: top → bottom (buggy nose-down).
 */
export default function BuggyCurtain({
  run, onCovered, onDone,
}: {
  run: CurtainRun | null;
  onCovered: () => void;
  onDone: () => void;
}) {
  const cover = useMotionValue(0);   // 0 = open (gathered at the far edge), 1 = fully closed
  const seam = useMotionValue(-1);    // position of the curtain's leading edge while the buggy drives it
  const textOpacity = useMotionValue(0);
  const span = useMotionValue(1200);  // screen length along the run axis
  const bw = useMotionValue(320);     // buggy length

  const curtainScale = useTransform([cover, seam, span], ([c, s, L]: number[]) =>
    s < 0 ? c : Math.max(0, 1 - s / L));
  const hemPos = useTransform([cover, seam, span], ([c, s, L]: number[]) => (s < 0 ? L * (1 - c) : s));
  const buggyPos = useTransform([seam, bw], ([s, b]: number[]) => s - b * 0.82);
  const buggyCenter = useTransform([seam, bw], ([s, b]: number[]) => s - b * 0.32);

  // Phones run the whole transition vertically. Only evaluated client-side (run exists after a tap).
  const vertical = run !== null && typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    if (!run) return;
    let cancelled = false;
    const isV = window.innerWidth < 768;
    const L = isV ? window.innerHeight : window.innerWidth;
    span.set(L);
    bw.set(buggyWidth(window.innerWidth));
    cover.set(0); seam.set(-1); textOpacity.set(0);
    (async () => {
      // 1 · draw closed
      animate(textOpacity, 1, { duration: 0.16, delay: 0.08 });
      await animate(cover, 1, { duration: CLOSE_S, ease: [0.76, 0, 0.24, 1] });
      if (cancelled) return;
      // 2 · swap the page behind the curtain, give it a moment to paint
      onCovered();
      await new Promise((r) => setTimeout(r, HOLD_S * 1000));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      if (cancelled) return;
      // 3 · the buggy races along the edge and drives the curtain back
      animate(textOpacity, 0, { duration: 0.15 });
      seam.set(0);
      window.dispatchEvent(new CustomEvent("sae:rev", { detail: { amount: 0.85, ms: OPEN_S * 1000 } })); // the buggy floors it
      await animate(seam, L + bw.get() * 0.9, { duration: OPEN_S, ease: [0.35, 0, 0.3, 1] });
      if (!cancelled) onDone();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id]);

  if (!run) return null;

  return (
    <div aria-hidden className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden">
      {/* The steel shutter: brushed gunmetal slats that fold up toward the far edge as it opens */}
      <motion.div
        className={`absolute inset-0 ${vertical ? "shutter-steel-v origin-bottom" : "shutter-steel origin-right"}`}
        style={vertical ? { scaleY: curtainScale } : { scaleX: curtainScale }}
      />
      {/* Leading edge: a steel bottom bar carrying the glowing red racing line */}
      <motion.div
        className={vertical ? "shutter-bar-v absolute left-0 right-0 h-4" : "shutter-bar absolute top-0 bottom-0 w-4"}
        style={vertical ? { y: hemPos } : { x: hemPos }}
      />

      {/* "Cut to" title on the closed curtain */}
      <motion.div
        className="absolute inset-0 flex flex-col sm:flex-row items-center justify-center gap-2 font-display font-medium text-xl sm:text-3xl tracking-[-0.01em] text-white"
        style={{ opacity: textOpacity }}
      >
        <span className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.45em] text-white/60 sm:mr-4">Cut to</span>
        <span className="font-serif-i gloss-red text-4xl sm:text-5xl [filter:drop-shadow(0_2px_0_rgba(0,0,0,0.85))]">{run.label}</span>
      </motion.div>

      {/* The B-26, racing along the curtain's edge */}
      {vertical ? (
        <motion.div className="absolute left-1/2 top-0" style={{ y: buggyCenter }}>
          <motion.div className="-translate-x-1/2 -translate-y-1/2 rotate-90" style={{ width: bw }}>
            <SideBuggy />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div className="absolute bottom-[12vh] left-0" style={{ x: buggyPos, width: bw }}>
          <SideBuggy />
        </motion.div>
      )}
    </div>
  );
}

/** Original side-view illustration of the B-26 (gloss-black body, red roll cage), facing right,
    lit so it reads clearly against the dark page: red underglow, rim light, headlight beam. */
function SideBuggy() {
  return (
    <div className="relative">
      {/* red underglow + halo so the silhouette separates from the dark background */}
      <div className="absolute inset-x-[6%] bottom-[2%] h-[38%] rounded-[50%] bg-apex-red/45 blur-2xl" />
      <div className="absolute inset-[-12%] rounded-full bg-[radial-gradient(closest-side,rgba(255,60,30,0.22),transparent)]" />
      {/* headlight beam */}
      <div className="absolute left-[92%] top-[46%] w-[55%] h-[26%] origin-left bg-gradient-to-r from-white/45 via-white/10 to-transparent [clip-path:polygon(0_40%,100%_0,100%_100%,0_60%)]" />
      {/* speed streaks */}
      <div className="absolute right-[90%] top-[22%] w-[70vw] max-w-[560px] h-[58%] flex flex-col justify-between">
        {[1, 0.6, 0.85, 0.45, 0.7].map((o, i) => (
          <span key={i} className="block h-[3px] rounded-full bg-gradient-to-l from-white to-transparent" style={{ opacity: o, marginLeft: `${(i * 17) % 40}%` }} />
        ))}
      </div>
      {/* dust kicked up by the rear wheel */}
      <div className="absolute left-[2%] bottom-[4%] flex gap-2">
        {[26, 34, 20, 28].map((sz, i) => (
          <span key={i} className="curtain-dust block rounded-full bg-[#b9a998]/45" style={{ width: sz, height: sz, animationDelay: `${i * 0.07}s` }} />
        ))}
      </div>

      <svg viewBox="0 0 220 110" className="relative w-full h-auto drop-shadow-[0_18px_24px_rgba(0,0,0,0.8)]">
        <defs>
          <linearGradient id="bc-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a3a44" />
            <stop offset="35%" stopColor="#141418" />
            <stop offset="100%" stopColor="#050506" />
          </linearGradient>
          <linearGradient id="bc-cage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5A3C" />
            <stop offset="100%" stopColor="#B00400" />
          </linearGradient>
        </defs>
        <ellipse cx="112" cy="103" rx="96" ry="5" fill="rgba(0,0,0,0.7)" />
        {/* suspension */}
        <path d="M58 72 L84 61 M160 72 L136 61" stroke="#55555f" strokeWidth="4" strokeLinecap="round" />
        <path d="M60 64 L75 49 M158 64 L145 49" stroke="url(#bc-cage)" strokeWidth="3" strokeLinecap="round" />
        {/* body tub with a bright top edge */}
        <path d="M42 66 L66 53 L168 53 L188 64 L181 75 L51 77 Z" fill="url(#bc-body)" stroke="#5a5a66" strokeWidth="1.6" />
        <path d="M68 55.5 L166 55.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M178 62 L186 64" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        {/* roll cage */}
        <path d="M74 55 L92 16 L140 16 L158 55" fill="none" stroke="url(#bc-cage)" strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M92 16 L118 55 M140 16 L128 40" stroke="url(#bc-cage)" strokeWidth="2.6" />
        <path d="M140 16 L158 29 L166 53" fill="rgba(225,6,0,0.6)" stroke="#FF3B1F" strokeWidth="2" />
        <path d="M93 17 L139 17" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" />
        {/* driver */}
        <circle cx="114" cy="33" r="10.5" fill="#1d1d22" stroke="#6a6a75" strokeWidth="1.6" />
        <path d="M117 29.5 h8.5 a3.2 3.2 0 0 1 0 6.4 h-8.5 z" fill="#FF3B1F" />
        <path d="M108 26 a9 9 0 0 1 9 -2" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" fill="none" />
        {/* engine */}
        <rect x="58" y="42" width="20" height="13" rx="2" fill="#2e2e36" stroke="#5a5a66" strokeWidth="1" />
        {/* wheels with bright rims */}
        {[58, 160].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="80" r="22" fill="#0a0a0c" stroke="#3a3a42" strokeWidth="4" />
            <g className="curtain-wheel" style={{ transformOrigin: `${cx}px 80px` }}>
              <circle cx={cx} cy="80" r="11" fill="#c9c9d1" />
              <path d={`M${cx - 10} 80 H${cx + 10} M${cx} 70 V90 M${cx - 7} 73 L${cx + 7} 87 M${cx + 7} 73 L${cx - 7} 87`} stroke="#4a4a52" strokeWidth="2" />
              <circle cx={cx} cy="80" r="3.5" fill="#E10600" />
            </g>
            <path d={`M${cx - 15} 64 a22 22 0 0 1 22 -6`} stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none" />
          </g>
        ))}
      </svg>
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import { type HeroClock } from "./heroTimeline";
import { engine } from "./engine";

/* Dial geometry: a 270° arc from bottom-left (135°) clockwise to bottom-right (45°). */
const SIZE = 400, C = SIZE / 2, R = 158;
const START = 135, SWEEP = 270, MAX = 10; // ×1000 rpm
const REDLINE = 8;
const ARC_LEN = 2 * Math.PI * R * (SWEEP / 360);

/** Rounded so server and browser render identical numbers (no hydration mismatch). */
const r2 = (n: number) => Math.round(n * 100) / 100;
const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [r2(C + Math.cos(a) * r), r2(C + Math.sin(a) * r)] as const;
};
const angleFor = (rpm: number) => START + (rpm / MAX) * SWEEP;
function arcPath(from: number, to: number, r: number) {
  const [x1, y1] = polar(angleFor(from), r);
  const [x2, y2] = polar(angleFor(to), r);
  const large = ((to - from) / MAX) * SWEEP > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/* Stages on the 0–1 load scale: 0–0.8 download, 0.8–0.95 decode, 1 ready. */
const CHECKS = [
  { at: 0.4, label: "Chassis" },
  { at: 0.8, label: "Decoder" },
  { at: 0.95, label: "Shaders" },
  { at: 1.0, label: "Telemetry" },
];

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * First impression, EV-cluster style: a frosted-glass dial whose rim catches an
 * orbiting reflection, a thin precise arc with a glowing tip, light numerals.
 * Real download progress drives it to 8k; at ignition it sweeps into the redline.
 */
export default function TachLoader({
  hero, load, bytes,
}: {
  hero: React.RefObject<HeroClock>;
  load: React.RefObject<number>;
  bytes: React.RefObject<{ loaded: number; total: number }>;
}) {
  const arc = useRef<SVGPathElement>(null);
  const tip = useRef<SVGCircleElement>(null);
  const tipGlow = useRef<SVGCircleElement>(null);
  const rpmText = useRef<HTMLSpanElement>(null);
  const pctText = useRef<HTMLSpanElement>(null);
  const statusText = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(0);
  const [ignition, setIgnition] = useState(false);
  const shown = useRef(0);

  useEffect(() => {
    let raf = 0;
    const born = performance.now();
    const tick = () => {
      const h = hero.current;
      const now = performance.now();
      const real = load.current ?? 0;
      const creep = 0.06 * (1 - Math.exp(-(now - born) / 1200));
      // Ease the displayed value toward the real one so jumps become sweeps.
      shown.current += (Math.min(0.99, Math.max(real, creep)) - shown.current) * 0.12;
      const p = h?.started ? 1 : shown.current;

      // An engine that's running while it waits: idle shudder + a throttle blip every ~1.6 s.
      const t = (now - born) / 1000;
      const phase = (t % 1.6) / 1.6;
      const blip = phase < 0.06 ? phase / 0.06 : Math.exp(-(phase - 0.06) * 9);
      const idle = h?.started ? 0 : 0.12 * Math.sin(t * 31) + 0.07 * Math.sin(t * 17.3) + 0.9 * blip;
      let rpm = Math.max(0, p * REDLINE * 0.92 + idle);
      if (h?.started) {
        const t = h.t;
        rpm = t < 0.4 ? REDLINE + (MAX - REDLINE) * easeOut(t / 0.4) : MAX - 2.5 * easeOut((t - 0.4) / 0.6);
      }

      if (arc.current) arc.current.style.strokeDashoffset = String(ARC_LEN * (1 - rpm / MAX));
      const [x, y] = polar(angleFor(rpm), R);
      tip.current?.setAttribute("cx", String(x)); tip.current?.setAttribute("cy", String(y));
      tipGlow.current?.setAttribute("cx", String(x)); tipGlow.current?.setAttribute("cy", String(y));
      if (rpmText.current) rpmText.current.textContent = rpm.toFixed(1);
      if (pctText.current) pctText.current.textContent = String(h?.started ? 100 : Math.round(p * 100));
      if (statusText.current) {
        const b = bytes.current;
        statusText.current.textContent = h?.started
          ? "Engine ready"
          : real < 0.8
            ? `Downloading · ${Math.round(b.loaded / 1024)} / ${Math.round(b.total / 1024)} KB`
            : "Decoding mesh · preparing shaders";
      }

      const n = CHECKS.filter((c) => p >= c.at - 1e-6).length;
      setDone((d) => (d === n ? d : n));
      setIgnition((g) => g || !!h?.started);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hero, load, bytes]);

  // Fine ticks every 0.25k, numerals on the thousands.
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= MAX * 4; i++) {
    const v = i / 4, major = i % 4 === 0, red = v >= REDLINE;
    const [x1, y1] = polar(angleFor(v), R - 16);
    const [x2, y2] = polar(angleFor(v), R - (major ? 28 : 21));
    ticks.push(
      <line key={`t${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={red ? "rgba(255,59,31,0.9)" : major ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.22)"}
        strokeWidth={major ? 1.6 : 1} strokeLinecap="round" />,
    );
    if (major) {
      const [lx, ly] = polar(angleFor(v), R - 44);
      ticks.push(
        <text key={`l${i}`} x={lx} y={ly} fill={red ? "#FF5A3C" : "rgba(255,255,255,0.6)"} fontSize="12.5"
          fontFamily="var(--font-inter-tight)" fontWeight="500" textAnchor="middle" dominantBaseline="central">{v}</text>,
      );
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050506]">
      {/* Ambient light: slow, soft red blooms — no grids, no scanlines */}
      <div aria-hidden className="loader-bloom absolute left-1/2 top-1/2 w-[110vmin] h-[110vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(225,6,0,0.32),transparent_60%)]" />
      <div aria-hidden className="loader-bloom-2 absolute left-[30%] top-[70%] w-[70vmin] h-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(140,4,0,0.35),transparent_65%)]" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
        <p className="font-display font-medium text-white/90 text-sm sm:text-[15px] tracking-[0.32em] uppercase">
          SAEINDIA <span className="text-apex-red mx-1">/</span> IIITDM Kurnool
        </p>
        <p className="mt-1.5 font-serif-i text-white/55 text-lg">presents</p>

        {/* The dial */}
        <div className={`relative mt-6 w-[min(80vw,380px)] aspect-square ${ignition ? "dial-ignite" : ""}`}>
          {/* frosted glass disc */}
          <div className="absolute inset-[7%] rounded-full bg-white/[0.035] border border-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-30px_60px_rgba(0,0,0,0.5),0_40px_120px_-30px_rgba(225,6,0,0.45)]" />
          {/* orbiting rim reflection */}
          <div aria-hidden className="dial-sheen absolute inset-[7%] rounded-full" />

          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 w-full h-full overflow-visible">
            <defs>
              <linearGradient id="dialArc" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#7A0300" />
                <stop offset="60%" stopColor="#E10600" />
                <stop offset="100%" stopColor="#FF7A55" />
              </linearGradient>
            </defs>
            {/* track, redline zone, live arc */}
            <path d={arcPath(0, MAX, R)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" strokeLinecap="round" />
            <path d={arcPath(REDLINE, MAX, R)} fill="none" stroke="rgba(255,42,16,0.35)" strokeWidth="3" strokeLinecap="round" />
            <path
              ref={arc}
              d={arcPath(0, MAX, R)}
              fill="none"
              stroke="url(#dialArc)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={ARC_LEN}
              strokeDashoffset={ARC_LEN}
              style={{ filter: "drop-shadow(0 0 8px rgba(255,40,10,0.85))" }}
            />
            {ticks}
            {/* glowing tip riding the arc */}
            <circle ref={tipGlow} cx={polar(START, R)[0]} cy={polar(START, R)[1]} r="14" fill="rgba(255,60,30,0.28)" style={{ filter: "blur(6px)" }} />
            <circle ref={tip} cx={polar(START, R)[0]} cy={polar(START, R)[1]} r="5" fill="#FFFFFF" style={{ filter: "drop-shadow(0 0 6px rgba(255,80,40,1))" }} />
          </svg>

          {/* readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/45">B-26</span>
            <span ref={rpmText} className="mt-1 font-display font-normal text-white tabular-nums tracking-[-0.05em] text-6xl sm:text-7xl leading-none">0.0</span>
            <span className="mt-2 font-display text-[11px] uppercase tracking-[0.3em] text-white/45">×1000 rpm</span>
          </div>
          <div className="absolute inset-x-0 bottom-[9%] flex justify-center">
            <span className={`font-display text-xs uppercase tracking-[0.35em] ${ignition ? "text-[#FF5A3C] dial-blink" : "text-white/60"}`}>
              {ignition ? "Ignition" : <><span ref={pctText} className="tabular-nums">0</span>%</>}
            </span>
          </div>
        </div>

        {/* systems check: four segments that fill in */}
        <div className="mt-8 w-[min(80vw,380px)]">
          <div className="grid grid-cols-4 gap-2">
            {CHECKS.map((c, i) => (
              <div key={c.label} className="h-[3px] rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r from-[#B30500] to-[#FF4A2A] transition-transform duration-500 ease-out origin-left ${i < done ? "scale-x-100 shadow-[0_0_10px_rgba(255,40,10,0.8)]" : "scale-x-0"}`} />
              </div>
            ))}
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-2 text-center font-display text-[10px] sm:text-[11px] uppercase tracking-[0.22em]">
            {CHECKS.map((c, i) => (
              <span key={c.label} className={`transition-colors duration-300 ${i < done ? "text-white/85" : "text-white/30"}`}>{c.label}</span>
            ))}
          </div>
          <p className="mt-4 text-center font-mono text-[10px] sm:text-[11px] tracking-[0.18em] text-white/55 tabular-nums">
            <span ref={statusText}>Downloading · 0 KB</span>
          </p>
          <SoundChip />
        </div>
      </div>
    </div>
  );
}

/** Optional: hear the engine catch at ignition. Audio can only start from a tap, so we ask. */
function SoundChip() {
  const [on, setOn] = useState(false);
  useEffect(() => engine.subscribe(setOn), []);
  return (
    <div className="mt-6 flex justify-center">
      <button
        onClick={() => engine.toggle()}
        data-engine-toggle
        aria-pressed={on}
        className={`pointer-events-auto relative z-10 group inline-flex items-center gap-2.5 rounded-full pl-2 pr-4 py-1.5 text-[11px] cursor-pointer transition-colors ${on ? "bg-apex-red/15 border border-apex-red/50 text-white" : "border border-white/15 bg-white/[0.04] text-white/70 hover:text-white hover:border-white/30"}`}
      >
        <span className={`relative grid place-items-center w-5 h-5 rounded-full ${on ? "bg-apex-red" : "bg-white/10"}`}>
          <span className={`block w-1.5 h-1.5 rounded-full ${on ? "bg-white animate-ping" : "bg-white/70"}`} />
        </span>
        <span className="font-mono uppercase tracking-[0.22em]">{on ? "Engine sound on" : "Ignition with sound"}</span>
      </button>
    </div>
  );
}

"use client";

/* Scroll is the throttle. Scrolling drives a little B-26 telemetry cluster (speed, gear, revs),
   paints speed streaks at the screen edges, and — if the visitor turns it on — revs a synthesized
   engine. Tab changes and the cold-open ignition blip the throttle via the "sae:rev" event. */

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { engine } from "./engine";

const IDLE = 1400, REDLINE = 3800;
const GEARS = [0, 9, 18, 28, 40, 56]; // km/h where each gear starts (1…5)
const SEGMENTS = 14;

export default function DriveHUD({ hide = false }: { hide?: boolean }) {
  const speedEl = useRef<HTMLSpanElement>(null);
  const gearEl = useRef<HTMLSpanElement>(null);
  const segs = useRef<HTMLSpanElement[]>([]);
  const streaks = useRef<HTMLDivElement>(null);
  const streakTile = useRef<HTMLDivElement>(null);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => { const off = engine.subscribe(setSoundOn); engine.init(); return off; }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = performance.now(), lastY = window.scrollY;
    let speed = 0, boost = 0, boostUntil = 0, prevSpeed = 0, shown = -1, shownGear = "", streakOn = true;
    const onRev = (e: Event) => {
      const d = (e as CustomEvent<{ amount?: number; ms?: number }>).detail ?? {};
      boost = Math.max(boost, d.amount ?? 1);
      boostUntil = performance.now() + (d.ms ?? 1200);
    };
    window.addEventListener("sae:rev", onRev);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const y = window.scrollY;
      const v = Math.abs(y - lastY) / Math.max(dt, 1e-3); lastY = y; // px/s

      // Throttle from scroll speed (and any rev blips); the car coasts down slowly when you stop.
      if (now > boostUntil) boost = Math.max(0, boost - dt * 1.2);
      const target = Math.min(54, v / 55 + boost * 46);
      speed += (target - speed) * (target > speed ? 1 - Math.pow(0.02, dt) : 1 - Math.pow(0.15, dt));
      const load = Math.max(0, Math.min(1, (speed - prevSpeed) / (dt * 40) + boost * 0.6)); prevSpeed = speed;

      // Gearbox: revs climb through each gear and drop on the upshift.
      let g = 0;
      while (g < GEARS.length - 2 && speed >= GEARS[g + 1]) g++;
      const lo = GEARS[g], hi = GEARS[g + 1];
      const inGear = speed < 0.6 ? 0 : (speed - lo) / (hi - lo);
      const rpm = speed < 0.6 ? IDLE + boost * 1600 : IDLE + 500 + inGear * (REDLINE - IDLE - 500);
      if (!engine.external) engine.set(rpm + Math.sin(now / 37) * 25, load);

      // Paint (DOM writes only when something visible changed).
      const kmh = Math.round(speed);
      if (kmh !== shown && speedEl.current) { speedEl.current.textContent = String(kmh).padStart(3, "0"); shown = kmh; }
      const gear = speed < 0.6 ? "N" : String(g + 1);
      if (gear !== shownGear && gearEl.current) { gearEl.current.textContent = gear; shownGear = gear; }
      const lit = Math.round(((rpm - IDLE) / (REDLINE - IDLE)) * SEGMENTS);
      segs.current.forEach((s, i) => { if (s) s.dataset.on = i < lit ? "1" : "0"; });
      // Streaks move on the compositor (transform of an oversized tile, modulo its 143px period)
      // and are skipped entirely while invisible.
      if (streaks.current && streakTile.current && !reduce) {
        const o = Math.min(0.35, Math.max(0, (speed - 8) / 70));
        if (o > 0.005 || streakOn) {
          streakOn = o > 0.005;
          streaks.current.style.opacity = o.toFixed(3);
          streaks.current.style.visibility = streakOn ? "visible" : "hidden";
          streakTile.current.style.transform = `translate3d(0, ${-(((y * 1.6) % 143) + 143) % 143}px, 0)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("sae:rev", onRev); };
  }, []);

  const toggle = () => { engine.toggle(); };

  return (
    <>
      {/* Speed streaks at the screen edges — they appear only when you're really moving */}
      <div ref={streaks} aria-hidden className="speed-streaks-mask pointer-events-none fixed inset-0 z-[30] hidden lg:block opacity-0 overflow-hidden">
        <div ref={streakTile} className="speed-streaks absolute inset-x-0 -top-[143px] h-[calc(100%+286px)] will-change-transform" />
      </div>

      {/* Telemetry cluster (desktop), next to the theme toggle */}
      <aside
        aria-label="Engine sound and telemetry"
        className={`hidden md:flex fixed bottom-6 left-[76px] z-40 items-center gap-3 h-10 pl-1.5 pr-4 rounded-full glass !rounded-full select-none transition-all duration-500 ${
          hide ? "opacity-0 pointer-events-none translate-y-8" : "opacity-100 translate-y-0"
        }`}
      >
        <button
          onClick={toggle}
        data-engine-toggle
          aria-pressed={soundOn}
          aria-label={soundOn ? "Turn engine sound off" : "Turn engine sound on"}
          title={soundOn ? "Engine sound: on" : "Engine sound: off"}
          className={`w-7 h-7 rounded-full grid place-items-center transition-colors cursor-pointer ${soundOn ? "btn-gloss text-white" : "text-bone/55 hover:text-bone bg-white/[0.06]"}`}
        >
          {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>
        <span aria-hidden className="flex items-baseline gap-1">
          <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-bone/40">Gear</span>
          <span ref={gearEl} className="font-display font-semibold text-bone text-[15px] w-3 text-center">N</span>
        </span>
        <span className="flex gap-[2px] items-end h-3" aria-hidden>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              ref={(el) => { if (el) segs.current[i] = el; }}
              data-on="0"
              className={`rev-seg w-[3px] rounded-[1px] ${i >= SEGMENTS - 3 ? "rev-seg--red" : ""}`}
              style={{ height: `${5 + (i / SEGMENTS) * 7}px` }}
            />
          ))}
        </span>
        <span aria-hidden className="flex items-baseline gap-1">
          <span ref={speedEl} className="font-display font-semibold text-bone text-[15px] tabular-nums tracking-[-0.02em]">000</span>
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-bone/40">km/h</span>
        </span>
      </aside>

      {/* Phones: just the engine-sound switch, in the header's empty right corner */}
      <button
        onClick={toggle}
        data-engine-toggle
        aria-pressed={soundOn}
        aria-label={soundOn ? "Turn engine sound off" : "Turn engine sound on"}
        className={`md:hidden fixed top-[14px] right-4 z-[51] h-9 pl-3 pr-3.5 rounded-full flex items-center gap-1.5 text-[11px] font-medium cursor-pointer transition-all duration-500 ${
          hide ? "opacity-0 pointer-events-none -translate-y-8" : "opacity-100 translate-y-0"
        } ${soundOn ? "btn-gloss text-white" : "btn-glass text-bone/75"}`}
      >
        {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
        <span className="font-mono uppercase tracking-[0.18em] text-[9px]">{soundOn ? "Engine on" : "Sound"}</span>
      </button>
    </>
  );
}

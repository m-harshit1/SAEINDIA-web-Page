"use client";

/* B-26 Manoeuvrability Sprint — a small top-down time trial modelled on the BAJA SAEINDIA
   manoeuvrability event. Drive through every gate, don't touch the cones.
     cone hit  +2 s      missed gate  +5 s
   Plain 2D canvas (no three.js) so it starts instantly on phones. Lap times go to the public
   Firestore "laps" collection; firestore.rules validates them and lets admins delete. */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addDoc, collection, getCountFromServer, getDocs, limit, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { ArrowUpRight, RotateCcw, Share2, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { engine } from "@/components/cinema/engine";

/* ═══════════════════════════ Track ═══════════════════════════ */

const W = 10;            // track width (m)
const WALL = W / 2 + 5;  // tyre wall distance from the centre line (m)
const CONE_R = 0.32;
const GATE_HALF = 2.1;   // half the gap between a gate's two cones
const CONE_PEN = 2000, GATE_PEN = 5000;
const CAR_HL = 1.05, CAR_HW = 0.66; // car half length / half width (m)

const CONTROL: [number, number][] = [
  [-8, 0], [20, 0], [60, 0], [90, 6], [108, 28], [106, 55], [88, 70], [66, 66], [52, 52],
  [36, 58], [24, 78], [2, 90], [-24, 84], [-38, 62], [-30, 42], [-44, 24], [-44, 2], [-44, -8],
];

interface Track {
  x: Float32Array; y: Float32Array;   // centre line, one sample per metre
  tx: Float32Array; ty: Float32Array; // unit tangent
  n: number;
  path: Path2D;
  gates: { i: number; off: number }[];
  minX: number; minY: number; maxX: number; maxY: number;
}

function buildTrack(): Track {
  // Catmull-Rom through the control points, then resample at 1 m spacing.
  const dense: [number, number][] = [];
  const P = CONTROL;
  for (let k = 0; k < P.length - 1; k++) {
    const p0 = P[Math.max(0, k - 1)], p1 = P[k], p2 = P[k + 1], p3 = P[Math.min(P.length - 1, k + 2)];
    for (let s = 0; s < 24; s++) {
      const t = s / 24, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(P[P.length - 1]);
  const xs: number[] = [dense[0][0]], ys: number[] = [dense[0][1]];
  let carry = 0;
  for (let k = 1; k < dense.length; k++) {
    const [ax, ay] = dense[k - 1], [bx, by] = dense[k];
    const seg = Math.hypot(bx - ax, by - ay);
    let d = 1 - carry;
    while (d <= seg) { xs.push(ax + ((bx - ax) * d) / seg); ys.push(ay + ((by - ay) * d) / seg); d += 1; }
    carry = seg - (d - 1);
  }
  const n = xs.length;
  const x = Float32Array.from(xs), y = Float32Array.from(ys);
  const tx = new Float32Array(n), ty = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2);
    const dx = x[b] - x[a], dy = y[b] - y[a], l = Math.hypot(dx, dy) || 1;
    tx[i] = dx / l; ty[i] = dy / l;
  }
  const path = new Path2D();
  path.moveTo(x[0], y[0]);
  for (let i = 1; i < n; i++) path.lineTo(x[i], y[i]);

  // Gates: a tight slalom down the first straight, then one every ~22 m, alternating sides.
  const gates: { i: number; off: number }[] = [];
  let side = 1;
  for (let s = 22; s <= 62; s += 10) { gates.push({ i: s, off: 2.3 * side }); side = -side; }
  for (let s = 86; s < n - 18; s += 22) { gates.push({ i: s, off: 2.0 * side }); side = -side; }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) { minX = Math.min(minX, x[i]); maxX = Math.max(maxX, x[i]); minY = Math.min(minY, y[i]); maxY = Math.max(maxY, y[i]); }
  return { x, y, tx, ty, n, path, gates, minX, minY, maxX, maxY };
}

/* ═══════════════════════════ World state ═══════════════════════════ */

interface Cone { x: number; y: number; vx: number; vy: number; rot: number; spin: number; hit: boolean; fade: number; gate: number }
interface World {
  px: number; py: number; a: number; vx: number; vy: number; steer: number;
  idx: number; nextGate: number; gateOk: boolean[];
  cones: Cone[];
  skids: Float32Array; skidN: number;      // ring buffer: x1,y1,x2,y2 per mark
  dust: { x: number; y: number; vx: number; vy: number; life: number; r: number }[];
  t: number; pen: number; conesHit: number; gatesMissed: number;
  camX: number; camY: number; lastRL: [number, number, number, number] | null;
  braking: boolean; onTrack: boolean; done: boolean;
}

const SKID_MAX = 1400;

function newWorld(T: Track): World {
  const cones: Cone[] = [];
  T.gates.forEach((g, gi) => {
    const nx = -T.ty[g.i], ny = T.tx[g.i];
    for (const s of [-1, 1]) {
      const o = g.off + s * GATE_HALF;
      cones.push({ x: T.x[g.i] + nx * o, y: T.y[g.i] + ny * o, vx: 0, vy: 0, rot: 0, spin: 0, hit: false, fade: 1, gate: gi });
    }
  });
  const i0 = 9;
  return {
    px: T.x[i0], py: T.y[i0], a: Math.atan2(T.ty[i0], T.tx[i0]), vx: 0, vy: 0, steer: 0,
    idx: i0, nextGate: 0, gateOk: T.gates.map(() => false),
    cones, skids: new Float32Array(SKID_MAX * 4), skidN: 0, dust: [],
    t: 0, pen: 0, conesHit: 0, gatesMissed: 0,
    camX: T.x[i0] + 8, camY: T.y[i0], lastRL: null, braking: false, onTrack: true, done: false,
  };
}

/* ═══════════════════════════ Leaderboard ═══════════════════════════ */

interface Lap { id: string; name: string; ms: number; cones: number }
const fmtTime = (ms: number) => {
  const s = ms / 1000;
  return s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}` : `${s.toFixed(2)}s`;
};
const cleanName = (s: string) => s.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 20);
const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/* ═══════════════════════════ Component ═══════════════════════════ */

type Phase = "intro" | "count" | "race" | "done";
interface Result { ms: number; raw: number; cones: number; gates: number }

export default function SprintGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeEl = useRef<HTMLSpanElement>(null);
  const speedEl = useRef<HTMLSpanElement>(null);
  const penEl = useRef<HTMLSpanElement>(null);
  const flashEl = useRef<HTMLDivElement>(null);
  const lightsEl = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("intro");
  const phaseRef = useRef<Phase>("intro");
  const [result, setResult] = useState<Result | null>(null);
  const [board, setBoard] = useState<Lap[] | null>(null);
  const [boardErr, setBoardErr] = useState(false);
  const [name, setName] = useState(() => store.get("sae-driver") ?? "");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<{ rank: number } | null>(null);
  const [submitErr, setSubmitErr] = useState("");
  const [best, setBest] = useState<number | null>(() => Number(store.get("sae-sprint-best")) || null);
  const [soundOn, setSoundOn] = useState(engine.on);
  const [coarse, setCoarse] = useState(false);
  const [mounted, setMounted] = useState(false);

  const trackRef = useRef<Track | null>(null);
  const worldRef = useRef<World | null>(null);
  const input = useRef({ up: false, down: false, left: false, right: false, hand: false });
  const countStart = useRef(0);
  const coarseRef = useRef(false);
  useEffect(() => { coarseRef.current = coarse; }, [coarse]);

  const go = useCallback((p: Phase) => { phaseRef.current = p; setPhase(p); }, []);

  const loadBoard = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "laps"), orderBy("ms"), limit(10)));
      setBoardErr(false);
      setBoard(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Lap, "id">) })));
    } catch { setBoardErr(true); setBoard([]); }
  }, []);

  const start = useCallback(() => {
    if (!trackRef.current) return;
    worldRef.current = newWorld(trackRef.current);
    input.current = { up: false, down: false, left: false, right: false, hand: false };
    setResult(null); setSubmitted(null); setSubmitErr("");
    countStart.current = performance.now();
    go("count");
  }, [go]);

  /* ── Mount: portal, freeze page scroll, engine takes orders from the game ── */
  useEffect(() => {
    const t = setTimeout(() => { setMounted(true); setCoarse(window.matchMedia("(pointer: coarse)").matches); }, 0);
    window.__lenis?.stop();
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    engine.external = true;
    const off = engine.subscribe(setSoundOn);
    const tb = setTimeout(loadBoard, 0);
    return () => {
      clearTimeout(t); clearTimeout(tb);
      window.__lenis?.start();
      document.documentElement.style.overflow = prevOverflow;
      engine.external = false;
      off();
    };
  }, [loadBoard]);

  /* ── Keyboard ── */
  useEffect(() => {
    const map: Record<string, keyof typeof input.current> = {
      ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
      ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "hand",
    };
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") { if (e.key === "Escape") onClose(); return; }
      if (e.key === "Escape") { onClose(); return; }
      const k = map[e.code];
      if (k) { input.current[k] = true; e.preventDefault(); }
      if (e.code === "KeyR" && phaseRef.current !== "intro") start();
      if (e.code === "Enter" && (phaseRef.current === "intro")) start();
    };
    const up = (e: KeyboardEvent) => { const k = map[e.code]; if (k) input.current[k] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [onClose, start]);

  /* ── Simulation + rendering loop ── */
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const T = (trackRef.current ??= buildTrack());
    worldRef.current ??= newWorld(T);
    // Test hook for automated lap checks (only with #sprint-test in the URL).
    if (window.location.hash === "#sprint-test") (window as unknown as { __sprint: unknown }).__sprint = { T, world: worldRef, input };

    // Speckled dirt texture, tiled in world space (one tile = 6 m).
    const tile = document.createElement("canvas"); tile.width = tile.height = 96;
    const tc = tile.getContext("2d")!;
    tc.fillStyle = "#0d0b0b"; tc.fillRect(0, 0, 96, 96);
    for (let i = 0; i < 420; i++) {
      const v = Math.random();
      tc.fillStyle = v > 0.92 ? "rgba(225,6,0,0.10)" : `rgba(255,240,230,${0.015 + v * 0.03})`;
      tc.fillRect(Math.random() * 96, Math.random() * 96, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5);
    }
    const dirt = ctx.createPattern(tile, "repeat")!;
    dirt.setTransform(new DOMMatrix().scale(6 / 96));

    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);

    const flash = (text: string) => {
      const el = flashEl.current; if (!el) return;
      el.textContent = text;
      el.classList.remove("sprint-flash--on"); void el.offsetWidth; el.classList.add("sprint-flash--on");
    };

    let raf = 0, last = performance.now(), shownT = "", shownV = -1, shownP = "";
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      const Wd = worldRef.current!;
      const ph = phaseRef.current;

      // Countdown lights: three reds, then lights out = go.
      if (ph === "count") {
        const e = (now - countStart.current) / 1000;
        const lit = Math.min(3, Math.floor(e / 0.7) + 1);
        lightsEl.current?.querySelectorAll("span").forEach((s, i) => { (s as HTMLElement).dataset.on = i < lit && e < 2.1 ? "1" : "0"; });
        if (e >= 2.1) { go("race"); engine.rev(1, 600); }
      }

      /* — Physics (fixed small steps for stability) — */
      const steps = 2, h1 = dt / steps;
      for (let s = 0; s < steps; s++) {
        const inp = ph === "race" ? input.current : { up: false, down: false, left: false, right: false, hand: false };
        const ca = Math.cos(Wd.a), sa = Math.sin(Wd.a);
        let fwd = Wd.vx * ca + Wd.vy * sa;
        let lat = -Wd.vx * sa + Wd.vy * ca;

        const target = (inp.left ? -1 : 0) + (inp.right ? 1 : 0);
        Wd.steer += (target - Wd.steer) * Math.min(1, h1 * (target === 0 ? 10 : 7));

        const MAXV = Wd.onTrack ? 16 : 9;
        if (inp.up) fwd += 10 * h1 * Math.max(0, 1 - fwd / MAXV);
        Wd.braking = inp.down && fwd > 0.3;
        if (inp.down) fwd -= (fwd > 0.3 ? 16 : 6) * h1;
        fwd = Math.max(-5, fwd);
        fwd -= fwd * (Wd.onTrack ? 0.22 : 1.4) * h1;                 // rolling + loose-dirt drag
        if (!inp.up && !inp.down) fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), 1.2 * h1);

        const grip = inp.hand ? 1.6 : Wd.onTrack ? 8.5 : 3.2;
        const slip = Math.abs(lat);
        lat *= Math.exp(-grip * h1);

        const steerAng = Wd.steer * 0.62 / (1 + Math.abs(fwd) / 13);
        const yaw = (fwd / 1.9) * Math.tan(steerAng) * (inp.hand ? 1.35 : 1);
        Wd.vx = fwd * ca - lat * sa; Wd.vy = fwd * sa + lat * ca;
        Wd.a += yaw * h1;
        Wd.px += Wd.vx * h1; Wd.py += Wd.vy * h1;

        // Tyre marks when sliding or braking hard.
        const sliding = slip > 1.4 || (Wd.braking && fwd > 6) || (inp.hand && Math.abs(fwd) > 4);
        const rx = Wd.px - Math.cos(Wd.a) * 0.75, ry = Wd.py - Math.sin(Wd.a) * 0.75;
        const ox = -Math.sin(Wd.a) * 0.6, oy = Math.cos(Wd.a) * 0.6;
        const cur: [number, number, number, number] = [rx + ox, ry + oy, rx - ox, ry - oy];
        if (sliding && Wd.lastRL) {
          for (const k of [0, 2]) {
            const j = (Wd.skidN % SKID_MAX) * 4;
            Wd.skids[j] = Wd.lastRL[k]; Wd.skids[j + 1] = Wd.lastRL[k + 1]; Wd.skids[j + 2] = cur[k]; Wd.skids[j + 3] = cur[k + 1];
            Wd.skidN++;
          }
        }
        Wd.lastRL = sliding ? cur : null;
        if ((sliding || (!Wd.onTrack && Math.abs(fwd) > 3)) && Math.random() < 0.5) {
          Wd.dust.push({ x: rx + (Math.random() - 0.5), y: ry + (Math.random() - 0.5), vx: -Wd.vx * 0.15 + (Math.random() - 0.5) * 2, vy: -Wd.vy * 0.15 + (Math.random() - 0.5) * 2, life: 1, r: 0.4 + Math.random() * 0.6 });
        }

        // Where are we on the course? Search near the last known sample so we never jump sections.
        let bi = Wd.idx, bd = Infinity;
        for (let i = Math.max(0, Wd.idx - 12); i < Math.min(T.n, Wd.idx + 25); i++) {
          const d = (Wd.px - T.x[i]) ** 2 + (Wd.py - T.y[i]) ** 2;
          if (d < bd) { bd = d; bi = i; }
        }
        const nx = -T.ty[bi], ny = T.tx[bi];
        const off = (Wd.px - T.x[bi]) * nx + (Wd.py - T.y[bi]) * ny;
        Wd.onTrack = Math.abs(off) < W / 2 + 0.3;
        if (Math.abs(off) > WALL - CAR_HW) {                       // tyre wall
          const lim = Math.sign(off) * (WALL - CAR_HW);
          Wd.px += nx * (lim - off); Wd.py += ny * (lim - off);
          const vn = Wd.vx * nx + Wd.vy * ny;
          if (vn * Math.sign(off) > 0) { Wd.vx -= nx * vn * 1.3; Wd.vy -= ny * vn * 1.3; Wd.vx *= 0.7; Wd.vy *= 0.7; if (Math.abs(vn) > 3) engine.thud(); }
        }

        // Gates are judged as the car crosses them.
        if (ph === "race") {
          while (Wd.nextGate < T.gates.length && bi >= T.gates[Wd.nextGate].i) {
            const g = T.gates[Wd.nextGate];
            const lo = (Wd.px - T.x[g.i]) * -T.ty[g.i] + (Wd.py - T.y[g.i]) * T.tx[g.i];
            const ok = Math.abs(lo - g.off) < GATE_HALF - CONE_R;
            Wd.gateOk[Wd.nextGate] = ok;
            if (!ok) { Wd.pen += GATE_PEN; Wd.gatesMissed++; flash("Missed gate  +5s"); }
            Wd.nextGate++;
          }
        }
        Wd.idx = bi;

        // Cones: car (oriented box) vs cone (circle).
        const c2 = Math.cos(Wd.a), s2 = Math.sin(Wd.a);
        for (const c of Wd.cones) {
          if (c.hit) continue;
          const dx = c.x - Wd.px, dy = c.y - Wd.py;
          const lx = dx * c2 + dy * s2, ly = -dx * s2 + dy * c2;
          const qx = Math.max(-CAR_HL, Math.min(CAR_HL, lx)), qy = Math.max(-CAR_HW, Math.min(CAR_HW, ly));
          if ((lx - qx) ** 2 + (ly - qy) ** 2 < CONE_R * CONE_R) {
            c.hit = true;
            const sp = Math.hypot(Wd.vx, Wd.vy);
            c.vx = Wd.vx * 1.1 + (dx / (Math.hypot(dx, dy) || 1)) * (2 + sp * 0.3);
            c.vy = Wd.vy * 1.1 + (dy / (Math.hypot(dx, dy) || 1)) * (2 + sp * 0.3);
            c.spin = (Math.random() - 0.5) * 18;
            Wd.vx *= 0.9; Wd.vy *= 0.9;
            if (ph === "race") { Wd.pen += CONE_PEN; Wd.conesHit++; flash("Cone  +2s"); }
            engine.thud();
          }
        }

        if (ph === "race") Wd.t += h1 * 1000;
      }

      // Finish line.
      if (ph === "race" && Wd.idx >= T.n - 4 && !Wd.done) {
        while (Wd.nextGate < T.gates.length) { Wd.pen += GATE_PEN; Wd.gatesMissed++; Wd.nextGate++; }
        Wd.done = true;
        const ms = Math.round(Wd.t + Wd.pen);
        setResult({ ms, raw: Math.round(Wd.t), cones: Wd.conesHit, gates: Wd.gatesMissed });
        setBest((b) => { const nb = b == null || ms < b ? ms : b; store.set("sae-sprint-best", String(nb)); return nb; });
        go("done");
        engine.rev(0.8, 900);
      }

      // Knocked cones tumble and fade; dust drifts and fades.
      for (const c of Wd.cones) if (c.hit) {
        c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= Math.exp(-2.5 * dt); c.vy *= Math.exp(-2.5 * dt);
        c.rot += c.spin * dt; c.spin *= Math.exp(-2 * dt);
        c.fade = Math.max(0.25, c.fade - dt * 0.35);
      }
      for (const p of Wd.dust) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.4; p.r += dt * 1.2; }
      Wd.dust = Wd.dust.filter((p) => p.life > 0).slice(-160);

      // Engine follows the car.
      const speed = Math.hypot(Wd.vx, Wd.vy);
      const kmh = speed * 3.6;
      const gears = [0, 12, 24, 36, 48];
      let g = 0; while (g < gears.length - 1 && kmh >= gears[g + 1]) g++;
      const inGear = (kmh - gears[g]) / 12;
      const rpm = kmh < 1 ? 1400 + (input.current.up && ph === "race" ? 900 : 0) : 1900 + Math.min(1, inGear) * 1900;
      engine.set(rpm, ph === "race" && input.current.up ? 0.9 : 0.1);

      /* — Render — */
      const base = Math.max(15, Math.min(30, Math.min(w, h) / 22));
      const scale = base * (1 - Math.min(1, speed / 16) * 0.16);
      const lookX = Wd.px + Wd.vx * 0.55, lookY = Wd.py + Wd.vy * 0.55;
      Wd.camX += (lookX - Wd.camX) * Math.min(1, dt * 4);
      Wd.camY += (lookY - Wd.camY) * Math.min(1, dt * 4);

      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, (w / 2 - Wd.camX * scale) * dpr, (h / 2 - Wd.camY * scale) * dpr);
      const vw = w / scale, vh = h / scale;
      ctx.fillStyle = dirt;
      ctx.fillRect(Wd.camX - vw / 2 - 2, Wd.camY - vh / 2 - 2, vw + 4, vh + 4);

      ctx.lineCap = "round"; ctx.lineJoin = "round";
      // Tyre wall, run-off, kerbs, track.
      ctx.strokeStyle = "#3a0d0a"; ctx.lineWidth = WALL * 2 + 1.2; ctx.stroke(T.path);
      ctx.strokeStyle = "#0f0d0d"; ctx.lineWidth = WALL * 2; ctx.stroke(T.path);
      ctx.strokeStyle = "#e9e4df"; ctx.lineWidth = W + 0.9; ctx.stroke(T.path);
      ctx.setLineDash([2.2, 2.2]); ctx.strokeStyle = "#E10600"; ctx.lineCap = "butt"; ctx.stroke(T.path);
      ctx.setLineDash([]); ctx.lineCap = "round";
      ctx.strokeStyle = "#241d1d"; ctx.lineWidth = W; ctx.stroke(T.path);
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = dirt; ctx.lineWidth = W; ctx.stroke(T.path); ctx.restore();
      ctx.setLineDash([1.5, 3]); ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 0.15; ctx.stroke(T.path); ctx.setLineDash([]);

      // Start and finish lines (chequered).
      for (const [i, label] of [[4, "START"], [T.n - 4, "FINISH"]] as const) {
        ctx.save(); ctx.translate(T.x[i], T.y[i]); ctx.rotate(Math.atan2(T.ty[i], T.tx[i]));
        for (let r = 0; r < 2; r++) for (let c = 0; c < 10; c++) {
          ctx.fillStyle = (r + c) % 2 ? "#f2efe9" : "#111";
          ctx.fillRect(-0.5 + r * 0.5, -W / 2 + c * (W / 10), 0.5, W / 10);
        }
        ctx.rotate(Math.PI / 2); ctx.fillStyle = "rgba(242,239,233,0.35)"; ctx.font = "600 1.1px ui-monospace, monospace";
        ctx.textAlign = "center"; ctx.fillText(label, 0, -1.6);
        ctx.restore();
      }

      // Skid marks.
      ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 0.26; ctx.lineCap = "round";
      ctx.beginPath();
      const nSk = Math.min(Wd.skidN, SKID_MAX);
      for (let k = 0; k < nSk; k++) { const j = k * 4; ctx.moveTo(Wd.skids[j], Wd.skids[j + 1]); ctx.lineTo(Wd.skids[j + 2], Wd.skids[j + 3]); }
      ctx.stroke();

      // Next-gate guide: a soft chevron between its cones.
      const ng = T.gates[Wd.nextGate];
      if (ng && ph !== "done") {
        const gx = T.x[ng.i] - T.ty[ng.i] * ng.off, gy = T.y[ng.i] + T.tx[ng.i] * ng.off;
        ctx.save(); ctx.translate(gx, gy); ctx.rotate(Math.atan2(T.ty[ng.i], T.tx[ng.i]));
        const pulse = 0.35 + 0.25 * Math.sin(now / 160);
        ctx.fillStyle = `rgba(225,6,0,${pulse * 0.5})`;
        ctx.fillRect(-0.4, -GATE_HALF + 0.35, 0.8, (GATE_HALF - 0.35) * 2);
        ctx.strokeStyle = `rgba(255,255,255,${pulse})`; ctx.lineWidth = 0.2;
        ctx.beginPath(); ctx.moveTo(-0.5, -0.8); ctx.lineTo(0.4, 0); ctx.lineTo(-0.5, 0.8); ctx.stroke();
        ctx.restore();
      }

      // Cones.
      for (const c of Wd.cones) {
        const passed = c.gate < Wd.nextGate;
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.globalAlpha = c.hit ? c.fade : passed ? 0.45 : 1;
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.arc(0.08, 0.1, CONE_R + 0.05, 0, Math.PI * 2); ctx.fill();
        if (c.hit) { ctx.scale(1.5, 0.75); }
        ctx.fillStyle = passed && !c.hit ? (Wd.gateOk[c.gate] ? "#8a8580" : "#5a1a14") : "#FF4A1C";
        ctx.beginPath(); ctx.arc(0, 0, CONE_R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 0.07; ctx.beginPath(); ctx.arc(0, 0, CONE_R * 0.58, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#ff8a6a"; ctx.beginPath(); ctx.arc(0, 0, 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Dust.
      for (const p of Wd.dust) { ctx.fillStyle = `rgba(190,170,160,${p.life * 0.12})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }

      // The B-26, top-down.
      ctx.save(); ctx.translate(Wd.px, Wd.py); ctx.rotate(Wd.a);
      const beam = ctx.createRadialGradient(2.2, 0, 0.2, 2.2, 0, 6);
      beam.addColorStop(0, "rgba(255,240,225,0.10)"); beam.addColorStop(1, "rgba(255,240,225,0)");
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(8, -3.2); ctx.lineTo(8, 3.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.roundRect(-1.1, -0.72, 2.35, 1.5, 0.35); ctx.fill();
      const tyre = (x: number, y: number, r: number) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.fillStyle = "#0a0a0a"; ctx.fillRect(-0.29, -0.15, 0.58, 0.3);
        ctx.fillStyle = "#2a2a2a"; for (let k = -2; k <= 2; k++) ctx.fillRect(k * 0.11 - 0.02, -0.15, 0.04, 0.3); ctx.restore();
      };
      const sa2 = Wd.steer * 0.55;
      tyre(-0.72, -0.64, 0); tyre(-0.72, 0.64, 0); tyre(0.78, -0.6, sa2); tyre(0.78, 0.6, sa2);
      ctx.fillStyle = "#1c1c1e"; ctx.beginPath(); ctx.roundRect(-0.98, -0.46, 2.0, 0.92, 0.18); ctx.fill();
      ctx.fillStyle = "#E10600";
      ctx.beginPath(); ctx.moveTo(0.55, -0.42); ctx.lineTo(1.12, -0.2); ctx.lineTo(1.12, 0.2); ctx.lineTo(0.55, 0.42); ctx.closePath(); ctx.fill();
      ctx.fillRect(-0.55, -0.48, 1.0, 0.12); ctx.fillRect(-0.55, 0.36, 1.0, 0.12);
      ctx.fillStyle = "#7a0300"; ctx.fillRect(-0.98, -0.26, 0.34, 0.52);
      ctx.strokeStyle = "rgba(235,235,235,0.85)"; ctx.lineWidth = 0.055;
      ctx.strokeRect(-0.55, -0.4, 1.0, 0.8);
      ctx.beginPath(); ctx.moveTo(-0.55, -0.4); ctx.lineTo(0.45, 0.4); ctx.moveTo(-0.55, 0.4); ctx.lineTo(-0.1, 0); ctx.stroke();
      ctx.fillStyle = "#f4f2ef"; ctx.beginPath(); ctx.arc(0.02, 0, 0.23, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#E10600"; ctx.beginPath(); ctx.arc(0.02, 0, 0.23, -0.6, 0.6); ctx.lineTo(0.02, 0); ctx.fill();
      if (Wd.braking) {
        ctx.fillStyle = "rgba(255,30,10,0.9)"; ctx.shadowColor = "#ff1a0a"; ctx.shadowBlur = 12;
        ctx.fillRect(-1.02, -0.38, 0.08, 0.14); ctx.fillRect(-1.02, 0.24, 0.08, 0.14); ctx.shadowBlur = 0;
      }
      ctx.restore();

      // Minimap.
      const mm = Math.min(132, w * 0.28), pad = 14;
      const sx = mm / Math.max(T.maxX - T.minX, T.maxY - T.minY);
      const ox = w - pad - (T.maxX - T.minX) * sx, oy = (coarseRef.current ? 64 : 76);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save(); ctx.translate(ox, oy); ctx.scale(sx, sx); ctx.translate(-T.minX, -T.minY);
      ctx.strokeStyle = "rgba(242,239,233,0.25)"; ctx.lineWidth = 2.2 / sx; ctx.stroke(T.path);
      ctx.fillStyle = "#E10600"; ctx.beginPath(); ctx.arc(Wd.px, Wd.py, 3.4 / sx, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // HUD (DOM writes only when the text changes).
      const shownTime = ph === "race" || ph === "done" ? Wd.t + Wd.pen : 0;
      const tStr = fmtTime(Math.round(shownTime / 10) * 10);
      if (tStr !== shownT && timeEl.current) { timeEl.current.textContent = tStr; shownT = tStr; }
      const k = Math.round(kmh);
      if (k !== shownV && speedEl.current) { speedEl.current.textContent = String(k).padStart(2, "0"); shownV = k; }
      const pStr = Wd.pen ? `+${Wd.pen / 1000}s` : "Clean";
      if (pStr !== shownP && penEl.current) { penEl.current.textContent = pStr; shownP = pStr; }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [mounted, go]);

  /* ── Leaderboard submit ── */
  const submit = async () => {
    if (!result || saving) return;
    const n = cleanName(name);
    if (!n) { setSubmitErr("Add a name for the board."); return; }
    setSaving(true); setSubmitErr("");
    store.set("sae-driver", n);
    try {
      await addDoc(collection(db, "laps"), { name: n, ms: result.ms, cones: result.cones, createdAt: serverTimestamp() });
      let rank = 0;
      try { rank = (await getCountFromServer(query(collection(db, "laps"), where("ms", "<", result.ms)))).data().count + 1; } catch { /* rank is a nicety */ }
      setSubmitted({ rank });
      loadBoard();
    } catch {
      setSubmitErr("Couldn't save your time. Check your connection and try again.");
    } finally { setSaving(false); }
  };

  const share = async () => {
    if (!result) return;
    const url = `${window.location.origin}/?play=1`;
    const text = `I ran the B-26 manoeuvrability sprint in ${fmtTime(result.ms)}. Beat that:`;
    try {
      if (navigator.share) await navigator.share({ title: "B-26 Sprint · SAEINDIA IIITDM Kurnool", text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setSubmitErr("Link copied — paste it anywhere."); }
    } catch { /* share sheet dismissed */ }
  };

  const joinTeam = () => {
    onClose();
    window.dispatchEvent(new CustomEvent("sae:navigate", { detail: "join" }));
  };

  /* ── Touch controls: hold to act; multi-touch safe ── */
  const hold = (k: keyof typeof input.current) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      input.current[k] = true;
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
    },
    onPointerUp: () => { input.current[k] = false; },
    onPointerCancel: () => { input.current[k] = false; },
    onLostPointerCapture: () => { input.current[k] = false; },
  });

  if (!mounted) return null;

  const Board = (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-bone/45 flex items-center gap-2"><Trophy size={12} className="text-[#FF5A3C]" /> Top 10</span>
        {best != null && <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-bone/45">Your best {fmtTime(best)}</span>}
      </div>
      <ol className="mt-3 space-y-1">
        {board == null ? <li className="text-bone/40 text-sm py-2">Loading times…</li>
          : boardErr ? <li className="text-bone/40 text-sm py-2">Leaderboard is offline right now.</li>
          : !board.length ? <li className="text-bone/40 text-sm py-2">No times yet — set the first one.</li>
          : board.map((l, i) => (
            <li key={l.id} className={`flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm ${i === 0 ? "bg-apex-red/[0.12]" : "bg-white/[0.025]"}`}>
              <span className={`w-5 font-mono text-[11px] tabular-nums ${i < 3 ? "text-[#FF5A3C]" : "text-bone/40"}`}>{i + 1}</span>
              <span className="flex-1 truncate text-bone/85">{l.name}</span>
              {l.cones > 0 && <span className="font-mono text-[10px] text-bone/35">{l.cones} cone{l.cones > 1 ? "s" : ""}</span>}
              <span className="font-mono tabular-nums text-bone">{fmtTime(l.ms)}</span>
            </li>
          ))}
      </ol>
    </div>
  );

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="B-26 manoeuvrability sprint" className="fixed inset-0 z-[9000] bg-[#0b0a0a] text-bone select-none" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_160px_40px_rgba(0,0,0,0.85)]" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 px-4 sm:px-6 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="glass !rounded-full flex items-center gap-4 h-11 pl-4 pr-5">
          <span className="font-display font-semibold text-[20px] sm:text-[22px] tabular-nums tracking-[-0.02em] min-w-[4.6ch]" ref={timeEl}>0.00s</span>
          <span className="w-px h-5 bg-white/15" />
          <span ref={penEl} className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/60">Clean</span>
          <span className="hidden sm:flex items-baseline gap-1"><span className="w-px h-5 bg-white/15 mr-3 self-center" /><span ref={speedEl} className="font-display font-semibold tabular-nums">00</span><span className="font-mono text-[8px] uppercase tracking-[0.2em] text-bone/40">km/h</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => engine.toggle()} data-engine-toggle aria-pressed={soundOn} aria-label={soundOn ? "Turn engine sound off" : "Turn engine sound on"}
            className={`w-11 h-11 rounded-full grid place-items-center cursor-pointer ${soundOn ? "btn-gloss text-white" : "btn-glass text-bone/70"}`}>
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {phase !== "intro" && (
            <button onClick={start} aria-label="Restart" className="btn-glass w-11 h-11 rounded-full grid place-items-center cursor-pointer"><RotateCcw size={16} /></button>
          )}
          <button onClick={onClose} aria-label="Close the game" className="btn-glass w-11 h-11 rounded-full grid place-items-center cursor-pointer"><X size={17} /></button>
        </div>
      </div>

      {/* Penalty flash */}
      <div ref={flashEl} aria-live="polite" className="sprint-flash pointer-events-none absolute left-1/2 top-[22%] -translate-x-1/2 font-display font-semibold text-3xl sm:text-4xl tracking-[-0.03em] text-[#FF3B1F]" />

      {/* Start lights */}
      {phase === "count" && (
        <div ref={lightsEl} className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2 glass !rounded-full flex gap-3 px-5 py-4">
          {[0, 1, 2].map((i) => <span key={i} data-on="0" className="sprint-light w-7 h-7 sm:w-9 sm:h-9 rounded-full" />)}
        </div>
      )}

      {/* Intro card */}
      {phase === "intro" && (
        <div className="absolute inset-0 grid place-items-center p-4 bg-black/45">
          <div className="glass !rounded-[28px] w-full max-w-md p-6 sm:p-8 max-h-[86svh] overflow-y-auto">
            <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-[#FF5A3C]/90">BAJA event · Manoeuvrability</span>
            <h2 className="mt-3 font-display font-semibold tracking-[-0.045em] text-[40px] leading-[0.95]">
              <span className="gloss-text-static">Take the B-26 </span><span className="font-serif-i gloss-red whitespace-nowrap">for a spin.</span>
            </h2>
            <p className="mt-4 text-bone/60 text-[15px] leading-relaxed">
              Drive through every gate, fastest time wins. Touch a cone: <b className="text-bone">+2s</b>. Miss a gate: <b className="text-bone">+5s</b>.
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/45 leading-relaxed">
              {coarse ? "Left thumb steers · right thumb gas & brake" : "Arrows / WASD drive · Space handbrake · R restart"}
            </p>
            <button onClick={start} className="btn-gloss mt-6 w-full rounded-full px-6 py-3.5 text-sm font-semibold text-white cursor-pointer">Start engine</button>
            {Board}
          </div>
        </div>
      )}

      {/* Results */}
      {phase === "done" && result && (
        <div className="absolute inset-0 grid place-items-center p-4 bg-black/55">
          <div className="glass !rounded-[28px] w-full max-w-md p-6 sm:p-8 max-h-[90svh] overflow-y-auto">
            <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-[#FF5A3C]/90">Finish · {result.cones === 0 && result.gates === 0 ? "clean run" : "with penalties"}</span>
            <p className="mt-2 font-display font-semibold tracking-[-0.05em] text-[64px] leading-none tabular-nums gloss-text-static">{fmtTime(result.ms)}</p>
            <p className="mt-2 text-bone/55 text-sm">
              Drive {fmtTime(result.raw)}{result.cones ? ` · ${result.cones} cone${result.cones > 1 ? "s" : ""} +${result.cones * 2}s` : ""}{result.gates ? ` · ${result.gates} gate${result.gates > 1 ? "s" : ""} +${result.gates * 5}s` : ""}
              {best === result.ms && <span className="text-[#FF5A3C]"> · personal best</span>}
            </p>

            {!submitted ? (
              <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Your name" aria-label="Your name for the leaderboard"
                  className="field !rounded-full !h-11 !py-0 flex-1 min-w-0" style={{ touchAction: "auto" }} />
                <button type="submit" disabled={saving} className="btn-gloss rounded-full px-5 h-11 text-sm font-semibold text-white cursor-pointer disabled:opacity-50">{saving ? "Saving…" : "Post time"}</button>
              </form>
            ) : (
              <p className="mt-5 text-[15px] text-bone/80">{submitted.rank ? <>Posted — you&apos;re <b className="text-white">#{submitted.rank}</b> overall.</> : "Posted to the leaderboard."}</p>
            )}
            {submitErr && <p className="mt-2 text-[13px] text-[#FF7A5C]">{submitErr}</p>}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={start} className="btn-glass rounded-full h-11 inline-flex items-center justify-center gap-2 text-sm cursor-pointer"><RotateCcw size={15} /> Again</button>
              <button onClick={share} className="btn-glass rounded-full h-11 inline-flex items-center justify-center gap-2 text-sm cursor-pointer"><Share2 size={15} /> Challenge</button>
            </div>
            {Board}
            <button onClick={joinTeam} className="mt-5 w-full inline-flex items-center justify-center gap-1.5 text-sm text-bone/65 hover:text-white cursor-pointer">
              Want to drive the real one? Join the team <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Touch controls */}
      {coarse && (phase === "race" || phase === "count") && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-4 pb-[max(18px,env(safe-area-inset-bottom))] pointer-events-none">
          <div className="flex gap-3 pointer-events-auto">
            <button aria-label="Steer left" {...hold("left")} className="sprint-pad w-[74px] h-[74px] rounded-full grid place-items-center text-2xl">◀</button>
            <button aria-label="Steer right" {...hold("right")} className="sprint-pad w-[74px] h-[74px] rounded-full grid place-items-center text-2xl">▶</button>
          </div>
          <div className="flex gap-3 items-end pointer-events-auto">
            <button aria-label="Brake" {...hold("down")} className="sprint-pad w-[66px] h-[66px] rounded-full grid place-items-center font-mono text-[10px] uppercase tracking-[0.15em]">Brake</button>
            <button aria-label="Accelerate" {...hold("up")} className="sprint-pad sprint-pad--gas w-[86px] h-[86px] rounded-full grid place-items-center font-mono text-[11px] uppercase tracking-[0.15em]">Gas</button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

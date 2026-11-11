"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowUpRight, X } from "lucide-react";
import { AnimatePresence, animate, motion, useInView, useScroll, useTransform, type MotionValue } from "framer-motion";
import HeroOverlay from "./cinema/HeroOverlay";
import { HERO, type HeroClock, heroPlayed, setHeroPlayed } from "./cinema/heroTimeline";
import SceneHUD, { type Scene } from "./cinema/SceneHUD";
import { CINE_EASE } from "./cinema/primitives";
import { facultyAdvisors } from "@/data/teamData";

/* The 3D stage is client-only and loads after first paint. */
const Story3D = dynamic(() => import("./cinema/Story3D"), { ssr: false });
const MODEL_URL = "/assets/b26_draco.glb";
const MODEL_BYTES = 695824; // decoded size, used when the response is compressed

interface HomeTabProps {
  switchPage: (tab: string) => void;
  onHeroDone?: () => void;
}

const CHAPTERS: Scene[] = [
  { id: "ch-idea", title: "The idea" },
  { id: "ch-blueprint", title: "Blueprint" },
  { id: "ch-frame", title: "Frame" },
  { id: "ch-crew", title: "The crew" },
  { id: "ch-track", title: "The track" },
  { id: "ch-next", title: "Your scene" },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Counts up once when scrolled into view, writing straight to the DOM. */
function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const c = animate(0, value, { duration: 1.8, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { el.textContent = Math.round(v) + suffix; } });
    return () => c.stop();
  }, [inView, value, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

/** Headline with *starred* words set in the red serif italic; rises word-by-word from a mask. */
function Title({ text, className = "", as: Tag = "h2" }: { text: string; className?: string; as?: "h1" | "h2" }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: false, margin: "0px 0px -12% 0px" }) // only wait on the bottom edge: titles near the top must still show;
  const words = text.split(" ");
  return (
    <Tag ref={ref} aria-label={text.replace(/\*/g, "")} className={`font-display font-semibold text-bone tracking-[-0.05em] leading-[0.92] ${className}`}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
          <motion.span
            className={`inline-block ${
              w.startsWith("*")
                ? "font-serif-i gloss-red tracking-[-0.015em]"
                : Tag === "h1" ? "gloss-text" : "gloss-text-static"
            }`}
            initial={{ y: "110%" }}
            animate={{ y: inView ? "0%" : "110%" }}
            transition={{ duration: 0.9, delay: inView ? i * 0.06 : 0, ease: CINE_EASE }}
          >
            {w.replace(/\*/g, "")}
          </motion.span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </Tag>
  );
}

function Kicker({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p className="hidden lg:flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-bone/45 mb-6">
      <span className="text-apex-red tabular-nums">{String(n).padStart(2, "0")}</span>
      <span className="h-px w-8 bg-bone/25" />
      {children}
    </p>
  );
}

/**
 * One chapter of the story: a tall section whose content pins mid-screen while
 * the car behind it changes. `side` keeps the text opposite the car.
 */
/* Desktop chapter height in screens — keep in sync with .chapter-section in globals.css. */
const DESK_H = 2.2;
const PIN_START = 1 / (1 + DESK_H);      // v where the section top reaches the screen top
const PIN_END = DESK_H / (1 + DESK_H);   // v where the section bottom reaches the screen bottom

function Chapter({
  id, n, side, first = false, children, render,
}: {
  id: string;
  n: number;
  first?: boolean;
  side: "left" | "right" | "center";
  children?: React.ReactNode;
  render?: (local: MotionValue<number>) => React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: v } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // Desktop sections are DESK_H screens tall (see .chapter-section): content is pinned while
  // v ∈ [PIN_START, PIN_END]. On touch phones they are one screen tall and paged, resting at v = 0.5.
  // The first chapter is already on screen at the top of the page, so it skips the fade-in.
  // Phones: text only fades in once it has (nearly) reached its slot at the top, so it never
  // drifts up through the car on its way in. Desktop keeps the longer, softer entrance.
  const narrow = () => typeof window !== "undefined" && window.innerWidth < 1024;
  // Touch phones page one screen per chapter (see the pager in HomeTab). There the text holds a
  // fixed slot and crossfades with its neighbour mid-glide, so there's never an empty frame.
  const paged = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse) and (max-width: 1023px)").matches;
  const sstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const enter = (x: number) => (narrow() ? clamp01((x - PIN_START) / 0.035) : clamp01((x - (PIN_START - 0.08)) / 0.1));
  const leave = (x: number) => clamp01((x - (PIN_END - 0.01)) / 0.09);
  const opacity = useTransform(v, (x) => {
    // One-screen chapters: a glide spans x 0.5→1 (outgoing) and 0→0.5 (incoming). The fades
    // overlap so both read ~55% at mid-glide — text is never absent.
    if (paged()) return x < 0.5 ? (first ? 1 : sstep(0.1, 0.38, x)) : 1 - sstep(0.62, 0.9, x);
    return x < 0.5 ? (first ? 1 : enter(x)) : 1 - leave(x);
  });
  const y = useTransform(v, (x) => {
    if (paged()) {
      // (2x−1)·vh cancels the page's own scroll → the text stays put; plus a small lift in/out.
      const lift = x < 0.5 ? (first ? 0 : (1 - sstep(0.1, 0.38, x)) * 28) : -sstep(0.62, 0.9, x) * 28;
      return (2 * x - 1) * window.innerHeight + lift;
    }
    // Enter/exit lift, plus a constant drift so the type keeps moving the whole time it's pinned.
    return (x < 0.5 ? (first ? 0 : (1 - enter(x)) * 60) : -leave(x) * 60) + (0.5 - x) * (narrow() ? 60 : 120);
  });
  // A huge chrome chapter number slides through behind the text (strong parallax).
  const numY = useTransform(v, (x) => `${(0.5 - x) * 70}vh`);
  const numOpacity = useTransform(v, (x) => 0.07 * Math.sin(Math.PI * clamp01((x - 0.15) / 0.7)));
  // 0→1 for scroll-driven details (e.g. the typed code). It completes as the chapter *settles*
  // and then holds, so whatever you stop to read is fully written.
  const local = useTransform(v, (x) => (paged() ? clamp01((x - 0.1) / 0.35) : clamp01((x - (PIN_START - 0.04)) / 0.12)));

  const place =
    side === "left" ? "mr-auto lg:ml-[5vw] max-w-[36rem]" :
    side === "right" ? "ml-auto lg:mr-[7vw] max-w-[36rem]" :
    "mx-auto max-w-4xl text-center self-start pt-[6vh]";

  return (
    <section ref={ref} id={id} className="chapter-section relative">
      <div className="sticky top-[var(--header-h)] h-[calc(100svh-var(--header-h))] flex items-start lg:items-center pt-[92px] lg:pt-[69px] px-5 sm:px-10 overflow-hidden">
        <motion.span
          aria-hidden
          style={{ y: numY, opacity: numOpacity }}
          className={`gloss-text-static [filter:none] will-change-[transform,opacity] pointer-events-none absolute top-1/2 -translate-y-1/2 font-display font-semibold leading-none tracking-[-0.08em] text-[clamp(16rem,42vw,40rem)] ${
            side === "left" ? "left-[2vw]" : side === "right" ? "right-[3vw]" : "left-1/2 -translate-x-1/2"
          }`}
        >
          {String(n).padStart(2, "0")}
        </motion.span>
        <motion.div style={{ opacity, y }} className={`relative w-full will-change-[transform,opacity] ${place}`}>
          {render ? render(local) : children}
        </motion.div>
      </div>
    </section>
  );
}

/** A code line that types itself (un-clips) across its slice of the chapter. */
function TypedLine({ p, i, n, children }: { p: MotionValue<number>; i: number; n: number; children: React.ReactNode }) {
  const clipPath = useTransform(p, (v) => `inset(0 ${100 - clamp01((v * 1.4 - i / n) * n) * 100}% 0 0)`);
  return <motion.div style={{ clipPath }} className="whitespace-pre">{children}</motion.div>;
}

const CODE: React.ReactNode[] = [
  <React.Fragment key={0}><span className="text-apex-red">const</span> frame = <span className="text-bone">new</span> SpaceFrame(<span className="text-[#A9B1BB]">&quot;AISI 4130 Chromoly&quot;</span>)</React.Fragment>,
  <React.Fragment key={1}>frame.envelope = [<span className="text-bone">2138</span>, <span className="text-bone">860</span>, <span className="text-bone">1391</span>] <span className="text-bone/30">{"// mm"}</span></React.Fragment>,
  <React.Fragment key={2}><span className="text-apex-red">const</span> fea = ansys.solve(frame, {"{"} load: <span className="text-bone">30_000</span> {"}"})</React.Fragment>,
  <React.Fragment key={3}>assert(fea.safetyFactor &gt;= <span className="text-bone">2.0</span>)</React.Fragment>,
  <span key={4} className="text-bone/30">{"// ✓ safetyFactor = 2.1 — cleared to build"}</span>,
];

function SpecRows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="glass px-5 divide-y divide-bone/10">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 sm:gap-6 py-2 sm:py-3">
          <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.28em] text-bone/40">{k}</dt>
          <dd className="text-bone text-[13px] sm:text-sm text-right whitespace-nowrap">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Still({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="relative w-56 sm:w-64 aspect-[4/3] rounded-2xl overflow-hidden border border-white/15 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] bg-[#111113]">
      <Image src={src} alt="" fill sizes="256px" className="object-cover" />
      <figcaption className="absolute left-2.5 bottom-2.5 font-mono text-[9px] uppercase tracking-[0.25em] text-white/85 bg-black/45 rounded-full px-2.5 py-1">
        {caption}
      </figcaption>
    </figure>
  );
}

interface PhotoItem {
  title: string;
  desc: string;
  path: string;
  location: string;
  date: string;
}

/* Real frames from the build season (team photos, Nov 2026 upload). */
const galleryPhotos: PhotoItem[] = [
  {
    title: "The roll-cage mock-up",
    desc: "A full-size PVC mock-up of the B-26 roll cage, built to check driver fit, sight lines and clearances before a single steel tube is cut.",
    path: "/media/mockup-team.webp",
    location: "Workshop, IIITDM Kurnool",
    date: "Build season 2025–26",
  },
  {
    title: "Joint by joint",
    desc: "Laying out the mock-up members on the workshop floor and joining them node by node, straight from the CAD dimensions.",
    path: "/media/mockup-build.webp",
    location: "Workshop, IIITDM Kurnool",
    date: "Build season 2025–26",
  },
  {
    title: "CAD meets the cage",
    desc: "The roll-cage model open on the laptop next to the physical mock-up — checking every member against the design.",
    path: "/media/mockup-cad.webp",
    location: "Workshop, IIITDM Kurnool",
    date: "Build season 2025–26",
  },
  {
    title: "Workshop session",
    desc: "Front-section mock-up on the floor between the lathes, with the design on screen while the team checks dimensions.",
    path: "/media/workshop-frame.webp",
    location: "Machine shop, IIITDM Kurnool",
    date: "Build season 2025–26",
  },
  {
    title: "The crew",
    desc: "The SAEINDIA IIITDM Kurnool chapter in front of the Mechanical Engineering block.",
    path: "/media/team-2025.webp",
    location: "Mechanical Engineering block, IIITDM Kurnool",
    date: "2025–26",
  },
];


export default function HomeTab({ switchPage, onHeroDone }: HomeTabProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [stageReady, setStageReady] = useState(false);
  const [heroDone, setHeroDone] = useState(() => heroPlayed);
  const hero = useRef<HeroClock>({ started: heroPlayed, t: heroPlayed ? HERO.end : 0 });

  useEffect(() => {
    if (!heroDone) {
      document.body.classList.add("hero-active");
      window.dispatchEvent(new CustomEvent("sae:hero-status", { detail: { active: true } }));
    } else {
      document.body.classList.remove("hero-active");
      window.dispatchEvent(new CustomEvent("sae:hero-status", { detail: { active: false } }));
    }
    return () => {
      document.body.classList.remove("hero-active");
    };
  }, [heroDone]);
  const trackRef = useRef<HTMLDivElement>(null);
  // Loading progress, 0–1: 0–0.8 = model download (real bytes), 0.8–0.95 = decode, 1 = ready.
  const loadRef = useRef(0);
  const bytesRef = useRef({ loaded: 0, total: MODEL_BYTES });
  const [modelFetched, setModelFetched] = useState(false);
  const onProgress = useCallback((p: number) => { loadRef.current = Math.max(loadRef.current, 0.8 + 0.15 * (p / 100)); }, []);

  // Download the model ourselves so the loader shows real byte progress. Once it's in the
  // HTTP cache, the 3D stage mounts and three.js reads it from there (no second download).
  useEffect(() => {
    let cancelled = false;
    import("./cinema/Story3D"); // warm the 3D code in parallel with the model download
    (async () => {
      try {
        const res = await fetch(MODEL_URL, { mode: "cors", credentials: "same-origin" });
        const encoded = !!res.headers.get("content-encoding");
        const total = (!encoded && Number(res.headers.get("content-length"))) || MODEL_BYTES;
        bytesRef.current.total = total;
        const reader = res.body?.getReader();
        if (reader) {
          let got = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            got += value.byteLength;
            bytesRef.current.loaded = Math.min(got, total);
            loadRef.current = 0.8 * Math.min(1, got / total);
          }
        } else {
          await res.arrayBuffer();
        }
      } catch { /* fall through: three.js will fetch it itself */ }
      if (!cancelled) {
        bytesRef.current.loaded = bytesRef.current.total;
        loadRef.current = Math.max(loadRef.current, 0.8);
        setModelFetched(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Start downloading the model and its decoder with the page, not after the 3D code arrives.
  preload("/assets/b26_draco.glb", { as: "fetch", crossOrigin: "anonymous" });
  preload("/draco/draco_decoder.wasm", { as: "fetch", crossOrigin: "anonymous" });
  preload("/draco/draco_wasm_wrapper.js", { as: "fetch", crossOrigin: "anonymous" });

  // The model is ready: start the cold open's clock (shared with the 3D stage).
  const onStageReady = useCallback(() => {
    setStageReady(true);
    if (!hero.current.started) {
      hero.current.started = true;
      setHeroPlayed(true);
      window.dispatchEvent(new CustomEvent("sae:rev", { detail: { amount: 1, ms: 2800 } })); // ignition: drop + launch
    }
  }, []);

  // Called by the 3D stage every frame: moves the cold-open clock forward and returns it.
  const advanceHero = useCallback((dt: number) => {
    const h = hero.current;
    if (h.started && h.t < HERO.end) h.t = Math.min(HERO.end, h.t + dt);
    return h.t;
  }, []);

  const skipHero = useCallback(() => {
    hero.current.started = true;
    hero.current.t = HERO.end;
    setHeroPlayed(true);
    setHeroDone(true);
    onHeroDone?.();
    document.body.classList.remove("hero-active");
    window.dispatchEvent(new CustomEvent("sae:hero-status", { detail: { active: false } }));
  }, [onHeroDone]);

  // Network watchdog: if 3D takes > 4.5s on slow mobile networks, smoothly proceed to the page
  useEffect(() => {
    if (heroDone) return;
    const timeout = setTimeout(() => {
      if (!stageReady) {
        skipHero();
      }
    }, 4500);
    return () => clearTimeout(timeout);
  }, [heroDone, stageReady, skipHero]);

  // Touch phones: page through the story one chapter per swipe. Any deliberate vertical swipe
  // glides to exactly the next/previous chapter; until that glide (and the car's transformation
  // during it) finishes, further swipes are ignored — so text never sits half-scrolled.
  const lightboxOpen = selectedPhotoIndex !== null;
  useEffect(() => {
    if (!heroDone || lightboxOpen) return;
    const touchPhone = window.matchMedia("(pointer: coarse) and (max-width: 1023px)").matches;
    if (!touchPhone) return;
    const root = document.documentElement;
    root.classList.add("paged-story");
    const ids = CHAPTERS.map((c) => c.id);
    const rests = () => ids.map((id) => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + window.scrollY : 0; });
    const nearest = () => { const r = rests(); let best = 0; r.forEach((y, i) => { if (Math.abs(y - window.scrollY) < Math.abs(r[best] - window.scrollY)) best = i; }); return best; };
    // Locked until the glide's own completion AND a hard time floor — belt and braces.
    let busy = false, lockedUntil = 0, x0 = 0, y0 = 0, horizontal = false, tracking = false;
    const go = (i: number) => {
      const r = rests();
      const idx = Math.max(0, Math.min(r.length - 1, i));
      busy = true;
      lockedUntil = performance.now() + 1100;
      const done = () => { busy = false; };
      if (window.__lenis) window.__lenis.scrollTo(r[idx], { duration: 1.0, easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), lock: true, force: true, onComplete: done });
      else { window.scrollTo({ top: r[idx], behavior: "smooth" }); setTimeout(done, 900); }
    };
    const onStart = (e: TouchEvent) => {
      tracking = e.touches.length === 1;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; horizontal = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
      if (!horizontal && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) horizontal = true;
      if (horizontal) return;                        // let the photo strip scroll sideways
      if (e.cancelable) e.preventDefault();          // we own vertical movement on the story
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking || horizontal) return;
      tracking = false;
      const dy = (e.changedTouches[0]?.clientY ?? y0) - y0;
      if (busy || performance.now() < lockedUntil || Math.abs(dy) < 30) return;
      go(nearest() + (dy < 0 ? 1 : -1));
    };
    const onResize = () => { if (!busy && performance.now() >= lockedUntil) go(nearest()); };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("orientationchange", onResize);
    return () => {
      root.classList.remove("paged-story");
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [heroDone, lightboxOpen]);

  // End of the cold open (on the shared clock) → hand over to the story.
  useEffect(() => {
    if (heroDone) return;
    let raf = 0;
    const tick = () => {
      if (hero.current.t >= HERO.end) {
        setHeroPlayed(true);
        setHeroDone(true);
        onHeroDone?.();
        document.body.classList.remove("hero-active");
        window.dispatchEvent(new CustomEvent("sae:hero-status", { detail: { active: false } }));
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [heroDone, onHeroDone]);

  // Hold the page still during the intro; any scroll, swipe or key skips straight to the story.
  useEffect(() => {
    if (heroDone) return;
    window.scrollTo(0, 0);
    window.__lenis?.stop();
    const root = document.documentElement;
    root.style.overflow = "hidden";
    const skip = () => skipHero();
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });
    window.addEventListener("keydown", skip);
    return () => {
      root.style.overflow = "";
      window.__lenis?.start();
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [heroDone, skipHero]);

  // Keyboard navigation for the lightbox
  useEffect(() => {
    if (selectedPhotoIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPhotoIndex(null);
      else if (e.key === "ArrowRight") setSelectedPhotoIndex((p) => (p === null ? 0 : (p + 1) % galleryPhotos.length));
      else if (e.key === "ArrowLeft") setSelectedPhotoIndex((p) => (p === null ? 0 : (p - 1 + galleryPhotos.length) % galleryPhotos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPhotoIndex]);

  return (
    <div className="animate-sceneIn bg-[#0A0A0B] text-bone min-h-svh" style={{ ["--header-h" as string]: "0px" }}>
      {/* ═══ Depth layers: backdrop (z-0) → chapter text (z-10) → the car (z-[15]) ═══
          Desktop: the car renders in front of the type, so text slides *behind* the buggy.
          Phones: text and car get separate halves, and the text stays on top of the 3D layer.
          The 3D layer uses the *large* viewport height so iOS's collapsing address bar never
          resizes the canvas mid-scroll (a resize = a dropped frame).
          The 3D layer ignores the pointer, so buttons under it stay clickable. */}
      <div aria-hidden className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 55% at 50% 60%, rgba(225,6,0,0.10), transparent 70%)" }} />
        {/* Letterbox hairlines + edge vignette keep the type readable */}
        <div className="absolute inset-x-5 sm:inset-x-10 top-5 h-px bg-bone/10" />
        <div className="absolute inset-x-5 sm:inset-x-10 bottom-5 h-px bg-bone/10" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 85% 80% at 50% 50%, transparent 55%, rgba(10,10,11,0.85) 100%)" }} />
      </div>
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-[var(--header-h)] h-screen supports-[height:100svh]:h-[100svh] z-[5] lg:z-[15] pointer-events-none"
        initial={{ opacity: 0 }} animate={{ opacity: stageReady ? 1 : 0 }} transition={{ duration: 1.2 }}
      >
        {modelFetched && <Story3D trackEl={trackRef} advanceHero={advanceHero} onReady={onStageReady} onProgress={onProgress} />}
      </motion.div>

      <AnimatePresence>
        {!heroDone && <HeroOverlay key="hero" hero={hero} load={loadRef} bytes={bytesRef} onSkip={skipHero} />}
      </AnimatePresence>

      {heroDone && <SceneHUD scenes={CHAPTERS} />}

      <div ref={trackRef} className={`relative z-10 transition-opacity duration-700 ${heroDone ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {/* ── 01 · The idea ─────────────────────────────── */}
        <Chapter id="ch-idea" n={1} side="left" first>
          <motion.p
            className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.4em] text-bone/45 mb-8"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.3 }}
          >
            SAEINDIA <span className="text-apex-red">·</span> IIITDM Kurnool <span className="text-apex-red">·</span> Est. 2025
          </motion.p>
          <Title as="h1" text="Design. *Build.* Race." className="text-[clamp(3.6rem,9.5vw,9.5rem)] leading-[0.86]" />
          <p className="mt-8 max-w-md text-bone/80 text-base leading-relaxed">
            Every machine starts as a story. This one starts as a cloud of ideas in Kurnool — keep scrolling and watch it become a race car.
          </p>
          <div className="glass mt-8 grid grid-cols-3 max-w-md divide-x divide-white/10 [@media(max-height:820px)]:!hidden">
            {[["77", "Engineers"], ["1", "Machine"], ["75.2", "km/h top"]].map(([v, l]) => (
              <div key={l} className="px-4 py-4">
                <div className="gloss-text-static font-display font-semibold text-3xl tracking-[-0.04em] tabular-nums">{v}</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em] text-bone/55">{l}</div>
              </div>
            ))}
          </div>
          <div className="btn-glass mt-6 inline-flex [@media(max-width:639px)_and_(min-height:821px)]:!hidden [@media(min-width:768px)_and_(max-height:950px)]:!hidden items-center gap-3 rounded-full pl-3 pr-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.35em] text-bone/85">
            <span className="relative grid place-items-center w-6 h-6 rounded-full bg-apex-red/90 shadow-[0_0_18px_rgba(225,6,0,0.8)]">
              <span className="block w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
            Scroll to build B-26
          </div>
        </Chapter>

        {/* ── 02 · Blueprint ────────────────────────────── */}
        <Chapter
          id="ch-blueprint"
          n={2}
          side="right"
          render={(local) => (
            <>
              <Kicker n={2}>Blueprint</Kicker>
              <Title text="It begins as *lines* *of* *code.*" className="text-[clamp(2.6rem,5.6vw,5.2rem)]" />
              <div className="glass mt-8 p-5 sm:p-6 font-mono text-[10px] min-[390px]:text-[11px] sm:text-[12.5px] leading-[1.9] text-bone/60 overflow-hidden">
                <p className="mb-3 text-[10px] text-bone/30">chassis/fea.ts</p>
                {CODE.map((line, i) => <TypedLine key={i} p={local} i={i} n={CODE.length}>{line}</TypedLine>)}
              </div>
              <p className="hidden sm:block mt-6 text-bone/55 text-sm leading-relaxed max-w-md">
                Before a single tube is cut, the whole roll cage is modelled and loaded in ANSYS until it fails — on screen, not on the track.
              </p>
            </>
          )}
        />

        {/* ── 03 · Frame ────────────────────────────────── */}
        <Chapter id="ch-frame" n={3} side="left">
          <Kicker n={3}>Frame</Kicker>
          <Title text="Then the code becomes *steel.*" className="text-[clamp(2.6rem,5.6vw,5.2rem)]" />
          <p className="mt-6 text-bone/60 text-[15px] leading-relaxed max-w-md [@media(max-height:740px)]:hidden">
            In the welding lab the model turns physical — TIG-welded joints, an engine at its heart and a driveline built to survive every jump.
          </p>
          <div className="mt-8" /><SpecRows rows={[["Frame", "Chromoly AISI 4130 · Arc Welded"], ["Transmission", "JIT CVT with Custom 9:1 Gearbox"], ["Drive", "4WD Single-Speed Transfer Case · 35:65 Split"], ["Suspension", "Double Wishbone (A-arm / H-arm) · 160 mm travel"]]} />
          <div className="mt-6 hidden lg:block [@media(max-height:820px)]:!hidden"><Still src="/media/mockup-team.webp" caption="Roll-cage mock-up · Kurnool" /></div>
        </Chapter>

        {/* ── 04 · The crew ─────────────────────────────── */}
        <Chapter id="ch-crew" n={4} side="right">
          <Kicker n={4}>The crew</Kicker>
          <Title text="Steel only gets *a* *soul* from people." className="text-[clamp(2.6rem,5.6vw,5.2rem)]" />
          <div className="glass mt-10 p-5 sm:p-6 grid grid-cols-3 gap-6">
            {[
              { big: <Counter value={77} />, label: "Engineers" },
              { big: <Counter value={100} suffix="+" />, label: "Kids mentored" },
              { big: <Counter value={facultyAdvisors.length} />, label: "Faculty mentors" },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display font-semibold text-bone text-4xl sm:text-5xl tracking-[-0.05em] tabular-nums">{s.big}</div>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.3em] text-bone/45">{s.label}</p>
              </div>
            ))}
          </div>
          <dl className="hidden sm:block mt-10 space-y-4">
            {facultyAdvisors.map((a) => (
              <div key={a.name}>
                <dt className="font-mono text-[9px] uppercase tracking-[0.35em] text-bone/40">{a.role}</dt>
                <dd className="mt-1 font-display font-medium text-bone text-xl tracking-[-0.02em]">{a.name}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex gap-3 items-center">
            <div className="hidden lg:block [@media(max-height:820px)]:!hidden"><Still src="/media/team-2025.webp" caption="BAJA Team · 2026–27" /></div>
            <button onClick={() => switchPage("teams")} className="btn-glass rounded-full px-5 py-3 text-sm text-bone cursor-pointer transition-colors">Meet the team →</button>
          </div>
        </Chapter>

        {/* ── 05 · The track ────────────────────────────── */}
        <Chapter id="ch-track" n={5} side="left">
          <Kicker n={5}>The track</Kicker>
          <Title text="And the track *writes* *the* *ending.*" className="text-[clamp(2.6rem,5.6vw,5.2rem)]" />
          <dl className="glass mt-10 p-5 sm:p-6 grid grid-cols-3 gap-6 max-w-lg">
            {[["75.2", "km/h", "Top speed"], ["1657", "N", "Tractive effort"], ["7.85", "m/s²", "Deceleration"]].map(([v, u, l]) => (
              <div key={l}>
                <dd className="font-display font-semibold text-bone text-3xl sm:text-4xl tracking-[-0.04em] tabular-nums">
                  {v}<span className="ml-1 text-xs text-bone/40 tracking-normal font-normal">{u}</span>
                </dd>
                <dt className="mt-2 font-mono text-[9px] uppercase tracking-[0.3em] text-bone/45">{l}</dt>
              </div>
            ))}
          </dl>
          <p className="hidden sm:block mt-10 mb-4 font-mono text-[9px] uppercase tracking-[0.35em] text-bone/40 [@media(max-height:740px)]:!hidden">Frames from the build — tap to open</p>
          <div data-lenis-prevent className="pointer-events-auto mt-6 sm:mt-0 flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1 snap-x [@media(max-height:740px)]:hidden">
            {galleryPhotos.map((ph, i) => (
              <button key={ph.path} onClick={() => setSelectedPhotoIndex(i)} aria-label={`Open photo: ${ph.title}`} className="group relative shrink-0 snap-start w-36 aspect-[16/10] sm:w-52 sm:aspect-[4/3] rounded-2xl overflow-hidden border border-white/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] cursor-zoom-in">
                <Image src={ph.path} alt="" fill sizes="208px" className="object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                <span className="absolute inset-x-0 bottom-0 p-2.5 text-left text-[11px] font-medium text-white bg-gradient-to-t from-black/80 to-transparent">{ph.title}</span>
              </button>
            ))}
          </div>
        </Chapter>

        {/* ── 06 · Your scene ───────────────────────────── */}
        <Chapter id="ch-next" n={6} side="center">
          <Kicker n={6}><span>To be continued</span></Kicker>
          <Title text="The next scene *needs* *you.*" className="text-[clamp(3rem,8vw,7.5rem)] leading-[0.9]" />
          <p className="mt-6 mx-auto max-w-lg text-bone/60 leading-relaxed [@media(max-height:700px)]:hidden">
            Designers, analysts, programmers and operations leads — applications are open for the Monsoon 2026 cycle.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            <button
              onClick={() => switchPage("join")}
              className="btn-gloss group basis-full sm:basis-auto justify-center inline-flex items-center gap-2 rounded-full text-white px-7 py-3.5 sm:py-4 text-sm font-semibold cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98] max-w-xs sm:max-w-none mx-auto sm:mx-0"
            >
              Join the team <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            <button onClick={() => switchPage("projects")} className="btn-glass rounded-full px-4 py-2.5 text-xs sm:px-6 sm:py-4 sm:text-sm text-bone cursor-pointer transition-colors"><span className="sm:hidden">Blueprint</span><span className="hidden sm:inline">Explore the blueprint</span></button>
            <button onClick={() => switchPage("join")} className="btn-glass rounded-full px-4 py-2.5 text-xs sm:px-6 sm:py-4 sm:text-sm text-bone/80 cursor-pointer transition-colors"><span className="sm:hidden">Sponsor</span><span className="hidden sm:inline">Sponsor the season</span></button>
          </div>
          <p className="hidden sm:block mt-10 font-mono text-[9px] uppercase tracking-[0.35em] text-bone/30 [@media(max-height:820px)]:!hidden">
            Designed in SolidWorks · Validated in ANSYS · Built in Kurnool
          </p>
        </Chapter>
      </div>

      {/* Full screen Lightbox viewer for Photos */}
      {selectedPhotoIndex !== null && galleryPhotos[selectedPhotoIndex] && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-carbon-900/95 backdrop-blur-md p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPhotoIndex(null);
          }}
        >
          <div className="relative w-full max-w-5xl bg-titanium-700/95 border border-white/10 rounded-lg overflow-hidden shadow-2xl flex flex-col md:flex-row items-stretch max-h-[90vh]">
            
            {/* Arrows */}
            <button 
              onClick={() => setSelectedPhotoIndex(prev => (prev !== null ? (prev - 1 + galleryPhotos.length) % galleryPhotos.length : 0))}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/40 border border-white/10 text-white rounded-full hover:bg-apex-red hover:border-apex-red transition-all cursor-pointer font-bold"
            >
              ◀
            </button>
            <button 
              onClick={() => setSelectedPhotoIndex(prev => (prev !== null ? (prev + 1) % galleryPhotos.length : 0))}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/40 border border-white/10 text-white rounded-full hover:bg-apex-red hover:border-apex-red transition-all cursor-pointer font-bold"
            >
              ▶
            </button>

            {/* Close */}
            <button 
              onClick={() => setSelectedPhotoIndex(null)}
              className="absolute right-4 top-4 z-40 p-2 bg-black/40 border border-white/10 text-white rounded-full hover:bg-apex-red hover:border-apex-red transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Left: Image Canvas */}
            <div className="flex-grow flex items-center justify-center p-6 bg-carbon-900 border-r border-white/5 relative min-h-[300px]">
              <Image 
                src={galleryPhotos[selectedPhotoIndex].path} 
                alt={galleryPhotos[selectedPhotoIndex].title}
                width={800}
                height={600}
                className="max-w-full max-h-[60vh] md:max-h-[75vh] object-contain rounded"
              />
              <div className="absolute bottom-4 left-4 bg-black/60 border border-white/10 px-3 py-1.5 rounded font-mono text-xs text-slate-300 flex items-center gap-1.5 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-lift-blue led-pulse" />
                <span>{galleryPhotos[selectedPhotoIndex].location}</span>
              </div>
            </div>

            {/* Right EXIF details */}
            <div className="w-full md:w-80 p-6 flex flex-col justify-between bg-titanium-700 font-mono text-xs text-slate-300 border-t md:border-t-0 md:border-l border-white/5 space-y-6">
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-widest block">Event Snapshot</span>
                  <h4 className="text-white font-black text-lg uppercase tracking-tight leading-tight mt-1">
                    {galleryPhotos[selectedPhotoIndex].title}
                  </h4>
                  <span className="text-xs text-torque-orange font-bold block mt-1">
                    {galleryPhotos[selectedPhotoIndex].date}
                  </span>
                </div>

                <p className="text-xs font-sans text-slate-400 leading-relaxed pt-2 border-t border-white/5">
                  {galleryPhotos[selectedPhotoIndex].desc}
                </p>

              </div>

              <div className="pt-4 border-t border-white/5 flex gap-2">
                <a 
                  href={galleryPhotos[selectedPhotoIndex].path} 
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 border border-white/10 hover:border-white hover:bg-white hover:text-carbon-900 transition-all text-center rounded font-bold uppercase tracking-wider text-xs"
                >
                  Open Original
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

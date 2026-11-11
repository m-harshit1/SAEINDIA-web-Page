"use client";

/* Shared building blocks for the inner pages (Projects, Teams, Blog, Join), so every page speaks the
   same visual language as the home story: chrome display type with red serif accents, frosted glass,
   one racing-red, and motion that arrives with the scroll. */

import React, { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { CINE_EASE } from "./primitives";

/** Headline whose words rise out of a mask. `*word*` renders as the red serif italic accent. */
export function GlossTitle({
  text, className = "", as: Tag = "h2", delay = 0,
}: { text: string; className?: string; as?: "h1" | "h2" | "h3"; delay?: number }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const words = text.split(" ");
  return (
    <Tag ref={ref} aria-label={text.replace(/\*/g, "")} className={`font-display font-semibold text-bone tracking-[-0.05em] leading-[0.92] ${className}`}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span aria-hidden className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
            <motion.span
              className={`inline-block ${w.startsWith("*") ? "font-serif-i gloss-red tracking-[-0.015em] pr-[0.06em]" : "gloss-text-static"}`}
              initial={{ y: "110%" }}
              animate={{ y: inView ? "0%" : "110%" }}
              transition={{ duration: 0.9, delay: delay + i * 0.06, ease: CINE_EASE }}
            >
              {w.replace(/\*/g, "")}
            </motion.span>
          </span>
          {i < words.length - 1 && " "}
        </React.Fragment>
      ))}
    </Tag>
  );
}

/** Small mono label: "02 —— Domains". */
export function Kicker({ n, children, className = "" }: { n?: string | number; children: React.ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-bone/45 ${className}`}>
      {n !== undefined && <span className="text-apex-red tabular-nums">{typeof n === "number" ? String(n).padStart(2, "0") : n}</span>}
      <span className="h-px w-8 bg-bone/25" />
      {children}
    </p>
  );
}

/** Fades and lifts its children in once they scroll into view. */
export function Reveal({
  children, delay = 0, className = "", y = 36,
}: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, delay, ease: CINE_EASE }}
    >
      {children}
    </motion.div>
  );
}

export interface HeroStat { value: string; unit?: string; label: string }

/**
 * Opening title card for an inner page: a giant ghost word drifting behind, a red bloom,
 * the headline rising word by word, and a racing line that draws itself under it.
 */
export function PageHero({
  kicker, title, sub, ghost, stats, children,
}: {
  kicker: string;
  title: string;
  sub: string;
  ghost: string;
  stats?: HeroStat[];
  children?: React.ReactNode;
}) {
  const { scrollY } = useScroll();
  const ghostY = useTransform(scrollY, (v) => Math.min(v, 900) * 0.28);
  const fade = useTransform(scrollY, (v) => 0.07 * (1 - Math.min(1, v / 700))); // a faint watermark

  return (
    <section className="relative overflow-hidden pt-[124px] sm:pt-[150px] pb-14 sm:pb-20 px-5 sm:px-10">
      {/* light + texture */}
      <div aria-hidden className="pointer-events-none absolute -top-[20vh] right-[-10vw] w-[80vw] h-[80vw] max-w-[1100px] max-h-[1100px] rounded-full bg-[radial-gradient(circle,rgba(225,6,0,0.22),transparent_62%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_70%_30%,#000_10%,transparent_70%)]" />
      <motion.span
        aria-hidden
        style={{ y: ghostY, opacity: fade }}
        className="gloss-text-static [filter:none] pointer-events-none select-none absolute right-[-2vw] top-[64px] sm:top-[40px] font-display font-semibold leading-none tracking-[-0.08em] text-[clamp(9rem,30vw,30rem)]"
      >
        {ghost}
      </motion.span>

      <div className="relative max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.1 }}>
          <Kicker n="●">{kicker}</Kicker>
        </motion.div>
        <GlossTitle as="h1" text={title} delay={0.15} className="mt-6 text-[clamp(3rem,8.4vw,8rem)] leading-[0.88] max-w-[14ch]" />
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: CINE_EASE }}
          className="mt-7 max-w-xl text-bone/65 text-base sm:text-lg leading-relaxed"
        >
          {sub}
        </motion.p>

        {stats && (
          <motion.dl
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.75, ease: CINE_EASE }}
            className="glass mt-10 inline-grid grid-flow-col auto-cols-fr divide-x divide-white/10 max-w-full"
          >
            {stats.map((s) => (
              <div key={s.label} className="px-4 sm:px-7 py-4 sm:py-5 min-w-0">
                <dd className="gloss-text-static font-display font-semibold text-2xl sm:text-4xl tracking-[-0.04em] tabular-nums whitespace-nowrap">
                  {s.value}{s.unit && <span className="ml-1 text-xs sm:text-sm text-bone/40 tracking-normal font-normal [-webkit-text-fill-color:currentColor]">{s.unit}</span>}
                </dd>
                <dt className="mt-1.5 font-mono text-[8.5px] sm:text-[9px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-bone/45">{s.label}</dt>
              </div>
            ))}
          </motion.dl>
        )}
        {children}
      </div>

      {/* racing line */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.6, delay: 0.4, ease: CINE_EASE }}
        className="absolute left-0 right-0 bottom-0 h-px origin-left bg-gradient-to-r from-apex-red via-apex-red/40 to-transparent"
      />
    </section>
  );
}

/** Section header inside a page: kicker above a revealed title, optional aside on the right. */
export function SectionHead({
  n, kicker, title, aside, className = "",
}: { n?: string | number; kicker: string; title: string; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-5 ${className}`}>
      <div>
        <Kicker n={n}>{kicker}</Kicker>
        <GlossTitle text={title} className="mt-4 text-[clamp(2.1rem,4.6vw,3.9rem)]" />
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

export interface SegOption<K extends string> { key: K; label: string; short?: string }

/** Glass pill switcher with stable, glitch-free active styling. */
export function Segmented<K extends string>({
  id, options, value, onChange, className = "",
}: { id: string; options: SegOption<K>[]; value: K; onChange: (k: K) => void; className?: string }) {
  return (
    <div role="tablist" aria-label={id} className={`max-w-full overflow-x-auto no-scrollbar ${className}`}>
      <div className="glass !rounded-full inline-flex p-1 gap-1">
        {options.map((o) => {
          const on = o.key === value;
          return (
            <button
              type="button"
              key={o.key}
              role="tab"
              aria-selected={on}
              onClick={(e) => {
                e.preventDefault();
                onChange(o.key);
              }}
              className={`relative shrink-0 whitespace-nowrap rounded-full px-4 sm:px-5 py-2.5 text-[13px] sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                on
                  ? "btn-gloss text-white shadow-lg shadow-apex-red/35 scale-[1.01]"
                  : "text-bone/60 hover:text-bone hover:bg-white/[0.04]"
              }`}
            >
              <span className="relative z-10">
                {o.short ? <><span className="sm:hidden">{o.short}</span><span className="hidden sm:inline">{o.label}</span></> : o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Glass card with a soft light that follows the pointer — the page's "gloss" on hover. */
export function SpotCard({
  children, className = "", onClick, as = "div",
}: { children: React.ReactNode; className?: string; onClick?: () => void; as?: "div" | "button" | "article" }) {
  const Tag = as as "div"; // same props for div, button and article
  return (
    <Tag
      onClick={onClick}
      onPointerMove={(e: React.PointerEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={`spot-card glass !rounded-3xl relative overflow-hidden text-left transition-[transform,border-color] duration-500 hover:-translate-y-1 hover:border-white/20 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Mono field label. */
export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[9.5px] uppercase tracking-[0.3em] text-bone/45 ${className}`}>{children}</span>;
}

/** Back link used by detail views. */
export function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="btn-glass rounded-full px-5 py-2.5 text-sm text-bone/80 hover:text-bone cursor-pointer transition-colors">
      ← {children}
    </button>
  );
}

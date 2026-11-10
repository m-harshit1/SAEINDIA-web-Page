"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

export const CINE_EASE = [0.22, 1, 0.36, 1] as const;

/** Headline that rises word-by-word out of a mask, like a title card. */
export function MaskedWords({
  text, className = "", delay = 0, as: Tag = "span",
}: { text: string; className?: string; delay?: number; as?: "span" | "h1" | "h2" | "h3" }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const words = text.split(" ");
  return (
    <Tag ref={ref as React.Ref<never>} className={className} aria-label={text.replace(/\*/g, "")}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", rotate: 4 }}
            animate={inView ? { y: "0%", rotate: 0 } : undefined}
            transition={{ duration: 0.9, delay: delay + i * 0.07, ease: CINE_EASE }}
          >
            {w.startsWith("*")
              ? <span className="font-serif-i tracking-[-0.01em] text-apex-red">{w.replace(/\*/g, "")}</span>
              : w}
          </motion.span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </Tag>
  );
}

/** Quiet scene label used across the home page: "Scene 05 — By the numbers". */
export function SceneSlate({ n, title }: { n: number; title: string }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-bone/40">
      Scene {String(n).padStart(2, "0")} — {title}
    </p>
  );
}

"use client";

/* Desktop cursor: a precise red dot and a trailing ring. The ring swells over anything you can
   press and names the action ("Open", "Drag", "Read"…); pressing squeezes it. Only for fine
   pointers, and off for reduced-motion users — everyone else keeps the system cursor. */

import { useEffect, useRef } from "react";

function labelFor(el: Element | null): { hot: boolean; label: string } {
  if (!el) return { hot: false, label: "" };
  const tagged = el.closest<HTMLElement>("[data-cursor]");
  if (tagged) return { hot: true, label: tagged.dataset.cursor ?? "" };
  if (el.tagName === "CANVAS") return { hot: true, label: "Drag" };
  if (el.closest("input, textarea, select")) return { hot: false, label: "" };
  const a = el.closest("a, button, [role=tab], label, summary");
  if (!a) return { hot: false, label: "" };
  if (a.tagName === "A") return { hot: true, label: (a as HTMLAnchorElement).href.startsWith("mailto:") ? "Mail" : "Open" };
  return { hot: true, label: "" };
}

export default function RevCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("rev-cursor");
    let x = -100, y = -100, rx = -100, ry = -100, raf = 0, last = performance.now();
    let hot = false, visible = false;

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY;
      if (!visible) { visible = true; rx = x; ry = y; root.classList.add("rev-cursor--in"); }
      const l = labelFor(e.target as Element);
      if (l.hot !== hot) { hot = l.hot; ring.current?.classList.toggle("is-hot", hot); }
      if (text.current && text.current.textContent !== l.label) text.current.textContent = l.label;
      ring.current?.classList.toggle("has-label", !!l.label);
    };
    const leave = () => { visible = false; root.classList.remove("rev-cursor--in"); };
    const out = (e: MouseEvent) => { if (!e.relatedTarget) leave(); }; // pointer left the window
    const press = () => { ring.current?.classList.add("is-down"); };
    const release = () => { ring.current?.classList.remove("is-down"); };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const k = 1 - Math.pow(0.0008, dt); // springy follow
      rx += (x - rx) * k; ry += (y - ry) * k;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    document.addEventListener("mouseout", out);
    window.addEventListener("blur", leave);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("rev-cursor", "rev-cursor--in");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      document.removeEventListener("mouseout", out);
      window.removeEventListener("blur", leave);
    };
  }, []);

  return (
    <div aria-hidden className="rev-cursor-layer">
      <div ref={ring} className="rev-ring"><span ref={text} className="rev-ring__label" /></div>
      <div ref={dot} className="rev-dot" />
    </div>
  );
}

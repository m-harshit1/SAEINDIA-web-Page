"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Home, Wrench, Users, BookOpen, UserPlus,
  ChevronUp
} from "lucide-react";
import MagneticButton from "@/components/MagneticButton";
import { useReducedMotion } from "framer-motion";
import BuggyCurtain, { type CurtainRun } from "@/components/cinema/BuggyCurtain";
import { heroPlayed } from "@/components/cinema/heroTimeline";

import dynamic from "next/dynamic";
import HomeTab     from "@/components/HomeTab";

/* Only Home ships in the first load; the other tabs (and Firestore, which Blog and Join use)
   load on demand and are prefetched once the browser is idle, so switching stays instant. */
const loadProjects = () => import("@/components/ProjectsTab");
const loadTeams    = () => import("@/components/TeamsTab");
const loadBlog     = () => import("@/components/BlogTab");
const loadJoin     = () => import("@/components/JoinTab");
const ProjectsTab = dynamic(loadProjects);
const TeamsTab    = dynamic(loadTeams);
const BlogTab     = dynamic(loadBlog);
const JoinTab     = dynamic(loadJoin);
import GlobalUX    from "@/components/GlobalUX";
import DriveHUD    from "@/components/cinema/DriveHUD";
import RevCursor   from "@/components/cinema/RevCursor";
import GameLauncher from "@/components/game/GameLauncher";

/* ── Types ──────────────────────────────────────────────────────────── */
type TabId = "home" | "projects" | "teams" | "blog" | "join";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  mobileIcon: React.ReactNode;
  color: string;
}

/* ── Nav config ─────────────────────────────────────────────────────── */
const navItems: NavItem[] = [
  { id: "home",     label: "Home",     icon: <Home size={14} />,          mobileIcon: <Home size={20} />,          color: "#E10600" },
  { id: "projects", label: "Projects", icon: <Wrench size={14} />,        mobileIcon: <Wrench size={20} />,        color: "#E10600" },
  { id: "teams",    label: "Teams",    icon: <Users size={14} />,         mobileIcon: <Users size={20} />,         color: "#E10600" },
  { id: "blog",     label: "Blog",     icon: <BookOpen size={14} />,      mobileIcon: <BookOpen size={20} />,      color: "#E10600" },
  { id: "join",     label: "Join",     icon: <UserPlus size={14} />,      mobileIcon: <UserPlus size={20} />,      color: "#E10600" },
];

/* ════════════════════════════════════════════════════════════════════
   ROOT PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function SAEIndiaHubContent() {
  const [activeTab,      setActiveTab]      = useState<TabId>("home");
  const [transitioning,  setTransitioning]  = useState(false);
  const [showScrollTop,  setShowScrollTop]  = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [curtain,        setCurtain]        = useState<(CurtainRun & { tab: TabId }) | null>(null);
  const [heroActive,     setHeroActive]     = useState(() => !heroPlayed);
  const reduceMotion = useReducedMotion();

  const mainRef        = useRef<HTMLElement>(null);

  /* ── Hero animation state listener ───────────────────────────────── */
  useEffect(() => {
    const onHeroStatus = (e: Event) => {
      const active = (e as CustomEvent<{ active: boolean }>).detail?.active ?? false;
      setHeroActive(active);
    };
    window.addEventListener("sae:hero-status", onHeroStatus);
    return () => window.removeEventListener("sae:hero-status", onHeroStatus);
  }, []);

  const hideNav = activeTab === "home" && heroActive;

  /* ── Scroll events ───────────────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 300);
      setHeaderScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Prefetch the other tabs once the page has settled ───────────── */
  useEffect(() => {
    // Fetch remaining tab bundles during idle time soon after load
    const prefetch = () => { loadProjects(); loadTeams(); loadBlog(); loadJoin(); };
    let idleId = 0;
    const t = setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(prefetch, { timeout: 2500 });
      else prefetch();
    }, 1200);
    return () => { clearTimeout(t); if (idleId) window.cancelIdleCallback(idleId); };
  }, []);

  /* ── Tab navigation with transition and browser history ────────── */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as TabId | null;
      if (tabParam && navItems.some(n => n.id === tabParam)) {
        // Deep link (?tab=…) is only knowable on the client after the static HTML loads.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Browser Back & Forward (popstate) listener: keeps route history and stops site exit
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = (params.get("tab") as TabId | null) || "home";
      if (navItems.some(n => n.id === tabParam)) {
        setActiveTab(tabParam);
        if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
        else window.scrollTo({ top: 0, behavior: "instant" });
      } else {
        setActiveTab("home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Swap the visible tab (runs behind the curtain once it's fully closed).
  const commitTab = useCallback((t: TabId, pushHistory: boolean = true) => {
    setActiveTab(t);
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    else window.scrollTo({ top: 0, behavior: "instant" });
    const url = new URL(window.location.href);
    if (t === "home") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", t);
    }
    // Clean up sub-view params from previous tab
    url.searchParams.delete("project");
    url.searchParams.delete("sub");
    url.searchParams.delete("year");
    url.searchParams.delete("spec");
    url.searchParams.delete("section");
    url.searchParams.delete("post");
    url.searchParams.delete("category");

    if (pushHistory) {
      window.history.pushState({ tab: t }, "", url.toString());
    } else {
      window.history.replaceState({ tab: t }, "", url.toString());
    }
  }, []);

  const navigateTo = useCallback((tab: string, pushHistory: boolean = true) => {
    const t = tab as TabId;
    if (t === activeTab || transitioning) return;
    if (reduceMotion) { commitTab(t, pushHistory); return; }
    // The curtain closes, we swap the tab behind it, then the buggy drives it open.
    const item = navItems.find(n => n.id === t);
    setTransitioning(true);
    setCurtain({ id: Date.now(), tab: t, label: item?.label ?? t, color: item?.color ?? "#E10600" });
  }, [activeTab, transitioning, reduceMotion, commitTab]);

  // Other components (e.g. the game's "Join the team") can ask for a tab change.
  useEffect(() => {
    const on = (e: Event) => navigateTo((e as CustomEvent<string>).detail);
    window.addEventListener("sae:navigate", on);
    return () => window.removeEventListener("sae:navigate", on);
  }, [navigateTo]);

  /* ── Render tab ──────────────────────────────────────────────────── */
  const renderTab = () => {
    switch (activeTab) {
      case "home":     return <HomeTab     switchPage={navigateTo} onHeroDone={() => setHeroActive(false)} />;
      case "projects": return <ProjectsTab />;
      case "teams":    return <TeamsTab    />;
      case "blog":     return <BlogTab     />;
      case "join":     return <JoinTab     />;
      default:         return <HomeTab     switchPage={navigateTo} onHeroDone={() => setHeroActive(false)} />;
    }
  };


  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <header
        className={`site-header site-header--overlay ${hideNav ? "site-header--hidden" : ""} ${activeTab !== "home" && headerScrolled ? "site-header--scrolled" : ""}`}
      >

        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4" style={{ height: "68px" }}>

          {/* ── Logos ── */}
          <button
            onClick={() => navigateTo("home")}
            className="flex items-center gap-3 shrink-0 group cursor-pointer"
            aria-label="SAEINDIA IIITDM Kurnool home"
          >
            {/* College Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo, no resizing needed */}
            <img src="/college_logo.webp" alt="IIITDM Kurnool" className="h-9 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
            
            <div className="h-6 w-px bg-white/15 hidden sm:block"></div>

            {/* Club Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo, no resizing needed */}
            <img src="/club_logo.webp" alt="SAEINDIA Club" className="h-10 w-auto object-contain" />

            <span className="hidden xl:block leading-none ml-1">
              <strong className="block font-display font-semibold text-[16px] text-white uppercase tracking-wide leading-tight">
                SAEINDIA
              </strong>
              <small className="block font-mono text-[10.5px] text-slate-400 tracking-[0.16em] uppercase mt-[3px]">
                IIITDM Kurnool
              </small>
            </span>
          </button>

          {/* ── Desktop & Mobile nav ── */}
          <nav className="hidden md:flex items-center gap-[3px] flex-1 justify-start overflow-x-auto no-scrollbar flex-nowrap" aria-label="Primary">
            {navItems.map(item => (
              <MagneticButton
                key={item.id}
                id={`nav-${item.id}`}
                onMouseEnter={() => {
                  if (item.id === "projects") loadProjects();
                  else if (item.id === "teams") loadTeams();
                  else if (item.id === "blog") loadBlog();
                  else if (item.id === "join") loadJoin();
                }}
                onClick={() => navigateTo(item.id)}
                className={`tab-pill whitespace-nowrap shrink-0 ${activeTab === item.id ? "active" : ""}`}
                style={activeTab === item.id ? { ["--tab-color" as string]: item.color } : {}}
              >
                {item.icon}
                {item.label}
              </MagneticButton>
            ))}
          </nav>

        </div>

      </header>

      {/* ══ MAIN CONTENT (with fade transition) ══════════════════════════ */}
      <main
        ref={mainRef}
        id="main-content"
        className="pb-20 md:pb-0"
      >
        {renderTab()}
      </main>

      <GlobalUX hide={hideNav} />
      <DriveHUD hide={hideNav} />
      <GameLauncher />
      <RevCursor />
      <div aria-hidden className="film-grain" />

      {/* ══ SCENE CUT: the buggy drives the curtain open ═══════════════════ */}
      <BuggyCurtain
        run={curtain}
        onCovered={() => { if (curtain) commitTab(curtain.tab); }}
        onDone={() => { setCurtain(null); setTransitioning(false); }}
      />

      {/* ══ MOBILE BOTTOM NAV (iOS-style) ════════════════════════════════ */}
      <nav
        className={`mobile-bottom-nav md:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch transition-all duration-500 ${
          hideNav ? "opacity-0 pointer-events-none translate-y-full" : "opacity-100 translate-y-0"
        }`}
        aria-label="Mobile navigation"
        style={{
          background: "rgba(10,11,13,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px) saturate(180%)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className="flex-1 flex flex-col items-center justify-center gap-[5px] py-3 transition-all duration-200 cursor-pointer relative"
              style={{ color: isActive ? item.color : "rgba(255,255,255,0.35)", background: "transparent", border: "none" }}
              aria-label={item.label}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-b-full animate-fadeIn"
                  style={{ background: item.color }}
                />
              )}
              <span className={`transition-transform duration-200 ${isActive ? "scale-110" : "scale-100"}`}>
                {item.mobileIcon}
              </span>
              <span className="font-mono text-[8.5px] font-bold uppercase tracking-wider leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ══ SCROLL-TO-TOP ════════════════════════════════════════════════ */}
      <button
        onClick={() => {
          if (window.__lenis) {
            window.__lenis.scrollTo(0, { duration: 1.0 });
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        className={`scroll-top-btn ${showScrollTop ? "visible" : ""}`}
        aria-label="Scroll to top"
        title="Back to top"
        style={{ bottom: showScrollTop ? "80px" : "24px" }}
      >
        <ChevronUp size={19} />
      </button>
    </>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import seedPosts from '@/data/posts.json';
import { PageHero, Segmented, SpotCard, Reveal, Label } from './cinema/PageKit';
import { CINE_EASE } from './cinema/primitives';

interface BlogPost {
  id: number | string;
  title: string;
  excerpt: string;
  content: string;
  category: "Announcements" | "Testing" | "AWIM Outreach" | "Competitions";
  author: string;
  date: string;
  lastUpdated?: string;
  readTime: string;
}

const CATEGORIES = ["All", "Testing", "AWIM Outreach", "Announcements", "Competitions"] as const;
type Cat = typeof CATEGORIES[number];

export default function BlogTab() {
  // Archive posts ship with the site and render immediately; newer bulletins come from Firestore.
  const [posts, setPosts] = useState<BlogPost[]>(seedPosts as BlogPost[]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<Cat>("All");
  const [activePost, setActivePost] = useState<BlogPost | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
        const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() }) as BlogPost);
        if (alive && fresh.length) setPosts([...fresh, ...(seedPosts as BlogPost[])]);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      }
    })();
    return () => { alive = false; };
  }, []);

  const closePost = useCallback((fromBack: boolean = false) => {
    setActivePost(null);
    if (typeof window !== "undefined" && !fromBack) {
      const url = new URL(window.location.href);
      if (url.searchParams.has("post")) {
        url.searchParams.delete("post");
        if (window.history.state && window.history.state.post) {
          window.history.back();
        } else {
          window.history.replaceState({ tab: "blog" }, "", url.toString());
        }
      }
    }
  }, []);

  const openPost = (post: BlogPost) => {
    setActivePost(post);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "blog");
      url.searchParams.set("post", String(post.id));
      window.history.pushState({ tab: "blog", post: String(post.id) }, "", url.toString());
    }
  };

  // Lock page scroll behind the open article.
  useEffect(() => {
    if (!activePost) return;
    window.__lenis?.stop();
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePost(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.__lenis?.start();
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [activePost, closePost]);

  // Initialize post & category from URL query parameters (?tab=blog&post=...&category=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("post");
    if (postId && posts.length) {
      const found = posts.find((p) => String(p.id) === postId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (found) setActivePost(found);
    }
    const cat = params.get("category") as Cat | null;
    if (cat && CATEGORIES.includes(cat)) setSelectedCategory(cat);
  }, [posts]);

  // Listen to browser Back/Forward (popstate) to close reader modal or update filters without exiting site
  useEffect(() => {
    const handlePop = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") !== "blog") return;
      const postId = params.get("post");
      if (!postId) {
        setActivePost(null);
      } else {
        const found = posts.find((p) => String(p.id) === postId);
        if (found) setActivePost(found);
      }
      const cat = params.get("category") as Cat | null;
      if (cat && CATEGORIES.includes(cat)) setSelectedCategory(cat);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [posts]);

  const handleCategoryChange = (cat: Cat) => {
    setSelectedCategory(cat);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "blog");
      if (cat === "All") url.searchParams.delete("category");
      else url.searchParams.set("category", cat);
      window.history.replaceState({ tab: "blog", category: cat }, "", url.toString());
    }
  };

  const q = searchQuery.toLowerCase();
  const filtered = posts.filter(post => {
    const matchQuery = post.title.toLowerCase().includes(q) || post.excerpt.toLowerCase().includes(q) || post.content.toLowerCase().includes(q);
    const matchCategory = selectedCategory === "All" || post.category === selectedCategory;
    return matchQuery && matchCategory;
  });
  const [lead, ...rest] = filtered;

  return (
    <div className="animate-fadeIn">
      <PageHero
        kicker="Blog · From the paddock"
        title="Notes from the *paddock.*"
        sub="Shakedown results, design decisions, outreach days and the occasional broken part — written by the people who were there."
        ghost="LOG"
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-10 pb-24 space-y-10">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          <label className="glass !rounded-full flex items-center gap-3 px-5 py-3 w-full lg:max-w-sm focus-within:border-apex-red/60 transition-colors">
            <Search size={16} className="text-bone/40 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the log…"
              className="w-full bg-transparent text-[15px] text-bone placeholder:text-bone/30 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} aria-label="Clear search" className="text-bone/40 hover:text-bone cursor-pointer"><X size={15} /></button>
            )}
          </label>
          <Segmented
            id="blog-cat"
            value={selectedCategory}
            onChange={handleCategoryChange}
            options={CATEGORIES.map((c) => ({ key: c, label: c, short: c === "AWIM Outreach" ? "AWIM" : c === "Announcements" ? "News" : undefined }))}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="glass py-20 text-center">
            <p className="font-display text-bone text-2xl tracking-[-0.03em]">Nothing on the log for that.</p>
            <p className="mt-2 text-bone/45 text-sm">Try another word or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 min-h-[400px]">
            {/* Lead story */}
            <Reveal className="md:col-span-2 lg:col-span-2 lg:row-span-2">
              <SpotCard as="button" onClick={() => openPost(lead)} className="group w-full h-full min-h-[360px] lg:min-h-[480px] p-7 sm:p-10 flex flex-col justify-between">
                <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,rgba(225,6,0,0.2),transparent_65%)]" />
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-apex-red/15 border border-apex-red/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#FF5A3C]">
                    Latest · {lead.category}
                  </span>
                  <Label>{lead.readTime}</Label>
                </div>
                <div className="mt-10">
                  <h2 className="gloss-text-static font-display font-semibold tracking-[-0.045em] leading-[0.98] text-[clamp(2rem,4.2vw,3.6rem)] max-w-[20ch]">{lead.title}</h2>
                  <p className="mt-5 max-w-2xl text-bone/60 text-base leading-relaxed line-clamp-3">{lead.excerpt}</p>
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                    <span className="text-bone/50 text-sm">{lead.author} · {lead.date}</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-bone group-hover:text-[#FF5A3C] transition-colors">Read the story <ArrowUpRight size={16} /></span>
                  </div>
                </div>
              </SpotCard>
            </Reveal>

            {rest.map((post, i) => (
              <Reveal key={post.id} delay={Math.min(i, 5) * 0.06} className="h-full">
                <SpotCard as="button" onClick={() => openPost(post)} className="group w-full h-full p-6 sm:p-7 flex flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-[#FF5A3C]/90">{post.category}</Label>
                    <Label>{post.readTime}</Label>
                  </div>
                  <h3 className="mt-4 font-display font-semibold text-bone text-xl sm:text-[22px] tracking-[-0.03em] leading-[1.12] group-hover:text-white">{post.title}</h3>
                  <p className="mt-3 text-bone/55 text-sm leading-relaxed line-clamp-3 flex-1">{post.excerpt}</p>
                  <div className="mt-6 pt-4 border-t border-white/[0.07] flex items-center justify-between gap-3">
                    <span className="text-bone/45 text-[13px] truncate">{post.author}</span>
                    <ArrowUpRight size={16} className="shrink-0 text-bone/50 group-hover:text-[#FF5A3C] transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </SpotCard>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {/* Article reader — portalled to <body> so no animated ancestor can trap the fixed overlay */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {activePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex justify-center items-end sm:items-center sm:p-8"
            onClick={() => closePost()}
          >
            <motion.article
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ duration: 0.55, ease: CINE_EASE }}
              onClick={(e) => e.stopPropagation()}
              data-lenis-prevent
              className="relative w-full max-w-3xl max-h-[92svh] overflow-y-auto overscroll-contain rounded-t-[28px] sm:rounded-[28px] border border-white/10 bg-[#0b0b0d] shadow-[0_40px_140px_-30px_rgba(0,0,0,1)]"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 sm:px-10 py-4 bg-[#0b0b0d]/85 backdrop-blur-md border-b border-white/[0.06]">
                <Label className="text-[#FF5A3C]/90">{activePost.category}</Label>
                <button onClick={() => closePost()} aria-label="Close" className="btn-glass w-9 h-9 rounded-full grid place-items-center text-bone/70 hover:text-bone cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div className="px-6 sm:px-12 pt-8 sm:pt-12 pb-14">
                <h1 className="gloss-text-static font-display font-semibold tracking-[-0.045em] leading-[1.0] text-[clamp(2rem,5vw,3.4rem)]">{activePost.title}</h1>
                <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-bone/45 text-sm">
                  <span>{activePost.author}</span>
                  <span>{activePost.date}{activePost.lastUpdated && activePost.lastUpdated !== activePost.date && ` · updated ${activePost.lastUpdated}`}</span>
                  <span>{activePost.readTime}</span>
                </p>
                <div className="mt-8 h-px bg-gradient-to-r from-apex-red via-apex-red/30 to-transparent" />
                <div className="mt-8 whitespace-pre-wrap text-bone/75 text-[16px] sm:text-[17px] leading-[1.8]">
                  {activePost.content}
                </div>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

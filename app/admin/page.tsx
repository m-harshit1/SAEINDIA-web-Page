"use client";

/* Private desk for Join-form applications. Sign in with Google; Firestore rules decide who may
   read (the admin allow-list in firestore.rules) — this page only presents what the rules allow. */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { Download, LogOut, Plus, RefreshCw, Search, Send, Trash2, X } from "lucide-react";
import { app, db } from "@/lib/firebase";
import { Label } from "@/components/cinema/PageKit";

interface Application {
  id: string;
  referenceCode: string;
  name: string;
  rollNumber: string;
  email: string;
  phone: string;
  branch: string;
  year: string;
  domain: string;
  secondaryDomain: string;
  coverText: string;
  status: string;
  submittedAt?: Timestamp;
}

const STATUSES = ["Application Under Review", "Shortlisted", "Aptitude Test", "Interview", "Selected", "Not Selected"] as const;
const SHORT: Record<string, string> = {
  "Application Under Review": "New",
  Shortlisted: "Shortlisted",
  "Aptitude Test": "Aptitude",
  Interview: "Interview",
  Selected: "Selected",
  "Not Selected": "Not selected",
};

const auth = getAuth(app);
const fmt = (t?: Timestamp) => (t ? t.toDate().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

function toCsv(rows: Application[]) {
  const cols: (keyof Application)[] = ["referenceCode", "name", "rollNumber", "email", "phone", "branch", "year", "domain", "secondaryDomain", "status", "coverText"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [[...cols, "submittedAt"].join(","), ...rows.map((r) => [...cols.map((c) => esc(r[c])), esc(r.submittedAt?.toDate().toISOString())].join(","))].join("\n");
}

/* B-26 sprint leaderboard moderation: remove joke names or impossible times. */
interface LapRow { id: string; name: string; ms: number; cones: number; createdAt?: Timestamp }
function LapsPanel() {
  const [laps, setLaps] = useState<LapRow[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "laps"), orderBy("ms"), limit(50)));
      setLaps(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LapRow)); setErr("");
    } catch { setErr("Couldn't load the leaderboard."); setLaps([]); }
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);
  const remove = async (l: LapRow) => {
    if (!window.confirm(`Remove "${l.name}" (${(l.ms / 1000).toFixed(2)}s) from the leaderboard? This can't be undone.`)) return;
    try { await deleteDoc(doc(db, "laps", l.id)); setLaps((xs) => (xs ?? []).filter((x) => x.id !== l.id)); }
    catch { setErr("Couldn't remove that entry."); }
  };
  return (
    <section className="pt-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Label className="text-[#FF5A3C]/90">B-26 sprint game</Label>
          <h2 className="mt-2 font-display font-semibold tracking-[-0.04em] text-3xl">Leaderboard <span className="font-serif-i gloss-red">top 50.</span></h2>
        </div>
        <button onClick={load} title="Refresh leaderboard" className="btn-glass w-10 h-10 rounded-full grid place-items-center cursor-pointer"><RefreshCw size={15} /></button>
      </div>
      {err && <p className="mt-3 text-[14px] text-[#FF7A5C]">{err}</p>}
      <div className="mt-4 glass !rounded-[24px] overflow-hidden">
        {laps == null ? <p className="px-6 py-10 text-center text-bone/45">Loading…</p>
          : !laps.length ? <p className="px-6 py-10 text-center text-bone/45">No times posted yet.</p>
          : (
            <ul className="divide-y divide-white/[0.06]">
              {laps.map((l, i) => (
                <li key={l.id} className="flex items-center gap-4 px-5 sm:px-6 py-3">
                  <span className="w-6 font-mono text-[12px] text-bone/40 tabular-nums">{i + 1}</span>
                  <span className="flex-1 min-w-0 truncate">{l.name}</span>
                  <span className="hidden sm:inline text-bone/40 text-[13px]">{fmt(l.createdAt)}</span>
                  <span className="font-mono tabular-nums">{(l.ms / 1000).toFixed(2)}s</span>
                  <button onClick={() => remove(l)} aria-label={`Remove ${l.name}`} className="btn-glass w-9 h-9 rounded-full grid place-items-center cursor-pointer text-bone/60 hover:text-[#FF7A5C]"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </section>
  );
}

/* Blog Bulletins Desk: publish official announcements and news updates */
interface AdminBlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  createdAt?: Timestamp;
}

const BLOG_CATEGORIES = ["Announcements", "Testing", "AWIM Outreach", "Competitions"] as const;

function BlogAdminPanel() {
  const [posts, setPosts] = useState<AdminBlogPost[] | null>(null);
  const [err, setErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Announcements");
  const [author, setAuthor] = useState("SAE Executive Council");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [readTime, setReadTime] = useState("3 min read");

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdminBlogPost));
      setErr("");
    } catch {
      setErr("Couldn't load bulletins.");
      setPosts([]);
    }
  }, []);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const remove = async (p: AdminBlogPost) => {
    if (!window.confirm(`Delete bulletin "${p.title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "posts", p.id));
      setPosts((xs) => (xs ?? []).filter((x) => x.id !== p.id));
    } catch {
      setErr("Couldn't delete bulletin.");
    }
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || submitting) return;
    setSubmitting(true);
    setErr("");
    try {
      const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      await addDoc(collection(db, "posts"), {
        title: title.trim().slice(0, 200),
        category,
        author: author.trim() || "SAE Executive Council",
        excerpt: (excerpt.trim() || title.trim()).slice(0, 500),
        content: content.trim().slice(0, 20000),
        readTime: readTime.trim() || "3 min read",
        date: dateStr,
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setExcerpt("");
      setContent("");
      setShowAdd(false);
      load();
    } catch (e) {
      console.error(e);
      setErr("Failed to publish bulletin. Make sure you have admin permissions in firestore.rules.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pt-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Label className="text-[#FF5A3C]/90">Chapter Journalism</Label>
          <h2 className="mt-2 font-display font-semibold tracking-[-0.04em] text-3xl">Blog & Bulletins <span className="font-serif-i gloss-red">publishing.</span></h2>
          <p className="mt-1 text-bone/50 text-sm">Publish updates to the public Blog tab and archive.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="btn-gloss rounded-full px-4 py-2 text-sm text-white font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> {showAdd ? "Close form" : "New Bulletin"}
          </button>
          <button onClick={load} title="Refresh bulletins" className="btn-glass w-10 h-10 rounded-full grid place-items-center cursor-pointer">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {err && <p className="mt-3 text-[14px] text-[#FF7A5C]">{err}</p>}

      {/* New Bulletin Composer */}
      {showAdd && (
        <form onSubmit={submitPost} className="mt-6 glass !rounded-[24px] p-6 space-y-5 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-mono text-[10px] uppercase tracking-[0.25em] text-bone/60 mb-2">Title</label>
              <input
                required
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Virtual Round Results: Rank 12 Nationwide"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-bone focus:outline-none focus:border-apex-red/60"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.25em] text-bone/60 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-bone focus:outline-none focus:border-apex-red/60"
              >
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#121214] text-bone">{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.25em] text-bone/60 mb-2">Author</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="SAE Executive Council"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-bone focus:outline-none focus:border-apex-red/60"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.25em] text-bone/60 mb-2">Read Time</label>
              <input
                value={readTime}
                onChange={(e) => setReadTime(e.target.value)}
                placeholder="3 min read"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-bone focus:outline-none focus:border-apex-red/60"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.25em] text-bone/60 mb-2">Short Excerpt (Summary)</label>
            <input
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="1–2 punchy sentences summarizing the announcement"
              className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-bone focus:outline-none focus:border-apex-red/60"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.25em] text-bone/60 mb-2">Content (Article Body)</label>
            <textarea
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Full article body. Paragraphs will be cleanly displayed to readers."
              className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-bone focus:outline-none focus:border-apex-red/60 resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="btn-glass rounded-full px-5 py-2.5 text-sm text-bone/70 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-gloss rounded-full px-6 py-2.5 text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={14} /> {submitting ? "Publishing…" : "Publish to Blog"}
            </button>
          </div>
        </form>
      )}

      {/* Bulletins Feed List */}
      <div className="mt-4 glass !rounded-[24px] overflow-hidden">
        {posts == null ? (
          <p className="px-6 py-10 text-center text-bone/45">Loading bulletins…</p>
        ) : !posts.length ? (
          <div className="px-6 py-10 text-center text-bone/45">
            <p>No custom bulletins published to Firestore yet.</p>
            <p className="text-xs text-bone/30 mt-1">Default seed posts continue to be served from posts.json.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 sm:px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider bg-white/[0.06] border border-white/10 text-[#FF5A3C]">
                      {p.category}
                    </span>
                    <span className="text-bone/40 text-xs">{p.date} · {p.readTime}</span>
                  </div>
                  <h4 className="mt-1 font-display font-medium text-bone text-base tracking-tight truncate">{p.title}</h4>
                  <p className="mt-0.5 text-bone/50 text-xs truncate max-w-xl">{p.excerpt || p.content}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs text-bone/40">{p.author}</span>
                  <button
                    onClick={() => remove(p)}
                    aria-label={`Delete ${p.title}`}
                    className="btn-glass w-9 h-9 rounded-full grid place-items-center cursor-pointer text-bone/60 hover:text-[#FF7A5C]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [domain, setDomain] = useState<string>("All");
  const [open, setOpen] = useState<Application | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const snap = await getDocs(query(collection(db, "applications"), orderBy("submittedAt", "desc")));
      setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application));
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(code === "permission-denied"
        ? "This Google account isn't on the admin list. Ask a chapter admin to add your email to firestore.rules."
        : "Couldn't load applications. Check your connection and try again.");
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once Firebase reports a signed-in user (from the auth callback, not a render effect).
  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); if (u) load(); }), [load]);

  const signIn = async () => {
    setError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code === "auth/popup-blocked") await signInWithRedirect(auth, provider);
      else if (code === "auth/configuration-not-found" || code === "auth/operation-not-allowed")
        setError("Google sign-in isn't enabled for this Firebase project yet (Firebase console → Authentication → Sign-in method → Google).");
      else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") setError("Sign-in failed. Please try again.");
    }
  };

  const setAppStatus = async (a: Application, s: string) => {
    const prev = a.status;
    setApps((xs) => xs.map((x) => (x.id === a.id ? { ...x, status: s } : x)));
    setOpen((o) => (o && o.id === a.id ? { ...o, status: s } : o));
    try { await updateDoc(doc(db, "applications", a.id), { status: s }); }
    catch {
      setApps((xs) => xs.map((x) => (x.id === a.id ? { ...x, status: prev } : x)));
      setOpen((o) => (o && o.id === a.id ? { ...o, status: prev } : o));
      setError("Couldn't save that status change.");
    }
  };

  const domains = useMemo(() => ["All", ...Array.from(new Set(apps.map((a) => a.domain))).sort()], [apps]);
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return apps.filter((a) =>
      (status === "All" || a.status === status) &&
      (domain === "All" || a.domain === domain) &&
      (!k || [a.name, a.rollNumber, a.email, a.referenceCode, a.branch].some((v) => (v ?? "").toLowerCase().includes(k))));
  }, [apps, q, status, domain]);
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, apps.filter((a) => a.status === s).length])), [apps]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(shown)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Signed out ─────────────────────────────────────────────────── */
  if (user === undefined) {
    return <main className="min-h-svh grid place-items-center bg-[#070708]"><Label>Checking sign-in…</Label></main>;
  }
  if (!user) {
    return (
      <main className="min-h-svh grid place-items-center bg-[#070708] px-5">
        <div className="glass !rounded-[28px] w-full max-w-md p-8 sm:p-10 text-center">
          <Label className="text-[#FF5A3C]/90">SAEINDIA IIITDM Kurnool</Label>
          <h1 className="mt-4 font-display font-semibold tracking-[-0.045em] text-4xl">
            <span className="gloss-text-static">Applications </span><span className="font-serif-i gloss-red">desk.</span>
          </h1>
          <p className="mt-4 text-bone/55 text-[15px] leading-relaxed">Chapter admins only. Sign in with the Google account on the admin list.</p>
          <button onClick={signIn} className="btn-gloss mt-8 w-full rounded-full px-6 py-3.5 text-sm font-semibold text-white cursor-pointer">Sign in with Google</button>
          {error && <p className="mt-5 text-[13px] text-[#FF7A5C] leading-relaxed">{error}</p>}
          <Link href="/" className="mt-6 inline-block text-bone/40 hover:text-bone text-sm">← Back to the site</Link>
        </div>
      </main>
    );
  }

  /* ── Signed in ──────────────────────────────────────────────────── */
  return (
    <main className="min-h-svh bg-[#070708] text-bone px-4 sm:px-8 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <Label className="text-[#FF5A3C]/90">Join form · Monsoon intake</Label>
            <h1 className="mt-3 font-display font-semibold tracking-[-0.045em] text-4xl sm:text-5xl">
              <span className="gloss-text-static">Applications </span><span className="font-serif-i gloss-red">desk.</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-bone/45 text-sm mr-2">{user.email}</span>
            <button onClick={load} title="Refresh" className="btn-glass w-10 h-10 rounded-full grid place-items-center cursor-pointer"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>
            <button onClick={exportCsv} disabled={!shown.length} className="btn-glass rounded-full px-4 h-10 inline-flex items-center gap-2 text-sm cursor-pointer disabled:opacity-40"><Download size={15} /> CSV</button>
            <button onClick={() => signOut(auth)} title="Sign out" className="btn-glass w-10 h-10 rounded-full grid place-items-center cursor-pointer"><LogOut size={15} /></button>
          </div>
        </header>

        {error && <p className="glass px-5 py-4 text-[14px] text-[#FF7A5C]">{error}</p>}

        {/* Pipeline counts */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(status === s ? "All" : s)}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors cursor-pointer ${status === s ? "bg-apex-red/[0.12] border-apex-red/50" : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"}`}>
              <p className="font-display font-semibold text-2xl tabular-nums">{counts[s] ?? 0}</p>
              <Label className="block mt-1 truncate">{SHORT[s]}</Label>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="glass !rounded-full flex items-center gap-3 px-5 h-11 flex-1">
            <Search size={15} className="text-bone/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, roll number, email or reference…" className="w-full bg-transparent text-[15px] focus:outline-none placeholder:text-bone/30" />
          </label>
          <select value={domain} onChange={(e) => setDomain(e.target.value)} className="field !rounded-full !h-11 !py-0 sm:max-w-xs">
            {domains.map((d) => <option key={d} value={d}>{d === "All" ? "All domains" : d}</option>)}
          </select>
        </div>

        {/* Table (cards on phones) */}
        <div className="glass !rounded-[24px] overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.6fr_0.9fr_1fr] gap-4 px-6 py-3 border-b border-white/[0.07]">
            {["Applicant", "Branch · year", "Domain", "Submitted", "Status"].map((h) => <Label key={h}>{h}</Label>)}
          </div>
          {loading && !apps.length ? (
            <p className="px-6 py-14 text-center text-bone/45">Loading applications…</p>
          ) : !shown.length ? (
            <p className="px-6 py-14 text-center text-bone/45">{apps.length ? "No applications match these filters." : "No applications yet."}</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {shown.map((a) => (
                <li key={a.id}>
                  <button onClick={() => setOpen(a)} className="w-full text-left grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.6fr_0.9fr_1fr] gap-1 md:gap-4 px-5 md:px-6 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer">
                    <span className="min-w-0">
                      <span className="block font-medium truncate">{a.name}</span>
                      <span className="block text-bone/45 text-[13px] truncate">{a.rollNumber} · {a.email}</span>
                    </span>
                    <span className="text-bone/65 text-sm truncate">{a.branch} · {a.year}</span>
                    <span className="text-bone/65 text-sm truncate">{a.domain}</span>
                    <span className="text-bone/45 text-[13px]">{fmt(a.submittedAt)}</span>
                    <span><span className={`inline-block rounded-full px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] border ${
                      a.status === "Selected" ? "border-apex-red/60 bg-apex-red/20 text-white" : a.status === "Not Selected" ? "border-white/10 text-bone/35" : a.status === "Application Under Review" ? "border-[#FF5A3C]/50 text-[#FF7A5C]" : "border-white/20 text-bone/75"
                    }`}>{SHORT[a.status] ?? a.status}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-bone/30 text-[12px]">{shown.length} of {apps.length} applications</p>

        <BlogAdminPanel />
        <LapsPanel />
      </div>

      {/* Detail drawer */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end" onClick={() => setOpen(null)}>
          <aside onClick={(e) => e.stopPropagation()} className="w-full max-w-lg h-full overflow-y-auto bg-[#0b0b0d] border-l border-white/10 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label>{open.referenceCode}</Label>
                <h2 className="mt-2 font-display font-semibold text-3xl tracking-[-0.04em]">{open.name}</h2>
                <p className="mt-1 text-bone/45 text-sm">Submitted {fmt(open.submittedAt)}</p>
              </div>
              <button onClick={() => setOpen(null)} aria-label="Close" className="btn-glass w-9 h-9 rounded-full grid place-items-center cursor-pointer"><X size={16} /></button>
            </div>

            <dl className="mt-7 divide-y divide-white/[0.06]">
              {([
                ["Roll number", open.rollNumber],
                ["Email", <a key="e" href={`mailto:${open.email}`} className="underline decoration-apex-red/60 underline-offset-4">{open.email}</a>],
                ["Phone", <a key="p" href={`tel:${open.phone}`} className="underline decoration-apex-red/60 underline-offset-4">{open.phone}</a>],
                ["Branch", open.branch],
                ["Year", open.year],
                ["First choice", open.domain],
                ["Second choice", open.secondaryDomain],
              ] as [string, React.ReactNode][]).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-6 py-3">
                  <dt><Label>{k}</Label></dt><dd className="text-sm text-right">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-7">
              <Label>Skills, projects & why</Label>
              <p className="mt-3 whitespace-pre-wrap text-bone/75 text-[15px] leading-relaxed">{open.coverText || "—"}</p>
            </div>

            <div className="mt-8">
              <Label>Move to</Label>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => setAppStatus(open, s)}
                    className={`rounded-full px-4 py-2 text-sm cursor-pointer transition-colors ${open.status === s ? "btn-gloss text-white" : "btn-glass text-bone/75 hover:text-bone"}`}>
                    {SHORT[s]}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

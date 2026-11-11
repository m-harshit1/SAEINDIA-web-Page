'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mail, Award, Search, ShieldCheck, UserCheck } from 'lucide-react';
import {
  facultyAdvisors, officeBearers, bajaTeam, TeamMember
} from '@/data/teamData';
import { saeChapterMembers } from '@/data/saeMembers';
import Image from 'next/image';
import { PageHero, SectionHead, Segmented, SpotCard, Reveal, Label } from './cinema/PageKit';
import { engine } from './cinema/engine';

const Linkedin = ({ size = 24, ...props }: React.ComponentPropsWithoutRef<'svg'> & { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

type Segment = "officers" | "baja" | "chapter" | "alumni";
type BajaFilter = "all" | "leads" | "powertrain" | "suspension" | "chassis" | "brakes" | "steering" | "management";
type OfficerFilter = "all" | "faculty" | "executive" | "chairs";

/** One rung of the org chart. */
function OrgNode({ label, names, note, hot = false }: { label: string; names: React.ReactNode; note: string; hot?: boolean }) {
  return (
    <div className={`relative w-full max-w-md mx-auto rounded-2xl border px-6 py-5 text-center backdrop-blur-md ${
      hot ? "bg-apex-red/[0.1] border-apex-red/45 shadow-[0_20px_60px_-25px_rgba(225,6,0,0.8)]" : "bg-white/[0.035] border-white/10"
    }`}>
      <Label className={hot ? "text-[#FF5A3C]" : ""}>{label}</Label>
      <div className="mt-2 font-display font-semibold text-bone text-lg tracking-[-0.025em] leading-snug">{names}</div>
      <p className="mt-1 text-bone/45 text-[13px]">{note}</p>
    </div>
  );
}

const Wire = ({ className = "" }: { className?: string }) => (
  <div aria-hidden className={`mx-auto w-px h-8 bg-gradient-to-b from-apex-red/70 to-white/10 ${className}`} />
);

function MemberCard({ m, i }: { m: TeamMember; i: number }) {
  return (
    <Reveal delay={Math.min(i, 6) * 0.04} className="h-full">
      <SpotCard className="h-full p-6 flex flex-col relative overflow-hidden">
        {m.isLead && (
          <div className="absolute top-0 right-0 bg-gradient-to-l from-apex-red/30 to-transparent text-apex-red px-3 py-1 text-[10px] font-mono uppercase tracking-widest font-semibold flex items-center gap-1">
            <Award size={11} /> Lead
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 w-14 h-14 rounded-full p-[1.5px] bg-[conic-gradient(from_210deg,#E10600,#ffffff40,#8A0400,#FF5A3C,#E10600)]">
            <div className="w-full h-full rounded-full bg-[#0c0c0e] grid place-items-center font-display font-semibold text-bone text-base tracking-[-0.02em]">
              {m.initials}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-bone text-lg tracking-[-0.025em] leading-tight truncate">{m.name}</h3>
            <Label className="block mt-1 truncate">{m.subteam}</Label>
          </div>
        </div>
        <p className="mt-5 text-bone/70 text-[14.5px] font-medium leading-relaxed flex-1">{m.role}</p>
        <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center gap-2">
          {m.email && (
            <a href={`mailto:${m.email}`} title={`Email ${m.name}`} className="btn-glass w-9 h-9 rounded-full grid place-items-center text-bone/60 hover:text-bone transition-colors">
              <Mail size={14} />
            </a>
          )}
          {m.linkedin && (
            <a href={m.linkedin} target="_blank" rel="noreferrer" title="LinkedIn" className="btn-glass w-9 h-9 rounded-full grid place-items-center text-bone/60 hover:text-bone transition-colors">
              <Linkedin size={14} />
            </a>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-bone/35">
            <span className="w-1.5 h-1.5 rounded-full bg-apex-red/80" /> Active
          </span>
        </div>
      </SpotCard>
    </Reveal>
  );
}

export default function TeamsTab() {
  // Order: Office Bearers first, then BAJA, then Chapter Members, then Alumni
  const [activeSegment, setActiveSegment] = useState<Segment>("officers");
  const [bajaFilter, setBajaFilter] = useState<BajaFilter>("all");
  const [officerFilter, setOfficerFilter] = useState<OfficerFilter>("all");
  const [memberSearch, setMemberSearch] = useState<string>("");
  const segContainerRef = useRef<HTMLDivElement>(null);

  // Initialize from deep-link query parameters (?tab=teams&section=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sec = params.get("section") as Segment | null;
    if (sec && ["officers", "baja", "chapter", "alumni"].includes(sec)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSegment(sec);
    }
  }, []);

  // Listen to browser Back/Forward (popstate) to step back without exiting the site
  useEffect(() => {
    const handlePop = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") !== "teams") return;
      const sec = (params.get("section") as Segment | null) || "officers";
      if (["officers", "baja", "chapter", "alumni"].includes(sec)) {
        setActiveSegment(sec);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const handleSegmentChange = (seg: Segment) => {
    setActiveSegment(seg);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "teams");
      url.searchParams.set("section", seg);
      window.history.pushState({ tab: "teams", section: seg }, "", url.toString());

      // Anchor scroll so user is never thrown down to the bottom
      if (segContainerRef.current) {
        const segTop = segContainerRef.current.getBoundingClientRect().top + window.scrollY - 70;
        if (window.scrollY > segTop) {
          if (window.__lenis) {
            window.__lenis.scrollTo(segTop, { immediate: true });
          } else {
            window.scrollTo({ top: segTop, behavior: "instant" });
          }
        }
      }
    }
  };

  const getFilteredBaja = () => {
    switch (bajaFilter) {
      case "leads": return bajaTeam.filter(m => m.isLead);
      case "powertrain": return bajaTeam.filter(m => m.subteam === "Powertrain");
      case "suspension": return bajaTeam.filter(m => m.subteam === "Suspension");
      case "chassis": return bajaTeam.filter(m => m.subteam === "Chassis");
      case "brakes": return bajaTeam.filter(m => m.subteam === "Brakes");
      case "steering": return bajaTeam.filter(m => m.subteam === "Steering");
      case "management": return bajaTeam.filter(m => m.subteam === "Management" || m.subteam === "Intern");
      default: return bajaTeam;
    }
  };

  const getFilteredOfficers = () => {
    switch (officerFilter) {
      case "faculty": return facultyAdvisors;
      case "executive": return officeBearers.filter(m => m.subteam === "Executive Council");
      case "chairs": return officeBearers.filter(m => m.subteam === "Chapter Chairs");
      default: return [...facultyAdvisors, ...officeBearers];
    }
  };

  const filteredMembers = saeChapterMembers.filter((m) => {
    const q = memberSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.graduationYear.includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fadeIn">
      <PageHero
        kicker="Teams · The Chapter & Squad"
        title="The minds driving the *mission.*"
        sub="The faculty advisors, chapter office bearers, and the 34-member engineering crew building the B-26 all-terrain buggy for BAJA SAEINDIA."
        ghost="CREW"
        stats={[
          { value: "8", label: "Office Bearers" },
          { value: "34", label: "BAJA Crew" },
          { value: "77", label: "SAE Members" },
          { value: "2", label: "Faculty Mentors" },
        ]}
      />

      {/* Sticky Segmented Switcher: stays pinned at top under the navigation header */}
      <div
        ref={segContainerRef}
        className="sticky top-[68px] z-30 bg-[#0a0a0c]/90 backdrop-blur-xl border-y border-white/[0.08] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-10 py-3.5 flex items-center justify-between">
          <Segmented
            id="team-seg"
            value={activeSegment}
            onChange={handleSegmentChange}
            options={[
              { key: "officers", label: "Office Bearers (2025–26)", short: "Officers" },
              { key: "baja", label: "Current BAJA Team (2026–27)", short: "BAJA Team" },
              { key: "chapter", label: "Collegiate Members (77)", short: "Members" },
              { key: "alumni", label: "Alumni Network", short: "Alumni" },
            ]}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-10 pt-10 pb-24 space-y-16">

        {/* ══ 1. OFFICE BEARERS & ADVISORY (FIRST SECTION) ══════════════ */}
        {activeSegment === "officers" && (
          <div className="space-y-20 animate-fadeIn">
            {/* Leadership Spotlight: Individual Cards for Faculty Advisors, President & Vice President */}
            <section className="space-y-8">
              <SectionHead
                n={0}
                kicker="Collegiate Leadership"
                title="Faculty Advisors & *Executive* *Chairs.*"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Faculty Advisor 1: Dr. Akhtar Khan */}
                <Reveal delay={0.0}>
                  <SpotCard className="h-full p-6 border-white/15 bg-white/[0.03] flex flex-col relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-apex-red/15 border border-apex-red/35 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[#FF5A3C]">
                        <ShieldCheck size={12} /> Faculty Mentor
                      </span>
                      <span className="font-mono text-[10px] uppercase text-bone/40">IIITDMK</span>
                    </div>
                    <div className="mt-5 flex items-center gap-4">
                      <div className="relative shrink-0 w-16 h-16 rounded-full p-[1.5px] bg-[conic-gradient(from_210deg,#E10600,#ffffff40,#8A0400,#FF5A3C,#E10600)]">
                        <div className="w-full h-full rounded-full bg-[#0c0c0e] grid place-items-center font-display font-semibold text-bone text-lg">
                          AK
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-bone text-xl tracking-tight">Dr. Akhtar Khan</h3>
                        <p className="text-apex-red font-medium text-xs mt-0.5">Faculty Advisor</p>
                      </div>
                    </div>
                    <p className="mt-4 text-bone/60 text-[13.5px] leading-relaxed flex-1">
                      Department of Mechanical Engineering, providing academic oversight, design verification, and institutional backing for chapter initiatives.
                    </p>
                    <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-bone/40">
                      <span>Mechanical Engg.</span>
                      <span className="text-[#FF5A3C]">Advisory</span>
                    </div>
                  </SpotCard>
                </Reveal>

                {/* Faculty Advisor 2: Dr. S. Anand Kumar */}
                <Reveal delay={0.05}>
                  <SpotCard className="h-full p-6 border-white/15 bg-white/[0.03] flex flex-col relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-apex-red/15 border border-apex-red/35 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[#FF5A3C]">
                        <ShieldCheck size={12} /> Faculty Mentor
                      </span>
                      <span className="font-mono text-[10px] uppercase text-bone/40">IIITDMK</span>
                    </div>
                    <div className="mt-5 flex items-center gap-4">
                      <div className="relative shrink-0 w-16 h-16 rounded-full p-[1.5px] bg-[conic-gradient(from_210deg,#E10600,#ffffff40,#8A0400,#FF5A3C,#E10600)]">
                        <div className="w-full h-full rounded-full bg-[#0c0c0e] grid place-items-center font-display font-semibold text-bone text-lg">
                          SA
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-bone text-xl tracking-tight">Dr. S. Anand Kumar</h3>
                        <p className="text-apex-red font-medium text-xs mt-0.5">Faculty Advisor</p>
                      </div>
                    </div>
                    <p className="mt-4 text-bone/60 text-[13.5px] leading-relaxed flex-1">
                      Department of Mechanical Engineering, guiding technical methodology, laboratory fabrication, and community outreach programmes including AWIM.
                    </p>
                    <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-bone/40">
                      <span>Mechanical Engg.</span>
                      <span className="text-[#FF5A3C]">Advisory</span>
                    </div>
                  </SpotCard>
                </Reveal>

                {/* President: Harshit Mishra */}
                <Reveal delay={0.1}>
                  <SpotCard className="h-full p-6 border-apex-red/40 bg-apex-red/[0.06] flex flex-col relative overflow-hidden shadow-[0_15px_40px_-20px_rgba(225,6,0,0.4)]">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-apex-red/25 border border-apex-red/50 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[#FF5A3C] font-semibold">
                        <Award size={12} /> Executive Head
                      </span>
                      <span className="font-mono text-[10px] uppercase text-bone/40">2025–26</span>
                    </div>
                    <div className="mt-5 flex items-center gap-4">
                      <div className="relative shrink-0 w-16 h-16 rounded-full p-[1.5px] bg-[conic-gradient(from_210deg,#E10600,#ffffff,#FF5A3C,#E10600)]">
                        <div className="w-full h-full rounded-full bg-[#0c0c0e] grid place-items-center font-display font-bold text-bone text-xl">
                          HM
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-bone text-xl tracking-tight">Harshit Mishra</h3>
                        <p className="text-[#FF5A3C] font-medium text-xs mt-0.5">President</p>
                      </div>
                    </div>
                    <p className="mt-4 text-bone/70 text-[13.5px] leading-relaxed flex-1">
                      Directs overall collegiate operations, government relations, and technical integration as Captain & Powertrain Lead for Team Monarch.
                    </p>
                    <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-bone/40">
                      <span>Executive Council</span>
                      <span className="text-[#FF5A3C]">President</span>
                    </div>
                  </SpotCard>
                </Reveal>

                {/* Vice President: Ramakrishna Sen */}
                <Reveal delay={0.15}>
                  <SpotCard className="h-full p-6 border-apex-red/40 bg-apex-red/[0.06] flex flex-col relative overflow-hidden shadow-[0_15px_40px_-20px_rgba(225,6,0,0.4)]">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-apex-red/25 border border-apex-red/50 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-[#FF5A3C] font-semibold">
                        <Award size={12} /> Executive Head
                      </span>
                      <span className="font-mono text-[10px] uppercase text-bone/40">2025–26</span>
                    </div>
                    <div className="mt-5 flex items-center gap-4">
                      <div className="relative shrink-0 w-16 h-16 rounded-full p-[1.5px] bg-[conic-gradient(from_210deg,#E10600,#ffffff,#FF5A3C,#E10600)]">
                        <div className="w-full h-full rounded-full bg-[#0c0c0e] grid place-items-center font-display font-bold text-bone text-xl">
                          RS
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display font-semibold text-bone text-xl tracking-tight">Ramakrishna Sen</h3>
                        <p className="text-[#FF5A3C] font-medium text-xs mt-0.5">Vice President</p>
                      </div>
                    </div>
                    <p className="mt-4 text-bone/70 text-[13.5px] leading-relaxed flex-1">
                      Heads internal collegiate administration, strategic planning, resource logistics, and serves as Management Lead for BAJA SAEINDIA.
                    </p>
                    <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-bone/40">
                      <span>Executive Council</span>
                      <span className="text-[#FF5A3C]">Vice President</span>
                    </div>
                  </SpotCard>
                </Reveal>
              </div>
            </section>

            {/* Org Chart */}
            <section className="space-y-10">
              <SectionHead n={1} kicker="Chain of command" title="Governance & *Council* (2025–2026)" />
              <Reveal className="glass !rounded-[28px] px-5 sm:px-10 py-10 sm:py-14 relative overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[70%] h-48 bg-[radial-gradient(ellipse_at_top,rgba(225,6,0,0.18),transparent_70%)]" />
                <OrgNode label="Faculty Advisors" names="Dr. Akhtar Khan & Dr. S. Anand Kumar" note="Department of Mechanical Engineering · IIITDM Kurnool" />
                <Wire />
                <OrgNode hot label="Executive Council" names={<>Harshit Mishra <span className="text-bone/40 font-normal">· President</span><br />Ramakrishna Sen <span className="text-bone/40 font-normal">· Vice President</span></>} note="Collegiate operations, strategic planning & governance" />
                <Wire />
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-3xl mx-auto">
                  <div aria-hidden className="hidden md:block absolute left-1/4 right-1/4 -top-px h-px bg-white/15" />
                  <OrgNode label="Finance & Accounts" names="Vineet Sharma" note="Treasurer · budget allocation & accounts" />
                  <OrgNode label="Secretariat" names="Pranjal Mishra" note="Secretary · chapter documentation & records" />
                </div>
                <Wire className="hidden md:block" />
                <div className="mt-4 md:mt-0 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
                  <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-5 sm:p-6">
                    <Label>Chapter Chairs</Label>
                    <dl className="mt-3 divide-y divide-white/[0.06]">
                      <div className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="text-bone/55 text-sm">Membership Chair</dt>
                        <dd className="text-bone text-sm font-medium text-right">Shanu Jha</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="text-bone/55 text-sm">Publicity Chair</dt>
                        <dd className="text-bone text-sm font-medium text-right">Jatin Sharma</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-5 sm:p-6">
                    <Label>Event & Outreach Chairs</Label>
                    <dl className="mt-3 divide-y divide-white/[0.06]">
                      <div className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="text-bone/55 text-sm">Reception Chair</dt>
                        <dd className="text-bone text-sm font-medium text-right">Prashant Kumar</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="text-bone/55 text-sm">Program Chair</dt>
                        <dd className="text-bone text-sm font-medium text-right">Karthikeya</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </Reveal>
            </section>

            {/* Complete Directory */}
            <section className="space-y-10">
              <SectionHead
                n={2}
                kicker="Directory"
                title="Office Bearers *Roster.*"
                aside={
                  <Segmented
                    id="officer-filter"
                    value={officerFilter}
                    onChange={setOfficerFilter}
                    options={[
                      { key: "all", label: "All Officers", short: "All" },
                      { key: "faculty", label: "Faculty", short: "Faculty" },
                      { key: "executive", label: "Executive Council", short: "Exec" },
                      { key: "chairs", label: "Chairs", short: "Chairs" },
                    ]}
                  />
                }
              />
              <div key={officerFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {getFilteredOfficers().map((m, i) => (
                  <MemberCard key={`${m.name}-${m.role}-${i}`} m={m} i={i} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ══ 2. CURRENT BAJA TEAM (2026–2027) ══════════════════════════ */}
        {activeSegment === "baja" && (
          <div className="space-y-16 animate-fadeIn">
            {/* The Crew Media Section with updated 2026-2027 Photo Caption */}
            <section className="space-y-10">
              <SectionHead n={0} kicker="The crew" title="BAJA Team *2026–2027.*" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <Reveal className="lg:col-span-7">
                  <figure className="glass !rounded-[28px] overflow-hidden p-2">
                    <video
                      className="w-full aspect-video rounded-[22px] bg-black object-cover"
                      src="/media/team-intro.mp4"
                      poster="/media/team-intro-poster.webp"
                      controls
                      playsInline
                      preload="none"
                      onPlay={() => engine.duck(true)}
                      onPause={() => engine.duck(false)}
                      onEnded={() => engine.duck(false)}
                    />
                    <figcaption className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="font-display font-medium text-bone tracking-[-0.01em]">A word from the team</span>
                      <Label>B-26 · in their words</Label>
                    </figcaption>
                  </figure>
                </Reveal>
                <Reveal delay={0.1} className="lg:col-span-5">
                  <figure className="glass !rounded-[28px] overflow-hidden p-2 h-full flex flex-col">
                    <div className="relative flex-1 min-h-[260px] rounded-[22px] overflow-hidden">
                      <Image
                        src="/media/team-2025.webp"
                        alt="The BAJA SAEINDIA 2026-2027 Team in front of the Mechanical Engineering block"
                        fill
                        sizes="(min-width:1024px) 40vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                    <figcaption className="flex items-center justify-between gap-4 px-4 py-3">
                      <div>
                        <span className="font-display font-medium text-bone tracking-[-0.01em] block">The crew, 2026–27</span>
                        <span className="text-[11px] font-mono text-[#FF5A3C]">BAJA Team 2026–2027</span>
                      </div>
                      <Label>Mechanical Engineering block</Label>
                    </figcaption>
                  </figure>
                </Reveal>
              </div>
            </section>

            {/* Leadership Spotlight Banner */}
            <section className="space-y-8">
              <SectionHead n={1} kicker="Team Leadership" title="Captains & Subsystem *Leads.*" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: "Harshit Mishra", role: "Team Captain & Powertrain Lead", subteam: "Powertrain" },
                  { name: "Ramakrishna Sen", role: "Management Lead", subteam: "Management" },
                  { name: "Jatin Sharma", role: "Suspension Lead", subteam: "Suspension" },
                  { name: "Samarth Sakhale", role: "Brakes Head", subteam: "Brakes" },
                  { name: "Uday Paul George", role: "Chassis Lead", subteam: "Chassis" },
                  { name: "Prashant Kumar", role: "Steering Lead", subteam: "Steering" },
                  { name: "Vishavjeet Singh Bhati", role: "Driver & Dynamics", subteam: "Vehicle Dynamics" },
                ].map((lead, i) => (
                  <Reveal key={lead.name} delay={i * 0.05}>
                    <SpotCard className="p-5 border-apex-red/30 bg-apex-red/[0.04]">
                      <div className="flex items-center gap-2 text-apex-red font-mono text-[10px] uppercase tracking-widest font-semibold mb-2">
                        <Award size={12} /> {lead.subteam}
                      </div>
                      <h4 className="font-display font-semibold text-bone text-lg tracking-tight">{lead.name}</h4>
                      <p className="text-bone/60 text-xs mt-1">{lead.role}</p>
                    </SpotCard>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* BAJA Roster Section */}
            <section className="space-y-10">
              <SectionHead
                n={2}
                kicker="Subsystem Roster"
                title="B-26 Engineering *Squad.*"
                aside={
                  <Segmented
                    id="baja-filter"
                    value={bajaFilter}
                    onChange={setBajaFilter}
                    options={[
                      { key: "all", label: "Everyone", short: "All" },
                      { key: "leads", label: "Leads Only", short: "Leads" },
                      { key: "powertrain", label: "Powertrain", short: "Power" },
                      { key: "suspension", label: "Suspension", short: "Susp" },
                      { key: "chassis", label: "Chassis" },
                      { key: "brakes", label: "Brakes" },
                      { key: "steering", label: "Steering" },
                      { key: "management", label: "Management", short: "Mgmt" },
                    ]}
                  />
                }
              />
              <div key={bajaFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {getFilteredBaja().map((m, i) => (
                  <MemberCard key={`${m.name}-${m.subteam}-${i}`} m={m} i={i} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ══ 3. SAE COLLEGIATE CHAPTER MEMBERS (77 MEMBERS) ════════════ */}
        {activeSegment === "chapter" && (
          <div className="space-y-10 animate-fadeIn">
            <SectionHead
              n={0}
              kicker="Collegiate Cohort"
              title="Registered SAE *Members.*"
              aside={
                <div className="glass !rounded-full flex items-center gap-3 px-4 py-2 w-full sm:w-72">
                  <Search size={14} className="text-bone/40 shrink-0" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search name, class year…"
                    className="w-full bg-transparent text-sm text-bone placeholder:text-bone/30 focus:outline-none"
                  />
                </div>
              }
            />

            <div className="glass !rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
                <div>
                  <h3 className="font-display font-semibold text-bone text-2xl tracking-tight">Collegiate Chapter Roster</h3>
                  <p className="mt-1 text-bone/50 text-sm">Official student members of SAEINDIA Collegiate Chapter at IIITDM Kurnool ({filteredMembers.length} displayed)</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1 font-mono text-[11px] text-bone/70">
                    <UserCheck size={13} className="text-[#FF5A3C]" /> 77 Active Members
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.map((m, i) => (
                  <div
                    key={`${m.email}-${i}`}
                    className="rounded-2xl border border-white/[0.07] bg-black/30 hover:bg-white/[0.04] p-4 flex items-center justify-between gap-3.5 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 grid place-items-center font-display font-semibold text-bone text-xs shrink-0">
                        {m.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-medium text-bone text-sm truncate tracking-tight">{m.name}</p>
                        <p className="text-[#FF5A3C] font-mono text-xs mt-0.5 font-medium">Class of {m.graduationYear}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredMembers.length === 0 && (
                <div className="py-16 text-center text-bone/40">
                  <p className="font-display text-lg">No members found matching &quot;{memberSearch}&quot;</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ 4. ALUMNI NETWORK ═════════════════════════════════════════ */}
        {activeSegment === "alumni" && (
          <div className="space-y-12 animate-fadeIn">
            <Reveal className="glass !rounded-[28px] relative overflow-hidden px-6 sm:px-14 py-14 sm:py-20">
              <span aria-hidden className="gloss-text-static [filter:none] pointer-events-none absolute -right-6 -bottom-16 font-display font-semibold leading-none tracking-[-0.08em] text-[18rem] sm:text-[26rem] opacity-[0.06]">0</span>
              <Label className="text-[#FF5A3C]/90">Foundational era</Label>
              <h3 className="mt-5 font-display font-semibold tracking-[-0.05em] leading-[0.92] text-[clamp(2.4rem,6vw,5rem)] max-w-[16ch]">
                <span className="gloss-text-static">Zero alumni. </span><span className="font-serif-i gloss-red">For now.</span>
              </h3>
              <p className="mt-6 max-w-xl text-bone/65 text-base sm:text-lg leading-relaxed">
                The chapter was chartered in 2025. Our first cohorts are currently designing and manufacturing the B-26 all-terrain vehicle — the inaugural alumni graduate in 2027–28.
              </p>
              <button onClick={() => handleSegmentChange("baja")} className="btn-gloss mt-9 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white cursor-pointer">
                Meet the BAJA crew →
              </button>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
              {[
                { v: "0", l: "Graduated alumni", d: "Inaugural cohort in training" },
                { v: "2025", l: "Chartered", d: "SAEINDIA collegiate chapter" },
                { v: "77", l: "Active members", d: "Enrolled in chapter" },
                { v: "’27", l: "First graduates", d: "Class of 2027–28" },
              ].map((st, i) => (
                <Reveal key={st.l} delay={i * 0.06}>
                  <SpotCard className="h-full p-5 sm:p-6">
                    <p className="gloss-text-static font-display font-semibold text-4xl sm:text-5xl tracking-[-0.05em] tabular-nums">{st.v}</p>
                    <Label className="block mt-3">{st.l}</Label>
                    <p className="mt-1.5 text-bone/45 text-[13px]">{st.d}</p>
                  </SpotCard>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

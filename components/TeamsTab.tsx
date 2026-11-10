'use client';

import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import {
  facultyAdvisors, executiveBoard, coreLeadership, subsystemLeads,
  managementTeam, TeamMember
} from '@/data/teamData';
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

type Filter = "all" | "faculty" | "leadership" | "technical" | "management";

const LEADS = {
  engineering: [
    ["Chassis & structure", "V. Akash"],
    ["Suspension & geometry", "Vineet Sharma"],
    ["Drivetrain & transmission", "N M Roshanth"],
    ["Brakes & steering", "Samarth Sakhale"],
    ["Electrical & DAQ", "Sneha Nair"],
  ],
  management: [
    ["Sponsors & CSR outreach", "Priya Patel"],
    ["Finance & billing", "Aman Sharma"],
    ["PR, media & design", "Rohan Verma"],
    ["AWIM programme", "Sneha Nair"],
  ],
};

/** One rung of the org chart. */
function OrgNode({ label, names, note, hot = false }: { label: string; names: React.ReactNode; note: string; hot?: boolean }) {
  return (
    <div className={`relative w-full max-w-md mx-auto rounded-2xl border px-6 py-5 text-center backdrop-blur-md ${
      hot ? "bg-apex-red/[0.1] border-apex-red/45 shadow-[0_20px_60px_-25px_rgba(225,6,0,0.8)]" : "bg-white/[0.035] border-white/10"
    }`}>
      <Label className={hot ? "text-[#FF5A3C]" : ""}>{label}</Label>
      <p className="mt-2 font-display font-semibold text-bone text-lg tracking-[-0.025em] leading-snug">{names}</p>
      <p className="mt-1 text-bone/45 text-[13px]">{note}</p>
    </div>
  );
}

const Wire = ({ className = "" }: { className?: string }) => (
  <div aria-hidden className={`mx-auto w-px h-8 bg-gradient-to-b from-apex-red/70 to-white/10 ${className}`} />
);

function MemberCard({ m, i }: { m: TeamMember; i: number }) {
  return (
    <Reveal delay={Math.min(i, 6) * 0.05} className="h-full">
      <SpotCard className="h-full p-6 flex flex-col">
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
        <p className="mt-5 text-bone/65 text-[15px] leading-relaxed flex-1">{m.role}</p>
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
  const [activeSegment, setActiveSegment] = useState<"officers" | "alumni">("officers");
  const [activeTab, setActiveTab] = useState<Filter>("all");

  const getFilteredMembers = () => {
    switch (activeTab) {
      case "faculty": return facultyAdvisors;
      case "leadership": return [...executiveBoard, ...coreLeadership];
      case "technical": return subsystemLeads;
      case "management": return managementTeam;
      default: return [...facultyAdvisors, ...executiveBoard, ...coreLeadership, ...subsystemLeads, ...managementTeam];
    }
  };

  return (
    <div className="animate-fadeIn">
      <PageHero
        kicker="Teams · The crew"
        title="The people behind the *cage.*"
        sub="Seventy-seven students from every branch — welders, coders, analysts and dealmakers — who turned a chapter founded in 2025 into a car that runs."
        ghost="77"
        stats={[
          { value: "77", label: "Engineers" },
          { value: "5", label: "Subsystems" },
          { value: "2", label: "Faculty mentors" },
        ]}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-10 pb-24 space-y-16">
        <Segmented
          id="team-seg"
          value={activeSegment}
          onChange={setActiveSegment}
          options={[
            { key: "officers", label: "Officers & org chart", short: "Officers" },
            { key: "alumni", label: "Alumni network", short: "Alumni" },
          ]}
        />

        {activeSegment === "officers" ? (
          <div className="space-y-20 animate-fadeIn">
            {/* ── The crew, for real ── */}
            <section className="space-y-10">
              <SectionHead n={0} kicker="The crew" title="Meet us *before* *the* *car.*" />
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
                      <Image src="/media/team-2025.webp" alt="The SAEINDIA IIITDM Kurnool team in front of the Mechanical Engineering block" fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
                    </div>
                    <figcaption className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="font-display font-medium text-bone tracking-[-0.01em]">The crew, 2025–26</span>
                      <Label>Mechanical Engineering block</Label>
                    </figcaption>
                  </figure>
                </Reveal>
              </div>
            </section>

            {/* ── Org chart ── */}
            <section className="space-y-10">
              <SectionHead n={1} kicker="Chain of command" title="Who answers *to* *whom.*" />
              <Reveal className="glass !rounded-[28px] px-5 sm:px-10 py-10 sm:py-14 relative overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[70%] h-48 bg-[radial-gradient(ellipse_at_top,rgba(225,6,0,0.18),transparent_70%)]" />
                <OrgNode label="Faculty advisors" names="Dr. S. Anand Kumar & Dr. Pankaj Kaushik" note="Department of Mechanical Engineering" />
                <Wire />
                <OrgNode hot label="Executive board" names={<>Harshit Kumar Mishra <span className="text-bone/40 font-normal">· President</span><br />N M Roshanth <span className="text-bone/40 font-normal">· Vice-President</span></>} note="Chapter operations & strategy" />
                <Wire />
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-3xl mx-auto">
                  <div aria-hidden className="hidden md:block absolute left-1/4 right-1/4 -top-px h-px bg-white/15" />
                  <OrgNode label="Technical division" names="Vineet Sharma" note="Technical head · vehicle dynamics" />
                  <OrgNode label="Operations & finance" names="Priya Patel" note="Sponsorships & public relations" />
                </div>
                <Wire className="hidden md:block" />
                <div className="mt-4 md:mt-0 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
                  {([["Engineering subsystem leads", LEADS.engineering], ["Management & compliance", LEADS.management]] as const).map(([title, rows]) => (
                    <div key={title} className="rounded-2xl border border-white/[0.08] bg-black/25 p-5 sm:p-6">
                      <Label>{title}</Label>
                      <dl className="mt-3 divide-y divide-white/[0.06]">
                        {rows.map(([k, v]) => (
                          <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                            <dt className="text-bone/55 text-sm">{k}</dt>
                            <dd className="text-bone text-sm font-medium text-right">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </Reveal>
            </section>

            {/* ── Directory ── */}
            <section className="space-y-10">
              <SectionHead
                n={2}
                kicker="Directory"
                title="Faces *on* *the* *roster.*"
                aside={
                  <Segmented
                    id="team-filter"
                    value={activeTab}
                    onChange={setActiveTab}
                    options={[
                      { key: "all", label: "Everyone", short: "All" },
                      { key: "faculty", label: "Faculty" },
                      { key: "leadership", label: "Leadership", short: "Board" },
                      { key: "technical", label: "Engineering", short: "Eng" },
                      { key: "management", label: "Management", short: "Mgmt" },
                    ]}
                  />
                }
              />
              <div key={activeTab} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {getFilteredMembers().map((m, i) => <MemberCard key={`${m.name}-${m.subteam}`} m={m} i={i} />)}
              </div>
            </section>
          </div>
        ) : (
          /* ── Alumni: a chapter too young to have any — yet ── */
          <div className="space-y-12 animate-fadeIn">
            <Reveal className="glass !rounded-[28px] relative overflow-hidden px-6 sm:px-14 py-14 sm:py-20">
              <span aria-hidden className="gloss-text-static [filter:none] pointer-events-none absolute -right-6 -bottom-16 font-display font-semibold leading-none tracking-[-0.08em] text-[18rem] sm:text-[26rem] opacity-[0.06]">0</span>
              <Label className="text-[#FF5A3C]/90">Foundational era</Label>
              <h3 className="mt-5 font-display font-semibold tracking-[-0.05em] leading-[0.92] text-[clamp(2.4rem,6vw,5rem)] max-w-[16ch]">
                <span className="gloss-text-static">Zero alumni. </span><span className="font-serif-i gloss-red">For now.</span>
              </h3>
              <p className="mt-6 max-w-xl text-bone/65 text-base sm:text-lg leading-relaxed">
                The chapter was chartered in 2025. Our first 77 members are still in the workshop building the B-26 — the inaugural alumni graduate in 2027–28.
              </p>
              <button onClick={() => setActiveSegment("officers")} className="btn-gloss mt-9 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white cursor-pointer">
                Meet the current crew →
              </button>
            </Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
              {[
                { v: "0", l: "Graduated alumni", d: "Inaugural cohort in training" },
                { v: "2025", l: "Chartered", d: "SAEINDIA collegiate chapter" },
                { v: "77", l: "Active members", d: "Building the B-26" },
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

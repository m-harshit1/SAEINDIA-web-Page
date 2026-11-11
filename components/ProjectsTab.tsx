'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Flag, Mail, Trophy } from 'lucide-react';
import { achievementsData } from '@/data/achievements';
import dynamic from 'next/dynamic';
import { PageHero, SectionHead, Segmented, SpotCard, Reveal, Label, BackButton, Kicker } from './cinema/PageKit';

const VehicleView3D = dynamic(() => import('./VehicleView3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[460px] md:h-[640px] rounded-3xl bg-[#070708] border border-white/10 flex items-center justify-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-bone/45 animate-pulse">Warming up the studio…</span>
    </div>
  )
});

interface SpecGridItem {
  label: string;
  val: string;
}

interface HotspotSpec {
  title: string;
  accent: string;
  stats: SpecGridItem[];
}

const specHotspots: Record<string, HotspotSpec> = {
  dimensions: {
    title: "Vehicle Dimensions & Weights",
    accent: "text-amber-400 border-amber-400/30",
    stats: [
      { label: "Dimensions (L × W × H)", val: "2138 × 860 × 1391 mm (84.2″ × 33.9″ × 54.7″)" },
      { label: "Wheelbase & Track", val: "1366.85 mm WB · 1516 mm Front / 1507 mm Rear Track" },
      { label: "Curb Weight", val: "200.2 kg (270.0 kg with 75 kg driver)" },
      { label: "Ground Clearance", val: "350 mm (13.78 in)" }
    ]
  },
  chassis: {
    title: "Chassis & Roll Cage",
    accent: "text-apex-red border-apex-red/30",
    stats: [
      { label: "Frame Material", val: "AISI 4130 Chromoly Steel Spaceframe" },
      { label: "Joining Method", val: "Arc Welding" },
      { label: "Bare Frame Weight", val: "~78 kg (with brackets & paint)" },
      { label: "Torsional Stiffness", val: "347.44 N·m/deg (ANSYS FEA validated)" }
    ]
  },
  powertrain: {
    title: "mBAJA Powertrain & 4WD",
    accent: "text-torque-orange border-torque-orange/30",
    stats: [
      { label: "Transmission", val: "JIT CVT with Custom 9:1 Gearbox" },
      { label: "Theoretical Top Speed", val: "75.18 km/h (Power-limited) · 83.50 km/h (Ratio-limited)" },
      { label: "Max Tractive Effort", val: "1657 N (55.5% gradeability)" },
      { label: "4WD Driveline", val: "Single-Speed Transfer Case (35% Front / 65% Rear split)" }
    ]
  },
  suspension: {
    title: "Suspension & Tyres",
    accent: "text-lift-blue border-lift-blue/30",
    stats: [
      { label: "Architecture", val: "Double Wishbone (A-arm front, H-arm rear)" },
      { label: "Wheel Travel", val: "160 mm (6.30 in) Front & Rear" },
      { label: "Tyres & Wheels", val: "23×7-10 Tubeless on 10″ rims" },
      { label: "Spring Rate & Dampers", val: "41.5 N/mm spring · N2 gas-assisted revalvable dampers" }
    ]
  },
  steering: {
    title: "Steering Subsystem",
    accent: "text-cyan-400 border-cyan-400/30",
    stats: [
      { label: "Mechanism", val: "Custom Rack & Pinion (4.5 : 1 ratio)" },
      { label: "Turning Circle", val: "3.80 meters diameter" },
      { label: "Steering Geometry", val: "Ackermann Geometry (84.96%)" },
      { label: "Lock-to-Lock Angle", val: "8.13 rad (~466°)" }
    ]
  },
  brakes: {
    title: "Braking System",
    accent: "text-emerald-400 border-emerald-400/30",
    stats: [
      { label: "Rotors", val: "180 mm SS410 (Inboard Front / Outboard Rear)" },
      { label: "Master Cylinder & Calipers", val: "Wilwood PS-1 calipers · Bosch Tandem MC (19 mm)" },
      { label: "Stopping Performance", val: "7.87 m in 1.42 s (7.848 m/s² deceleration / ~0.8g)" },
      { label: "Pedal Ratio", val: "6 : 1 ratio (366 N pedal effort)" }
    ]
  }
};

const dynoData = [
  { rpm: 1200, hp: 3.2,  torque: 19.0 },
  { rpm: 1600, hp: 5.1,  torque: 22.5 },
  { rpm: 2000, hp: 7.4,  torque: 26.2 },
  { rpm: 2400, hp: 9.4,  torque: 27.6 },
  { rpm: 2500, hp: 9.9,  torque: 27.7 },
  { rpm: 2800, hp: 11.0, torque: 27.4 },
  { rpm: 3200, hp: 12.1, torque: 26.5 },
  { rpm: 3600, hp: 12.87, torque: 23.9 },
];

export default function ProjectsTab() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeProject, setActiveProject] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState<string>("3d_view");
  const [activeHotspot, setActiveHotspot] = useState<string>("dimensions");
  const [selectedYear, setSelectedYear] = useState<string>("2027");

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopySpec = (val: string, index: number) => {
    navigator.clipboard.writeText(val);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to sync URL parameters with browser history
  const syncUrl = (updates: { project?: string; sub?: string; year?: string; spec?: string; category?: string }, push: boolean = true) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "projects");
    if (updates.project !== undefined) {
      if (updates.project) url.searchParams.set("project", updates.project);
      else {
        url.searchParams.delete("project");
        url.searchParams.delete("sub");
        url.searchParams.delete("year");
        url.searchParams.delete("spec");
      }
    }
    if (updates.sub !== undefined) {
      if (updates.sub) url.searchParams.set("sub", updates.sub);
      else url.searchParams.delete("sub");
    }
    if (updates.year !== undefined) {
      if (updates.year) url.searchParams.set("year", updates.year);
      else url.searchParams.delete("year");
    }
    if (updates.spec !== undefined) {
      if (updates.spec) url.searchParams.set("spec", updates.spec);
      else url.searchParams.delete("spec");
    }
    if (updates.category !== undefined) {
      if (updates.category && updates.category !== "All") url.searchParams.set("category", updates.category);
      else url.searchParams.delete("category");
    }
    if (push) {
      window.history.pushState({ ...updates }, "", url.toString());
    } else {
      window.history.replaceState({ ...updates }, "", url.toString());
    }
  };

  // Initialize from deep-link query parameters
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const proj = params.get("project");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (proj === "baja" || proj === "achievements") setActiveProject(proj);
    const sub = params.get("sub");
    if (sub && ["3d_view", "overview", "cvt"].includes(sub)) setActiveSubTab(sub);
    const yr = params.get("year");
    if (yr && ["2025", "2026", "2027"].includes(yr)) setSelectedYear(yr);
    const sp = params.get("spec");
    if (sp && Object.keys(specHotspots).includes(sp)) setActiveHotspot(sp);
    const cat = params.get("category");
    if (cat && ["All", "Active", "Research", "Achievements"].includes(cat)) setSelectedCategory(cat);
  }, []);

  // Listen to browser Back/Forward (popstate) to step back without exiting the site
  useEffect(() => {
    const handlePop = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") !== "projects") return;
      const proj = params.get("project") || "";
      setActiveProject(proj);
      const sub = params.get("sub");
      if (sub && ["3d_view", "overview", "cvt"].includes(sub)) setActiveSubTab(sub);
      const yr = params.get("year");
      if (yr && ["2025", "2026", "2027"].includes(yr)) setSelectedYear(yr);
      const sp = params.get("spec");
      if (sp && Object.keys(specHotspots).includes(sp)) setActiveHotspot(sp);
      const cat = params.get("category");
      if (cat && ["All", "Active", "Research", "Achievements"].includes(cat)) setSelectedCategory(cat);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const handleBackToAllProjects = () => {
    if (typeof window !== "undefined" && window.history.state?.project) {
      window.history.back();
    } else {
      setActiveProject("");
      syncUrl({ project: "" }, false);
    }
  };

  // Official JIT CVT + 9:1 Custom Gearbox Parameters
  const [cvtEngineRpm, setCvtEngineRpm] = useState<number>(3600);
  const [cvtRatio, setCvtRatio] = useState<number>(0.50); // 0.50 final overdrive to 3.90 underdrive
  const [cvtFinalDrive, setCvtFinalDrive] = useState<number>(9.0); // 9:1 Custom Gearbox
  const [cvtTireDiameter, setCvtTireDiameter] = useState<number>(23.0); // 23x7-10 tyres

  const lowerPoint = [...dynoData].reverse().find(p => p.rpm <= cvtEngineRpm) || dynoData[0];
  const upperPoint = dynoData.find(p => p.rpm >= cvtEngineRpm) || dynoData[dynoData.length - 1];
  const interpolatedTorque = lowerPoint.rpm === upperPoint.rpm 
    ? lowerPoint.torque 
    : lowerPoint.torque + ((cvtEngineRpm - lowerPoint.rpm) / (upperPoint.rpm - lowerPoint.rpm)) * (upperPoint.torque - lowerPoint.torque);

  const wheelSpeedRpm = cvtEngineRpm / (cvtRatio * cvtFinalDrive);
  const tireCircumferenceMeters = cvtTireDiameter * Math.PI * 0.0254;
  const vehicleSpeedKmh = (wheelSpeedRpm * tireCircumferenceMeters * 60) / 1000;
  const totalReduction = cvtRatio * cvtFinalDrive;
  const wheelTorqueNm = interpolatedTorque * totalReduction * 0.95; // 95% driveline efficiency

  const currentSpec = specHotspots[activeHotspot as keyof typeof specHotspots] || specHotspots.dimensions;
  const currentAchievement = achievementsData[selectedYear] || achievementsData["2026"];

  const showActive = selectedCategory === "All" || selectedCategory === "Active";
  const showResearch = selectedCategory === "All" || selectedCategory === "Research";
  const showAchieve = selectedCategory === "All" || selectedCategory === "Achievements";

  const research = [
    { tag: "Structural FEA", title: "Lightweight chassis topology", desc: "Re-sizing roll-cage tube walls and weld clusters in AISI 4130 to maintain a dynamic factor of safety above 2.0 while keeping bare frame mass at ~78 kg.", tools: "ANSYS Structural · SolidWorks" },
    { tag: "Driveline Dynamics", title: "CVT ratio & tractive mapping", desc: "Simulating drawbar torque, gradeability up to 55.5%, and 4WD torque distribution (35:65 front/rear) for loose dirt conditions.", tools: "IPG CarMaker · MATLAB" },
    { tag: "Kinematics", title: "Double wishbone roll-center", desc: "Optimizing A-arm/H-arm geometry, Ackerman 84.96%, and 160 mm travel to keep scrub radius positive front (15.8mm) and roll rate at 0.13 deg/g.", tools: "ADAMS/Car · Lotus Shark" },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHero
        kicker="Projects · Official mBAJA 2027 Vehicle"
        title="Inside the *machine.*"
        sub="Every parameter on the B-26 is verified through ANSYS, CarMaker simulations, and official BAJA SAEINDIA 2027 specifications. Explore the buggy, subsystem engineering, and competition scorecards."
        ghost="B-26"
        stats={[
          { value: "75.2", unit: "km/h", label: "Top speed" },
          { value: "1657", unit: "N", label: "Tractive effort" },
          { value: "160", unit: "mm", label: "Wheel travel" },
          { value: "200.2", unit: "kg", label: "Curb weight" },
        ]}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-10 pb-24 space-y-14">
        {activeProject === "" ? (
          <>
            {/* National Achievement Spotlight Banner */}
            <Reveal>
              <div className="glass !rounded-3xl p-6 sm:p-9 border-apex-red/40 bg-gradient-to-r from-apex-red/[0.12] via-black/40 to-black/60 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-apex-red/30 border border-apex-red/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#FF5A3C] font-semibold">
                        <Trophy size={13} /> Official Virtual Round Result
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-bone/70">
                        mBAJA SAEINDIA 2027
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-bone text-2xl sm:text-3xl tracking-tight">
                      Team Monarch Ranks <span className="gloss-red">#12 Nationally</span> & <span className="text-white">#2 Among CFTIs</span>
                    </h3>
                    <p className="max-w-2xl text-bone/75 text-sm sm:text-base leading-relaxed">
                      Preliminary round results announced: Team Monarch secured an overall score of <strong className="text-white">34.98 / 50</strong> (Quiz: 8.10/10, Presentation: 26.88/40), placing IIITDM Kurnool 12th out of 49 engineering institutions across India and 2nd among four participating Centrally Funded Technical Institutes.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                    <button
                      onClick={() => { setActiveProject("achievements"); setSelectedYear("2027"); syncUrl({ project: "achievements", year: "2027" }, true); }}
                      className="btn-gloss inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white cursor-pointer"
                    >
                      View Virtual Scores <ArrowUpRight size={15} />
                    </button>
                    <button
                      onClick={() => { setActiveProject("baja"); setActiveSubTab("overview"); syncUrl({ project: "baja", sub: "overview" }, true); }}
                      className="btn-glass inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm text-bone cursor-pointer"
                    >
                      Explore B-26 Specs
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>

            <Segmented
              id="proj-cat"
              value={selectedCategory}
              onChange={(k) => { setSelectedCategory(k); syncUrl({ category: k }, false); }}
              options={["All", "Active", "Research", "Achievements"].map((c) => ({ key: c, label: c }))}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {/* Flagship: the B-26 */}
              {showActive && (
                <Reveal className="md:col-span-2 lg:col-span-2 lg:row-span-2">
                  <SpotCard
                    as="button"
                    onClick={() => { setActiveProject("baja"); setActiveSubTab("3d_view"); syncUrl({ project: "baja", sub: "3d_view" }, true); }}
                    className="group w-full h-full min-h-[420px] lg:min-h-[560px] flex flex-col justify-end p-0"
                  >
                    <Image src="/media/workshop-frame.webp" alt="Team members building the B-26 roll-cage mock-up in the workshop" fill sizes="(min-width:1024px) 66vw, 100vw" className="object-cover opacity-70 transition-transform duration-[1.6s] group-hover:scale-[1.05]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-[#050506]/70 to-transparent" />
                    <div className="relative p-6 sm:p-9">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-apex-red/15 border border-apex-red/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#FF5A3C]">
                          <span className="w-1.5 h-1.5 rounded-full bg-apex-red animate-pulse" /> Active campaign
                        </span>
                        <Label>BAJA SAEINDIA 2027</Label>
                      </div>
                      <h2 className="mt-5 font-display font-semibold tracking-[-0.05em] leading-[0.9] text-[clamp(2.6rem,6vw,5.5rem)]">
                        <span className="gloss-text-static">mBAJA ATV </span><span className="font-serif-i gloss-red tracking-[-0.02em]">B-26</span>
                      </h2>
                      <p className="mt-4 max-w-lg text-bone/70 text-[15px] leading-relaxed">
                        AISI 4130 chromoly roll cage, JIT CVT with custom 9:1 gearbox, 4WD single-speed transfer case, and double-wishbone suspension with 160 mm travel.
                      </p>
                      <span className="btn-gloss mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white">
                        Open the engineering report <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </SpotCard>
                </Reveal>
              )}

              {/* Research */}
              {showResearch && research.map((r, i) => (
                <Reveal key={r.title} delay={0.08 * i}>
                  <SpotCard className="h-full p-6 sm:p-7 flex flex-col">
                    <div className="flex items-center justify-between">
                      <Label className="text-[#FF5A3C]/90">{r.tag}</Label>
                      <span className="font-display text-bone/15 text-4xl font-semibold tracking-[-0.06em] tabular-nums">0{i + 1}</span>
                    </div>
                    <h2 className="mt-4 font-display font-semibold text-bone text-2xl tracking-[-0.035em] leading-[1.05]">{r.title}</h2>
                    <p className="mt-3 text-bone/55 text-sm leading-relaxed flex-1">{r.desc}</p>
                    <p className="mt-6 pt-4 border-t border-white/[0.07] font-mono text-[10px] uppercase tracking-[0.2em] text-bone/40">{r.tools}</p>
                  </SpotCard>
                </Reveal>
              ))}

              {/* Scoreboard */}
              {showAchieve && (
                <Reveal delay={0.1}>
                  <SpotCard
                    as="button"
                    onClick={() => { setActiveProject("achievements"); setSelectedYear("2027"); syncUrl({ project: "achievements", year: "2027" }, true); }}
                    className="group w-full h-full p-6 sm:p-7 flex flex-col"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-[#FF5A3C]/90">Prelims Qualified</Label>
                      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone/40">Rank 12 / 49</span>
                    </div>
                    <h2 className="mt-4 font-display font-semibold text-bone text-2xl tracking-[-0.035em] leading-[1.05]">Road to the <span className="font-serif-i gloss-red">debut.</span></h2>
                    <div className="mt-6 space-y-3 flex-1">
                      {(achievementsData["2027"].scores ?? []).map((sc) => (
                        <div key={sc.label}>
                          <div className="flex justify-between text-[12px] text-bone/55"><span>{sc.label}</span><span className="tabular-nums text-bone/80">{sc.scored}/{sc.max}</span></div>
                          <div className="mt-1.5 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#8A0400] to-[#FF3B1F]" style={{ width: `${(sc.scored / sc.max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-bone/80 group-hover:text-bone">See all results & targets <ArrowUpRight size={15} /></span>
                  </SpotCard>
                </Reveal>
              )}
            </div>
          </>
        ) : activeProject === "baja" ? (
          /* ── DETAIL: B-26 engineering report ─────────────────────── */
          <div className="space-y-10 animate-fadeIn">
            <BackButton onClick={handleBackToAllProjects}>All projects</BackButton>
            <SectionHead
              n="B-26"
              kicker="Design Specification Sheet"
              title="Official Vehicle *Parameters.*"
              aside={
                <Segmented
                  id="proj-sub"
                  value={activeSubTab}
                  onChange={(k) => { setActiveSubTab(k); syncUrl({ sub: k }, false); }}
                  options={[
                    { key: "3d_view", label: "3D showcase", short: "3D" },
                    { key: "overview", label: "Subsystems", short: "Specs" },
                    { key: "cvt", label: "CVT calculator", short: "CVT" },
                  ]}
                />
              }
            />

            {activeSubTab === "3d_view" && (
              <div className="space-y-5 animate-fadeIn">
                <VehicleView3D />
                <div className="glass p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-semibold text-bone text-lg tracking-[-0.02em]">SolidWorks assembly & IPG CarMaker model</h3>
                    <p className="mt-1 text-bone/50 text-sm">Chassis, powertrain, double-wishbone suspension and cockpit. Shared with judges and partner labs on request.</p>
                  </div>
                  <a
                    href="mailto:saeindia@iiitk.ac.in?subject=B-26%20CAD%20assembly%20request"
                    className="btn-glass shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm text-bone"
                  >
                    <Mail size={15} /> Request the CAD
                  </a>
                </div>
                <div className="glass p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-semibold text-bone text-lg tracking-[-0.02em]">Drive it yourself · manoeuvrability sprint</h3>
                    <p className="mt-1 text-bone/50 text-sm">A 420 m cone course modelled on the BAJA event. Set a time and get on the leaderboard.</p>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new Event("sae:play"))}
                    className="btn-glass shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm text-bone cursor-pointer"
                  >
                    <Flag size={15} className="text-[#FF3B1F]" /> Let&rsquo;s give it a test drive
                  </button>
                </div>
              </div>
            )}

            {activeSubTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fadeIn">
                <div className="lg:col-span-4 flex lg:flex-col gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0">
                  {Object.keys(specHotspots).map((key, i) => {
                    const on = activeHotspot === key;
                    return (
                      <button
                        key={key}
                        onMouseEnter={() => { setActiveHotspot(key); syncUrl({ spec: key }, false); }}
                        onClick={() => { setActiveHotspot(key); syncUrl({ spec: key }, false); }}
                        className={`shrink-0 lg:w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all cursor-pointer ${
                          on ? "bg-apex-red/[0.12] border-apex-red/50 text-bone shadow-[0_10px_40px_-15px_rgba(225,6,0,0.7)]" : "bg-white/[0.025] border-white/[0.08] text-bone/55 hover:text-bone hover:border-white/20"
                        }`}
                      >
                        <span className={`font-mono text-[10px] tabular-nums ${on ? "text-[#FF5A3C]" : "text-bone/30"}`}>0{i + 1}</span>
                        <span className="font-display font-medium text-[15px] tracking-[-0.01em] whitespace-nowrap">{specHotspots[key].title}</span>
                      </button>
                    );
                  })}
                </div>
                <div key={activeHotspot} className="lg:col-span-8 glass p-6 sm:p-8 animate-fadeIn">
                  <div className="flex items-baseline justify-between gap-4 pb-5 border-b border-white/[0.07]">
                    <div>
                      <h3 className="font-display font-semibold text-white text-2xl sm:text-3xl tracking-[-0.04em]">{currentSpec.title}</h3>
                      <p className="mt-1 font-mono text-xs text-[#FF5A3C]">BAJA SAEINDIA 2027 Official Design Specification</p>
                    </div>
                    <Label className="hidden sm:inline">Tap value to copy</Label>
                  </div>
                  <dl className="mt-2 divide-y divide-white/[0.06]">
                    {currentSpec.stats.map((st, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleCopySpec(st.val, idx)}
                        className="group flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-6 py-4 cursor-pointer select-none"
                        title="Copy value"
                      >
                        <dt><Label className="text-bone/80 text-xs font-semibold">{st.label}</Label></dt>
                        <dd className="text-white font-medium text-[15px] sm:text-right group-hover:text-[#FF5A3C] transition-colors">
                          {st.val}
                          <span className={`ml-2 font-mono text-[9px] uppercase tracking-[0.2em] transition-opacity ${copiedIndex === idx ? "text-[#FF5A3C] opacity-100" : "text-bone/35 opacity-0 group-hover:opacity-100"}`}>
                            {copiedIndex === idx ? "Copied" : "Copy"}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-bone/35">Team ID: 271011 · Team Monarch · IIITDM Kurnool</p>
                </div>
              </div>
            )}

            {activeSubTab === "cvt" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fadeIn">
                <div className="lg:col-span-5 glass p-6 sm:p-8 space-y-7">
                  <Kicker n="IN">CVT & Gearbox Parameters</Kicker>
                  {[
                    { label: "Engine speed", val: `${cvtEngineRpm} rpm`, min: 1200, max: 3600, step: 100, v: cvtEngineRpm, set: setCvtEngineRpm, ends: ["1200", "3600 rpm"] },
                    { label: "CVT pulley ratio", val: `${cvtRatio.toFixed(2)} : 1`, min: 0.50, max: 3.90, step: 0.05, v: cvtRatio, set: setCvtRatio, ends: ["0.50 overdrive", "3.90 low"] },
                    { label: "Custom gearbox ratio", val: `${cvtFinalDrive.toFixed(1)} : 1`, min: 5.0, max: 12.0, step: 0.5, v: cvtFinalDrive, set: setCvtFinalDrive, ends: ["5.0:1", "12.0:1"] },
                    { label: "Tyre diameter", val: `${cvtTireDiameter.toFixed(1)} in`, min: 20, max: 25, step: 0.5, v: cvtTireDiameter, set: setCvtTireDiameter, ends: ["20 in", "25 in"] },
                  ].map((f) => (
                    <div key={f.label}>
                      <div className="flex items-baseline justify-between">
                        <Label>{f.label}</Label>
                        <strong className="font-display font-semibold text-bone text-lg tabular-nums tracking-[-0.02em]">{f.val}</strong>
                      </div>
                      <input type="range" min={f.min} max={f.max} step={f.step} value={f.v} onChange={(e) => f.set(Number(e.target.value))} className="range-red mt-3" aria-label={f.label} />
                      <div className="mt-1.5 flex justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-bone/30"><span>{f.ends[0]}</span><span>{f.ends[1]}</span></div>
                    </div>
                  ))}
                  <p className="pt-5 border-t border-white/[0.07] font-mono text-[10.5px] leading-relaxed text-bone/45">
                    Speed = (RPM ÷ (CVT × Gearbox)) × (D × π × 0.0254) × 0.06
                  </p>
                </div>

                <div className="lg:col-span-7 glass p-6 sm:p-8 flex flex-col">
                  <Kicker n="OUT">Live Dynamics Output</Kicker>
                  <div className="mt-6 grid sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-black/30 border border-white/[0.07] p-6">
                      <Label>Vehicle speed</Label>
                      <p className="mt-3 font-display font-semibold tracking-[-0.06em] leading-none tabular-nums text-6xl sm:text-7xl gloss-text-static">{vehicleSpeedKmh.toFixed(1)}</p>
                      <p className="mt-2 text-bone/45 text-sm">km/h · {(vehicleSpeedKmh / 3.6).toFixed(2)} m/s</p>
                    </div>
                    <div className="rounded-2xl bg-apex-red/[0.08] border border-apex-red/30 p-6">
                      <Label className="text-[#FF5A3C]/80">Wheel torque (at hubs)</Label>
                      <p className="mt-3 font-display font-semibold tracking-[-0.06em] leading-none tabular-nums text-6xl sm:text-7xl gloss-red">{wheelTorqueNm.toFixed(0)}</p>
                      <p className="mt-2 text-bone/45 text-sm">N·m · 95% driveline efficiency</p>
                    </div>
                  </div>
                  <p className="mt-6 text-bone/65 text-[15px] leading-relaxed flex-1">
                    At <strong className="text-bone font-medium">{cvtEngineRpm} rpm</strong> with a CVT ratio of <strong className="text-bone font-medium">{cvtRatio.toFixed(2)}:1</strong> and custom 9:1 gearbox, overall reduction is <strong className="text-[#FF5A3C] font-medium">{totalReduction.toFixed(2)}:1</strong>. Theoretical top speed reaches <strong className="text-bone font-medium">75.18 km/h</strong> (power-limited) and <strong className="text-bone font-medium">83.5 km/h</strong> (ratio-limited).
                  </p>
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-bone/35">Validated against BAJA SAEINDIA 2027 mBAJA Powertrain Sheet</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── DETAIL: scoreboard ─────────────────────────────────── */
          <div className="space-y-10 animate-fadeIn">
            <BackButton onClick={handleBackToAllProjects}>All projects</BackButton>
            <SectionHead n="25→27" kicker="Timeline & Milestones" title="Road to the *debut.*" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Year rail */}
              <div className="lg:col-span-4 flex lg:flex-col gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0">
                {Object.keys(achievementsData).map((year) => {
                  const node = achievementsData[year];
                  const on = selectedYear === year;
                  return (
                    <button
                      key={year}
                      onClick={() => { setSelectedYear(year); syncUrl({ year }, false); }}
                      className={`shrink-0 w-[220px] lg:w-full rounded-2xl border px-5 py-4 text-left transition-all cursor-pointer ${
                        on ? "bg-apex-red/[0.12] border-apex-red/50 shadow-[0_10px_40px_-15px_rgba(225,6,0,0.7)]" : "bg-white/[0.025] border-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-display font-semibold text-2xl tracking-[-0.04em] tabular-nums ${on ? "text-bone" : "text-bone/60"}`}>{node.year}</span>
                        <span className={`font-mono text-[9px] uppercase tracking-[0.2em] ${node.status === "Completed" ? "text-emerald-400" : "text-[#FF5A3C]"}`}>{node.status}</span>
                      </div>
                      <p className={`mt-1 text-[13px] truncate ${on ? "text-bone/75" : "text-bone/40"}`}>{node.milestone}</p>
                    </button>
                  );
                })}
              </div>

              {/* Year detail */}
              <div key={selectedYear} className="lg:col-span-8 glass p-6 sm:p-8 space-y-8 animate-fadeIn">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-[#FF5A3C]/80">{currentAchievement.year} · {currentAchievement.status}</Label>
                    {currentAchievement.rankBadge && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-apex-red/20 border border-apex-red/40 px-2.5 py-0.5 font-mono text-[10px] text-[#FF5A3C] font-semibold">
                        <Trophy size={11} /> {currentAchievement.rankBadge}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-display font-semibold text-bone text-3xl sm:text-4xl tracking-[-0.045em] leading-[1.02]">{currentAchievement.milestone}</h3>
                  <p className="mt-4 text-bone/60 text-[15px] leading-relaxed max-w-2xl">{currentAchievement.desc}</p>
                </div>

                {currentAchievement.scores && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <Label className="sm:col-span-2 text-[#FF5A3C]/80">
                      {currentAchievement.year === "2026" ? "Official Virtual Round Score Breakdown" : "Target points — not results yet"}
                    </Label>
                    {currentAchievement.scores.map((sc) => {
                      const pct = (sc.scored / sc.max) * 100;
                      return (
                        <div key={sc.label}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-bone/70 text-sm truncate">{sc.label}</span>
                            <span className="font-display font-semibold text-bone tabular-nums">{sc.scored}<span className="text-bone/35 font-normal">/{sc.max}</span></span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#8A0400] to-[#FF3B1F] shadow-[0_0_12px_rgba(255,40,10,0.6)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <ul className="pt-6 border-t border-white/[0.07] grid sm:grid-cols-2 gap-3">
                  {currentAchievement.highlights.map((hl) => (
                    <li key={hl} className="flex gap-3 text-bone/70 text-sm leading-relaxed">
                      <span className="mt-2 w-1.5 h-1.5 shrink-0 rounded-full bg-apex-red shadow-[0_0_8px_rgba(225,6,0,0.9)]" />
                      {hl}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

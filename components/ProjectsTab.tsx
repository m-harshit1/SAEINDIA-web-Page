'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Flag, Mail } from 'lucide-react';
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
  chassis: {
    title: "Chassis & Roll Cage",
    accent: "text-apex-red border-apex-red/30",
    stats: [
      { label: "Material", val: "Chromoly Steel (AISI 4030 & 1013)" },
      { label: "Frame Type", val: "Tubular Spaceframe Roll Cage" },
      { label: "Max Length", val: "2000 mm" },
      { label: "Max Width", val: "700 mm" },
      { label: "Weldment Safety Factor", val: "2.1 (30 kN Front Brace Load)" }
    ]
  },
  powertrain: {
    title: "Powertrain & Drivetrain",
    accent: "text-torque-orange border-torque-orange/30",
    stats: [
      { label: "Engine Model", val: "Honda GX430T (425cc)" },
      { label: "Peak Power", val: "12.87 HP (9.6 kW) @ 3600 RPM" },
      { label: "Peak Engine Torque", val: "27.7 Nm @ 2500 RPM" },
      { label: "Transmission", val: "CVT (3:1 to 0.43:1 Ratio)" },
      { label: "Drive Type", val: "4WD (4:1 Final Drive)" }
    ]
  },
  suspension: {
    title: "Suspension & Kinematics",
    accent: "text-lift-blue border-lift-blue/30",
    stats: [
      { label: "Configuration", val: "Front & Rear Double Wishbone" },
      { label: "Dampers", val: "Ohlins Custom 3-Way Adjustable" },
      { label: "Wheel Travel", val: "±100 mm" },
      { label: "Spring Rates", val: "Front: 28 N/mm | Rear: 29 N/mm" },
      { label: "Optimization", val: "Multi-body dynamics (ADAMS/Car)" }
    ]
  },
  brakes: {
    title: "Brakes & Steering",
    accent: "text-emerald-400 border-emerald-400/30",
    stats: [
      { label: "Configuration", val: "Hydraulic Dual Master-Cylinder" },
      { label: "Brake Bias", val: "78:22 (Front:Rear)" },
      { label: "Deceleration", val: "~1g (7.848 m/s²)" },
      { label: "Rotor Material", val: "SS410 Stainless Steel" },
      { label: "Steering", val: "Custom Rack & Pinion" }
    ]
  }
};

const dynoData = [
  { rpm: 1200, hp: 3.2,  torque: 19.0 },
  { rpm: 1600, hp: 5.1,  torque: 22.5 },
  { rpm: 2000, hp: 7.4,  torque: 26.2 },
  { rpm: 2400, hp: 9.4,  torque: 27.6 },
  { rpm: 2500, hp: 9.9,  torque: 27.7 }, // Peak Torque
  { rpm: 2800, hp: 11.0, torque: 27.4 },
  { rpm: 3200, hp: 12.1, torque: 26.5 },
  { rpm: 3600, hp: 12.87, torque: 23.9 }, // Peak Power
];

export default function ProjectsTab() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeProject, setActiveProject] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState<string>("3d_view");

  // Copy state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopySpec = (val: string, index: number) => {
    navigator.clipboard.writeText(val);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // BAJA specifications hotspot state
  const [activeHotspot, setActiveHotspot] = useState<string>("chassis");

  // CVT Speed Calculator states
  const [cvtEngineRpm, setCvtEngineRpm] = useState<number>(3000);
  const [cvtRatio, setCvtRatio] = useState<number>(0.9);
  const [cvtFinalDrive, setCvtFinalDrive] = useState<number>(4.0);
  const [cvtTireDiameter, setCvtTireDiameter] = useState<number>(23.0);

  // Achievements State
  const [selectedYear, setSelectedYear] = useState<string>("2027");

  // CVT dynamic speed and torque computations
  const lowerPoint = [...dynoData].reverse().find(p => p.rpm <= cvtEngineRpm) || dynoData[0];
  const upperPoint = dynoData.find(p => p.rpm >= cvtEngineRpm) || dynoData[dynoData.length - 1];
  const interpolatedTorque = lowerPoint.rpm === upperPoint.rpm 
    ? lowerPoint.torque 
    : lowerPoint.torque + ((cvtEngineRpm - lowerPoint.rpm) / (upperPoint.rpm - lowerPoint.rpm)) * (upperPoint.torque - lowerPoint.torque);

  const wheelSpeedRpm = cvtEngineRpm / (cvtRatio * cvtFinalDrive);
  const tireCircumferenceMeters = cvtTireDiameter * Math.PI * 0.0254;
  const vehicleSpeedKmh = (wheelSpeedRpm * tireCircumferenceMeters * 60) / 1000;
  const totalReduction = cvtRatio * cvtFinalDrive;
  const wheelTorqueNm = interpolatedTorque * totalReduction * 0.90; // 90% system efficiency

  const currentSpec = specHotspots[activeHotspot as keyof typeof specHotspots];

  const currentAchievement = achievementsData[selectedYear];

  const showActive = selectedCategory === "All" || selectedCategory === "Active";
  const showResearch = selectedCategory === "All" || selectedCategory === "Research";
  const showAchieve = selectedCategory === "All" || selectedCategory === "Achievements";

  const research = [
    { tag: "Structural FEA", title: "Lightweight chassis topology", desc: "Re-sizing roll-cage tube walls and weld clusters to cut spaceframe mass by 15% while keeping the dynamic factor of safety above 2.0.", tools: "ANSYS Structural · SolidWorks" },
    { tag: "EV conversion", title: "Electric ATV powertrain", desc: "Battery-management logic, cell layouts and motor efficiency maps for off-road duty cycles — simulating drawbar torque and traction limits.", tools: "MATLAB · Simulink · COMSOL" },
    { tag: "Manufacturing", title: "Additive-manufactured uprights", desc: "Titanium laser-melted hubs with generative, organic geometry to trim unsprung weight without giving up stiffness.", tools: "Fusion 360 · nTopology" },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHero
        kicker="Projects · Season 2025–26"
        title="Inside the *machine.*"
        sub="Every number on the B-26 was argued over, simulated and then proved on dirt. This is the engineering — the car, the research behind the next one, and the scorecards that keep us honest."
        ghost="B-26"
        stats={[
          { value: "50.1", unit: "km/h", label: "Top speed" },
          { value: "12.87", unit: "hp", label: "Honda GX430T" },
          { value: "±100", unit: "mm", label: "Wheel travel" },
        ]}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-10 pb-24 space-y-14">
        {activeProject === "" ? (
          <>
            <Segmented
              id="proj-cat"
              value={selectedCategory}
              onChange={(k) => setSelectedCategory(k)}
              options={["All", "Active", "Research", "Achievements"].map((c) => ({ key: c, label: c }))}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {/* Flagship: the B-26 */}
              {showActive && (
                <Reveal className="md:col-span-2 lg:col-span-2 lg:row-span-2">
                  <SpotCard
                    as="button"
                    onClick={() => { setActiveProject("baja"); setActiveSubTab("3d_view"); }}
                    className="group w-full h-full min-h-[420px] lg:min-h-[560px] flex flex-col justify-end p-0"
                  >
                    <Image src="/media/workshop-frame.webp" alt="Team members building the B-26 roll-cage mock-up in the workshop" fill sizes="(min-width:1024px) 66vw, 100vw" className="object-cover opacity-70 transition-transform duration-[1.6s] group-hover:scale-[1.05]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-[#050506]/70 to-transparent" />
                    <div className="relative p-6 sm:p-9">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-apex-red/15 border border-apex-red/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#FF5A3C]">
                          <span className="w-1.5 h-1.5 rounded-full bg-apex-red animate-pulse" /> Active campaign
                        </span>
                        <Label>Flagship</Label>
                      </div>
                      <h2 className="mt-5 font-display font-semibold tracking-[-0.05em] leading-[0.9] text-[clamp(2.6rem,6vw,5.5rem)]">
                        <span className="gloss-text-static">BAJA ATV </span><span className="font-serif-i gloss-red tracking-[-0.02em]">B-26</span>
                      </h2>
                      <p className="mt-4 max-w-lg text-bone/70 text-[15px] leading-relaxed">
                        Chromoly AISI 4030 roll cage, double-wishbone suspension, a Honda GX430T heart and a custom 4WD driveline.
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
                    onClick={() => { setActiveProject("achievements"); setSelectedYear("2027"); }}
                    className="group w-full h-full p-6 sm:p-7 flex flex-col"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-[#FF5A3C]/90">Debut 2027</Label>
                      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone/40">2025 → 2027</span>
                    </div>
                    <h2 className="mt-4 font-display font-semibold text-bone text-2xl tracking-[-0.035em] leading-[1.05]">Road to the <span className="font-serif-i gloss-red">debut.</span></h2>
                    <div className="mt-6 space-y-3 flex-1">
                      {(achievementsData["2027"].scores ?? []).slice(0, 3).map((sc) => (
                        <div key={sc.label}>
                          <div className="flex justify-between text-[12px] text-bone/55"><span>{sc.label}</span><span className="tabular-nums text-bone/80">{sc.scored}/{sc.max}</span></div>
                          <div className="mt-1.5 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#8A0400] to-[#FF3B1F]" style={{ width: `${(sc.scored / sc.max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-bone/80 group-hover:text-bone">See the targets <ArrowUpRight size={15} /></span>
                  </SpotCard>
                </Reveal>
              )}
            </div>
          </>
        ) : activeProject === "baja" ? (
          /* ── DETAIL: B-26 engineering report ─────────────────────── */
          <div className="space-y-10 animate-fadeIn">
            <BackButton onClick={() => setActiveProject("")}>All projects</BackButton>
            <SectionHead
              n="B-26"
              kicker="Engineering report"
              title="The car, *taken* *apart.*"
              aside={
                <Segmented
                  id="proj-sub"
                  value={activeSubTab}
                  onChange={(k) => setActiveSubTab(k)}
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
                    <h3 className="font-display font-semibold text-bone text-lg tracking-[-0.02em]">SolidWorks assembly · 257 MB STEP</h3>
                    <p className="mt-1 text-bone/50 text-sm">Chassis, powertrain, double-wishbone suspension and cockpit. Shared with sponsors, judges and partner labs on request.</p>
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
                        onMouseEnter={() => setActiveHotspot(key)}
                        onClick={() => setActiveHotspot(key)}
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
                    <h3 className="font-display font-semibold text-bone text-2xl sm:text-3xl tracking-[-0.04em]">{currentSpec.title}</h3>
                    <Label className="hidden sm:inline">Tap a value to copy</Label>
                  </div>
                  <dl className="mt-2 divide-y divide-white/[0.06]">
                    {currentSpec.stats.map((st, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleCopySpec(st.val, idx)}
                        className="group flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-6 py-4 cursor-pointer select-none"
                        title="Copy value"
                      >
                        <dt><Label>{st.label}</Label></dt>
                        <dd className="text-bone text-[15px] sm:text-right group-hover:text-[#FF5A3C] transition-colors">
                          {st.val}
                          <span className={`ml-2 font-mono text-[9px] uppercase tracking-[0.2em] transition-opacity ${copiedIndex === idx ? "text-[#FF5A3C] opacity-100" : "text-bone/35 opacity-0 group-hover:opacity-100"}`}>
                            {copiedIndex === idx ? "Copied" : "Copy"}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-bone/35">Dynamic track approved · SAEINDIA compliance checked</p>
                </div>
              </div>
            )}

            {activeSubTab === "cvt" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fadeIn">
                <div className="lg:col-span-5 glass p-6 sm:p-8 space-y-7">
                  <Kicker n="IN">Ratio parameters</Kicker>
                  {[
                    { label: "Engine speed", val: `${cvtEngineRpm} rpm`, min: 1200, max: 3600, step: 100, v: cvtEngineRpm, set: setCvtEngineRpm, ends: ["1200", "3600"] },
                    { label: "CVT pulley ratio", val: `${cvtRatio.toFixed(2)} : 1`, min: 0.43, max: 3.0, step: 0.05, v: cvtRatio, set: setCvtRatio, ends: ["0.43 overdrive", "3.0 underdrive"] },
                    { label: "Final drive", val: `${cvtFinalDrive.toFixed(2)} : 1`, min: 2.5, max: 6.0, step: 0.1, v: cvtFinalDrive, set: setCvtFinalDrive, ends: ["2.5", "6.0"] },
                    { label: "Tyre diameter", val: `${cvtTireDiameter.toFixed(1)} in`, min: 18, max: 26, step: 0.5, v: cvtTireDiameter, set: setCvtTireDiameter, ends: ["18", "26"] },
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
                    v = rpm ÷ (ratio × final) × (d × π × 0.0254) × 0.06
                  </p>
                </div>

                <div className="lg:col-span-7 glass p-6 sm:p-8 flex flex-col">
                  <Kicker n="OUT">Live result</Kicker>
                  <div className="mt-6 grid sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-black/30 border border-white/[0.07] p-6">
                      <Label>Vehicle speed</Label>
                      <p className="mt-3 font-display font-semibold tracking-[-0.06em] leading-none tabular-nums text-6xl sm:text-7xl gloss-text-static">{vehicleSpeedKmh.toFixed(1)}</p>
                      <p className="mt-2 text-bone/45 text-sm">km/h · {(vehicleSpeedKmh / 3.6).toFixed(2)} m/s</p>
                    </div>
                    <div className="rounded-2xl bg-apex-red/[0.08] border border-apex-red/30 p-6">
                      <Label className="text-[#FF5A3C]/80">Wheel torque</Label>
                      <p className="mt-3 font-display font-semibold tracking-[-0.06em] leading-none tabular-nums text-6xl sm:text-7xl gloss-red">{wheelTorqueNm.toFixed(1)}</p>
                      <p className="mt-2 text-bone/45 text-sm">N·m · 90% driveline efficiency</p>
                    </div>
                  </div>
                  <p className="mt-6 text-bone/65 text-[15px] leading-relaxed flex-1">
                    At <strong className="text-bone font-medium">{cvtEngineRpm} rpm</strong> the GX430T makes <strong className="text-bone font-medium">{interpolatedTorque.toFixed(1)} N·m</strong> at the crank. A total reduction of <strong className="text-bone font-medium">{totalReduction.toFixed(2)} : 1</strong> multiplies that into <strong className="text-[#FF5A3C] font-medium">{wheelTorqueNm.toFixed(1)} N·m</strong> at the hubs.
                  </p>
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-bone/35">Interpolated against the official GX430T load map</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── DETAIL: scoreboard ─────────────────────────────────── */
          <div className="space-y-10 animate-fadeIn">
            <BackButton onClick={() => setActiveProject("")}>All projects</BackButton>
            <SectionHead n="25→27" kicker="Timeline" title="Road to the *debut.*" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Year rail */}
              <div className="lg:col-span-4 flex lg:flex-col gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0">
                {Object.keys(achievementsData).map((year) => {
                  const node = achievementsData[year];
                  const on = selectedYear === year;
                  return (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`shrink-0 w-[220px] lg:w-full rounded-2xl border px-5 py-4 text-left transition-all cursor-pointer ${
                        on ? "bg-apex-red/[0.12] border-apex-red/50 shadow-[0_10px_40px_-15px_rgba(225,6,0,0.7)]" : "bg-white/[0.025] border-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-display font-semibold text-2xl tracking-[-0.04em] tabular-nums ${on ? "text-bone" : "text-bone/60"}`}>{node.year}</span>
                        <span className={`font-mono text-[9px] uppercase tracking-[0.2em] ${node.status === "Completed" ? "text-bone/40" : "text-[#FF5A3C]"}`}>{node.status}</span>
                      </div>
                      <p className={`mt-1 text-[13px] truncate ${on ? "text-bone/75" : "text-bone/40"}`}>{node.milestone}</p>
                    </button>
                  );
                })}
              </div>

              {/* Year detail */}
              <div key={selectedYear} className="lg:col-span-8 glass p-6 sm:p-8 space-y-8 animate-fadeIn">
                <div>
                  <Label className="text-[#FF5A3C]/80">{currentAchievement.year} · {currentAchievement.status}</Label>
                  <h3 className="mt-3 font-display font-semibold text-bone text-3xl sm:text-4xl tracking-[-0.045em] leading-[1.02]">{currentAchievement.milestone}</h3>
                  <p className="mt-4 text-bone/60 text-[15px] leading-relaxed max-w-2xl">{currentAchievement.desc}</p>
                </div>

                {currentAchievement.scores && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <Label className="sm:col-span-2 text-[#FF5A3C]/80">Target points — not results yet</Label>
                    {currentAchievement.scores.map((sc) => {
                      const pct = (sc.scored / sc.max) * 100;
                      return (
                        <div key={sc.label}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-bone/70 text-sm truncate">{sc.label}</span>
                            <span className="font-display font-semibold text-bone tabular-nums">{sc.scored}<span className="text-bone/35 font-normal">/{sc.max}</span></span>
                          </div>
                          <div className="mt-2 h-1 rounded-full bg-white/[0.07] overflow-hidden">
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

'use client';

import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Send, CheckCircle2, Download } from 'lucide-react';
import { PageHero, SectionHead, Segmented, SpotCard, Reveal, Label } from './cinema/PageKit';

interface SkillMatrixItem {
  department: string;
  skills: string[];
  tools: string[];
  slots: number;
  color: string;
}

const skillMatrix: SkillMatrixItem[] = [
  { department: "Design & CFD", skills: ["3D Modeling", "Chassis Spaceframe", "Aerodynamics"], tools: ["SolidWorks", "CATIA", "SimScale"], slots: 4, color: "border-apex-red/30 text-apex-red bg-apex-red/5" },
  { department: "Structural FEA", skills: ["Static Structural FEA", "Modal Analysis", "Topology Optimization"], tools: ["ANSYS Workbench", "nTopology"], slots: 3, color: "border-torque-orange/30 text-torque-orange bg-torque-orange/5" },
  { department: "Embedded Systems", skills: ["Microcontrollers", "CAN-Bus Protocols", "DAQ & Sensor Node design"], tools: ["Arduino", "STM32 CubeIDE", "Altium"], slots: 5, color: "border-lift-blue/30 text-lift-blue bg-lift-blue/5" },
  { department: "Manufacturing Ops", skills: ["TIG Welding", "CNC Lathe machining", "Welding Fixtures Setup"], tools: ["Workshop Skills", "Safety Rules"], slots: 6, color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" },
  { department: "Business Ops", skills: ["Sponsor deck outreach", "CSR proposals drafting", "BOM spreadsheets costing"], tools: ["MS Excel", "Adobe Illustrator"], slots: 2, color: "border-red-600/30 text-red-400 bg-red-600/5" }
];

const DOMAINS = [
  "Chassis & Spaceframe Structural Design",
  "Suspension, Steering & Wheel Kinematics",
  "Powertrain & Transmission (CVT & 4WD)",
  "Braking Systems & Hydraulic Architecture",
  "Electronics, DAQ Sensors & Wiring Harness",
  "Vehicle Dynamics, FEA & CFD Simulation",
  "Fabrication, TIG Welding & Machining",
  "e-BAJA Division (Battery Management & EV)",
  "Sponsorship, Corporate CSR & Finance",
  "Media Production, Design & Public Relations",
];

/** Labelled form row. */
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <Label className="block mb-2">{label}</Label>
      {children}
    </label>
  );
}

interface SponsorTier {
  id: string;
  name: string;
  investment: string;
  pledgeValue: number;
  badge: string;
  color: string;
  border: string;
  badgeBg: string;
  csrSchoolCount: number;
  highlight: string;
  benefits: string[];
}

const sponsorTiers: SponsorTier[] = [
  { 
    id: "bronze",
    name: "Bronze Partner", 
    investment: "₹50,000",
    pledgeValue: 50000,
    badge: "Official Supporter",
    color: "text-amber-500", 
    border: "border-amber-500/40", 
    badgeBg: "bg-amber-500/10", 
    csrSchoolCount: 1,
    highlight: "Essential CSR compliance & digital presence",
    benefits: [
      "Company logo on the official SAEINDIA chapter website",
      "Invitation to annual B-26 vehicle rollout & networking dinner",
      "Official Section 135 CSR impact certificate for school science kits",
      "Mention in team season newsletters & social media announcements"
    ]
  },
  { 
    id: "silver",
    name: "Silver Partner", 
    investment: "₹1,00,000",
    pledgeValue: 100000,
    badge: "Technical Partner",
    color: "text-slate-200", 
    border: "border-slate-300/40", 
    badgeBg: "bg-slate-300/10", 
    csrSchoolCount: 2,
    highlight: "Vehicle branding & talent recruitment access",
    benefits: [
      "All Bronze Partner benefits included",
      "Logo decaled on competition vehicle side body panels",
      "Priority recruitment access to member resumes & portfolios",
      "Featured recognition in AWIM district outreach events",
      "Sponsor display space during on-campus engineering exhibitions"
    ]
  },
  { 
    id: "gold",
    name: "Gold Partner", 
    investment: "₹2,50,000",
    pledgeValue: 250000,
    badge: "Principal Partner",
    color: "text-yellow-400", 
    border: "border-yellow-400/40", 
    badgeBg: "bg-yellow-400/10", 
    csrSchoolCount: 5,
    highlight: "High-visibility race paddocks & exclusive campus sessions",
    benefits: [
      "All Silver Partner benefits included",
      "Prominent branding on official team apparel & pit banners",
      "Exclusive campus recruitment webinar / technical talk hosted by team",
      "Product showcase & component testing validation case studies",
      "Adoption of 5 rural primary schools for AWIM STEM kits"
    ]
  },
  { 
    id: "title",
    name: "Title Sponsor", 
    investment: "₹5,00,000+",
    pledgeValue: 500000,
    badge: "Headline Partner",
    color: "text-apex-red font-black", 
    border: "border-apex-red/50", 
    badgeBg: "bg-apex-red/15", 
    csrSchoolCount: 10,
    highlight: "Headline naming rights & VIP trackside access",
    benefits: [
      "All Gold Partner benefits included",
      "Headline Title naming rights ('Team SAEINDIA powered by [Brand]')",
      "VIP trackside paddock passes & national competition briefings",
      "Primary central livery branding across nose cone & roll cage panels",
      "Adoption of 10 primary schools with comprehensive science toolkits",
      "Dedicated joint press release & executive interview feature"
    ]
  }
];

interface AwimSchool {
  id: number;
  name: string;
  district: string;
  state: string;
  kits: string;
  mentored: number;
  securedBy: number;
  x: number;
  y: number;
}

const awimSchools: AwimSchool[] = [
  { id: 1, name: "Gautham Model School, Kurnool", district: "Kurnool", state: "Andhra Pradesh", kits: "15 JetToy, 10 Skimmer", mentored: 120, securedBy: 50000, x: 195, y: 295 },
  { id: 2, name: "Zilla Parishad High School, Kurnool", district: "Kurnool", state: "Andhra Pradesh", kits: "25 JetToy", mentored: 180, securedBy: 100000, x: 215, y: 310 },
  { id: 3, name: "St. Joseph's English Medium School", district: "Kurnool", state: "Andhra Pradesh", kits: "12 JetToy, 8 Skimmer", mentored: 95, securedBy: 250000, x: 185, y: 325 },
  { id: 4, name: "Telangana Model School, Mahbubnagar", district: "Mahbubnagar", state: "Telangana", kits: "10 JetToy, 5 Skimmer", mentored: 75, securedBy: 250000, x: 205, y: 210 },
  { id: 5, name: "ZP High School, Anantapur", district: "Anantapur", state: "Andhra Pradesh", kits: "12 Skimmer", mentored: 80, securedBy: 500000, x: 175, y: 380 },
  { id: 6, name: "ZPHS Boys School, Nandyal", district: "Kurnool (Nandyal)", state: "Andhra Pradesh", kits: "15 JetToy", mentored: 110, securedBy: 500000, x: 255, y: 340 },
  { id: 7, name: "Giddalur Primary School, Prakasam", district: "Prakasam", state: "Andhra Pradesh", kits: "8 JetToy, 8 Skimmer", mentored: 70, securedBy: 500000, x: 305, y: 350 }
];

export default function JoinTab() {
  const [subTab, setSubTab] = useState<"recruit" | "sponsor">("recruit");

  // Recruitment Form States
  const [applicantName, setApplicantName] = useState<string>("");
  const [applicantRoll, setApplicantRoll] = useState<string>("");
  const [applicantEmail, setApplicantEmail] = useState<string>("");
  const [applicantPhone, setApplicantPhone] = useState<string>("");
  const [applicantBranch, setApplicantBranch] = useState<string>("Mechanical Engineering");
  const [applicantYear, setApplicantYear] = useState<string>("1st Year");
  const [applicantDomain, setApplicantDomain] = useState<string>("Chassis & Spaceframe Structural Design");
  const [applicantSecondaryDomain, setApplicantSecondaryDomain] = useState<string>("Suspension, Steering & Wheel Kinematics");
  const [applicantCoverText, setApplicantCoverText] = useState<string>("");
  const [applicationSubmitted, setApplicationSubmitted] = useState<boolean>(false);
  const [assignedReference, setAssignedReference] = useState<string>("");

  // Sponsor State - selected tier
  const [selectedTierId, setSelectedTierId] = useState<string>("gold");
  const [selectedSchool, setSelectedSchool] = useState<number | null>(1);
  const [downloaded, setDownloaded] = useState<boolean>(false);

  const activeTier = sponsorTiers.find(t => t.id === selectedTierId) || sponsorTiers[2];

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim()) return;

    // Applications go straight to Firestore; rules allow create-only, with field validation.
    const referenceCode = `BAJA-APP-2026-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const clip = (v: string, n: number) => (v || '').toString().trim().slice(0, n);
    try {
      await addDoc(collection(db, 'applications'), {
        referenceCode,
        name: clip(applicantName, 100),
        rollNumber: clip(applicantRoll, 40),
        email: clip(applicantEmail, 120),
        phone: clip(applicantPhone, 30),
        branch: clip(applicantBranch, 80) || 'Mechanical Engineering',
        year: clip(applicantYear, 20) || '1st Year',
        domain: clip(applicantDomain, 120),
        secondaryDomain: clip(applicantSecondaryDomain, 120) || 'None',
        coverText: clip(applicantCoverText, 4000),
        status: 'Application Under Review',
        submittedAt: serverTimestamp(),
      });
      setAssignedReference(referenceCode);
      setApplicationSubmitted(true);
    } catch (error) {
      console.error('Error submitting application form:', error);
      alert('Could not submit your application. Please check your connection and try again.');
    }
  };

  const handleBrochureDownload = () => {
    setDownloaded(true);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const benefitsHTML = activeTier.benefits
      .map(b => `<li style="margin-bottom: 10px; color: #222; font-size: 13px;">✓ ${b}</li>`)
      .join('');
      
    printWindow.document.write(`
      <html>
        <head>
          <title>SAEINDIA IIITDM Kurnool - Sponsor Proposal Pledge</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #222; line-height: 1.6; }
            .header { border-bottom: 2px solid #E10600; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo-text { font-size: 24px; font-weight: bold; color: #E10600; }
            .meta { font-size: 12px; color: #666; text-align: right; }
            .title { font-size: 22px; text-transform: uppercase; margin-bottom: 20px; font-weight: 800; color: #111; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f9f9f9; padding: 20px; border-radius: 6px; }
            .detail-label { font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold; }
            .detail-val { font-size: 18px; font-weight: bold; color: #111; margin-top: 4px; }
            .section-title { font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 15px; font-weight: bold; color: #E10600; }
            .benefits-list { padding-left: 20px; margin-bottom: 40px; }
            .footer { border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px; font-size: 11px; color: #666; display: flex; justify-content: space-between; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo-text">SAEINDIA Collegiate Chapter</div>
              <div style="font-size: 12px; color: #666;">IIITDM Kurnool, Andhra Pradesh</div>
            </div>
            <div class="meta">
              <div>Date: ${new Date().toLocaleDateString('en-IN')}</div>
              <div>Proposal Ref: SAE-B26-SP-${activeTier.name.toUpperCase().replace(/\s+/g, '')}</div>
            </div>
          </div>
          
          <div class="title">Corporate Sponsorship Agreement &amp; Brand Partnership</div>
          
          <div class="details-grid">
            <div>
              <div class="detail-label">Partnership Tier</div>
              <div class="detail-val">${activeTier.name}</div>
            </div>
            <div>
              <div class="detail-label">Investment Commitment</div>
              <div class="detail-val" style="color: #E10600;">${activeTier.investment}</div>
            </div>
            <div>
              <div class="detail-label">CSR School Adoption (Section 135)</div>
              <div class="detail-val" style="color: #10b981;">${activeTier.csrSchoolCount} Primary School(s)</div>
            </div>
            <div>
              <div class="detail-label">Tax Benefit Eligibility</div>
              <div class="detail-val">Eligible under Indian CSR Norms</div>
            </div>
          </div>
          
          <div class="section-title">Return On Investment (ROI) &amp; Branding Benefits</div>
          <ul class="benefits-list">
            ${benefitsHTML}
          </ul>
          
          <div class="section-title">Signatures &amp; Approvals</div>
          <div style="display: flex; justify-content: space-between; margin-top: 50px; padding-bottom: 50px;">
            <div style="width: 220px; border-top: 1px solid #222; text-align: center; padding-top: 8px; font-size: 12px;">
              Authorized Corporate Sponsor
            </div>
            <div style="width: 220px; border-top: 1px solid #222; text-align: center; padding-top: 8px; font-size: 12px;">
              SAEINDIA Chapter Operations Lead
            </div>
          </div>
          
          <div class="footer">
            <div>Official Email: saeindia@iiitk.ac.in</div>
            <div>© 2026 IIITDM Kurnool SAEINDIA Collegiate Chapter.</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalSeats = skillMatrix.reduce((n, d) => n + d.slots, 0);
  const funded = awimSchools.filter(s => activeTier.pledgeValue >= s.securedBy).length;
  const school = awimSchools.find(s => s.id === selectedSchool) || awimSchools[0];
  const schoolFunded = activeTier.pledgeValue >= school.securedBy;

  return (
    <div className="animate-fadeIn">
      <PageHero
        kicker="Join · Monsoon 2026 intake"
        title="Your seat is *open.*"
        sub="Build the next car with us, or put your name on it. Students apply in five minutes; partners get a car on the national grid and a classroom of kids building their first machines."
        ghost="JOIN"
        stats={[
          { value: String(totalSeats), label: "Open seats" },
          { value: "4", label: "Stage selection" },
          { value: "7", label: "Schools in AWIM" },
        ]}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-10 pb-24 space-y-16">
        <Segmented
          id="join-seg"
          value={subTab}
          onChange={setSubTab}
          options={[
            { key: "recruit", label: "Apply as a student", short: "Apply" },
            { key: "sponsor", label: "Partner with us", short: "Sponsor" },
          ]}
        />

        {subTab === "recruit" ? (
          <div className="space-y-20 animate-fadeIn">
            {/* ── Domains ── */}
            <section className="space-y-10">
              <SectionHead n={1} kicker="Domains & seats" title="Pick your *corner* *of* *the* *car.*" aside={<Label>Monsoon 2026 cohort</Label>} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {skillMatrix.map((d, i) => (
                  <Reveal key={d.department} delay={i * 0.06} className="h-full">
                    <SpotCard className="h-full p-6 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display font-semibold text-bone text-lg tracking-[-0.025em] leading-tight">{d.department}</h3>
                        <span className="text-right shrink-0">
                          <span className="block gloss-red font-display font-semibold text-3xl leading-none tracking-[-0.05em] tabular-nums">{d.slots}</span>
                          <Label className="text-[8.5px]">seats</Label>
                        </span>
                      </div>
                      <ul className="mt-5 space-y-2 flex-1">
                        {d.skills.map((s) => (
                          <li key={s} className="flex items-center gap-2.5 text-bone/65 text-sm">
                            <span className="w-1 h-1 rounded-full bg-apex-red" />{s}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-5 pt-4 border-t border-white/[0.07] font-mono text-[10px] uppercase tracking-[0.18em] text-bone/40 leading-relaxed">{d.tools.join(" · ")}</p>
                    </SpotCard>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* ── Application ── */}
            <section className="space-y-10">
              <SectionHead n={2} kicker="Application" title="Tell us *what* *you'll* *build.*" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <Reveal className="lg:col-span-8">
                  <div className="glass !rounded-[28px] p-6 sm:p-10">
                    {!applicationSubmitted ? (
                      <form onSubmit={handleApplicationSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
                        <Field label="Full name *">
                          <input className="field" type="text" required value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="Aman Gupta" autoComplete="name" />
                        </Field>
                        <Field label="Roll number *">
                          <input className="field uppercase" type="text" required value={applicantRoll} onChange={(e) => setApplicantRoll(e.target.value)} placeholder="24BME012" />
                        </Field>
                        <Field label="College email *">
                          <input className="field" type="email" required value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} placeholder="roll@iiitk.ac.in" autoComplete="email" />
                        </Field>
                        <Field label="Phone *">
                          <input className="field" type="tel" required value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
                        </Field>
                        <Field label="Branch *">
                          <select className="field" value={applicantBranch} onChange={(e) => setApplicantBranch(e.target.value)}>
                            <option value="Mechanical Engineering">Mechanical Engineering (Design &amp; Mfg)</option>
                            <option value="Electronics & Communication">Electronics &amp; Communication</option>
                            <option value="Computer Science & Engineering">Computer Science &amp; Engineering</option>
                            <option value="Artificial Intelligence & Data Science">AI &amp; Data Science</option>
                            <option value="Smart Manufacturing">Smart Manufacturing</option>
                            <option value="Automobile / Other Engineering">Automobile / Other</option>
                          </select>
                        </Field>
                        <Field label="Year *">
                          <select className="field" value={applicantYear} onChange={(e) => setApplicantYear(e.target.value)}>
                            <option value="1st Year">1st year</option>
                            <option value="2nd Year">2nd year</option>
                            <option value="3rd Year">3rd year</option>
                            <option value="4th Year">4th year</option>
                            <option value="Post-Graduate">Post-graduate (M.Tech / PhD)</option>
                          </select>
                        </Field>
                        <Field label="First-choice domain *">
                          <select className="field" value={applicantDomain} onChange={(e) => setApplicantDomain(e.target.value)}>
                            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                            <option value="Cost Report & Technical Rulebook Compliance">Cost Report &amp; Technical Rulebook Compliance</option>
                          </select>
                        </Field>
                        <Field label="Second choice">
                          <select className="field" value={applicantSecondaryDomain} onChange={(e) => setApplicantSecondaryDomain(e.target.value)}>
                            <option value="None">None — first choice only</option>
                            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </Field>
                        <Field label="Skills, projects & why you" wide>
                          <textarea
                            className="field min-h-[132px] resize-y"
                            rows={4}
                            value={applicantCoverText}
                            onChange={(e) => setApplicantCoverText(e.target.value)}
                            placeholder="SolidWorks, ANSYS, MATLAB, Arduino/STM32, welding, a robot you built, a race you watched too closely…"
                          />
                        </Field>
                        <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                          <p className="text-bone/40 text-[13px]">Goes straight to the selection board. We reply within a week.</p>
                          <button type="submit" className="btn-gloss shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-white cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]">
                            <Send size={15} /> Submit application
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="py-8 sm:py-12 text-center animate-fadeIn">
                        <div className="mx-auto w-16 h-16 rounded-full grid place-items-center bg-apex-red/15 border border-apex-red/40 shadow-[0_0_40px_rgba(225,6,0,0.45)]">
                          <CheckCircle2 size={28} className="text-[#FF5A3C]" />
                        </div>
                        <h3 className="mt-7 font-display font-semibold tracking-[-0.045em] leading-none text-4xl sm:text-5xl">
                          <span className="gloss-text-static">You&apos;re </span><span className="font-serif-i gloss-red">on the grid.</span>
                        </h3>
                        <p className="mt-5 max-w-md mx-auto text-bone/60 text-[15px] leading-relaxed">
                          Thanks, <span className="text-bone">{applicantName}</span>. Your application is logged — keep this reference for the aptitude round:
                        </p>
                        <p className="mt-5 inline-block rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 font-mono text-sm tracking-[0.15em] text-bone">{assignedReference}</p>
                        <p className="mt-6 text-bone/45 text-[13px]">{applicantBranch} · {applicantYear} · {applicantDomain}</p>
                        <button
                          onClick={() => { setApplicationSubmitted(false); setApplicantName(""); setApplicantRoll(""); setApplicantEmail(""); setApplicantPhone(""); setApplicantCoverText(""); }}
                          className="btn-glass mt-8 rounded-full px-5 py-2.5 text-sm text-bone/80 hover:text-bone cursor-pointer"
                        >
                          Submit another application
                        </button>
                      </div>
                    )}
                  </div>
                </Reveal>

                {/* Selection pipeline */}
                <Reveal delay={0.1} className="lg:col-span-4">
                  <div className="glass !rounded-[28px] p-6 sm:p-8 h-full flex flex-col">
                    <Label>Selection, in four laps</Label>
                    <ol className="mt-6 space-y-6 flex-1">
                      {[
                        ["Application review", "Screened by subsystem leads and the executive board."],
                        ["Aptitude test", "Domain fundamentals — mechanics, circuits or management."],
                        ["Technical interview", "One-on-one with a domain head: problem-solving and design instinct."],
                        ["Workshop onboarding", "Safety induction, CAD training and your first B-26 sprint."],
                      ].map(([t, d], i) => (
                        <li key={t} className="relative flex gap-4">
                          <span className="shrink-0 w-8 h-8 rounded-full grid place-items-center border border-apex-red/50 bg-apex-red/10 font-mono text-[11px] text-[#FF5A3C]">{i + 1}</span>
                          <div>
                            <p className="font-display font-semibold text-bone tracking-[-0.02em]">{t}</p>
                            <p className="mt-1 text-bone/50 text-sm leading-relaxed">{d}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-8 pt-5 border-t border-white/[0.07] text-bone/50 text-[13px] leading-relaxed">
                      <span className="inline-flex items-center gap-2 text-bone"><span className="w-1.5 h-1.5 rounded-full bg-apex-red animate-pulse" />Applications open</span><br />
                      All years welcome. Questions: <a href="mailto:saeindia@iiitk.ac.in" className="text-bone underline decoration-apex-red/60 underline-offset-4">saeindia@iiitk.ac.in</a>
                    </p>
                  </div>
                </Reveal>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-20 animate-fadeIn">
            {/* ── Tiers ── */}
            <section className="space-y-10">
              <SectionHead
                n={1}
                kicker="Partnership tiers"
                title="Put your name *on* *the* *car.*"
                aside={
                  <button onClick={handleBrochureDownload} className="btn-glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm text-bone cursor-pointer">
                    <Download size={15} /> {activeTier.name} proposal (PDF)
                  </button>
                }
              />
              <p className="-mt-4 max-w-3xl text-bone/60 text-[15px] leading-relaxed">
                National motorsport visibility, first look at engineering talent, and CSR impact you can audit — every tier funds AWIM science kits in district schools.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {sponsorTiers.map((tier, i) => {
                  const on = selectedTierId === tier.id;
                  return (
                    <Reveal key={tier.id} delay={i * 0.06} className="h-full">
                      <SpotCard
                        as="button"
                        onClick={() => { setSelectedTierId(tier.id); setDownloaded(false); }}
                        className={`w-full h-full p-6 flex flex-col ${on ? "!border-apex-red/60 shadow-[0_30px_80px_-30px_rgba(225,6,0,0.75)]" : ""}`}
                      >
                        {on && <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-apex-red to-transparent" />}
                        <div className="flex items-center justify-between">
                          <Label className={on ? "text-[#FF5A3C]" : ""}>{tier.badge}</Label>
                          <span className={`w-4 h-4 rounded-full border grid place-items-center ${on ? "border-apex-red" : "border-white/25"}`}>
                            {on && <span className="w-2 h-2 rounded-full bg-apex-red" />}
                          </span>
                        </div>
                        <h3 className="mt-5 font-display font-semibold text-bone text-2xl tracking-[-0.035em]">{tier.name}</h3>
                        <p className="mt-2 gloss-text-static font-display font-semibold text-4xl tracking-[-0.05em] tabular-nums">{tier.investment}</p>
                        <Label className="block mt-1">per season · {tier.csrSchoolCount} school{tier.csrSchoolCount > 1 ? "s" : ""} adopted</Label>
                        <p className="mt-4 text-bone/55 text-sm leading-relaxed">{tier.highlight}</p>
                        <ul className="mt-5 pt-5 border-t border-white/[0.07] space-y-2.5 flex-1">
                          {tier.benefits.map((b) => (
                            <li key={b} className="flex gap-2.5 text-bone/70 text-[13px] leading-snug">
                              <CheckCircle2 size={14} className={`shrink-0 mt-0.5 ${on ? "text-[#FF5A3C]" : "text-bone/35"}`} />{b}
                            </li>
                          ))}
                        </ul>
                      </SpotCard>
                    </Reveal>
                  );
                })}
              </div>

              <div className="glass !rounded-[28px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <Label>Selected package</Label>
                  <p className="mt-2 font-display font-semibold text-bone text-2xl tracking-[-0.03em]">
                    {activeTier.name} <span className="text-bone/40 font-normal">· {activeTier.investment}</span>
                  </p>
                  {downloaded && <p className="mt-1 text-bone/45 text-[13px]">Proposal opened in a new tab — print or save it as PDF.</p>}
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href="mailto:saeindia@iiitk.ac.in?subject=Corporate%20Sponsorship%20Inquiry%20-%20SAEINDIA%20IIITDM%20Kurnool" className="btn-glass inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm text-bone">
                    Talk to us
                  </a>
                  <button onClick={handleBrochureDownload} className="btn-gloss inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white cursor-pointer">
                    <Download size={15} /> Generate proposal
                  </button>
                </div>
              </div>
            </section>

            {/* ── AWIM map ── */}
            <section className="space-y-10">
              <SectionHead
                n={2}
                kicker="AWIM · CSR outreach"
                title="Where your money *goes* *to* *school.*"
                aside={<p className="text-bone/60 text-sm"><span className="gloss-red font-display font-semibold text-2xl tabular-nums">{funded}</span> <span className="text-bone/40">/ {awimSchools.length} schools funded at this tier</span></p>}
              />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-7 glass !rounded-[28px] p-3 sm:p-6 relative overflow-hidden">
                  <div aria-hidden className="pointer-events-none absolute left-[40%] top-[62%] -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(225,6,0,0.22),transparent_65%)]" />
                  <svg viewBox="100 90 380 380" className="relative w-full h-auto select-none">
                    <polygon points="160,120 250,110 310,160 320,180 300,260 210,270 140,240 125,180" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4,3" />
                    <text x="215" y="150" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="var(--font-jetbrains-mono)" letterSpacing="4" textAnchor="middle">TELANGANA</text>
                    <polygon points="140,240 210,270 300,260 320,180 350,190 440,245 460,290 380,370 300,410 210,430 160,450 145,390 165,340 140,270" fill="rgba(225,6,0,0.035)" stroke="rgba(225,6,0,0.35)" strokeWidth="1" strokeDasharray="4,3" />
                    <text x="345" y="330" fill="rgba(255,90,60,0.28)" fontSize="9" fontFamily="var(--font-jetbrains-mono)" letterSpacing="4" textAnchor="middle">ANDHRA PRADESH</text>
                    {[["HYDERABAD", 220, 180], ["AMARAVATI", 330, 290], ["VIZAG", 425, 232]].map(([n, x, y]) => (
                      <g key={n as string} opacity="0.45">
                        <circle cx={x as number} cy={y as number} r="1.6" fill="#F1F1F1" />
                        <text x={x as number} y={(y as number) - 7} fill="#F1F1F1" fontSize="7" fontFamily="var(--font-jetbrains-mono)" textAnchor="middle" letterSpacing="1.5">{n}</text>
                      </g>
                    ))}
                    {awimSchools.map((s) => {
                      const ok = activeTier.pledgeValue >= s.securedBy;
                      const on = selectedSchool === s.id;
                      return (
                        <g key={s.id} onClick={() => setSelectedSchool(s.id)} className="cursor-pointer">
                          <circle cx={s.x} cy={s.y} r="14" fill="transparent" />
                          {ok && <circle cx={s.x} cy={s.y} r="9" fill="rgba(225,6,0,0.3)" className="animate-ping" style={{ transformOrigin: `${s.x}px ${s.y}px`, animationDuration: `${2 + s.id * 0.4}s` }} />}
                          {on && <circle cx={s.x} cy={s.y} r="8" fill="none" stroke="#F1F1F1" strokeWidth="1" />}
                          <circle cx={s.x} cy={s.y} r="4" fill={ok ? "#FF3B1F" : "#3a3a42"} stroke="#070708" strokeWidth="1.5" />
                          <text x={s.x} y={s.y - 11} fill={on ? "#F1F1F1" : ok ? "rgba(255,120,90,0.9)" : "rgba(241,241,241,0.35)"} fontSize="7" fontFamily="var(--font-jetbrains-mono)" textAnchor="middle" letterSpacing="1">{s.district.toUpperCase()}</text>
                        </g>
                      );
                    })}
                  </svg>
                  <p className="relative px-3 pb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-bone/35">Tap a school · red = funded at {activeTier.name}</p>
                </div>

                <div key={school.id} className="lg:col-span-5 glass !rounded-[28px] p-6 sm:p-8 flex flex-col animate-fadeIn">
                  <div className="flex items-center justify-between gap-3">
                    <Label>School {String(school.id).padStart(2, "0")}</Label>
                    <span className={`rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em] border ${schoolFunded ? "border-apex-red/50 bg-apex-red/15 text-[#FF5A3C]" : "border-white/15 text-bone/45"}`}>
                      {schoolFunded ? "Funded" : "Awaiting partner"}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display font-semibold text-bone text-2xl sm:text-3xl tracking-[-0.04em] leading-tight">{school.name}</h3>
                  <dl className="mt-6 divide-y divide-white/[0.06] flex-1">
                    {[["District", school.district], ["State", school.state], ["Science kits", school.kits], ["Students / season", String(school.mentored)]].map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                        <dt><Label>{k}</Label></dt>
                        <dd className="text-bone text-sm text-right">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-6 text-bone/45 text-[13px] leading-relaxed">
                    CSR contributions under Section 135 buy these classroom kits and cover our mentors&apos; travel from the IIITDM Kurnool campus.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export interface ScoreMetric {
  label: string;
  scored: number;
  max: number;
  color: string;
}

export interface YearAchievement {
  year: string;
  milestone: string;
  desc: string;
  status: "Completed" | "In progress" | "Target";
  /** Event scores or target points */
  scores?: ScoreMetric[];
  highlights: string[];
  rankBadge?: string;
}

export const achievementsData: Record<string, YearAchievement> = {
  "2025": {
    year: "2025",
    milestone: "Chapter founded",
    desc: "The SAEINDIA collegiate chapter at IIITDM Kurnool was established in 2025. Faculty advisors came on board, the first members were recruited across engineering branches, and CAD work on the B-26 buggy began.",
    status: "Completed",
    highlights: [
      "SAEINDIA collegiate chapter established at IIITDM Kurnool",
      "Dr. Akhtar Khan and Dr. S. Anand Kumar join as faculty advisors",
      "First cohort recruited into chassis, powertrain, suspension, brakes, steering and management",
      "B-26 spaceframe concept and CAD modeling initiated in SolidWorks",
    ],
  },
  "2026": {
    year: "2026",
    milestone: "Design & Build Season · B-26 Prototype",
    desc: "Comprehensive engineering season: complete CAD in SolidWorks, multi-body kinematics in CarMaker, structural FEA in ANSYS, and full-scale PVC mock-up fabrication leading into the BAJA SAEINDIA 2027 campaign.",
    status: "Completed",
    highlights: [
      "Complete 3D CAD spaceframe and suspension geometry modeled and stress-tested",
      "Full-scale PVC ergonomic mock-up built and driver extraction validated",
      "Official BAJA SAEINDIA 2027 design spec sheet locked and verified",
      "Procurement of powertrain components, AISI 4130 steel, and tooling completed",
    ],
  },
  "2027": {
    year: "2027",
    milestone: "mBAJA SAEINDIA 2027 — Virtual Rank 12 & Physical Debut",
    desc: "Team Monarch achieved an extraordinary preliminary round performance in the mBAJA SAEINDIA 2027 Virtual Event. IIITDM Kurnool secured 12th position out of 49 engineering institutions across India and 2nd position among all participating Centrally Funded Technical Institutes (CFTIs) with an overall score of 34.98/50. The squad is now fabricating the physical B-26 buggy for dynamic events and endurance.",
    status: "In progress",
    rankBadge: "Rank 12 / 49 Overall · Rank 2 CFTI",
    scores: [
      { label: "Technical Quiz Round (Official)", scored: 8.1, max: 10, color: "bg-apex-red" },
      { label: "Design & Presentation Round (Official)", scored: 26.88, max: 40, color: "bg-apex-red" },
      { label: "Overall Preliminary Score (Official)", scored: 34.98, max: 50, color: "bg-apex-red" },
      { label: "Endurance & Dynamic Target", scored: 300, max: 400, color: "bg-apex-red" },
    ],
    highlights: [
      "Secured 12th position among 49 participating colleges nationwide in the Virtual Round",
      "Ranked 2nd among four Centrally Funded Technical Institutes (CFTIs) in mBAJA",
      "Scored 8.10/10 in Quiz and 26.88/40 in Design & Presentation (Total: 34.98/50)",
      "Clear technical inspection (TI) and brake test on the first attempt",
      "Finish the grueling 4-hour physical endurance race with zero mechanical DNFs",
    ],
  },
};

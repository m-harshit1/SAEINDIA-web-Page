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
    milestone: "mBAJA 2027 Virtual Event — Rank 12 Nationally & Rank 2 CFTI",
    desc: "Team Monarch delivered an extraordinary preliminary round performance in the mBAJA SAEINDIA 2027 Virtual Event. IIITDM Kurnool secured 12th position out of 49 engineering colleges across India and 2nd position among all participating CFTIs with an overall score of 34.98/50.",
    status: "Completed",
    rankBadge: "Rank 12 / 49 Overall · Rank 2 CFTI",
    scores: [
      { label: "Technical Quiz Round", scored: 8.1, max: 10, color: "bg-apex-red" },
      { label: "Design & Presentation Round", scored: 26.88, max: 40, color: "bg-apex-red" },
      { label: "Overall Preliminary Score", scored: 34.98, max: 50, color: "bg-apex-red" },
    ],
    highlights: [
      "Secured 12th position among 49 participating colleges in the Virtual Round",
      "Ranked 2nd among four Centrally Funded Technical Institutes (CFTIs) in mBAJA",
      "Scored 8.10/10 in Quiz and 26.88/40 in Design & Presentation",
      "Full-scale PVC ergonomic mock-up built and validated before steel fabrication",
      "Official BAJA SAEINDIA 2027 design spec sheet locked and submitted",
    ],
  },
  "2027": {
    year: "2027",
    milestone: "Debut at BAJA SAEINDIA (Physical Event)",
    desc: "Our inaugural physical BAJA SAEINDIA campaign. The goal for our debut buggy: clear technical inspection on the first attempt, conquer the dynamic events, and complete the 4-hour endurance challenge.",
    status: "Target",
    highlights: [
      "Clear technical inspection (TI) and brake test on first attempt",
      "Conquer dynamic sprint, manoeuvrability, suspension & traction events",
      "Finish the grueling 4-hour endurance race with zero mechanical DNFs",
      "Score strongly in design and cost evaluations as a debut institution",
    ],
    scores: [
      { label: "Design Target", scored: 120, max: 150, color: "bg-apex-red" },
      { label: "Cost & BOM Target", scored: 80, max: 100, color: "bg-apex-red" },
      { label: "Manoeuvrability Target", scored: 75, max: 100, color: "bg-apex-red" },
      { label: "Endurance Target", scored: 300, max: 400, color: "bg-apex-red" },
    ],
  },
};

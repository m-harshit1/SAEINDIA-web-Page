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
  status: "Target" | "Completed" | "In progress";
  /** Debut targets — the points we are designing for, not results. */
  scores?: ScoreMetric[];
  highlights: string[];
}

/* The chapter was founded in 2025 and makes its BAJA SAEINDIA debut in 2027.
   No competition results exist yet; the 2027 numbers are targets. */
export const achievementsData: Record<string, YearAchievement> = {
  "2025": {
    year: "2025",
    milestone: "Chapter founded",
    desc: "The SAEINDIA collegiate chapter at IIITDM Kurnool was set up in 2025. Faculty advisors came on board, the first members were recruited across every branch, and work on the B-26 began on paper.",
    status: "Completed",
    highlights: [
      "SAEINDIA collegiate chapter established at IIITDM Kurnool",
      "Dr. S. Anand Kumar and Dr. Pankaj Kaushik join as faculty advisors",
      "First cohort recruited into chassis, powertrain, suspension, brakes, electrical and management teams",
      "B-26 concept and roll-cage design started in CAD",
    ],
  },
  "2026": {
    year: "2026",
    milestone: "Design & build season",
    desc: "The B-26 goes from CAD to the workshop floor: frame analysis in ANSYS, a full-size PVC roll-cage mock-up to check driver fit and clearances, then fabrication of the real chassis.",
    status: "In progress",
    highlights: [
      "Roll cage modelled in SolidWorks and checked in ANSYS",
      "Full-scale PVC mock-up built to validate ergonomics before cutting steel",
      "Powertrain, suspension and braking subsystems being specified",
      "Sponsorship and outreach programme being set up",
    ],
  },
  "2027": {
    year: "2027",
    milestone: "Debut at BAJA SAEINDIA",
    desc: "Our first BAJA SAEINDIA. The goal for a debut team: pass technical inspection first time, finish the endurance race, and score well in design. The scores below are the targets we are building towards.",
    status: "Target",
    highlights: [
      "Clear technical inspection on the first attempt",
      "Finish every dynamic event, including the endurance race",
      "Score strongly in design and cost evaluations as a rookie team",
    ],
    scores: [
      { label: "Design target", scored: 120, max: 150, color: "bg-apex-red" },
      { label: "Cost & BOM target", scored: 80, max: 100, color: "bg-apex-red" },
      { label: "Manoeuvrability target", scored: 75, max: 100, color: "bg-apex-red" },
      { label: "Endurance target", scored: 300, max: 400, color: "bg-apex-red" },
    ],
  },
};

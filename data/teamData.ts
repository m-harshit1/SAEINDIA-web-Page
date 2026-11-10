export interface TeamMember {
  name: string;
  role: string;
  subteam: string;
  image?: string;
  email?: string;
  linkedin?: string;
  initials: string;
  isLead?: boolean;
}

export const facultyAdvisors: TeamMember[] = [
  { name: "Dr. S. Anand Kumar", role: "Primary Faculty Advisor", subteam: "Academic Advisory", initials: "AK", email: "anand@iiitk.ac.in" },
  { name: "Dr. Pankaj Kaushik", role: "Faculty Co-supervisor", subteam: "Academic Advisory", initials: "PK", email: "pankaj@iiitk.ac.in" }
];

/* ── Office Bearers (2025–2026) ───────────────────────────────────────── */
export const officeBearers: TeamMember[] = [
  { name: "Harshit Mishra", role: "President", subteam: "Executive Council", initials: "HM", isLead: true },
  { name: "Ramakrishna Sen", role: "Vice President", subteam: "Executive Council", initials: "RS", isLead: true },
  { name: "Vineet Sharma", role: "Treasurer", subteam: "Executive Council", initials: "VS", isLead: true },
  { name: "Pranjal Mishra", role: "Secretary", subteam: "Executive Council", initials: "PM", isLead: true },
  { name: "Shanu Jha", role: "Membership Chair", subteam: "Chapter Chairs", initials: "SJ" },
  { name: "Jatin Sharma", role: "Publicity Chair", subteam: "Chapter Chairs", initials: "JS" },
  { name: "Prashant Kumar", role: "Reception Chair", subteam: "Chapter Chairs", initials: "PK" },
  { name: "Karthikeya", role: "Program Chair", subteam: "Chapter Chairs", initials: "K" }
];

// Backwards compatibility aliases
export const executiveBoard = officeBearers.slice(0, 4);
export const coreLeadership = officeBearers.slice(4);

/* ── Current BAJA Team (B-26) ─────────────────────────────────────────── */
export const bajaTeam: TeamMember[] = [
  // Leadership & Heads
  { name: "Harshit Mishra", role: "Team Captain & Powertrain Lead", subteam: "Powertrain", initials: "HM", isLead: true },
  { name: "Ramakrishna Sen", role: "Management Lead", subteam: "Management", initials: "RS", isLead: true },
  { name: "Jatin Sharma", role: "Suspension Lead", subteam: "Suspension", initials: "JS", isLead: true },
  { name: "Samarth Sakhale", role: "Brakes Head", subteam: "Brakes", initials: "SS", isLead: true },
  { name: "Uday Paul George", role: "Chassis Lead", subteam: "Chassis", initials: "UG", isLead: true },
  { name: "Prashant Kumar", role: "Steering Lead", subteam: "Steering", initials: "PK", isLead: true },
  { name: "Vishavjeet Singh Bhati", role: "Driver & Dynamics", subteam: "Vehicle Dynamics", initials: "VB", isLead: true },

  // Powertrain Subsystem
  { name: "Vidya Vidhitha Sri Talluri", role: "Powertrain Engineer", subteam: "Powertrain", initials: "VT" },
  { name: "Veeren Birari", role: "Powertrain Engineer", subteam: "Powertrain", initials: "VB" },
  { name: "Abhilash Kumar", role: "Powertrain Engineer", subteam: "Powertrain", initials: "AK" },
  { name: "Kubera Shivas", role: "Powertrain Engineer", subteam: "Powertrain", initials: "KS" },
  { name: "Nagulesh Thiagarajan", role: "Powertrain Engineer", subteam: "Powertrain", initials: "NT" },

  // Suspension Subsystem
  { name: "Vashishta Ganapuram", role: "Suspension Engineer", subteam: "Suspension", initials: "VG" },
  { name: "Prachi Arya", role: "Suspension Engineer", subteam: "Suspension", initials: "PA" },
  { name: "Madhav Bansal", role: "Suspension Engineer", subteam: "Suspension", initials: "MB" },
  { name: "Prateek Kumar", role: "Suspension Engineer", subteam: "Suspension", initials: "PK" },

  // Chassis Subsystem
  { name: "A S Ashwani", role: "Chassis Engineer", subteam: "Chassis", initials: "AA" },
  { name: "Kartik Gosain", role: "Chassis Engineer", subteam: "Chassis", initials: "KG" },
  { name: "P Surya Kiran", role: "Chassis Engineer", subteam: "Chassis", initials: "PK" },
  { name: "Banoth Vinod Kumar", role: "Chassis Engineer", subteam: "Chassis", initials: "BK" },
  { name: "Pavan Shankar", role: "Chassis Engineer", subteam: "Chassis", initials: "PS" },

  // Brakes Subsystem
  { name: "Aanchal Patil", role: "Brakes Engineer", subteam: "Brakes", initials: "AP" },
  { name: "Gopichand Mallula", role: "Brakes Engineer", subteam: "Brakes", initials: "GM" },
  { name: "Anusha Sinha", role: "Brakes Engineer", subteam: "Brakes", initials: "AS" },
  { name: "Shanu Jha", role: "Brakes Engineer", subteam: "Brakes", initials: "SJ" },
  { name: "Santosh Kumar", role: "Brakes Engineer", subteam: "Brakes", initials: "SK" },

  // Steering Subsystem
  { name: "Anuj Sarode", role: "Steering Engineer", subteam: "Steering", initials: "AS" },
  { name: "Mujtaba Hassan", role: "Steering Engineer", subteam: "Steering", initials: "MH" },
  { name: "Suryansh Pandey", role: "Steering Engineer", subteam: "Steering", initials: "SP" },
  { name: "Babu T", role: "Steering Engineer", subteam: "Steering", initials: "BT" },

  // Management & Operations
  { name: "Krish Modani", role: "Management & Operations", subteam: "Management", initials: "KM" },
  { name: "Ketha Harshad Reddy", role: "Management & Operations", subteam: "Management", initials: "KR" },
  { name: "Srivathsan G", role: "Management & Operations", subteam: "Management", initials: "SG" },
  { name: "Ankit Meena", role: "Engineering Intern", subteam: "Intern", initials: "AM" }
];

// Subsystem Leads list for legacy references
export const subsystemLeads: TeamMember[] = bajaTeam.filter(m => m.isLead);
export const managementTeam: TeamMember[] = bajaTeam.filter(m => m.subteam === "Management");

export interface Alumnus {
  name: string;
  batch: string;
  company: string;
  position: string;
  location: string;
  linkedin: string;
  team: string;
  initials: string;
}

// Chapter Inception: 2025 — Zero alumni currently (Inaugural cohorts graduating 2027/2028)
export const alumniData: Alumnus[] = [];

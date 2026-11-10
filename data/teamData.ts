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
  { name: "Dr. Akhtar Khan", role: "Faculty Advisor", subteam: "Academic Advisory", initials: "AK" },
  { name: "Dr. S. Anand Kumar", role: "Faculty Advisor", subteam: "Academic Advisory", initials: "SAK" }
];

/* ── Office Bearers (2025–2026) ───────────────────────────────────────── */
export const officeBearers: TeamMember[] = [
  { name: "Harshit Mishra", role: "President", subteam: "Executive Council", initials: "HM", isLead: true },
  { name: "Ramakrishna Sen", role: "Vice President", subteam: "Executive Council", initials: "RS", isLead: true },
  { name: "Vineet Sharma", role: "Treasurer", subteam: "Executive Council", initials: "VS" },
  { name: "Pranjal Mishra", role: "Secretary", subteam: "Executive Council", initials: "PM" },
  { name: "Shanu Jha", role: "Membership Chair", subteam: "Chapter Chairs", initials: "SJ" },
  { name: "Jatin Sharma", role: "Publicity Chair", subteam: "Chapter Chairs", initials: "JS" },
  { name: "Prashant Kumar", role: "Reception Chair", subteam: "Chapter Chairs", initials: "PK" },
  { name: "Karthikeya", role: "Program Chair", subteam: "Chapter Chairs", initials: "K" }
];

/* ── Current BAJA Team (B-26) ─────────────────────────────────────────── */
export const bajaTeam: TeamMember[] = [
  // Leadership & Heads
  { name: "Harshit Mishra", role: "Captain & Powertrain Lead", subteam: "Powertrain", initials: "HM", isLead: true },
  { name: "Ramakrishna Sen", role: "Management Lead", subteam: "Management", initials: "RS", isLead: true },
  { name: "Jatin Sharma", role: "Suspension Lead", subteam: "Suspension", initials: "JS", isLead: true },
  { name: "Samarth Sakhale", role: "Brakes Head", subteam: "Brakes", initials: "SS", isLead: true },
  { name: "Uday Paul George", role: "Chassis Lead", subteam: "Chassis", initials: "UG", isLead: true },
  { name: "Prashant Kumar", role: "Steering Lead", subteam: "Steering", initials: "PK", isLead: true },
  { name: "Vishavjeet Singh Bhati", role: "Driver", subteam: "Vehicle Dynamics", initials: "VB", isLead: true },

  // Engineering & Management
  { name: "Krish Modani", role: "Management", subteam: "Management", initials: "KM" },
  { name: "Vashishta Ganapuram", role: "Suspension", subteam: "Suspension", initials: "VG" },
  { name: "A S Ashwani", role: "Chassis", subteam: "Chassis", initials: "AA" },
  { name: "Aanchal Patil", role: "Brakes", subteam: "Brakes", initials: "AP" },
  { name: "Gopichand Mallula", role: "Brakes", subteam: "Brakes", initials: "GM" },
  { name: "Vidya Vidhitha Sri Talluri", role: "Powertrain", subteam: "Powertrain", initials: "VT" },
  { name: "Anusha Sinha", role: "Brakes", subteam: "Brakes", initials: "AS" },
  { name: "Anuj Sarode", role: "Steering", subteam: "Steering", initials: "AS" },
  { name: "Veeren Birari", role: "Powertrain", subteam: "Powertrain", initials: "VB" },
  { name: "Kartik Gosain", role: "Chassis", subteam: "Chassis", initials: "KG" },
  { name: "Abhilash Kumar", role: "Powertrain", subteam: "Powertrain", initials: "AK" },
  { name: "Shanu Jha", role: "Brakes", subteam: "Brakes", initials: "SJ" },
  { name: "Santosh Kumar", role: "Brakes", subteam: "Brakes", initials: "SK" },
  { name: "P Surya Kiran", role: "Chassis", subteam: "Chassis", initials: "PK" },
  { name: "Banoth Vinod Kumar", role: "Chassis", subteam: "Chassis", initials: "BK" },
  { name: "Pavan Shankar", role: "Chassis", subteam: "Chassis", initials: "PS" },
  { name: "Prachi Arya", role: "Suspension", subteam: "Suspension", initials: "PA" },
  { name: "Ketha Harshad Reddy", role: "Management", subteam: "Management", initials: "KR" },
  { name: "Ankit Meena", role: "Intern", subteam: "Intern", initials: "AM" },
  { name: "Kubera Shivas", role: "Powertrain", subteam: "Powertrain", initials: "KS" },
  { name: "Madhav Bansal", role: "Suspension", subteam: "Suspension", initials: "MB" },
  { name: "Srivathsan G", role: "Management", subteam: "Management", initials: "SG" },
  { name: "Mujtaba Hassan", role: "Steering", subteam: "Steering", initials: "MH" },
  { name: "Nagulesh Thiagarajan", role: "Powertrain", subteam: "Powertrain", initials: "NT" },
  { name: "Prateek Kumar", role: "Suspension", subteam: "Suspension", initials: "PK" },
  { name: "Suryansh Pandey", role: "Steering", subteam: "Steering", initials: "SP" },
  { name: "Babu T", role: "Steering", subteam: "Steering", initials: "BT" }
];

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

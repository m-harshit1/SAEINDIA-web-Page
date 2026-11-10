export interface TeamMember {
  name: string;
  role: string;
  subteam: string;
  image?: string;
  email?: string;
  linkedin?: string;
  initials: string;
}

export const facultyAdvisors: TeamMember[] = [
  { name: "Dr. S. Anand Kumar", role: "Primary Faculty Advisor", subteam: "Academic Advisory", initials: "AK", email: "anand@iiitk.ac.in" },
  { name: "Dr. Pankaj Kaushik", role: "Faculty Co-supervisor", subteam: "Academic Advisory", initials: "PK", email: "pankaj@iiitk.ac.in" }
];

export const executiveBoard: TeamMember[] = [
  { name: "Harshit Kumar Mishra", role: "Club President / Powertrain Lead", subteam: "Executive Board", initials: "HM", email: "harshit.mishra@iiitk.ac.in" },
  { name: "N M Roshanth", role: "Club Vice-President / Drivetrain Lead", subteam: "Executive Board", initials: "NR", email: "roshanth.nm@iiitk.ac.in" }
];

export const coreLeadership: TeamMember[] = [
  { name: "Vineet Sharma", role: "Technical Head / Suspension Lead", subteam: "Core Tech Leadership", initials: "VS", email: "vineet.sharma@iiitk.ac.in" }
];

export const subsystemLeads: TeamMember[] = [
  { name: "V. Akash", role: "Chassis & Roll Cage Lead", subteam: "Chassis", initials: "VA", email: "akash.v@iiitk.ac.in" },
  { name: "Vineet Sharma", role: "Suspension & Kinematics Lead", subteam: "Suspension", initials: "VS", email: "vineet.sharma@iiitk.ac.in" },
  { name: "N M Roshanth", role: "Drivetrain & Powertrain Lead", subteam: "Powertrain", initials: "NR", email: "roshanth.nm@iiitk.ac.in" },
  { name: "Samarth Sakhale", role: "Brakes & Steering Lead", subteam: "Brakes", initials: "SS", email: "samarth.sakhale@iiitk.ac.in" },
  { name: "Sneha Nair", role: "Electrical & DAQ Lead", subteam: "Electrical", initials: "SN", email: "sneha.nair@iiitk.ac.in" }
];

export const managementTeam: TeamMember[] = [
  { name: "Priya Patel", role: "Sponsorship & Corporate Relations Lead", subteam: "Management", initials: "PP", email: "priya.patel@iiitk.ac.in" },
  { name: "Aman Sharma", role: "Finance & Inventory Officer", subteam: "Management", initials: "AS", email: "aman.sharma@iiitk.ac.in" },
  { name: "Rohan Verma", role: "Public Relations & Media Manager", subteam: "Management", initials: "RV", email: "rohan.verma@iiitk.ac.in" }
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

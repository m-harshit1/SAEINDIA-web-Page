const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('sae2026', 10);
  
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'SAEINDIA Admin',
      passwordHash,
      role: 'Admin'
    }
  });

  const membersData = [
    {
      membershipId: 'SAEBAJA-ADMIN',
      name: 'Harshit Kumar Mishra',
      role: 'Club President / Powertrain Lead',
      department: 'Executive Board',
      email: 'harshit.mishra@iiitk.ac.in',
      yearJoined: 2023
    },
    {
      membershipId: 'SAEBAJA-2026-002',
      name: 'N M Roshanth',
      role: 'Club Vice-President / Drivetrain Lead',
      department: 'Executive Board',
      email: 'roshanth.nm@iiitk.ac.in',
      yearJoined: 2023
    },
    {
      membershipId: 'SAEBAJA-2026-003',
      name: 'Vineet Sharma',
      role: 'Technical Head / Suspension Lead',
      department: 'Core Tech Leadership',
      email: 'vineet.sharma@iiitk.ac.in',
      yearJoined: 2023
    },
    {
      membershipId: 'SAEBAJA-2026-004',
      name: 'V. Akash',
      role: 'Chassis & Roll Cage Lead',
      department: 'Chassis Division',
      email: 'akash.v@iiitk.ac.in',
      yearJoined: 2024
    },
    {
      membershipId: 'SAEBAJA-2026-005',
      name: 'Samarth Sakhale',
      role: 'Brakes & Steering Lead',
      department: 'Brakes Division',
      email: 'samarth.sakhale@iiitk.ac.in',
      yearJoined: 2024
    },
    {
      membershipId: 'SAEBAJA-2026-006',
      name: 'Sneha Nair',
      role: 'Electrical Lead',
      department: 'Electrical Division',
      email: 'sneha.nair@iiitk.ac.in',
      yearJoined: 2024
    },
    {
      membershipId: 'SAEBAJA-2026-007',
      name: 'Priya Patel',
      role: 'Sponsorship & Corporate Relations Lead',
      department: 'Management',
      email: 'priya.patel@iiitk.ac.in',
      yearJoined: 2024
    },
    {
      membershipId: 'SAEBAJA-2026-008',
      name: 'Aman Sharma',
      role: 'Finance & Inventory Officer',
      department: 'Management',
      email: 'aman.sharma@iiitk.ac.in',
      yearJoined: 2025
    },
    {
      membershipId: 'SAEBAJA-2026-009',
      name: 'Rohan Verma',
      role: 'Public Relations & Media Manager',
      department: 'Management',
      email: 'rohan.verma@iiitk.ac.in',
      yearJoined: 2025
    },
    {
      membershipId: 'SAEIN26892',
      name: 'Ananya Rao',
      role: 'Vehicle Dynamics / Test Driver',
      department: 'BAJA Division',
      email: 'ananya.rao@iiitk.ac.in',
      yearJoined: 2025
    }
  ];

  for (const m of membersData) {
    const existing = await prisma.member.findFirst({
      where: {
        OR: [
          { membershipId: m.membershipId },
          { email: m.email }
        ]
      }
    });

    if (existing) {
      await prisma.member.update({
        where: { id: existing.id },
        data: m
      });
    } else {
      await prisma.member.create({
        data: m
      });
    }
  }

  // Seed initial tasks if empty
  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        { title: "Chassis Roll Cage FEA Validation", assignee: "V. Akash", priority: "High", status: "Done" },
        { title: "CVT Secondary Sheave Preload Tuning", assignee: "N M Roshanth", priority: "High", status: "In-Progress" },
        { title: "Brake Over-Travel Switch Calibration", assignee: "Samarth Sakhale", priority: "Medium", status: "Todo" },
        { title: "Emergency Kill Switch Wiring Harness", assignee: "Sneha Nair", priority: "High", status: "Done" }
      ]
    });
  }

  // Seed inventory if empty
  const invCount = await prisma.inventoryItem.count();
  if (invCount === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        { name: "Chromoly 4130 Tubing (1.25\" OD)", qty: "18 meters", status: "In Stock", dept: "Chassis" },
        { name: "CVT Belt Kevlar Reinforced", qty: "3 units", status: "In Stock", dept: "Powertrain" },
        { name: "Wilwood Caliper Master Cylinder Kit", qty: "1 kit", status: "Low Stock", dept: "Brakes" },
        { name: "Fox Float 3 Evol Air Shocks", qty: "4 sets", status: "Allocated", dept: "Suspension" }
      ]
    });
  }

  // Seed attendance if empty
  const attCount = await prisma.attendanceRecord.count();
  if (attCount === 0) {
    await prisma.attendanceRecord.createMany({
      data: [
        { name: "Harshit Kumar Mishra", hours: 42.5, role: "Club President", status: "Present" },
        { name: "N M Roshanth", hours: 38.0, role: "Vice-President", status: "Present" },
        { name: "Vineet Sharma", hours: 35.0, role: "Technical Head", status: "Present" },
        { name: "V. Akash", hours: 29.5, role: "Chassis Lead", status: "Present" }
      ]
    });
  }

  console.log('Database successfully seeded with SAEBAJA members, tasks, inventory, and attendance records.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

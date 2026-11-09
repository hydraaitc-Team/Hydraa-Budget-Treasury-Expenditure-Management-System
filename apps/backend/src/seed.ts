import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING INITIAL HYDRAA MASTER DATA ---');

  // 1. Financial Years (2024-25, 2025-26, 2026-27)
  const fyData = [
    { code: '2024-25', name: 'FY 2024-2025', startDate: new Date('2024-04-01'), endDate: new Date('2025-03-31'), isCurrent: false },
    { code: '2025-26', name: 'FY 2025-2026', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31'), isCurrent: false },
    { code: '2026-27', name: 'FY 2026-2027', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'), isCurrent: true },
  ];
  for (const fy of fyData) {
    await prisma.financialYear.upsert({
      where: { code: fy.code },
      update: { isCurrent: fy.isCurrent },
      create: fy,
    });
  }
  console.log('✓ Financial Years seeded');

  // 2. Funding Sources (HMDA and PD)
  const fundingSources = [
    { code: 'HMDA', name: 'Hyderabad Metropolitan Development Authority', description: 'Budget releases and sanctions received from HMDA for disaster and infrastructure projects.' },
    { code: 'PD', name: 'Personal Deposit Account', description: 'Personal Deposit Account allocation managed under Government Treasury rules.' },
  ];
  for (const fs of fundingSources) {
    await prisma.fundingSource.upsert({
      where: { code: fs.code },
      update: {},
      create: fs,
    });
  }
  console.log('✓ Funding Sources seeded (HMDA & PD)');

  // 3. Wings (MTO, Admin, Legal, DTC – Falhallaguda, IT&C, PS HYDRAA)
  const wings = [
    { code: 'MTO', name: 'Motor Transport Office (MTO)', headPerson: 'Superintendent MTO' },
    { code: 'ADMIN', name: 'Administration Wing', headPerson: 'Joint Director Admin' },
    { code: 'LEGAL', name: 'Legal Wing', headPerson: 'Chief Legal Officer' },
    { code: 'DTC_FALHALLAGUDA', name: 'Disaster Training Center (DTC) – Falhallaguda', headPerson: 'Director DTC' },
    { code: 'ITC', name: 'Information Technology & Communications (IT&C)', headPerson: 'Head IT&C' },
    { code: 'PS_HYDRAA', name: 'PS to Commissioner HYDRAA', headPerson: 'Private Secretary' },
  ];
  for (const w of wings) {
    await prisma.wing.upsert({
      where: { code: w.code },
      update: {},
      create: w,
    });
  }
  console.log('✓ HYDRAA Wings seeded');

  // 4. Budget Heads (10 Mandatory Initial Heads + configurable categories)
  const budgetHeads = [
    { code: 'HIRING', name: 'Hiring Charges', category: 'Operational' },
    { code: 'DEMOLITION', name: 'Demolition Activities', category: 'Enforcement' },
    { code: 'POL_REPAIRS', name: 'POL / Vehicle Repairs', category: 'Fleet Maintenance' },
    { code: 'DTC_TRAINING', name: 'DTC Training & Drills', category: 'Capacity Building' },
    { code: 'FENCING', name: 'Fencing & Lake Protection', category: 'Asset Protection' },
    { code: 'STATIONERY', name: 'Stationery & Printing', category: 'Administration' },
    { code: 'DIET', name: 'Diet & Operational Refreshments', category: 'Operational' },
    { code: 'CIVIL_WORKS', name: 'Civil Works & Restorations', category: 'Infrastructure' },
    { code: 'COMPUTER_PERIPHERALS', name: 'Computer / Peripherals / IT Hardware', category: 'Technology' },
    { code: 'TG_TS_HONORARIUM', name: 'TG / TS / Honorarium', category: 'Personnel & Allowances' },
    { code: 'GREEN_WASTE_MGMT', name: 'Green Waste Management', category: 'Environment' },
    { code: 'VEHICLE_PROCUREMENT', name: 'Vehicle Procurement', category: 'Capital Expenditure' },
    { code: 'OFFICE_INFRASTRUCTURE', name: 'Office Infrastructure', category: 'Capital Expenditure' },
  ];
  for (const bh of budgetHeads) {
    await prisma.budgetHead.upsert({
      where: { code: bh.code },
      update: {},
      create: bh,
    });
  }
  console.log('✓ Budget Heads seeded');

  // 5. Default Users & Roles
  // Password for initial accounts: HydraaTreasury@2026
  const passwordHash = await bcrypt.hash('HydraaTreasury@2026', 10);

  const initialUsers = [
    {
      username: 'superadmin',
      email: 'superadmin@hydraa.telangana.gov.in',
      fullName: 'HYDRAA Super Administrator',
      designation: 'Director of Treasury & Accounts',
      role: UserRole.SUPER_ADMIN,
    },
    {
      username: 'treasury.admin',
      email: 'treasury.admin@hydraa.telangana.gov.in',
      fullName: 'Sri R. Venkatesh',
      designation: 'Senior Treasury Officer (STO)',
      role: UserRole.TREASURY_ADMIN,
    },
    {
      username: 'dataentry.officer',
      email: 'dataentry@hydraa.telangana.gov.in',
      fullName: 'K. Sridevi',
      designation: 'Treasury Data Entry Officer',
      role: UserRole.TREASURY_DATA_ENTRY,
    },
    {
      username: 'treasury.supervisor',
      email: 'supervisor@hydraa.telangana.gov.in',
      fullName: 'M. Anand Rao',
      designation: 'Treasury Supervisor / Reviewer',
      role: UserRole.TREASURY_SUPERVISOR,
    },
    {
      username: 'auditor',
      email: 'auditor@hydraa.telangana.gov.in',
      fullName: 'State Audit Examiner',
      designation: 'Government Audit Officer',
      role: UserRole.AUDITOR_READ_ONLY,
    },
  ];

  for (const u of initialUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { role: u.role },
      create: {
        ...u,
        passwordHash,
      },
    });
  }
  console.log('✓ Initial Treasury Officers seeded (SuperAdmin, TreasuryAdmin, DataEntry, Supervisor, Auditor)');

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


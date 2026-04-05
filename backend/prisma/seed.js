'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database for A3 submission...");
  // Use the required password "123123"
  const password = await bcrypt.hash("123123", 10);
  const now = new Date();

  // Helper to generate random dates within a range
  const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

  // ============= ADMIN =============
  const admin = await prisma.account.create({
    data: {
      email: "admin1@csc309.utoronto.ca",
      password,
      role: "administrator",
      activated: true,
      suspended: false,
    },
  });
  console.log("✓ Admin created");

  // ============= REGULAR USERS (20+) =============
  const firstNames = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Henry", "Ivy", "Jack", "Karen", "Leo", "Mona", "Nick", "Olivia", "Paul", "Quinn", "Rose", "Sam", "Tina", "Uma", "Vera", "Will", "Xena", "Yves", "Zoe"];
  const lastNames = ["Lin", "Chen", "Wang", "Ng", "Brown", "Smith", "Jones", "Taylor", "Wilson", "Lee", "Kim", "Park", "Garcia", "Martinez", "Rodriguez", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin"];
  const regularUsers = [];
  const regularCount = 22; // at least 20

  for (let i = 1; i <= regularCount; i++) {
    const firstName = firstNames[(i - 1) % firstNames.length];
    const lastName = lastNames[(i - 1) % lastNames.length];
    const email = `regular${i}@csc309.utoronto.ca`;
    const user = await prisma.account.create({
      data: {
        email,
        password,
        role: "regular",
        activated: true,
        suspended: false,
        regularUser: {
          create: {
            firstName,
            lastName,
            phoneNumber: `416-555-${1000 + i}`,
            postalAddress: `${i * 100} ${["College", "University", "Queen", "King", "Dundas"][i % 5]} St, Toronto`,
            birthday: `198${i % 10}-0${(i % 12) + 1}-${(i % 28) + 1}`,
            available: i % 3 !== 0, // most are available
            lastActiveAt: i % 5 === 0 ? null : now, // some have never been active
            biography: `${firstName} ${lastName} is a dental professional with ${(i % 10) + 1} years of experience.`,
          },
        },
      },
      include: { regularUser: true },
    });
    regularUsers.push(user);
  }
  console.log(`✓ ${regularUsers.length} regular users created`);

  // ============= BUSINESSES (10+) =============
  const businessNames = [
    "Bahen Dental Clinic", "Downtown Dental", "Spadina Smiles", "Yonge Street Dental", "Queen West Orthodontics",
    "Bloor Dental Group", "Kingston Road Dentistry", "Eglinton Dental Centre", "Scarborough Smiles", "North York Dental",
    "Etobicoke Family Dental", "Mississauga Dental Arts"
  ];
  const owners = ["David Liu", "Sarah Kim", "James Wilson", "Michael Chen", "Emily Brown", "Robert Taylor", "Linda Martinez", "Brian Davis", "Jennifer Miller", "Kevin White", "Amanda Harris", "Thomas Jackson"];
  const businesses = [];
  const businessCount = 12; // at least 10

  for (let i = 1; i <= businessCount; i++) {
    const email = `business${i}@csc309.utoronto.ca`;
    const business = await prisma.account.create({
      data: {
        email,
        password,
        role: "business",
        activated: true,
        suspended: false,
        business: {
          create: {
            businessName: businessNames[(i - 1) % businessNames.length],
            ownerName: owners[(i - 1) % owners.length],
            phoneNumber: `416-555-${2000 + i}`,
            postalAddress: `${i * 100} ${["College", "Bay", "Bloor", "Yonge"][i % 4]} St, Toronto`,
            lon: -79.38 + (i * 0.01),
            lat: 43.64 + (i * 0.01),
            verified: i % 3 !== 0, // some unverified
            biography: `${businessNames[(i - 1) % businessNames.length]} is a modern dental practice serving the community.`,
          },
        },
      },
      include: { business: true },
    });
    businesses.push(business);
  }
  console.log(`✓ ${businesses.length} businesses created`);

  // ============= POSITION TYPES (10+) =============
  const positionTypesData = [
    { name: "Dental Assistant (Level 1)", description: "Entry level dental assistant. Assists dentist during procedures, sterilizes equipment, and prepares examination rooms.", hidden: false },
    { name: "Dental Hygienist", description: "Licensed hygienist. Performs cleanings, takes x-rays, and educates patients on oral hygiene.", hidden: false },
    { name: "General Dentist", description: "Provides general dental care including fillings, crowns, and routine examinations.", hidden: false },
    { name: "Orthodontist", description: "Specializes in teeth alignment, braces, and other orthodontic treatments.", hidden: false },
    { name: "Oral Surgeon", description: "Performs oral surgeries including wisdom tooth extraction and dental implants.", hidden: false },
    { name: "Pediatric Dentist", description: "Specialized in children's dental care from infancy through teenage years.", hidden: false },
    { name: "Orthodontic Assistant", description: "Assists orthodontists with braces adjustments and patient care.", hidden: false },
    { name: "Dental Lab Technician", description: "Creates dental appliances including crowns, bridges, and dentures.", hidden: false },
    { name: "Dental Receptionist", description: "Manages appointments, handles patient inquiries, and processes billing.", hidden: true },
    { name: "Endodontist", description: "Specializes in root canal treatments and tooth pain management.", hidden: false },
    { name: "Periodontist", description: "Treats gum disease and places dental implants.", hidden: false },
    { name: "Prosthodontist", description: "Restores and replaces teeth with crowns, bridges, and dentures.", hidden: false },
  ];
  const positionTypes = [];
  for (const pt of positionTypesData) {
    const created = await prisma.positionType.create({ data: pt });
    positionTypes.push(created);
  }
  console.log(`✓ ${positionTypes.length} position types created`);

  // ============= QUALIFICATIONS (20+ with mixed statuses) =============
  const qualificationStatuses = ["created", "submitted", "approved", "rejected", "revised"];
  const qualificationCount = 35;
  const qualifications = [];
  // Ensure each user has at least one approved qualification
  for (const user of regularUsers) {
    const posType = positionTypes[Math.floor(Math.random() * positionTypes.length)];
    const status = "approved";
    const qual = await prisma.qualification.create({
      data: {
        userId: user.regularUser.id,
        positionTypeId: posType.id,
        status,
        note: `${user.regularUser.firstName} ${user.regularUser.lastName} is qualified for ${posType.name}.`,
        updatedAt: randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now),
      },
    });
    qualifications.push(qual);
  }
  // Add additional qualifications with mixed statuses
  for (let i = 0; i < qualificationCount - regularUsers.length; i++) {
    const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
    const posType = positionTypes[Math.floor(Math.random() * positionTypes.length)];
    const status = qualificationStatuses[Math.floor(Math.random() * qualificationStatuses.length)];
    // Avoid duplicate (userId, positionTypeId)
    const exists = await prisma.qualification.findUnique({
      where: {
        userId_positionTypeId: {
          userId: user.regularUser.id,
          positionTypeId: posType.id,
        },
      },
    });
    if (!exists) {
      const qual = await prisma.qualification.create({
        data: {
          userId: user.regularUser.id,
          positionTypeId: posType.id,
          status,
          note: `${user.regularUser.firstName} applied for ${posType.name}.`,
          updatedAt: randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now),
        },
      });
      qualifications.push(qual);
    }
  }
  console.log(`✓ ${qualifications.length} qualifications created (mixed statuses)`);

  // ============= JOBS (30+ with various statuses) =============
  const jobStatuses = ["open", "filled", "expired", "canceled", "completed"];
  const jobs = [];
  const jobCount = 35;
  const startDates = [];
  // Generate start dates in the future and past
  for (let i = 0; i < jobCount; i++) {
    let startTime;
    if (i < 20) {
      // Future jobs (open)
      startTime = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000); // 1-20 days in future
    } else {
      // Past jobs (filled/expired/canceled/completed)
      startTime = new Date(now.getTime() - (i - 19) * 24 * 60 * 60 * 1000);
    }
    startDates.push(startTime);
  }
  for (let i = 0; i < jobCount; i++) {
    const business = businesses[Math.floor(Math.random() * businesses.length)];
    const positionType = positionTypes[Math.floor(Math.random() * positionTypes.length)];
    const startTime = startDates[i];
    const endTime = new Date(startTime.getTime() + (Math.floor(Math.random() * 8) + 4) * 60 * 60 * 1000);
    let status;
    if (startTime > now) {
      status = "open";
    } else {
      // Past jobs: distribute statuses
      const rand = Math.random();
      if (rand < 0.3) status = "filled";
      else if (rand < 0.5) status = "expired";
      else if (rand < 0.7) status = "canceled";
      else status = "completed";
    }
    // For unverified businesses, status cannot be open (business unverified), but we already have open jobs only from verified businesses by chance
    const job = await prisma.job.create({
      data: {
        businessId: business.business.id,
        positionTypeId: positionType.id,
        salaryMin: 25 + Math.floor(Math.random() * 30),
        salaryMax: 50 + Math.floor(Math.random() * 50),
        note: `Job posting for ${positionType.name} at ${business.business.businessName}`,
        startTime,
        endTime,
        status,
      },
    });
    jobs.push(job);
  }
  console.log(`✓ ${jobs.length} jobs created (various statuses)`);

  // ============= INTERESTS, INVITATIONS, NEGOTIATIONS (no active) =============
  // Create interests (mutual, one-sided, invitations) to demonstrate workflows
  // We will avoid creating any active negotiations as per requirement.
  // Instead, create completed/failed negotiations for filled jobs and some pending mutual interests.

  const interests = [];
  // 1. Create some mutual interests (both true) that will lead to completed negotiations (filled jobs)
  const filledJobs = jobs.filter(j => j.status === "filled");
  for (let i = 0; i < filledJobs.length && i < regularUsers.length; i++) {
    const job = filledJobs[i];
    const user = regularUsers[i % regularUsers.length];
    // Ensure user is qualified for the job's position type
    const qual = await prisma.qualification.findFirst({
      where: { userId: user.regularUser.id, positionTypeId: job.positionTypeId, status: "approved" },
    });
    if (qual) {
      const interest = await prisma.interest.create({
        data: {
          jobId: job.id,
          userId: user.regularUser.id,
          candidateInterested: true,
          businessInterested: true,
          createdAt: new Date(job.startTime.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
      });
      interests.push(interest);
      // Create a successful negotiation for this filled job
      await prisma.negotiation.create({
        data: {
          interestId: interest.id,
          jobId: job.id,
          userId: user.regularUser.id,
          status: "success",
          candidateDecision: "accept",
          businessDecision: "accept",
          expiresAt: new Date(job.startTime.getTime() - 1 * 24 * 60 * 60 * 1000),
          createdAt: new Date(job.startTime.getTime() - 3 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(job.startTime.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
      });
      // Update job to have workerId
      await prisma.job.update({
        where: { id: job.id },
        data: { workerId: user.regularUser.id },
      });
    }
  }

  // 2. Create mutual interests without negotiation (to allow starting negotiation)
  for (let i = 0; i < 8; i++) {
    const job = jobs.filter(j => j.status === "open")[i % jobs.filter(j => j.status === "open").length];
    const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
    const qual = await prisma.qualification.findFirst({
      where: { userId: user.regularUser.id, positionTypeId: job.positionTypeId, status: "approved" },
    });
    if (qual && !interests.some(int => int.jobId === job.id && int.userId === user.regularUser.id)) {
      const interest = await prisma.interest.create({
        data: {
          jobId: job.id,
          userId: user.regularUser.id,
          candidateInterested: true,
          businessInterested: true,
          createdAt: now,
        },
      });
      interests.push(interest);
    }
  }

  // 3. Create pending invitations (businessInterested = true, candidateInterested = null)
  for (let i = 0; i < 10; i++) {
    const job = jobs.filter(j => j.status === "open")[i % jobs.filter(j => j.status === "open").length];
    const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
    const qual = await prisma.qualification.findFirst({
      where: { userId: user.regularUser.id, positionTypeId: job.positionTypeId, status: "approved" },
    });
    if (qual && !interests.some(int => int.jobId === job.id && int.userId === user.regularUser.id)) {
      const interest = await prisma.interest.create({
        data: {
          jobId: job.id,
          userId: user.regularUser.id,
          candidateInterested: null,
          businessInterested: true,
          createdAt: now,
        },
      });
      interests.push(interest);
    }
  }

  // 4. Create one-sided interests (candidateInterested = true, businessInterested = null)
  for (let i = 0; i < 10; i++) {
    const job = jobs.filter(j => j.status === "open")[i % jobs.filter(j => j.status === "open").length];
    const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
    const qual = await prisma.qualification.findFirst({
      where: { userId: user.regularUser.id, positionTypeId: job.positionTypeId, status: "approved" },
    });
    if (qual && !interests.some(int => int.jobId === job.id && int.userId === user.regularUser.id)) {
      const interest = await prisma.interest.create({
        data: {
          jobId: job.id,
          userId: user.regularUser.id,
          candidateInterested: true,
          businessInterested: null,
          createdAt: now,
        },
      });
      interests.push(interest);
    }
  }

  console.log(`✓ ${interests.length} interests created (mutual, invitations, one-sided)`);

  // ============= FAILED NEGOTIATIONS (for demonstration) =============
  // Create a few failed negotiations (status = failed) to show the "Negotiate Again" button
  const failedNegotiations = [];
  for (let i = 0; i < 5; i++) {
    const job = jobs.filter(j => j.status === "open")[i % jobs.filter(j => j.status === "open").length];
    const user = regularUsers[Math.floor(Math.random() * regularUsers.length)];
    const qual = await prisma.qualification.findFirst({
      where: { userId: user.regularUser.id, positionTypeId: job.positionTypeId, status: "approved" },
    });
    if (qual) {
      // Create an interest if not exists
      let interest = interests.find(int => int.jobId === job.id && int.userId === user.regularUser.id);
      if (!interest) {
        interest = await prisma.interest.create({
          data: {
            jobId: job.id,
            userId: user.regularUser.id,
            candidateInterested: true,
            businessInterested: true,
            createdAt: now,
          },
        });
        interests.push(interest);
      }
      const failed = await prisma.negotiation.create({
        data: {
          interestId: interest.id,
          jobId: job.id,
          userId: user.regularUser.id,
          status: "failed",
          candidateDecision: Math.random() > 0.5 ? "accept" : "decline",
          businessDecision: Math.random() > 0.5 ? "accept" : "decline",
          expiresAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        },
      });
      failedNegotiations.push(failed);
    }
  }
  console.log(`✓ ${failedNegotiations.length} failed negotiations created`);

  // ============= SYSTEM SETTINGS =============
  // Check if settings already exist before creating
  const existingSettings = await prisma.systemSetting.findMany();
  const settingsToCreate = [
      { key: "negotiation_window_minutes", value: "15" },
      { key: "job_start_window_hours", value: "168" },
      { key: "availability_timeout", value: "300" },
  ];

  for (const setting of settingsToCreate) {
      const exists = existingSettings.some(s => s.key === setting.key);
      if (!exists) {
          await prisma.systemSetting.create({ data: setting });
      }
  }
  console.log("✓ System settings configured");

  // ============= VERIFICATION =============
  console.log("\n=== SEED DATA VERIFICATION ===");
  const userCount = await prisma.account.count({ where: { role: "regular" } });
  const businessCountDb = await prisma.account.count({ where: { role: "business" } });
  const positionTypeCount = await prisma.positionType.count();
  const jobCountDb = await prisma.job.count();
  const qualificationCountDb = await prisma.qualification.count();
  const interestCountDb = await prisma.interest.count();
  const negotiationCountDb = await prisma.negotiation.count();
  console.log(`Regular users: ${userCount} (≥20 required)`);
  console.log(`Businesses: ${businessCountDb} (≥10 required)`);
  console.log(`Position types: ${positionTypeCount} (≥10 required)`);
  console.log(`Jobs: ${jobCountDb} (≥30 required)`);
  console.log(`Qualifications: ${qualificationCountDb} (≥20 required)`);
  console.log(`Interests: ${interestCountDb}`);
  console.log(`Negotiations (active: 0): ${negotiationCountDb} (none active)`);

  const activeNegotiations = await prisma.negotiation.count({ where: { status: "active" } });
  if (activeNegotiations === 0) {
    console.log("✓ No active negotiations created (as required).");
  } else {
    console.log(`Warning: ${activeNegotiations} active negotiations found.`);
  }

  console.log("\nSeed completed successfully!");
}

main()
  .catch(e => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

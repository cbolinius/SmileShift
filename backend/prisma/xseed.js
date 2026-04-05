'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with comprehensive test data...");
  const password = await bcrypt.hash("Password1!", 10);
  const now = new Date();

  // ============= ADMIN =============
  const admin = await prisma.account.create({
    data: {
      email: "admin@test.com",
      password,
      role: "administrator",
      activated: true,
      suspended: false
    }
  });
  console.log("✓ Admin created");

  // ============= REGULAR USERS =============
  // All users have lastActiveAt set to now to ensure they're within inactivity window

  const alice = await prisma.account.create({
    data: {
      email: "alice@test.com",
      password,
      role: "regular",
      activated: true,
      suspended: false,
      regularUser: {
        create: {
          firstName: "Alice",
          lastName: "Lin",
          phoneNumber: "416-555-0101",
          postalAddress: "123 College St, Toronto",
          birthday: "1995-05-15",
          available: true,
          lastActiveAt: now,
          biography: "Experienced dental assistant with 3 years experience"
        }
      }
    },
    include: { regularUser: true }
  });

  const bob = await prisma.account.create({
    data: {
      email: "bob@test.com",
      password,
      role: "regular",
      activated: true,
      suspended: false,
      regularUser: {
        create: {
          firstName: "Bob",
          lastName: "Chen",
          phoneNumber: "416-555-0102",
          postalAddress: "456 University Ave, Toronto",
          birthday: "1992-08-22",
          available: true,
          lastActiveAt: now,
          biography: "Registered dental hygienist"
        }
      }
    },
    include: { regularUser: true }
  });

  const carol = await prisma.account.create({
    data: {
      email: "carol@test.com",
      password,
      role: "regular",
      activated: true,
      suspended: false,
      regularUser: {
        create: {
          firstName: "Carol",
          lastName: "Wang",
          phoneNumber: "416-555-0103",
          postalAddress: "789 Queen St W, Toronto",
          birthday: "1993-11-30",
          available: true,
          lastActiveAt: now,
          biography: "General dentist looking for part-time work"
        }
      }
    },
    include: { regularUser: true }
  });

  const dave = await prisma.account.create({
    data: {
      email: "dave@test.com",
      password,
      role: "regular",
      activated: true,
      suspended: false,
      regularUser: {
        create: {
          firstName: "Dave",
          lastName: "Ng",
          phoneNumber: "416-555-0104",
          postalAddress: "321 King St E, Toronto",
          birthday: "1990-03-18",
          available: true,
          lastActiveAt: now,
          biography: "Oral surgeon specialist"
        }
      }
    },
    include: { regularUser: true }
  });

  const charlie = await prisma.account.create({
    data: {
      email: "charlie@test.com",
      password,
      role: "regular",
      activated: true,
      suspended: false,
      regularUser: {
        create: {
          firstName: "Charlie",
          lastName: "Brown",
          phoneNumber: "416-555-0105",
          postalAddress: "654 Yonge St, Toronto",
          birthday: "1994-07-12",
          available: true,
          lastActiveAt: now,
          biography: "Pediatric dentistry specialist"
        }
      }
    },
    include: { regularUser: true }
  });

  const dana = await prisma.account.create({
    data: {
      email: "dana@test.com",
      password,
      role: "regular",
      activated: true,
      suspended: false,
      regularUser: {
        create: {
          firstName: "Dana",
          lastName: "O'Neil",
          phoneNumber: "416-555-0106",
          postalAddress: "987 Bay St, Toronto",
          birthday: "1991-12-03",
          available: true,
          lastActiveAt: now,
          biography: "Lab technician with 5 years experience"
        }
      }
    },
    include: { regularUser: true }
  });

  const eve = await prisma.account.create({
    data: {
      email: "eve@test.com",
      password,
      role: "regular",
      activated: true,
      suspended: false,
      regularUser: {
        create: {
          firstName: "Eve",
          lastName: "Smith",
          phoneNumber: "416-555-0107",
          postalAddress: "147 Spadina Ave, Toronto",
          birthday: "1996-09-25",
          available: true,
          lastActiveAt: now,
          biography: "Orthodontic assistant"
        }
      }
    },
    include: { regularUser: true }
  });

  const frank = await prisma.account.create({
    data: {
      email: "frank@test.com",
      password,
      role: "regular",
      activated: true,
      suspended: false,
      regularUser: {
        create: {
          firstName: "Frank",
          lastName: "Wong",
          phoneNumber: "416-555-0108",
          postalAddress: "258 Dundas St, Toronto",
          birthday: "1989-04-07",
          available: true,
          lastActiveAt: now,
          biography: "Experienced dental assistant"
        }
      }
    },
    include: { regularUser: true }
  });

  console.log("✓ 8 regular users created");

  // ============= BUSINESSES =============
  const bahen = await prisma.account.create({
    data: {
      email: "bahen@test.com",
      password,
      role: "business",
      activated: true,
      suspended: false,
      business: {
        create: {
          businessName: "Bahen Dental Clinic",
          ownerName: "David Liu",
          phoneNumber: "416-978-2011",
          postalAddress: "40 St George St, Toronto",
          lon: -79.3998729,
          lat: 43.6598084,
          verified: true,
          biography: "Modern dental clinic in downtown Toronto"
        }
      }
    },
    include: { business: true }
  });

  const clinic = await prisma.account.create({
    data: {
      email: "clinic@test.com",
      password,
      role: "business",
      activated: true,
      suspended: false,
      business: {
        create: {
          businessName: "Downtown Dental",
          ownerName: "Sarah Kim",
          phoneNumber: "416-555-0201",
          postalAddress: "123 King St, Toronto",
          lon: -79.38,
          lat: 43.65,
          verified: true,
          biography: "Family-friendly dental practice"
        }
      }
    },
    include: { business: true }
  });

  const spadina = await prisma.account.create({
    data: {
      email: "spadina@test.com",
      password,
      role: "business",
      activated: true,
      suspended: false,
      business: {
        create: {
          businessName: "Spadina Smiles",
          ownerName: "James Wilson",
          phoneNumber: "416-555-0202",
          postalAddress: "500 Spadina Ave, Toronto",
          lon: -79.4001,
          lat: 43.656,
          verified: true,
          biography: "Specializing in cosmetic dentistry"
        }
      }
    },
    include: { business: true }
  });

  const yonge = await prisma.account.create({
    data: {
      email: "yonge@test.com",
      password,
      role: "business",
      activated: true,
      suspended: false,
      business: {
        create: {
          businessName: "Yonge Street Dental",
          ownerName: "Michael Chen",
          phoneNumber: "416-555-0203",
          postalAddress: "1000 Yonge St, Toronto",
          lon: -79.39,
          lat: 43.67,
          verified: false, // Unverified business for testing
          biography: "New clinic accepting patients"
        }
      }
    },
    include: { business: true }
  });

  console.log("✓ 4 businesses created");

  // ============= POSITION TYPES =============
  const assistant = await prisma.positionType.create({
    data: {
      name: "Dental Assistant (Level 1)",
      description: "Entry level dental assistant. Assists dentist during procedures, sterilizes equipment, and prepares examination rooms.",
      hidden: false
    }
  });

  const hygienist = await prisma.positionType.create({
    data: {
      name: "Dental Hygienist",
      description: "Licensed hygienist. Performs cleanings, takes x-rays, and educates patients on oral hygiene.",
      hidden: false
    }
  });

  const dentist = await prisma.positionType.create({
    data: {
      name: "General Dentist",
      description: "Provides general dental care including fillings, crowns, and routine examinations.",
      hidden: false
    }
  });

  const orthodontist = await prisma.positionType.create({
    data: {
      name: "Orthodontist",
      description: "Specializes in teeth alignment, braces, and other orthodontic treatments.",
      hidden: false
    }
  });

  const surgeon = await prisma.positionType.create({
    data: {
      name: "Oral Surgeon",
      description: "Performs oral surgeries including wisdom tooth extraction and dental implants.",
      hidden: false
    }
  });

  const pediatric = await prisma.positionType.create({
    data: {
      name: "Pediatric Dentist",
      description: "Specialized in children's dental care from infancy through teenage years.",
      hidden: false
    }
  });

  const orthodonticAsst = await prisma.positionType.create({
    data: {
      name: "Orthodontic Assistant",
      description: "Assists orthodontists with braces adjustments and patient care.",
      hidden: false
    }
  });

  const labTech = await prisma.positionType.create({
    data: {
      name: "Dental Lab Technician",
      description: "Creates dental appliances including crowns, bridges, and dentures.",
      hidden: false
    }
  });

  const receptionist = await prisma.positionType.create({
    data: {
      name: "Dental Receptionist",
      description: "Manages appointments, handles patient inquiries, and processes billing.",
      hidden: true // Hidden position type for testing
    }
  });

  console.log("✓ 9 position types created");

  // ============= QUALIFICATIONS =============
  // Ensure every user has at least one approved qualification
  await prisma.qualification.createMany({
    data: [
      // Alice - multiple qualifications
      { userId: alice.regularUser.id, positionTypeId: assistant.id, status: "approved", note: "Certified Dental Assistant Level 1", updatedAt: now },
      { userId: alice.regularUser.id, positionTypeId: orthodonticAsst.id, status: "approved", note: "Orthodontic assistant certified", updatedAt: now },
      { userId: alice.regularUser.id, positionTypeId: hygienist.id, status: "submitted", note: "Hygienist certification pending", updatedAt: now },
      { userId: alice.regularUser.id, positionTypeId: surgeon.id, status: "submitted", note: "Alice's surgeon certification", updatedAt: now },

      // Bob - multiple qualifications
      { userId: bob.regularUser.id, positionTypeId: hygienist.id, status: "approved", note: "Registered Dental Hygienist", updatedAt: now },
      { userId: bob.regularUser.id, positionTypeId: dentist.id, status: "approved", note: "General dentist license", updatedAt: now },
      { userId: bob.regularUser.id, positionTypeId: pediatric.id, status: "revised", note: "Bob's pediatric update", updatedAt: now },

      // Carol - multiple qualifications
      { userId: carol.regularUser.id, positionTypeId: dentist.id, status: "approved", note: "General practitioner", updatedAt: now },
      { userId: carol.regularUser.id, positionTypeId: pediatric.id, status: "approved", note: "Pediatric dentistry certified", updatedAt: now },
      { userId: carol.regularUser.id, positionTypeId: assistant.id, status: "revised", note: "Updated assistant certification", updatedAt: now },
      { userId: carol.regularUser.id, positionTypeId: orthodonticAsst.id, status: "submitted", note: "Carol's orthodontic assistant", updatedAt: now },

      // Dave - multiple qualifications
      { userId: dave.regularUser.id, positionTypeId: surgeon.id, status: "approved", note: "Oral surgery specialist", updatedAt: now },
      { userId: dave.regularUser.id, positionTypeId: dentist.id, status: "approved", note: "General dentistry", updatedAt: now },
      { userId: dave.regularUser.id, positionTypeId: labTech.id, status: "submitted", note: "Lab tech certification", updatedAt: now },
      { userId: dave.regularUser.id, positionTypeId: orthodontist.id, status: "submitted", note: "Orthodontist certification pending", updatedAt: now },
      { userId: dave.regularUser.id, positionTypeId: receptionist.id, status: "revised", note: "Dave's receptionist training", updatedAt: now },

      // Charlie - multiple qualifications
      { userId: charlie.regularUser.id, positionTypeId: pediatric.id, status: "approved", note: "Pediatric specialist", updatedAt: now },
      { userId: charlie.regularUser.id, positionTypeId: orthodontist.id, status: "submitted", note: "Orthodontics training", updatedAt: now },
      { userId: charlie.regularUser.id, positionTypeId: surgeon.id, status: "revised", note: "Updated surgeon credentials", updatedAt: now },

      // Dana - multiple qualifications
      { userId: dana.regularUser.id, positionTypeId: labTech.id, status: "approved", note: "Senior lab technician", updatedAt: now },
      { userId: dana.regularUser.id, positionTypeId: assistant.id, status: "approved", note: "Dental assistant", updatedAt: now },

      // Eve - multiple qualifications
      { userId: eve.regularUser.id, positionTypeId: orthodonticAsst.id, status: "approved", note: "Orthodontic assistant", updatedAt: now },
      { userId: eve.regularUser.id, positionTypeId: assistant.id, status: "approved", note: "Dental assistant", updatedAt: now },
      { userId: eve.regularUser.id, positionTypeId: receptionist.id, status: "submitted", note: "Front desk training", updatedAt: now },
      { userId: eve.regularUser.id, positionTypeId: pediatric.id, status: "submitted", note: "Pediatric dentistry training", updatedAt: now },
      { userId: eve.regularUser.id, positionTypeId: labTech.id, status: "submitted", note: "Eve's lab tech certification", updatedAt: now },

      // Frank - multiple qualifications
      { userId: frank.regularUser.id, positionTypeId: assistant.id, status: "approved", note: "Senior dental assistant", updatedAt: now },
      { userId: frank.regularUser.id, positionTypeId: hygienist.id, status: "revised", note: "Updated hygienist cert", updatedAt: now },
      { userId: frank.regularUser.id, positionTypeId: dentist.id, status: "revised", note: "Updated dentist license", updatedAt: now },
    ]
  });

  console.log("✓ Qualifications created (each user has approved qualifications)");

  // ============= JOBS =============
  // Create jobs on different days to avoid conflicts
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow

  const dayAfterTomorrow = new Date(now);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  dayAfterTomorrow.setHours(14, 0, 0, 0); // 2 PM day after tomorrow

  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  threeDaysLater.setHours(10, 0, 0, 0); // 10 AM in 3 days

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(13, 0, 0, 0); // 1 PM next week

  const job1 = await prisma.job.create({
    data: {
      businessId: bahen.business.id,
      positionTypeId: assistant.id,
      salaryMin: 28,
      salaryMax: 195,
      note: "Morning shift - Dental Assistant needed",
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000), // 4 hours later
      status: "open"
    }
  });

  const job2 = await prisma.job.create({
    data: {
      businessId: clinic.business.id,
      positionTypeId: hygienist.id,
      salaryMin: 45,
      salaryMax: 200,
      note: "Experienced hygienist for afternoon shift",
      startTime: dayAfterTomorrow,
      endTime: new Date(dayAfterTomorrow.getTime() + 6 * 60 * 60 * 1000), // 6 hours later
      status: "open"
    }
  });

  const job3 = await prisma.job.create({
    data: {
      businessId: spadina.business.id,
      positionTypeId: dentist.id,
      salaryMin: 80,
      salaryMax: 210,
      note: "General dentist for busy practice",
      startTime: threeDaysLater,
      endTime: new Date(threeDaysLater.getTime() + 8 * 60 * 60 * 1000), // 8 hours later
      status: "open"
    }
  });

  const job4 = await prisma.job.create({
    data: {
      businessId: bahen.business.id,
      positionTypeId: orthodonticAsst.id,
      salaryMin: 30,
      salaryMax: 250,
      note: "Orthodontic assistant needed",
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 5 * 60 * 60 * 1000), // 5 hours later
      status: "open"
    }
  });

  const job5 = await prisma.job.create({
    data: {
      businessId: yonge.business.id, // Unverified business
      positionTypeId: assistant.id,
      salaryMin: 25,
      salaryMax: 160,
      note: "Position at new clinic",
      startTime: threeDaysLater,
      endTime: new Date(threeDaysLater.getTime() + 4 * 60 * 60 * 1000),
      status: "open" // This job exists but business is unverified
    }
  });

  const uniqueJob = await prisma.job.create({
      data: {
          businessId: bahen.business.id,
          positionTypeId: assistant.id,
          salaryMin: 40,
          salaryMax: 900,  // Unique salary_max
          note: "Unique job for salary filter test",
          startTime: nextWeek,
          endTime: new Date(nextWeek.getTime() + 4 * 60 * 60 * 1000),
          status: "open"
      }
  });

  console.log("✓ 6 jobs created (non-conflicting schedules)");

  // ============= INTERESTS =============
  // Mutual interest between Alice and Bahen Dental for job1
  const interest1 = await prisma.interest.create({
    data: {
      jobId: job1.id,
      userId: alice.regularUser.id,
      candidateInterested: true,
      businessInterested: true,
      createdAt: now
    }
  });

  // Bob interested in job2 (business hasn't responded yet)
  const interest2 = await prisma.interest.create({
    data: {
      jobId: job2.id,
      userId: bob.regularUser.id,
      candidateInterested: true,
      businessInterested: null,
      createdAt: now
    }
  });

  // Business invited Carol for job2 (candidate hasn't responded)
  const interest3 = await prisma.interest.create({
    data: {
      jobId: job2.id,
      userId: carol.regularUser.id,
      candidateInterested: null,
      businessInterested: true,
      createdAt: now
    }
  });

  // Mutual interest between Dave and Spadina for job3
  const interest4 = await prisma.interest.create({
    data: {
      jobId: job3.id,
      userId: dave.regularUser.id,
      candidateInterested: true,
      businessInterested: true,
      createdAt: now
    }
  });

  // Eve interested in job4 (mutual with business)
  const interest5 = await prisma.interest.create({
    data: {
      jobId: job4.id,
      userId: eve.regularUser.id,
      candidateInterested: true,
      businessInterested: true,
      createdAt: now
    }
  });

  // Charlie interested in job3 (not mutual yet)
  const interest6 = await prisma.interest.create({
    data: {
      jobId: job3.id,
      userId: charlie.regularUser.id,
      candidateInterested: true,
      businessInterested: null,
      createdAt: now
    }
  });

  // Business Bahen invites Frank for job1
  const pendingInvitation1 = await prisma.interest.create({
    data: {
      jobId: job1.id,
      userId: frank.regularUser.id,
      candidateInterested: null,  // User hasn't responded yet
      businessInterested: true,    // Business expressed interest
      createdAt: now
    }
  });

  // Business Spadina invites Bob for job3
  const pendingInvitation2 = await prisma.interest.create({
    data: {
      jobId: job3.id,
      userId: bob.regularUser.id,
      candidateInterested: null,
      businessInterested: true,
      createdAt: now
    }
  });

  // Business Clinic invites Dana for job2
  const pendingInvitation3 = await prisma.interest.create({
    data: {
      jobId: job2.id,
      userId: dana.regularUser.id,
      candidateInterested: null,
      businessInterested: true,
      createdAt: now
    }
  });

  // Mutual interest between Charlie and Bahen for job4
  const mutualInterest1 = await prisma.interest.create({
    data: {
      jobId: job4.id,
      userId: charlie.regularUser.id,
      candidateInterested: true,   // Charlie expressed interest
      businessInterested: true,    // Bahen invited Charlie
      createdAt: now
    }
  });

  // Mutual interest between Eve and Clinic for job2
  const mutualInterest2 = await prisma.interest.create({
    data: {
      jobId: job2.id,
      userId: eve.regularUser.id,
      candidateInterested: true,   // Eve expressed interest
      businessInterested: true,    // Clinic invited Eve
      createdAt: now
    }
  });

  // Mutual interest between Carol and Spadina for job3
  const mutualInterest3 = await prisma.interest.create({
    data: {
      jobId: job3.id,
      userId: carol.regularUser.id,
      candidateInterested: true,   // Carol expressed interest
      businessInterested: true,    // Spadina invited Carol
      createdAt: now
    }
  });

  console.log("✓ Interests created");

  // ============= NEGOTIATIONS =============
  // Create an active negotiation for mutual interest (job1 + Alice)
  const negotiation1 = await prisma.negotiation.create({
    data: {
      interestId: interest1.id,
      jobId: job1.id,
      userId: alice.regularUser.id,
      status: "active",
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutes from now
      createdAt: now,
      updatedAt: now
    }
  });

  // Create an active negotiation for job3 + Dave
  const negotiation2 = await prisma.negotiation.create({
    data: {
      interestId: interest4.id,
      jobId: job3.id,
      userId: dave.regularUser.id,
      status: "active",
      expiresAt: new Date(now.getTime() + 12 * 60 * 1000), // 5 minutes from now
      createdAt: now,
      updatedAt: now
    }
  });

  console.log("✓ 3 active negotiations created");

  // ============= FILLED JOB (for no-show tests) =============
  // Create a job that's already filled (for no-show testing)
  const filledJobStart = new Date(now);
  filledJobStart.setHours(now.getHours() - 2); // Started 2 hours ago

  const filledJobEnd = new Date(now);
  filledJobEnd.setHours(now.getHours() + 6); // Ends 6 hours from now

  const filledJob = await prisma.job.create({
    data: {
      businessId: spadina.business.id,
      positionTypeId: hygienist.id,
      salaryMin: 50,
      salaryMax: 60,
      note: "Currently filled job for testing",
      startTime: filledJobStart,
      endTime: filledJobEnd,
      status: "filled",
      workerId: frank.regularUser.id // Frank is the worker
    }
  });

  // Create a successful negotiation for this filled job
  const filledInterest = await prisma.interest.create({
    data: {
      jobId: filledJob.id,
      userId: frank.regularUser.id,
      candidateInterested: true,
      businessInterested: true,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000) // 3 hours ago
    }
  });

  const filledNegotiation = await prisma.negotiation.create({
    data: {
      interestId: filledInterest.id,
      jobId: filledJob.id,
      userId: frank.regularUser.id,
      status: "success",
      candidateDecision: "accept",
      businessDecision: "accept",
      expiresAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Expired 2 hours ago
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    }
  });

  console.log("✓ 1 filled job created for no-show testing");

  // ============= SYSTEM SETTINGS =============
  await prisma.systemSetting.createMany({
    data: [
      { key: "negotiation_window_minutes", value: "15" },
      { key: "job_start_window_hours", value: "168" }, // 1 week
      { key: "availability_timeout", value: "300" } // 5 minutes
    ]
  });

  console.log("✓ System settings configured");

  // ============= VERIFICATION =============
  console.log("\n=== SEED DATA VERIFICATION ===");

  // Verify all users have approved qualifications
  const usersWithoutQuals = await prisma.regularUser.findMany({
    where: {
      qualifications: { none: { status: 'approved' } }
    },
    include: { account: true }
  });

  if (usersWithoutQuals.length > 0) {
    console.log(`Warning: ${usersWithoutQuals.length} users have no approved qualifications`);
    usersWithoutQuals.forEach(u => console.log(`  - ${u.account.email}`));
  } else {
    console.log("✓ All users have at least one approved qualification");
  }

  // Verify all active users have lastActiveAt
  const usersWithoutLastActive = await prisma.regularUser.findMany({
    where: {
      available: true,
      lastActiveAt: null
    }
  });

  if (usersWithoutLastActive.length > 0) {
    console.log(`Warning: ${usersWithoutLastActive.length} available users have no lastActiveAt`);
  } else {
    console.log("✓ All available users have lastActiveAt timestamp");
  }

  // Count jobs by status
  const jobCounts = await prisma.job.groupBy({
    by: ['status'],
    _count: true
  });
  console.log("Job counts by status:", jobCounts);

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
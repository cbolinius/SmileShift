-- CreateEnum
CREATE TYPE "Role" AS ENUM ('regular', 'business', 'administrator');

-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('created', 'submitted', 'approved', 'rejected', 'revised');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('open', 'filled', 'expired', 'canceled', 'completed');

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "utorid" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegularUser" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "postalAddress" TEXT,
    "birthday" TEXT NOT NULL DEFAULT '1970-01-01',
    "avatar" TEXT,
    "resume" TEXT,
    "biography" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveAt" TIMESTAMP(3),

    CONSTRAINT "RegularUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "postalAddress" TEXT NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "avatar" TEXT,
    "biography" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "positionTypeId" INTEGER NOT NULL,
    "status" "QualificationStatus" NOT NULL,
    "note" TEXT,
    "document" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "positionTypeId" INTEGER NOT NULL,
    "workerId" INTEGER,
    "status" "JobStatus" NOT NULL,
    "salaryMin" DOUBLE PRECISION NOT NULL,
    "salaryMax" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "candidateInterested" BOOLEAN,
    "businessInterested" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Negotiation" (
    "id" SERIAL NOT NULL,
    "interestId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "businessDecision" TEXT,
    "candidateDecision" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Negotiation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_utorid_key" ON "Account"("utorid");

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RegularUser_accountId_key" ON "RegularUser"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Business_accountId_key" ON "Business"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Qualification_userId_positionTypeId_key" ON "Qualification"("userId", "positionTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_jobId_userId_key" ON "Interest"("jobId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Negotiation_interestId_key" ON "Negotiation"("interestId");

-- CreateIndex
CREATE INDEX "Negotiation_jobId_idx" ON "Negotiation"("jobId");

-- CreateIndex
CREATE INDEX "Negotiation_userId_idx" ON "Negotiation"("userId");

-- AddForeignKey
ALTER TABLE "RegularUser" ADD CONSTRAINT "RegularUser_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_positionTypeId_fkey" FOREIGN KEY ("positionTypeId") REFERENCES "PositionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_positionTypeId_fkey" FOREIGN KEY ("positionTypeId") REFERENCES "PositionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "RegularUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

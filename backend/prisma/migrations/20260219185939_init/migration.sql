-- CreateTable
CREATE TABLE "Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utorid" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RegularUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "lastActiveAt" DATETIME,
    CONSTRAINT "RegularUser_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Business" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "postalAddress" TEXT NOT NULL,
    "lon" REAL NOT NULL,
    "lat" REAL NOT NULL,
    "avatar" TEXT,
    "biography" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Business_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PositionType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "positionTypeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "document" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Qualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Qualification_positionTypeId_fkey" FOREIGN KEY ("positionTypeId") REFERENCES "PositionType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "businessId" INTEGER NOT NULL,
    "positionTypeId" INTEGER NOT NULL,
    "workerId" INTEGER,
    "status" TEXT NOT NULL,
    "salaryMin" REAL NOT NULL,
    "salaryMax" REAL NOT NULL,
    "note" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Job_positionTypeId_fkey" FOREIGN KEY ("positionTypeId") REFERENCES "PositionType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "RegularUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "candidateInterested" BOOLEAN,
    "businessInterested" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Interest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Negotiation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "businessAccepted" BOOLEAN,
    "userAccepted" BOOLEAN,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Negotiation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE UNIQUE INDEX "Negotiation_jobId_key" ON "Negotiation"("jobId");

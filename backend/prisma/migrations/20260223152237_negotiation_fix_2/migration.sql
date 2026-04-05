/*
  Warnings:

  - You are about to drop the column `businessAccepted` on the `Negotiation` table. All the data in the column will be lost.
  - You are about to drop the column `userAccepted` on the `Negotiation` table. All the data in the column will be lost.
  - Added the required column `interestId` to the `Negotiation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Negotiation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Negotiation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "interestId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "businessDecision" TEXT,
    "candidateDecision" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Negotiation_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Negotiation" ("createdAt", "expiresAt", "id", "jobId", "userId") SELECT "createdAt", "expiresAt", "id", "jobId", "userId" FROM "Negotiation";
DROP TABLE "Negotiation";
ALTER TABLE "new_Negotiation" RENAME TO "Negotiation";
CREATE UNIQUE INDEX "Negotiation_interestId_key" ON "Negotiation"("interestId");
CREATE INDEX "Negotiation_jobId_idx" ON "Negotiation"("jobId");
CREATE INDEX "Negotiation_userId_idx" ON "Negotiation"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Create enums
CREATE TYPE "RelationshipType" AS ENUM ('MANAGER', 'PEER', 'DIRECT_REPORT', 'CROSS_FUNCTIONAL');
CREATE TYPE "CollaborationFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'RARELY');
CREATE TYPE "NominationStatus" AS ENUM ('REQUESTED', 'SUBMITTED');
CREATE TYPE "ChatRole" AS ENUM ('REVIEWER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "ReviewCycleStatus" AS ENUM ('REQUESTED', 'READY', 'FINALISED');
CREATE TYPE "CombinedReviewStatus" AS ENUM ('DRAFT', 'FINALISED');

-- Create Person table
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- Create ReviewCycle table
CREATE TABLE "ReviewCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "status" "ReviewCycleStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReviewCycle_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewCycle_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create Nomination table
CREATE TABLE "Nomination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "collaborationFrequency" "CollaborationFrequency" NOT NULL,
    "requestToken" TEXT NOT NULL UNIQUE,
    "status" "NominationStatus" NOT NULL DEFAULT 'REQUESTED',
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Nomination_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Nomination_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create ChatMessage table
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nominationId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "Nomination"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create ReviewStructured table
CREATE TABLE "ReviewStructured" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nominationId" TEXT NOT NULL UNIQUE,
    "model" TEXT,
    "json" JSONB NOT NULL,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewStructured_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "Nomination"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create CombinedReview table
CREATE TABLE "CombinedReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL UNIQUE,
    "step1PrimaryJson" JSONB,
    "step1OmittedJson" JSONB,
    "step2Json" JSONB,
    "step3Json" JSONB,
    "editedJson" JSONB,
    "status" "CombinedReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CombinedReview_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX "ReviewCycle_employeeId_idx" ON "ReviewCycle"("employeeId");
CREATE INDEX "ReviewCycle_managerId_idx" ON "ReviewCycle"("managerId");
CREATE INDEX "Nomination_cycleId_idx" ON "Nomination"("cycleId");
CREATE INDEX "Nomination_reviewerId_idx" ON "Nomination"("reviewerId");
CREATE INDEX "Nomination_requestToken_idx" ON "Nomination"("requestToken");
CREATE INDEX "ChatMessage_nominationId_idx" ON "ChatMessage"("nominationId");
CREATE INDEX "ReviewStructured_nominationId_idx" ON "ReviewStructured"("nominationId");
CREATE INDEX "CombinedReview_cycleId_idx" ON "CombinedReview"("cycleId");

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('MANAGER', 'PEER', 'DIRECT_REPORT', 'CROSS_FUNCTIONAL');

-- CreateEnum
CREATE TYPE "CollaborationFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'RARELY');

-- CreateEnum
CREATE TYPE "NominationStatus" AS ENUM ('REQUESTED', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('REVIEWER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReviewCycleStatus" AS ENUM ('REQUESTED', 'READY', 'FINALISED');

-- CreateEnum
CREATE TYPE "CombinedReviewStatus" AS ENUM ('DRAFT', 'FINALISED');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCycle" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "status" "ReviewCycleStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nomination" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "collaborationFrequency" "CollaborationFrequency" NOT NULL,
    "requestToken" TEXT NOT NULL,
    "status" "NominationStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "nominationId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewStructured" (
    "id" TEXT NOT NULL,
    "nominationId" TEXT NOT NULL,
    "model" TEXT,
    "json" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewStructured_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombinedReview" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "step1PrimaryJson" JSONB,
    "step1OmittedJson" JSONB,
    "step2Json" JSONB,
    "step3Json" JSONB,
    "editedJson" JSONB,
    "status" "CombinedReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CombinedReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Nomination_requestToken_key" ON "Nomination"("requestToken");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewStructured_nominationId_key" ON "ReviewStructured"("nominationId");

-- CreateIndex
CREATE UNIQUE INDEX "CombinedReview_cycleId_key" ON "CombinedReview"("cycleId");

-- AddForeignKey
ALTER TABLE "ReviewCycle" ADD CONSTRAINT "ReviewCycle_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCycle" ADD CONSTRAINT "ReviewCycle_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "Nomination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewStructured" ADD CONSTRAINT "ReviewStructured_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "Nomination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedReview" ADD CONSTRAINT "CombinedReview_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

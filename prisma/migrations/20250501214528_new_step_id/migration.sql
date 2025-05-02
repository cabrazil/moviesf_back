/*
  Warnings:

  - Made the column `stepId` on table `JourneyStep` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "JourneyStep" ALTER COLUMN "stepId" SET NOT NULL;

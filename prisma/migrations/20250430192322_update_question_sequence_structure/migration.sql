/*
  Warnings:

  - You are about to drop the column `basicSentimentId` on the `MovieClue` table. All the data in the column will be lost.
  - You are about to drop the column `questionSequence` on the `MovieClue` table. All the data in the column will be lost.
  - Added the required column `questionSequenceId` to the `MovieClue` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MovieClue" DROP CONSTRAINT "MovieClue_basicSentimentId_fkey";

-- DropIndex
DROP INDEX "MovieClue_basicSentimentId_idx";

-- AlterTable
ALTER TABLE "MovieClue" DROP COLUMN "basicSentimentId",
DROP COLUMN "questionSequence",
ADD COLUMN     "questionSequenceId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "MovieClue_questionSequenceId_idx" ON "MovieClue"("questionSequenceId");

-- AddForeignKey
ALTER TABLE "MovieClue" ADD CONSTRAINT "MovieClue_questionSequenceId_fkey" FOREIGN KEY ("questionSequenceId") REFERENCES "QuestionSequence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

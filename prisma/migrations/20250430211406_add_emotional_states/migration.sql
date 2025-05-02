/*
  Warnings:

  - You are about to drop the `BasicSentiment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MovieClue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Question` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuestionSequence` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MovieClue" DROP CONSTRAINT "MovieClue_movieId_fkey";

-- DropForeignKey
ALTER TABLE "MovieClue" DROP CONSTRAINT "MovieClue_questionSequenceId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_basicSentimentId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionSequence" DROP CONSTRAINT "QuestionSequence_basicSentimentId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionSequence" DROP CONSTRAINT "QuestionSequence_nextQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionSequence" DROP CONSTRAINT "QuestionSequence_questionId_fkey";

-- DropTable
DROP TABLE "BasicSentiment";

-- DropTable
DROP TABLE "MovieClue";

-- DropTable
DROP TABLE "Question";

-- DropTable
DROP TABLE "QuestionSequence";

-- CreateTable
CREATE TABLE "EmotionalState" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contextFlow" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmotionalState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieSuggestion" (
    "id" SERIAL NOT NULL,
    "movieId" TEXT NOT NULL,
    "emotionalStateId" INTEGER NOT NULL,
    "contextPath" TEXT[],
    "reason" TEXT NOT NULL,
    "relevance" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmotionalState_name_key" ON "EmotionalState"("name");

-- CreateIndex
CREATE INDEX "MovieSuggestion_movieId_idx" ON "MovieSuggestion"("movieId");

-- CreateIndex
CREATE INDEX "MovieSuggestion_emotionalStateId_idx" ON "MovieSuggestion"("emotionalStateId");

-- AddForeignKey
ALTER TABLE "MovieSuggestion" ADD CONSTRAINT "MovieSuggestion_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieSuggestion" ADD CONSTRAINT "MovieSuggestion_emotionalStateId_fkey" FOREIGN KEY ("emotionalStateId") REFERENCES "EmotionalState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

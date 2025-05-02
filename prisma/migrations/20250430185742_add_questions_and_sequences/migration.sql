-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSequence" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "basicSentimentId" INTEGER NOT NULL,
    "nextQuestionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionSequence_questionId_idx" ON "QuestionSequence"("questionId");

-- CreateIndex
CREATE INDEX "QuestionSequence_basicSentimentId_idx" ON "QuestionSequence"("basicSentimentId");

-- CreateIndex
CREATE INDEX "QuestionSequence_nextQuestionId_idx" ON "QuestionSequence"("nextQuestionId");

-- AddForeignKey
ALTER TABLE "QuestionSequence" ADD CONSTRAINT "QuestionSequence_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSequence" ADD CONSTRAINT "QuestionSequence_basicSentimentId_fkey" FOREIGN KEY ("basicSentimentId") REFERENCES "BasicSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSequence" ADD CONSTRAINT "QuestionSequence_nextQuestionId_fkey" FOREIGN KEY ("nextQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

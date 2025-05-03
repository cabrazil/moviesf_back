-- CreateTable
CREATE TABLE "JourneyFlow" (
    "id" SERIAL NOT NULL,
    "mainSentimentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyStepFlow" (
    "id" SERIAL NOT NULL,
    "journeyFlowId" INTEGER NOT NULL,
    "stepId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyStepFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyOptionFlow" (
    "id" SERIAL NOT NULL,
    "journeyStepFlowId" INTEGER NOT NULL,
    "optionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "nextStepId" TEXT,
    "isEndState" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyOptionFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieSuggestionFlow" (
    "id" SERIAL NOT NULL,
    "journeyOptionFlowId" INTEGER NOT NULL,
    "movieId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "relevance" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieSuggestionFlow_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MovieSuggestionFlow_journeyOptionFlowId_movieId_key" UNIQUE ("journeyOptionFlowId", "movieId")
);

-- CreateIndex
CREATE UNIQUE INDEX "JourneyFlow_mainSentimentId_key" ON "JourneyFlow"("mainSentimentId");

-- CreateIndex
CREATE INDEX "JourneyStepFlow_journeyFlowId_idx" ON "JourneyStepFlow"("journeyFlowId");

-- CreateIndex
CREATE INDEX "JourneyOptionFlow_journeyStepFlowId_idx" ON "JourneyOptionFlow"("journeyStepFlowId");

-- CreateIndex
CREATE INDEX "MovieSuggestionFlow_journeyOptionFlowId_idx" ON "MovieSuggestionFlow"("journeyOptionFlowId");

-- CreateIndex
CREATE INDEX "MovieSuggestionFlow_movieId_idx" ON "MovieSuggestionFlow"("movieId");

-- AddForeignKey
ALTER TABLE "JourneyFlow" ADD CONSTRAINT "JourneyFlow_mainSentimentId_fkey" FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyStepFlow" ADD CONSTRAINT "JourneyStepFlow_journeyFlowId_fkey" FOREIGN KEY ("journeyFlowId") REFERENCES "JourneyFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyOptionFlow" ADD CONSTRAINT "JourneyOptionFlow_journeyStepFlowId_fkey" FOREIGN KEY ("journeyStepFlowId") REFERENCES "JourneyStepFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieSuggestionFlow" ADD CONSTRAINT "MovieSuggestionFlow_journeyOptionFlowId_fkey" FOREIGN KEY ("journeyOptionFlowId") REFERENCES "JourneyOptionFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieSuggestionFlow" ADD CONSTRAINT "MovieSuggestionFlow_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

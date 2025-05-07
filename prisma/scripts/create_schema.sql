-- Criação das tabelas
CREATE TABLE IF NOT EXISTS "Movie" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT UNIQUE NOT NULL,
    "year" INTEGER,
    "director" TEXT,
    "genres" TEXT[],
    "streamingPlatforms" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "original_title" TEXT
);

CREATE TABLE IF NOT EXISTS "MainSentiment" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "SubSentiment" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT '{}',
    "mainSentimentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "EmotionalState" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mainSentimentId" INTEGER NOT NULL,
    FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "JourneyStep" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "emotionalStateId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stepId" TEXT NOT NULL,
    FOREIGN KEY ("emotionalStateId") REFERENCES "EmotionalState"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "JourneyOption" (
    "id" SERIAL PRIMARY KEY,
    "journeyStepId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "nextStepId" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("journeyStepId") REFERENCES "JourneyStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MovieSuggestion" (
    "id" SERIAL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "emotionalStateId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "relevance" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "journeyOptionId" INTEGER NOT NULL,
    FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("emotionalStateId") REFERENCES "EmotionalState"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("journeyOptionId") REFERENCES "JourneyOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MovieSentiment" (
    "movieId" TEXT NOT NULL,
    "mainSentimentId" INTEGER NOT NULL,
    "subSentimentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("movieId", "mainSentimentId", "subSentimentId"),
    FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("subSentimentId") REFERENCES "SubSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "JourneyFlow" (
    "id" SERIAL PRIMARY KEY,
    "mainSentimentId" INTEGER NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "JourneyStepFlow" (
    "id" SERIAL PRIMARY KEY,
    "journeyFlowId" INTEGER NOT NULL,
    "stepId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("journeyFlowId") REFERENCES "JourneyFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "JourneyOptionFlow" (
    "id" SERIAL PRIMARY KEY,
    "journeyStepFlowId" INTEGER NOT NULL,
    "optionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "nextStepId" TEXT,
    "isEndState" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("journeyStepFlowId") REFERENCES "JourneyStepFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MovieSuggestionFlow" (
    "id" SERIAL PRIMARY KEY,
    "journeyOptionFlowId" INTEGER NOT NULL,
    "movieId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "relevance" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("journeyOptionFlowId") REFERENCES "JourneyOptionFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "unique_movie_suggestion_flow" UNIQUE ("journeyOptionFlowId", "movieId")
);

-- Criação dos índices
CREATE INDEX IF NOT EXISTS "EmotionalState_mainSentimentId_idx" ON "EmotionalState"("mainSentimentId");
CREATE INDEX IF NOT EXISTS "JourneyStep_emotionalStateId_idx" ON "JourneyStep"("emotionalStateId");
CREATE INDEX IF NOT EXISTS "JourneyOption_journeyStepId_idx" ON "JourneyOption"("journeyStepId");
CREATE INDEX IF NOT EXISTS "MovieSuggestion_movieId_idx" ON "MovieSuggestion"("movieId");
CREATE INDEX IF NOT EXISTS "MovieSuggestion_emotionalStateId_idx" ON "MovieSuggestion"("emotionalStateId");
CREATE INDEX IF NOT EXISTS "MovieSuggestion_journeyOptionId_idx" ON "MovieSuggestion"("journeyOptionId");
CREATE INDEX IF NOT EXISTS "SubSentiment_mainSentimentId_idx" ON "SubSentiment"("mainSentimentId");
CREATE INDEX IF NOT EXISTS "MovieSentiment_mainSentimentId_idx" ON "MovieSentiment"("mainSentimentId");
CREATE INDEX IF NOT EXISTS "MovieSentiment_subSentimentId_idx" ON "MovieSentiment"("subSentimentId");
CREATE INDEX IF NOT EXISTS "JourneyStepFlow_journeyFlowId_idx" ON "JourneyStepFlow"("journeyFlowId");
CREATE INDEX IF NOT EXISTS "JourneyOptionFlow_journeyStepFlowId_idx" ON "JourneyOptionFlow"("journeyStepFlowId");
CREATE INDEX IF NOT EXISTS "MovieSuggestionFlow_journeyOptionFlowId_idx" ON "MovieSuggestionFlow"("journeyOptionFlowId");
CREATE INDEX IF NOT EXISTS "MovieSuggestionFlow_movieId_idx" ON "MovieSuggestionFlow"("movieId"); 
--- 1. Tabelas base (sem dependências)
CREATE TABLE "Movie" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) UNIQUE NOT NULL,
    year INTEGER,
    director VARCHAR(255),
    genres TEXT[],
    "streamingPlatforms" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    description TEXT,
    thumbnail TEXT,
    original_title TEXT,
    vote_average DECIMAL(3,1),
    vote_count INTEGER,
    certification VARCHAR(255),
    adult BOOLEAN DEFAULT false,
    keywords TEXT[]
);

CREATE TABLE "MainSentiment" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    keywords TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 2. Tabelas com dependências de primeiro nível
CREATE TABLE "SubSentiment" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    keywords TEXT[] DEFAULT '{}',
    "mainSentimentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"(id)
);
CREATE INDEX "SubSentiment_mainSentimentId_idx" ON "SubSentiment"("mainSentimentId");

CREATE TABLE "MovieSentiment" (
    "movieId" UUID NOT NULL,
    "mainSentimentId" INTEGER NOT NULL,
    "subSentimentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("movieId", "mainSentimentId", "subSentimentId"),
    FOREIGN KEY ("movieId") REFERENCES "Movie"(id),
    FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"(id),
    FOREIGN KEY ("subSentimentId") REFERENCES "SubSentiment"(id)
);
CREATE INDEX "MovieSentiment_mainSentimentId_idx" ON "MovieSentiment"("mainSentimentId");
CREATE INDEX "MovieSentiment_subSentimentId_idx" ON "MovieSentiment"("subSentimentId");

CREATE TABLE "JourneyFlow" (
    id SERIAL PRIMARY KEY,
    "mainSentimentId" INTEGER UNIQUE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"(id)
);

-- 3. Tabelas com dependências de segundo nível
CREATE TABLE "JourneyStepFlow" (
    id SERIAL PRIMARY KEY,
    "journeyFlowId" INTEGER NOT NULL,
    "stepId" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    question TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("journeyFlowId") REFERENCES "JourneyFlow"(id)
);
CREATE INDEX "JourneyStepFlow_journeyFlowId_idx" ON "JourneyStepFlow"("journeyFlowId");

CREATE TABLE "JourneyOptionFlow" (
    id SERIAL PRIMARY KEY,
    "journeyStepFlowId" INTEGER NOT NULL,
    "optionId" VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    "nextStepId" VARCHAR(255),
    "isEndState" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("journeyStepFlowId") REFERENCES "JourneyStepFlow"(id)
);
CREATE INDEX "JourneyOptionFlow_journeyStepFlowId_idx" ON "JourneyOptionFlow"("journeyStepFlowId");

-- 4. Tabelas com dependências de terceiro nível
CREATE TABLE "MovieSuggestionFlow" (
    id SERIAL PRIMARY KEY,
    "journeyOptionFlowId" INTEGER NOT NULL,
    "movieId" UUID NOT NULL,
    reason TEXT NOT NULL,
    relevance INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("journeyOptionFlowId") REFERENCES "JourneyOptionFlow"(id),
    FOREIGN KEY ("movieId") REFERENCES "Movie"(id)
);
CREATE INDEX "movie_suggestion_flows_journeyOptionFlowId_idx" ON "MovieSuggestionFlow"("journeyOptionFlowId");
CREATE INDEX "movie_suggestion_flows_movieId_idx" ON "MovieSuggestionFlow"("movieId");
-- CreateEnum
CREATE TYPE "IntentionType" AS ENUM ('PROCESS', 'TRANSFORM', 'MAINTAIN', 'EXPLORE');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('INCLUDED_WITH_SUBSCRIPTION', 'RENTAL', 'PURCHASE', 'FREE_WITH_ADS', 'OTHER', 'HYBRID_OR_UNKNOWN');

-- CreateEnum
CREATE TYPE "PlatformCategory" AS ENUM ('SUBSCRIPTION_PRIMARY', 'RENTAL_PURCHASE_PRIMARY', 'FREE_PRIMARY', 'HYBRID');

-- CreateEnum
CREATE TYPE "ShowFilterType" AS ENUM ('PRIORITY', 'SECONDARY', 'HIDDEN');

-- CreateTable
CREATE TABLE "Movie" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "year" INTEGER,
    "director" VARCHAR(255),
    "genres" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "original_title" TEXT,
    "vote_average" DECIMAL(3,1),
    "vote_count" INTEGER,
    "certification" VARCHAR(255),
    "adult" BOOLEAN DEFAULT false,
    "keywords" TEXT[],
    "genreIds" INTEGER[],
    "runtime" INTEGER,
    "tmdbId" INTEGER,
    "imdbRating" DECIMAL(3,1),
    "rottenTomatoesRating" INTEGER,
    "metacriticRating" INTEGER,
    "slug" VARCHAR(255),
    "landingPageHook" TEXT,
    "contentWarnings" TEXT,
    "targetAudienceForLP" TEXT,
    "awardsSummary" TEXT,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MainSentiment" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shortDescription" TEXT,

    CONSTRAINT "MainSentiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubSentiment" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mainSentimentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubSentiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieSentiment" (
    "movieId" UUID NOT NULL,
    "mainSentimentId" INTEGER NOT NULL,
    "subSentimentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "relevance" DECIMAL(5,3),
    "explanation" TEXT,

    CONSTRAINT "MovieSentiment_pkey" PRIMARY KEY ("movieId","mainSentimentId","subSentimentId")
);

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
    "stepId" VARCHAR(255) NOT NULL,
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
    "optionId" VARCHAR(255) NOT NULL,
    "text" TEXT NOT NULL,
    "nextStepId" VARCHAR(255),
    "isEndState" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayTitle" TEXT,

    CONSTRAINT "JourneyOptionFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieSuggestionFlow" (
    "id" SERIAL NOT NULL,
    "journeyOptionFlowId" INTEGER NOT NULL,
    "movieId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "relevance" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "relevanceScore" DECIMAL(5,3),

    CONSTRAINT "MovieSuggestionFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenreSubSentiment" (
    "id" SERIAL NOT NULL,
    "genreId" INTEGER NOT NULL,
    "subSentimentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenreSubSentiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyOptionFlowSubSentiment" (
    "id" SERIAL NOT NULL,
    "journeyOptionFlowId" INTEGER NOT NULL,
    "subSentimentId" INTEGER NOT NULL,
    "weight" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyOptionFlowSubSentiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionalIntention" (
    "id" SERIAL NOT NULL,
    "mainSentimentId" INTEGER NOT NULL,
    "intentionType" "IntentionType" NOT NULL,
    "description" TEXT NOT NULL,
    "preferredGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoidGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emotionalTone" TEXT NOT NULL DEFAULT 'similar',
    "subSentimentWeights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmotionalIntention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionalIntentionJourneyStep" (
    "id" SERIAL NOT NULL,
    "emotionalIntentionId" INTEGER NOT NULL,
    "journeyStepFlowId" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "customQuestion" TEXT,
    "contextualHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmotionalIntentionJourneyStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamingPlatform" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" "PlatformCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoPath" VARCHAR(500),
    "baseUrl" VARCHAR(500),
    "hasFreeTrial" BOOLEAN NOT NULL DEFAULT false,
    "freeTrialDuration" VARCHAR(100),
    "showFilter" "ShowFilterType" NOT NULL DEFAULT 'SECONDARY',

    CONSTRAINT "StreamingPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieStreamingPlatform" (
    "movieId" UUID NOT NULL,
    "streamingPlatformId" INTEGER NOT NULL,
    "accessType" "AccessType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieStreamingPlatform_pkey" PRIMARY KEY ("movieId","streamingPlatformId","accessType")
);

-- CreateTable
CREATE TABLE "Actor" (
    "id" UUID NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "profilePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieCast" (
    "id" UUID NOT NULL,
    "movieId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "characterName" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieCast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieTrailer" (
    "id" UUID NOT NULL,
    "movieId" UUID NOT NULL,
    "tmdbId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "site" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "language" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieTrailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "url" TEXT,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardCategory" (
    "id" UUID NOT NULL,
    "awardId" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AwardCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieAwardNomination" (
    "id" UUID NOT NULL,
    "movieId" UUID NOT NULL,
    "awardId" UUID NOT NULL,
    "awardCategoryId" UUID NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "MovieAwardNomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieAwardWin" (
    "id" UUID NOT NULL,
    "movieId" UUID NOT NULL,
    "awardId" UUID NOT NULL,
    "awardCategoryId" UUID NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "MovieAwardWin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonAwardNomination" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "awardId" UUID NOT NULL,
    "awardCategoryId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "forMovieId" UUID,

    CONSTRAINT "PersonAwardNomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonAwardWin" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "awardId" UUID NOT NULL,
    "awardCategoryId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "forMovieId" UUID,

    CONSTRAINT "PersonAwardWin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" SERIAL NOT NULL,
    "movieId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "author" TEXT,
    "vehicle" TEXT,
    "url" VARCHAR(500),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_title_key" ON "Movie"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");

-- CreateIndex
CREATE INDEX "Movie_title_idx" ON "Movie"("title");

-- CreateIndex
CREATE INDEX "Movie_year_idx" ON "Movie"("year");

-- CreateIndex
CREATE INDEX "Movie_tmdbId_idx" ON "Movie"("tmdbId");

-- CreateIndex
CREATE INDEX "Movie_createdAt_idx" ON "Movie"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MainSentiment_name_key" ON "MainSentiment"("name");

-- CreateIndex
CREATE INDEX "SubSentiment_mainSentimentId_idx" ON "SubSentiment"("mainSentimentId");

-- CreateIndex
CREATE INDEX "MovieSentiment_movieId_idx" ON "MovieSentiment"("movieId");

-- CreateIndex
CREATE INDEX "MovieSentiment_mainSentimentId_idx" ON "MovieSentiment"("mainSentimentId");

-- CreateIndex
CREATE INDEX "MovieSentiment_subSentimentId_idx" ON "MovieSentiment"("subSentimentId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyFlow_mainSentimentId_key" ON "JourneyFlow"("mainSentimentId");

-- CreateIndex
CREATE INDEX "JourneyStepFlow_journeyFlowId_idx" ON "JourneyStepFlow"("journeyFlowId");

-- CreateIndex
CREATE INDEX "JourneyStepFlow_order_idx" ON "JourneyStepFlow"("order");

-- CreateIndex
CREATE INDEX "JourneyOptionFlow_journeyStepFlowId_idx" ON "JourneyOptionFlow"("journeyStepFlowId");

-- CreateIndex
CREATE INDEX "JourneyOptionFlow_nextStepId_idx" ON "JourneyOptionFlow"("nextStepId");

-- CreateIndex
CREATE INDEX "MovieSuggestionFlow_journeyOptionFlowId_idx" ON "MovieSuggestionFlow"("journeyOptionFlowId");

-- CreateIndex
CREATE INDEX "MovieSuggestionFlow_movieId_idx" ON "MovieSuggestionFlow"("movieId");

-- CreateIndex
CREATE INDEX "MovieSuggestionFlow_relevanceScore_idx" ON "MovieSuggestionFlow"("relevanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "GenreSubSentiment_genreId_subSentimentId_key" ON "GenreSubSentiment"("genreId", "subSentimentId");

-- CreateIndex
CREATE INDEX "JourneyOptionFlowSubSentiment_journeyOptionFlowId_idx" ON "JourneyOptionFlowSubSentiment"("journeyOptionFlowId");

-- CreateIndex
CREATE INDEX "JourneyOptionFlowSubSentiment_subSentimentId_idx" ON "JourneyOptionFlowSubSentiment"("subSentimentId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyOptionFlowSubSentiment_journeyOptionFlowId_subSentim_key" ON "JourneyOptionFlowSubSentiment"("journeyOptionFlowId", "subSentimentId");

-- CreateIndex
CREATE INDEX "EmotionalIntention_mainSentimentId_idx" ON "EmotionalIntention"("mainSentimentId");

-- CreateIndex
CREATE INDEX "EmotionalIntention_intentionType_idx" ON "EmotionalIntention"("intentionType");

-- CreateIndex
CREATE UNIQUE INDEX "EmotionalIntention_mainSentimentId_intentionType_key" ON "EmotionalIntention"("mainSentimentId", "intentionType");

-- CreateIndex
CREATE INDEX "EmotionalIntentionJourneyStep_emotionalIntentionId_idx" ON "EmotionalIntentionJourneyStep"("emotionalIntentionId");

-- CreateIndex
CREATE INDEX "EmotionalIntentionJourneyStep_journeyStepFlowId_idx" ON "EmotionalIntentionJourneyStep"("journeyStepFlowId");

-- CreateIndex
CREATE INDEX "EmotionalIntentionJourneyStep_priority_idx" ON "EmotionalIntentionJourneyStep"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "EmotionalIntentionJourneyStep_emotionalIntentionId_journeyS_key" ON "EmotionalIntentionJourneyStep"("emotionalIntentionId", "journeyStepFlowId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamingPlatform_name_key" ON "StreamingPlatform"("name");

-- CreateIndex
CREATE INDEX "StreamingPlatform_category_idx" ON "StreamingPlatform"("category");

-- CreateIndex
CREATE INDEX "StreamingPlatform_showFilter_idx" ON "StreamingPlatform"("showFilter");

-- CreateIndex
CREATE INDEX "MovieStreamingPlatform_movieId_idx" ON "MovieStreamingPlatform"("movieId");

-- CreateIndex
CREATE INDEX "MovieStreamingPlatform_streamingPlatformId_idx" ON "MovieStreamingPlatform"("streamingPlatformId");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_tmdbId_key" ON "Actor"("tmdbId");

-- CreateIndex
CREATE INDEX "Actor_tmdbId_idx" ON "Actor"("tmdbId");

-- CreateIndex
CREATE INDEX "Actor_name_idx" ON "Actor"("name");

-- CreateIndex
CREATE INDEX "MovieCast_movieId_idx" ON "MovieCast"("movieId");

-- CreateIndex
CREATE INDEX "MovieCast_actorId_idx" ON "MovieCast"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieCast_movieId_actorId_key" ON "MovieCast"("movieId", "actorId");

-- CreateIndex
CREATE INDEX "MovieTrailer_movieId_idx" ON "MovieTrailer"("movieId");

-- CreateIndex
CREATE INDEX "MovieTrailer_tmdbId_idx" ON "MovieTrailer"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieTrailer_movieId_key_key" ON "MovieTrailer"("movieId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Award_name_key" ON "Award"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AwardCategory_awardId_name_key" ON "AwardCategory"("awardId", "name");

-- CreateIndex
CREATE INDEX "MovieAwardNomination_movieId_idx" ON "MovieAwardNomination"("movieId");

-- CreateIndex
CREATE INDEX "MovieAwardNomination_year_idx" ON "MovieAwardNomination"("year");

-- CreateIndex
CREATE UNIQUE INDEX "MovieAwardNomination_movieId_awardId_awardCategoryId_year_key" ON "MovieAwardNomination"("movieId", "awardId", "awardCategoryId", "year");

-- CreateIndex
CREATE INDEX "MovieAwardWin_movieId_idx" ON "MovieAwardWin"("movieId");

-- CreateIndex
CREATE INDEX "MovieAwardWin_year_idx" ON "MovieAwardWin"("year");

-- CreateIndex
CREATE UNIQUE INDEX "MovieAwardWin_movieId_awardId_awardCategoryId_year_key" ON "MovieAwardWin"("movieId", "awardId", "awardCategoryId", "year");

-- CreateIndex
CREATE INDEX "PersonAwardNomination_personId_idx" ON "PersonAwardNomination"("personId");

-- CreateIndex
CREATE INDEX "PersonAwardNomination_forMovieId_idx" ON "PersonAwardNomination"("forMovieId");

-- CreateIndex
CREATE INDEX "PersonAwardNomination_year_idx" ON "PersonAwardNomination"("year");

-- CreateIndex
CREATE UNIQUE INDEX "PersonAwardNomination_personId_awardId_awardCategoryId_year_key" ON "PersonAwardNomination"("personId", "awardId", "awardCategoryId", "year");

-- CreateIndex
CREATE INDEX "PersonAwardWin_personId_idx" ON "PersonAwardWin"("personId");

-- CreateIndex
CREATE INDEX "PersonAwardWin_forMovieId_idx" ON "PersonAwardWin"("forMovieId");

-- CreateIndex
CREATE INDEX "PersonAwardWin_year_idx" ON "PersonAwardWin"("year");

-- CreateIndex
CREATE UNIQUE INDEX "PersonAwardWin_personId_awardId_awardCategoryId_year_key" ON "PersonAwardWin"("personId", "awardId", "awardCategoryId", "year");

-- CreateIndex
CREATE INDEX "Quote_movieId_idx" ON "Quote"("movieId");

-- CreateIndex
CREATE INDEX "Quote_author_idx" ON "Quote"("author");


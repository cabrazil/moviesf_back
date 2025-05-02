-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "director" TEXT,
    "genres" TEXT[],
    "streamingPlatforms" TEXT[],

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MainSentiment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MainSentiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubSentiment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mainSentimentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubSentiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieSentiment" (
    "movieId" TEXT NOT NULL,
    "mainSentimentId" INTEGER NOT NULL,
    "subSentimentId" INTEGER NOT NULL,

    CONSTRAINT "MovieSentiment_pkey" PRIMARY KEY ("movieId","mainSentimentId","subSentimentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "MainSentiment_name_key" ON "MainSentiment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SubSentiment_name_key" ON "SubSentiment"("name");

-- CreateIndex
CREATE INDEX "SubSentiment_mainSentimentId_idx" ON "SubSentiment"("mainSentimentId");

-- CreateIndex
CREATE INDEX "MovieSentiment_mainSentimentId_idx" ON "MovieSentiment"("mainSentimentId");

-- CreateIndex
CREATE INDEX "MovieSentiment_subSentimentId_idx" ON "MovieSentiment"("subSentimentId");

-- AddForeignKey
ALTER TABLE "SubSentiment" ADD CONSTRAINT "SubSentiment_mainSentimentId_fkey" FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieSentiment" ADD CONSTRAINT "MovieSentiment_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieSentiment" ADD CONSTRAINT "MovieSentiment_mainSentimentId_fkey" FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieSentiment" ADD CONSTRAINT "MovieSentiment_subSentimentId_fkey" FOREIGN KEY ("subSentimentId") REFERENCES "SubSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

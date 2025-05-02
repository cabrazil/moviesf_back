-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "MovieClue" (
    "id" SERIAL NOT NULL,
    "movieId" TEXT NOT NULL,
    "basicSentimentId" INTEGER NOT NULL,
    "questionSequence" TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieClue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovieClue_movieId_idx" ON "MovieClue"("movieId");

-- CreateIndex
CREATE INDEX "MovieClue_basicSentimentId_idx" ON "MovieClue"("basicSentimentId");

-- AddForeignKey
ALTER TABLE "MovieClue" ADD CONSTRAINT "MovieClue_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieClue" ADD CONSTRAINT "MovieClue_basicSentimentId_fkey" FOREIGN KEY ("basicSentimentId") REFERENCES "BasicSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

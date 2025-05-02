-- DropForeignKey
ALTER TABLE "EmotionalState" DROP CONSTRAINT "EmotionalState_mainSentimentId_fkey";

-- DropForeignKey
ALTER TABLE "MovieSuggestion" DROP CONSTRAINT "MovieSuggestion_journeyOptionId_fkey";

-- AddForeignKey
ALTER TABLE "EmotionalState" ADD CONSTRAINT "EmotionalState_mainSentimentId_fkey" FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieSuggestion" ADD CONSTRAINT "MovieSuggestion_journeyOptionId_fkey" FOREIGN KEY ("journeyOptionId") REFERENCES "JourneyOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

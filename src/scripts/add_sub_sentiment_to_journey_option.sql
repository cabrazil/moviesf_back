-- Adiciona a coluna associatedSubSentimentId
ALTER TABLE "JourneyOptionFlow" 
ADD COLUMN "associatedSubSentimentId" INTEGER;

-- Adiciona o índice
CREATE INDEX "JourneyOptionFlow_associatedSubSentimentId_idx" 
ON "JourneyOptionFlow"("associatedSubSentimentId");

-- Adiciona a foreign key
ALTER TABLE "JourneyOptionFlow"
ADD CONSTRAINT "JourneyOptionFlow_associatedSubSentimentId_fkey"
FOREIGN KEY ("associatedSubSentimentId")
REFERENCES "SubSentiment"("id")
ON DELETE SET NULL; 
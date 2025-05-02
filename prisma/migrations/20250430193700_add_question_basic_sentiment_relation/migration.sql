/*
  Warnings:

  - Added the required column `basicSentimentId` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "basicSentimentId" INTEGER;

-- CreateIndex
CREATE INDEX "Question_basicSentimentId_idx" ON "Question"("basicSentimentId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_basicSentimentId_fkey" FOREIGN KEY ("basicSentimentId") REFERENCES "BasicSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Atualizamos os registros existentes com um valor padrão (você precisará ajustar este valor)
UPDATE "Question" SET "basicSentimentId" = 1 WHERE "basicSentimentId" IS NULL;

-- Por fim, tornamos a coluna obrigatória
ALTER TABLE "Question" ALTER COLUMN "basicSentimentId" SET NOT NULL;

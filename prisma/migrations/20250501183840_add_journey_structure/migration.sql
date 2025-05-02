/*
  Warnings:

  - You are about to drop the column `contextFlow` on the `EmotionalState` table. All the data in the column will be lost.
  - You are about to drop the column `contextPath` on the `MovieSuggestion` table. All the data in the column will be lost.
  - Added the required column `mainSentimentId` to the `EmotionalState` table without a default value. This is not possible if the table is not empty.
  - Added the required column `journeyOptionId` to the `MovieSuggestion` table without a default value. This is not possible if the table is not empty.

*/
-- Primeiro, criar as novas tabelas
CREATE TABLE "JourneyStep" (
    "id" SERIAL NOT NULL,
    "emotionalStateId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JourneyOption" (
    "id" SERIAL NOT NULL,
    "journeyStepId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "nextStepId" INTEGER,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourneyOption_pkey" PRIMARY KEY ("id")
);

-- Adicionar colunas opcionais primeiro
ALTER TABLE "EmotionalState" ADD COLUMN "mainSentimentId" INTEGER;
ALTER TABLE "MovieSuggestion" ADD COLUMN "journeyOptionId" INTEGER;

-- Criar índices
CREATE INDEX "JourneyStep_emotionalStateId_idx" ON "JourneyStep"("emotionalStateId");
CREATE INDEX "JourneyOption_journeyStepId_idx" ON "JourneyOption"("journeyStepId");
CREATE INDEX "EmotionalState_mainSentimentId_idx" ON "EmotionalState"("mainSentimentId");
CREATE INDEX "MovieSuggestion_journeyOptionId_idx" ON "MovieSuggestion"("journeyOptionId");

-- Adicionar chaves estrangeiras
ALTER TABLE "EmotionalState" ADD CONSTRAINT "EmotionalState_mainSentimentId_fkey" FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JourneyStep" ADD CONSTRAINT "JourneyStep_emotionalStateId_fkey" FOREIGN KEY ("emotionalStateId") REFERENCES "EmotionalState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JourneyOption" ADD CONSTRAINT "JourneyOption_journeyStepId_fkey" FOREIGN KEY ("journeyStepId") REFERENCES "JourneyStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MovieSuggestion" ADD CONSTRAINT "MovieSuggestion_journeyOptionId_fkey" FOREIGN KEY ("journeyOptionId") REFERENCES "JourneyOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrar dados existentes
-- 1. Criar um MainSentiment padrão
INSERT INTO "MainSentiment" ("name", "description", "keywords", "createdAt", "updatedAt")
VALUES ('Padrão', 'Sentimento padrão para migração', ARRAY['padrao'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Atualizar EmotionalState com o MainSentiment padrão
UPDATE "EmotionalState" SET "mainSentimentId" = (SELECT id FROM "MainSentiment" WHERE name = 'Padrão' LIMIT 1);

-- 3. Criar JourneyStep e JourneyOption para cada EmotionalState existente
DO $$
DECLARE
    emotional_state RECORD;
    journey_step_id INTEGER;
    journey_option_id INTEGER;
BEGIN
    FOR emotional_state IN SELECT id, "contextFlow" FROM "EmotionalState" LOOP
        -- Inserir JourneyStep
        INSERT INTO "JourneyStep" ("emotionalStateId", "order", "question", "createdAt", "updatedAt")
        VALUES (emotional_state.id, 1, 'Migração de dados existentes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id INTO journey_step_id;

        -- Inserir JourneyOption
        INSERT INTO "JourneyOption" ("journeyStepId", "text", "isFinal", "createdAt", "updatedAt")
        VALUES (journey_step_id, 'Opção padrão', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id INTO journey_option_id;

        -- Atualizar MovieSuggestion
        UPDATE "MovieSuggestion" 
        SET "journeyOptionId" = journey_option_id
        WHERE "emotionalStateId" = emotional_state.id;
    END LOOP;
END $$;

-- Agora podemos tornar as colunas obrigatórias
ALTER TABLE "EmotionalState" ALTER COLUMN "mainSentimentId" SET NOT NULL;
ALTER TABLE "MovieSuggestion" ALTER COLUMN "journeyOptionId" SET NOT NULL;

-- Por fim, remover as colunas antigas
ALTER TABLE "EmotionalState" DROP COLUMN "contextFlow";
ALTER TABLE "MovieSuggestion" DROP COLUMN "contextPath";

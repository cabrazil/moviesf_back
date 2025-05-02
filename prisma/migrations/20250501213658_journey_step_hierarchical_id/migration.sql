/*
  Warnings:

  - The primary key for the `JourneyStep` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `stepId` to the `JourneyStep` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "JourneyOption" DROP CONSTRAINT "JourneyOption_journeyStepId_fkey";

-- Criar tabela temporária para armazenar os mapeamentos de ID
CREATE TABLE "_JourneyStepTemp" (
    "old_id" INTEGER,
    "new_id" TEXT,
    "stepId" TEXT
);

-- Inserir mapeamentos na tabela temporária
INSERT INTO "_JourneyStepTemp" ("old_id", "new_id", "stepId")
SELECT 
    "id",
    gen_random_uuid()::TEXT,
    CASE 
        WHEN "order" = 1 THEN '1'
        ELSE CONCAT(
            "order"::TEXT,
            CHR((64 + (ROW_NUMBER() OVER (PARTITION BY "order" ORDER BY "id"))::INTEGER))
        )
    END
FROM "JourneyStep";

-- AlterTable
ALTER TABLE "JourneyOption" ALTER COLUMN "journeyStepId" SET DATA TYPE TEXT,
ALTER COLUMN "nextStepId" SET DATA TYPE TEXT;

-- Atualizar referências em JourneyOption
UPDATE "JourneyOption" jo
SET "journeyStepId" = jst."new_id"
FROM "_JourneyStepTemp" jst
WHERE jo."journeyStepId" = jst."old_id"::TEXT;

UPDATE "JourneyOption" jo
SET "nextStepId" = jst."new_id"
FROM "_JourneyStepTemp" jst
WHERE jo."nextStepId" = jst."old_id"::TEXT;

-- AlterTable
ALTER TABLE "JourneyStep" 
    DROP CONSTRAINT "JourneyStep_pkey",
    ALTER COLUMN "id" DROP DEFAULT,
    ALTER COLUMN "id" SET DATA TYPE TEXT,
    ADD COLUMN "stepId" TEXT,
    ADD CONSTRAINT "JourneyStep_pkey" PRIMARY KEY ("id");

DROP SEQUENCE IF EXISTS "JourneyStep_id_seq";

-- Atualizar JourneyStep com novos IDs e stepIds
UPDATE "JourneyStep" js
SET 
    "id" = jst."new_id",
    "stepId" = jst."stepId"
FROM "_JourneyStepTemp" jst
WHERE js."id"::TEXT = jst."old_id"::TEXT;

-- Remover tabela temporária
DROP TABLE "_JourneyStepTemp";

-- AddForeignKey
ALTER TABLE "JourneyOption" ADD CONSTRAINT "JourneyOption_journeyStepId_fkey" FOREIGN KEY ("journeyStepId") REFERENCES "JourneyStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

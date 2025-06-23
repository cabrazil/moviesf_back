-- ===== ADICIONAR INTENÇÃO EMOCIONAL AO SUPABASE =====
-- Execute estes comandos em ordem no SQL Editor do Supabase

-- 1. Criar enum para tipos de intenção emocional
CREATE TYPE "IntentionType" AS ENUM ('PROCESS', 'TRANSFORM', 'MAINTAIN', 'EXPLORE');

-- 2. Criar tabela EmotionalIntention
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionalIntention_pkey" PRIMARY KEY ("id")
);

-- 3. Criar índices para performance
CREATE INDEX "EmotionalIntention_mainSentimentId_idx" ON "EmotionalIntention"("mainSentimentId");
CREATE INDEX "EmotionalIntention_intentionType_idx" ON "EmotionalIntention"("intentionType");

-- 4. Criar constraint unique para evitar duplicatas
CREATE UNIQUE INDEX "EmotionalIntention_mainSentimentId_intentionType_key" ON "EmotionalIntention"("mainSentimentId", "intentionType");

-- 5. Adicionar foreign key constraint
ALTER TABLE "EmotionalIntention" ADD CONSTRAINT "EmotionalIntention_mainSentimentId_fkey" FOREIGN KEY ("mainSentimentId") REFERENCES "MainSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Criar trigger para updatedAt automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_emotional_intention_updated_at 
    BEFORE UPDATE ON "EmotionalIntention" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Inserir configurações iniciais para o sentimento "Triste / Melancólico(a)" (ID: 14)
-- Substitua o ID 14 pelo ID correto do seu sentimento "Triste"

INSERT INTO "EmotionalIntention" (
    "mainSentimentId", 
    "intentionType", 
    "description", 
    "preferredGenres", 
    "avoidGenres", 
    "emotionalTone", 
    "subSentimentWeights"
) VALUES 
(
    14, -- Substitua pelo ID correto do sentimento "Triste / Melancólico(a)"
    'PROCESS',
    'Quero um filme que me ajude a processar e elaborar essa tristeza',
    ARRAY['drama', 'romance dramático', 'biografia'],
    ARRAY['comédia', 'ação', 'terror'],
    'similar',
    '{"Emotivo(a) (Triste)": 1.8, "Drama Familiar": 1.6, "Reflexão Filosófica": 1.4, "Vazio(a)": 1.2}'::jsonb
),
(
    14, -- Substitua pelo ID correto do sentimento "Triste / Melancólico(a)"
    'TRANSFORM',
    'Quero um filme que me ajude a sair dessa tristeza',
    ARRAY['comédia', 'comédia romântica', 'animação', 'musical'],
    ARRAY['drama pesado', 'thriller psicológico'],
    'contrasting',
    '{"Humor / Comédia": 2.0, "Conforto / Aconchego Emocional": 1.8, "Inspiração / Motivação para Agir": 1.6, "Emotivo(a) (Feliz)": 1.4}'::jsonb
),
(
    14, -- Substitua pelo ID correto do sentimento "Triste / Melancólico(a)"
    'MAINTAIN',
    'Estou bem com essa melancolia, quero algo que ressoe com ela',
    ARRAY['drama indie', 'filme de arte', 'documentário'],
    ARRAY['comédia exagerada', 'ação'],
    'similar',
    '{"Emotivo(a) (Triste)": 1.8, "Reflexão Filosófica": 1.6, "Vazio(a)": 1.4}'::jsonb
),
(
    14, -- Substitua pelo ID correto do sentimento "Triste / Melancólico(a)"
    'EXPLORE',
    'Quero explorar diferentes aspectos da tristeza e melancolia',
    ARRAY['drama', 'romance', 'filme de época'],
    ARRAY['terror', 'ação'],
    'progressive',
    '{"Superação e Crescimento": 2.0, "Drama Familiar": 1.8, "Emotivo(a) (Triste)": 1.6}'::jsonb
);

-- 8. Verificar se as inserções foram bem-sucedidas
SELECT 
    ei."id",
    ms."name" as sentiment_name,
    ei."intentionType",
    ei."description",
    ei."preferredGenres",
    ei."avoidGenres",
    ei."emotionalTone"
FROM "EmotionalIntention" ei
JOIN "MainSentiment" ms ON ei."mainSentimentId" = ms."id"
ORDER BY ei."mainSentimentId", ei."intentionType";

-- ===== COMANDOS OPCIONAIS PARA ROLLBACK =====
-- Use apenas se precisar reverter as alterações

/*
-- Remover dados de teste
DELETE FROM "EmotionalIntention" WHERE "mainSentimentId" = 14;

-- Remover trigger
DROP TRIGGER IF EXISTS update_emotional_intention_updated_at ON "EmotionalIntention";

-- Remover tabela
DROP TABLE IF EXISTS "EmotionalIntention";

-- Remover enum
DROP TYPE IF EXISTS "IntentionType";
*/ 
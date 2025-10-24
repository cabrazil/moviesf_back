-- ===============================================
-- Migration: Adicionar campo showFilter à tabela StreamingPlatform
-- Data: 2025-10-24
-- Objetivo: Controlar visibilidade das plataformas no filtro mobile
-- ===============================================

-- 1. Criar o ENUM ShowFilterType
CREATE TYPE "ShowFilterType" AS ENUM ('PRIORITY', 'SECONDARY', 'HIDDEN');

-- 2. Adicionar coluna showFilter à tabela StreamingPlatform
ALTER TABLE "StreamingPlatform" 
ADD COLUMN "showFilter" "ShowFilterType" NOT NULL DEFAULT 'SECONDARY';

-- 3. Criar índice para melhorar performance de filtros
CREATE INDEX "StreamingPlatform_showFilter_idx" ON "StreamingPlatform"("showFilter");

-- 4. Atualizar as 9 plataformas PRIORITY (baseado em popularidade + quantidade de filmes)
UPDATE "StreamingPlatform" 
SET "showFilter" = 'PRIORITY'
WHERE name IN (
  'Netflix',
  'Prime Video',
  'Disney+',
  'HBO Max',
  'Paramount+',
  'Globoplay',
  'Telecine',
  'Apple TV+',
  'Claro Video'
);

-- 5. Marcar plataformas SECONDARY (com conteúdo relevante)
UPDATE "StreamingPlatform" 
SET "showFilter" = 'SECONDARY'
WHERE name IN (
  'MUBI',
  'Looke',
  'Oldflix',
  'MGM+',
  'Filmelier+',
  'Reserva Imovision',
  'FilmBox+',
  'YouTube Premium'
);

-- 6. Marcar plataformas HIDDEN (sem conteúdo ou apenas aluguel/compra)
UPDATE "StreamingPlatform" 
SET "showFilter" = 'HIDDEN'
WHERE id IN (
  SELECT sp.id 
  FROM "StreamingPlatform" sp
  LEFT JOIN "MovieStreamingPlatform" msp ON msp."streamingPlatformId" = sp.id
  WHERE msp."movieId" IS NULL
)
OR category IN ('RENTAL_PURCHASE_PRIMARY', 'FREE_PRIMARY');

-- 7. Verificar resultado da migration
SELECT 
  "showFilter",
  COUNT(*) as total,
  STRING_AGG(name, ', ' ORDER BY name) as platforms
FROM "StreamingPlatform"
GROUP BY "showFilter"
ORDER BY 
  CASE "showFilter"
    WHEN 'PRIORITY' THEN 1
    WHEN 'SECONDARY' THEN 2
    WHEN 'HIDDEN' THEN 3
  END;

-- ===============================================
-- Resultado esperado:
-- PRIORITY: 9 plataformas principais
-- SECONDARY: 8 plataformas secundárias
-- HIDDEN: ~22 plataformas ocultas (sem conteúdo ou aluguel)
-- ===============================================


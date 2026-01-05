-- ========================================
-- SCRIPT DE LIMPEZA DE DUPLICATAS
-- SubSentiment - Ambiente DEV (Supabase)
-- ========================================

-- PASSO 1: Identificar duplicatas (para revisar)
SELECT 
  name, 
  "mainSentimentId", 
  COUNT(*) as count,
  array_agg(id ORDER BY id) as ids,
  MIN(id) as keep_id,
  array_agg(id ORDER BY id) FILTER (WHERE id != MIN(id)) as delete_ids
FROM "SubSentiment"
GROUP BY name, "mainSentimentId"
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- PASSO 2: Atualizar referências em MovieSentiment
-- (Apontar para o ID mais antigo antes de deletar)
WITH duplicates AS (
  SELECT 
    name,
    "mainSentimentId",
    MIN(id) as keep_id,
    array_agg(id) FILTER (WHERE id != MIN(id)) as delete_ids
  FROM "SubSentiment"
  GROUP BY name, "mainSentimentId"
  HAVING COUNT(*) > 1
)
UPDATE "MovieSentiment" ms
SET "subSentimentId" = d.keep_id
FROM duplicates d,
     LATERAL unnest(d.delete_ids) as old_id
WHERE ms."subSentimentId" = old_id;

-- PASSO 3: Atualizar referências em JourneyOptionFlowSubSentiment
-- Primeiro, deletar duplicatas que podem causar conflito de unique constraint
WITH duplicates AS (
  SELECT 
    name,
    "mainSentimentId",
    MIN(id) as keep_id,
    array_agg(id) FILTER (WHERE id != MIN(id)) as delete_ids
  FROM "SubSentiment"
  GROUP BY name, "mainSentimentId"
  HAVING COUNT(*) > 1
)
DELETE FROM "JourneyOptionFlowSubSentiment" jofs
USING duplicates d,
      LATERAL unnest(d.delete_ids) as old_id
WHERE jofs."subSentimentId" = old_id
  AND EXISTS (
    SELECT 1 
    FROM "JourneyOptionFlowSubSentiment" jofs2 
    WHERE jofs2."journeyOptionFlowId" = jofs."journeyOptionFlowId" 
      AND jofs2."subSentimentId" = d.keep_id
  );

-- Depois, atualizar os que não causam conflito
WITH duplicates AS (
  SELECT 
    name,
    "mainSentimentId",
    MIN(id) as keep_id,
    array_agg(id) FILTER (WHERE id != MIN(id)) as delete_ids
  FROM "SubSentiment"
  GROUP BY name, "mainSentimentId"
  HAVING COUNT(*) > 1
)
UPDATE "JourneyOptionFlowSubSentiment" jofs
SET "subSentimentId" = d.keep_id
FROM duplicates d,
     LATERAL unnest(d.delete_ids) as old_id
WHERE jofs."subSentimentId" = old_id;

-- PASSO 4: Deletar SubSentiments duplicados
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY name, "mainSentimentId" 
      ORDER BY id ASC
    ) as rn
  FROM "SubSentiment"
)
DELETE FROM "SubSentiment"
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- PASSO 5: Verificação final (deve retornar 0 linhas)
SELECT 
  name, 
  "mainSentimentId", 
  COUNT(*) as count
FROM "SubSentiment"
GROUP BY name, "mainSentimentId"
HAVING COUNT(*) > 1;

-- PASSO 6: Estatísticas finais
SELECT 
  'Total SubSentiments' as metric,
  COUNT(*) as value
FROM "SubSentiment"
UNION ALL
SELECT 
  'Total MovieSentiment',
  COUNT(*)
FROM "MovieSentiment"
UNION ALL
SELECT 
  'Total JourneyOptionFlowSubSentiment',
  COUNT(*)
FROM "JourneyOptionFlowSubSentiment";

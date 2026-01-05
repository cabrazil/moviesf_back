-- ========================================
-- SCRIPT DE LIMPEZA DE DUPLICATAS SEMÂNTICAS
-- JourneyOptionFlowSubSentiment - Ambiente DEV
-- ========================================
-- Problema: Mesma jornada com múltiplos SubSentiments de mesmo nome mas IDs diferentes
-- Exemplo: journeyOptionFlowId=25 tem IDs 105, 90, 93 todos com nome "Autodescoberta e Crescimento"

-- PASSO 1: Identificar duplicatas semânticas
SELECT 
  jofs."journeyOptionFlowId",
  ss.name,
  COUNT(*) as count,
  array_agg(jofs."subSentimentId" ORDER BY jofs."weight" DESC, jofs."subSentimentId" ASC) as sub_ids,
  array_agg(jofs."weight" ORDER BY jofs."weight" DESC, jofs."subSentimentId" ASC) as weights
FROM "JourneyOptionFlowSubSentiment" jofs
JOIN "SubSentiment" ss ON jofs."subSentimentId" = ss.id
GROUP BY jofs."journeyOptionFlowId", ss.name
HAVING COUNT(*) > 1
ORDER BY count DESC, jofs."journeyOptionFlowId";

-- PASSO 2: Deletar duplicatas, mantendo apenas o SubSentiment com maior peso
-- Se pesos forem iguais, mantém o ID menor (mais antigo)
WITH duplicates AS (
  SELECT 
    jofs.id as jofs_id,
    jofs."journeyOptionFlowId",
    ss.name,
    jofs."subSentimentId",
    jofs."weight",
    ROW_NUMBER() OVER (
      PARTITION BY jofs."journeyOptionFlowId", ss.name 
      ORDER BY jofs."weight" DESC, jofs."subSentimentId" ASC
    ) as rn
  FROM "JourneyOptionFlowSubSentiment" jofs
  JOIN "SubSentiment" ss ON jofs."subSentimentId" = ss.id
)
DELETE FROM "JourneyOptionFlowSubSentiment"
WHERE id IN (
  SELECT jofs_id FROM duplicates WHERE rn > 1
);

-- PASSO 3: Verificação final (deve retornar 0 linhas)
SELECT 
  jofs."journeyOptionFlowId",
  ss.name,
  COUNT(*) as count
FROM "JourneyOptionFlowSubSentiment" jofs
JOIN "SubSentiment" ss ON jofs."subSentimentId" = ss.id
GROUP BY jofs."journeyOptionFlowId", ss.name
HAVING COUNT(*) > 1;

-- PASSO 4: Estatísticas finais
SELECT 
  'Total JourneyOptionFlowSubSentiment' as metric,
  COUNT(*) as value
FROM "JourneyOptionFlowSubSentiment"
UNION ALL
SELECT 
  'Jornadas únicas',
  COUNT(DISTINCT "journeyOptionFlowId")
FROM "JourneyOptionFlowSubSentiment"
UNION ALL
SELECT 
  'SubSentiments únicos',
  COUNT(DISTINCT "subSentimentId")
FROM "JourneyOptionFlowSubSentiment";

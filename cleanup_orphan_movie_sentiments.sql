-- Script para limpar MovieSentiments órfãos (que apontam para SubSentiments deletados)

-- 1. Identificar MovieSentiments órfãos
SELECT 
  ms."movieId",
  ms."mainSentimentId",
  ms."subSentimentId",
  ms.relevance,
  m.title,
  m.year
FROM "MovieSentiment" ms
LEFT JOIN "SubSentiment" ss ON ms."subSentimentId" = ss.id
LEFT JOIN "Movie" m ON ms."movieId" = m.id
WHERE ss.id IS NULL
ORDER BY m.title;

-- 2. Contar órfãos
SELECT COUNT(*) as total_orfaos
FROM "MovieSentiment" ms
LEFT JOIN "SubSentiment" ss ON ms."subSentimentId" = ss.id
WHERE ss.id IS NULL;

-- 3. Deletar MovieSentiments órfãos
DELETE FROM "MovieSentiment"
WHERE "subSentimentId" NOT IN (
  SELECT id FROM "SubSentiment"
);

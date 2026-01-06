-- Query para listar todos os filmes de uma JourneyOptionFlow ordenados por relevanceScore

-- VERSÃO 1: Completa com todas as informações
SELECT 
  m.id as movie_id,
  m.title,
  m.year,
  m."tmdbId",
  s."relevanceScore",
  s.reflection,
  s."createdAt",
  s."updatedAt",
  jof.id as journey_option_flow_id,
  jof.text as journey_option_text,
  ms.name as main_sentiment_name,
  ei."intentionType" as emotional_intention
FROM "MovieSuggestion" s
INNER JOIN "Movie" m ON s."movieId" = m.id
INNER JOIN "JourneyOptionFlow" jof ON s."journeyOptionFlowId" = jof.id
INNER JOIN "JourneyStepFlow" jsf ON jof."journeyStepFlowId" = jsf.id
INNER JOIN "JourneyFlow" jf ON jsf."journeyFlowId" = jf.id
INNER JOIN "MainSentiment" ms ON jf."mainSentimentId" = ms.id
LEFT JOIN "EmotionalIntention" ei ON jf."emotionalIntentionId" = ei.id
WHERE s."journeyOptionFlowId" = 176  -- ← ALTERE AQUI O ID DA JORNADA
ORDER BY s."relevanceScore" DESC;

-- VERSÃO 2: Simplificada (apenas essencial)
SELECT 
  m.title,
  m.year,
  s."relevanceScore",
  s.reason
FROM "MovieSuggestionFlow" s
INNER JOIN "Movie" m ON s."movieId" = m.id
WHERE s."journeyOptionFlowId" = 176  -- ← ALTERE AQUI O ID DA JORNADA
ORDER BY s."relevanceScore" DESC;

-- VERSÃO 3: Com contagem de SubSentiments
SELECT 
  m.title,
  m.year,
  s."relevanceScore",
  s.reflection,
  COUNT(DISTINCT ms."subSentimentId") as total_subsentiments,
  STRING_AGG(DISTINCT ss.name, ', ' ORDER BY ss.name) as subsentiments
FROM "MovieSuggestion" s
INNER JOIN "Movie" m ON s."movieId" = m.id
LEFT JOIN "MovieSentiment" ms ON m.id = ms."movieId"
LEFT JOIN "SubSentiment" ss ON ms."subSentimentId" = ss.id
WHERE s."journeyOptionFlowId" = 176  -- ← ALTERE AQUI O ID DA JORNADA
GROUP BY m.id, m.title, m.year, s."relevanceScore", s.reflection
ORDER BY s."relevanceScore" DESC;

-- VERSÃO 4: Com ranking
SELECT 
  ROW_NUMBER() OVER (ORDER BY s."relevanceScore" DESC) as rank,
  m.title,
  m.year,
  s."relevanceScore",
  CASE 
    WHEN s."relevanceScore" >= 7.0 THEN '⭐ Excelente'
    WHEN s."relevanceScore" >= 6.0 THEN '✅ Muito Bom'
    WHEN s."relevanceScore" >= 5.0 THEN '👍 Bom'
    WHEN s."relevanceScore" >= 4.0 THEN '⚠️ Regular'
    ELSE '❌ Fraco'
  END as classificacao
FROM "MovieSuggestion" s
INNER JOIN "Movie" m ON s."movieId" = m.id
WHERE s."journeyOptionFlowId" = 176  -- ← ALTERE AQUI O ID DA JORNADA
ORDER BY s."relevanceScore" DESC;

-- VERSÃO 5: Comparação com outras jornadas do mesmo filme
SELECT 
  m.title,
  m.year,
  s."relevanceScore" as score_jof_176,
  (
    SELECT COUNT(*) 
    FROM "MovieSuggestion" s2 
    WHERE s2."movieId" = m.id
  ) as total_jornadas,
  (
    SELECT STRING_AGG(jof2.id::text || ' (' || s2."relevanceScore"::text || ')', ', ')
    FROM "MovieSuggestion" s2
    INNER JOIN "JourneyOptionFlow" jof2 ON s2."journeyOptionFlowId" = jof2.id
    WHERE s2."movieId" = m.id AND s2."journeyOptionFlowId" != 176
    ORDER BY s2."relevanceScore" DESC
  ) as outras_jornadas
FROM "MovieSuggestion" s
INNER JOIN "Movie" m ON s."movieId" = m.id
WHERE s."journeyOptionFlowId" = 176  -- ← ALTERE AQUI O ID DA JORNADA
ORDER BY s."relevanceScore" DESC;

-- VERSÃO 6: Export para CSV (formato simples)
COPY (
  SELECT 
    m.title || ' (' || m.year || ')' as filme,
    ROUND(s."relevanceScore"::numeric, 3) as score,
    s.reflection
  FROM "MovieSuggestion" s
  INNER JOIN "Movie" m ON s."movieId" = m.id
  WHERE s."journeyOptionFlowId" = 176
  ORDER BY s."relevanceScore" DESC
) TO '/tmp/jof176_filmes.csv' WITH CSV HEADER;

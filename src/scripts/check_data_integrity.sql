-- ===== INVESTIGAÇÃO DE INTEGRIDADE REFERENCIAL =====
-- Execute essas consultas uma por vez no Supabase e me informe os resultados

-- 1. Verificar registros órfãos na MovieSentiment (mainSentimentId inválido)
SELECT 
    ms."movieId",
    ms."mainSentimentId", 
    ms."subSentimentId",
    ms."createdAt"
FROM "MovieSentiment" ms
LEFT JOIN "MainSentiment" main ON main.id = ms."mainSentimentId"
WHERE main.id IS NULL;

-- 2. Verificar registros órfãos na MovieSentiment (subSentimentId inválido)
SELECT 
    ms."movieId",
    ms."mainSentimentId", 
    ms."subSentimentId",
    ms."createdAt"
FROM "MovieSentiment" ms
LEFT JOIN "SubSentiment" sub ON sub.id = ms."subSentimentId"
WHERE sub.id IS NULL;

-- 3. Verificar registros órfãos na MovieSentiment (movieId inválido)
SELECT 
    ms."movieId",
    ms."mainSentimentId", 
    ms."subSentimentId",
    ms."createdAt"
FROM "MovieSentiment" ms
LEFT JOIN "Movie" m ON m.id = ms."movieId"
WHERE m.id IS NULL;

-- 4. Verificar inconsistências entre MainSentiment e SubSentiment
SELECT 
    ms."movieId",
    ms."mainSentimentId",
    ms."subSentimentId",
    main.name as main_sentiment_name,
    sub.name as sub_sentiment_name,
    sub."mainSentimentId" as sub_main_id
FROM "MovieSentiment" ms
JOIN "MainSentiment" main ON main.id = ms."mainSentimentId"
JOIN "SubSentiment" sub ON sub.id = ms."subSentimentId"
WHERE ms."mainSentimentId" != sub."mainSentimentId";

-- 5. Contar total de registros problemáticos
SELECT 
    'Registros órfãos MainSentiment' as problema,
    COUNT(*) as quantidade
FROM "MovieSentiment" ms
LEFT JOIN "MainSentiment" main ON main.id = ms."mainSentimentId"
WHERE main.id IS NULL

UNION ALL

SELECT 
    'Registros órfãos SubSentiment' as problema,
    COUNT(*) as quantidade
FROM "MovieSentiment" ms
LEFT JOIN "SubSentiment" sub ON sub.id = ms."subSentimentId"
WHERE sub.id IS NULL

UNION ALL

SELECT 
    'Registros órfãos Movie' as problema,
    COUNT(*) as quantidade
FROM "MovieSentiment" ms
LEFT JOIN "Movie" m ON m.id = ms."movieId"
WHERE m.id IS NULL

UNION ALL

SELECT 
    'Inconsistências MainSent/SubSent' as problema,
    COUNT(*) as quantidade
FROM "MovieSentiment" ms
JOIN "MainSentiment" main ON main.id = ms."mainSentimentId"
JOIN "SubSentiment" sub ON sub.id = ms."subSentimentId"
WHERE ms."mainSentimentId" != sub."mainSentimentId";

-- 6. Verificar o filme específico que está causando problema
SELECT 
    m.id,
    m.title,
    m.year,
    ms."mainSentimentId",
    ms."subSentimentId",
    main.name as main_sentiment_name,
    sub.name as sub_sentiment_name
FROM "Movie" m
JOIN "MovieSentiment" ms ON ms."movieId" = m.id
LEFT JOIN "MainSentiment" main ON main.id = ms."mainSentimentId"
LEFT JOIN "SubSentiment" sub ON sub.id = ms."subSentimentId"
WHERE m.title LIKE '%Olhar do Paraíso%'
ORDER BY ms."createdAt" DESC; 
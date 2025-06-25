-- ===== CORREÇÃO DE INTEGRIDADE REFERENCIAL =====
-- Execute esses comandos no Supabase para corrigir os problemas

-- 1. DELETAR registros órfãos específicos do filme "Um Olhar do Paraíso"
DELETE FROM "MovieSentiment" 
WHERE "movieId" = 'a8db59b5-c8a2-4d4b-90aa-7c6c64388442' 
  AND "mainSentimentId" = 19 
  AND "subSentimentId" IN (50, 56);

-- 2. VERIFICAR se há outros registros órfãos com mainSentimentId = 19
SELECT 
    ms."movieId",
    ms."mainSentimentId", 
    ms."subSentimentId",
    ms."createdAt",
    m.title as movie_title
FROM "MovieSentiment" ms
LEFT JOIN "MainSentiment" main ON main.id = ms."mainSentimentId"
LEFT JOIN "Movie" m ON m.id = ms."movieId"
WHERE ms."mainSentimentId" = 19 AND main.id IS NULL;

-- 3. DELETAR TODOS os registros órfãos da MovieSentiment (caso existam outros)
-- CUIDADO: Este comando deleta TODOS os registros órfãos, não apenas os do filme específico
DELETE FROM "MovieSentiment" 
WHERE "mainSentimentId" NOT IN (SELECT id FROM "MainSentiment");

-- 4. VERIFICAR se a correção funcionou - deve retornar 0 registros
SELECT 
    ms."movieId",
    ms."mainSentimentId", 
    ms."subSentimentId",
    ms."createdAt"
FROM "MovieSentiment" ms
LEFT JOIN "MainSentiment" main ON main.id = ms."mainSentimentId"
WHERE main.id IS NULL;

-- 5. VERIFICAR os dados do filme "Um Olhar do Paraíso" após a correção
SELECT 
    m.id,
    m.title,
    m.year,
    ms."mainSentimentId",
    ms."subSentimentId",
    main.name as main_sentiment_name,
    sub.name as sub_sentiment_name
FROM "Movie" m
LEFT JOIN "MovieSentiment" ms ON ms."movieId" = m.id
LEFT JOIN "MainSentiment" main ON main.id = ms."mainSentimentId"
LEFT JOIN "SubSentiment" sub ON sub.id = ms."subSentimentId"
WHERE m.title LIKE '%Olhar do Paraíso%'
ORDER BY ms."createdAt" DESC; 
-- ==============================================================================
-- REVISÃO JOF 66: "Uma aventura épica, com ação e personagens carismáticos..."
-- ==============================================================================

-- 1. REMOVER FILMES "INTRUSOS" OU QUE NÃO SE ENCAIXAM MAIS
-- Filmes: "O Senhor dos Anéis: As Duas Torres", "Guardiões da Galáxia - Vol. 2", "Ben-Hur"

DELETE FROM "MovieSuggestionFlow"
WHERE "journeyOptionFlowId" = 66
AND "movieId" IN (
    SELECT id FROM "Movie" WHERE title IN (
        'O Senhor dos Anéis: As Duas Torres',
        'Guardiões da Galáxia - Vol. 2',
        'Ben-Hur'
    )
);

-- 2. ATUALIZAR DNA DA JORNADA (SUBSENTIMENTS)
-- DNA Foco: Grandeza, Adrenalina e Carisma

-- Primeiro, limpar DNA antigo
DELETE FROM "JourneyOptionFlowSubSentiment" WHERE "journeyOptionFlowId" = 66;

-- Inserir novo DNA
INSERT INTO "JourneyOptionFlowSubSentiment" ("journeyOptionFlowId", "subSentimentId", "weight", "createdAt", "updatedAt")
VALUES 
(66, 36, 1.00, NOW(), NOW()),   -- Aventura Épica ? (Assumindo IDs baseados no request)
(66, 34, 0.98, NOW(), NOW()), 
(66, 140, 0.95, NOW(), NOW()), 
(66, 85, 0.92, NOW(), NOW()), 
(66, 88, 0.90, NOW(), NOW()), 
(66, 91, 0.88, NOW(), NOW()), 
(66, 139, 0.85, NOW(), NOW()), 
(66, 35, 0.82, NOW(), NOW()), 
(66, 94, 0.80, NOW(), NOW()), 
(66, 141, 0.78, NOW(), NOW()), 
(66, 102, 0.75, NOW(), NOW()), 
(66, 93, 0.70, NOW(), NOW());

-- ==============================================================================
-- PRÓXIMOS PASSOS (EXECUTAR NO TERMINAL):
-- 1. Rodar este SQL: 
--    npx ts-node src/scripts/executeSqlFromFile.ts src/scripts/ops/review_jof_66_cleanup.sql
--
-- 2. Encontrar e dupliciar novos filmes (RRR, Twisters, etc):
--    npx ts-node src/scripts/ops/find_movies_for_duplication.ts
-- ==============================================================================

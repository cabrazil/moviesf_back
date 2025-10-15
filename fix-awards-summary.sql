-- Corrigir duplicação "no no total" na tabela Movie
UPDATE "Movie" 
SET "awardsSummary" = REPLACE("awardsSummary", 'no no total', 'no total')
WHERE "awardsSummary" LIKE '%no no total%';

-- Verificar quantos registros foram afetados
SELECT COUNT(*) as registros_corrigidos 
FROM "Movie" 
WHERE "awardsSummary" LIKE '%no no total%';
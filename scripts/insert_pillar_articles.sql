-- Script para inserir relacionamentos entre filmes e artigos pilares
-- 
-- INSTRUÇÕES:
-- 1. Substitua os valores de exemplo pelos dados reais dos seus artigos pilares
-- 2. Para encontrar o movieId, use: SELECT id, title, year FROM "Movie" WHERE title ILIKE '%nome do filme%';
-- 3. O blogArticleId deve ser o ID do artigo no banco de dados do blog (Supabase)
-- 4. Execute este script no Supabase SQL Editor ou via psql

-- Exemplo de INSERT para relacionar um filme com um artigo pilar
-- 
-- INSERT INTO "MoviePillarArticle" ("movieId", "blogArticleId", "title", "slug", "createdAt", "updatedAt")
-- VALUES (
--   'uuid-do-filme',                    -- ID do filme no banco Vibesfilm
--   'id-do-artigo-no-blog',             -- ID do artigo no banco do blog
--   'Título do Artigo Pilar',           -- Título do artigo para exibição
--   'slug-do-artigo',                   -- Slug do artigo para criar o link
--   NOW(),
--   NOW()
-- );

-- ========================================
-- EXEMPLOS PRÁTICOS
-- ========================================

-- Exemplo 1: Relacionar "A Origem" com artigo sobre filmes de ficção científica
-- INSERT INTO "MoviePillarArticle" ("movieId", "blogArticleId", "title", "slug", "createdAt", "updatedAt")
-- VALUES (
--   (SELECT id FROM "Movie" WHERE title = 'A Origem' AND year = 2010),
--   '123e4567-e89b-12d3-a456-426614174000',
--   'Os 10 Melhores Filmes de Ficção Científica para Expandir sua Mente',
--   'melhores-filmes-ficcao-cientifica',
--   NOW(),
--   NOW()
-- );

-- Exemplo 2: Relacionar múltiplos filmes com o mesmo artigo
-- INSERT INTO "MoviePillarArticle" ("movieId", "blogArticleId", "title", "slug", "createdAt", "updatedAt")
-- VALUES 
--   (
--     (SELECT id FROM "Movie" WHERE title = 'Interestelar' AND year = 2014),
--     '123e4567-e89b-12d3-a456-426614174000',
--     'Os 10 Melhores Filmes de Ficção Científica para Expandir sua Mente',
--     'melhores-filmes-ficcao-cientifica',
--     NOW(),
--     NOW()
--   ),
--   (
--     (SELECT id FROM "Movie" WHERE title = 'Blade Runner 2049' AND year = 2017),
--     '123e4567-e89b-12d3-a456-426614174000',
--     'Os 10 Melhores Filmes de Ficção Científica para Expandir sua Mente',
--     'melhores-filmes-ficcao-cientifica',
--     NOW(),
--     NOW()
--   );

-- ========================================
-- QUERIES ÚTEIS
-- ========================================

-- Listar todos os relacionamentos existentes
-- SELECT 
--   m.title as filme,
--   m.year,
--   mpa.title as artigo,
--   mpa.slug,
--   mpa."createdAt"
-- FROM "MoviePillarArticle" mpa
-- JOIN "Movie" m ON mpa."movieId" = m.id
-- ORDER BY mpa."createdAt" DESC;

-- Verificar se um filme já tem artigos pilares
-- SELECT 
--   mpa.id,
--   mpa.title,
--   mpa.slug
-- FROM "MoviePillarArticle" mpa
-- WHERE mpa."movieId" = (SELECT id FROM "Movie" WHERE title = 'Nome do Filme' AND year = 2020);

-- Remover um relacionamento
-- DELETE FROM "MoviePillarArticle" 
-- WHERE "movieId" = (SELECT id FROM "Movie" WHERE title = 'Nome do Filme' AND year = 2020)
--   AND "blogArticleId" = 'id-do-artigo';

-- ========================================
-- TESTE: MÚLTIPLOS ARTIGOS PARA O MESMO FILME
-- ========================================

-- Exemplo: "O Sexto Sentido" aparecendo em dois artigos pilares diferentes
-- Descomente e ajuste os IDs dos artigos conforme necessário

/*
INSERT INTO "MoviePillarArticle" ("movieId", "blogArticleId", "title", "slug", "createdAt", "updatedAt")
VALUES 
  (
    (SELECT id FROM "Movie" WHERE title = 'O Sexto Sentido' AND year = 1999),
    'artigo-id-1',  -- Substitua pelo ID real do primeiro artigo
    'Os 15 Melhores Filmes de Suspense Psicológico',
    'melhores-filmes-suspense-psicologico',
    NOW(),
    NOW()
  ),
  (
    (SELECT id FROM "Movie" WHERE title = 'O Sexto Sentido' AND year = 1999),
    'artigo-id-2',  -- Substitua pelo ID real do segundo artigo
    'Filmes com Plot Twists Inesquecíveis',
    'filmes-plot-twists-inesqueciveis',
    NOW(),
    NOW()
  );
*/

-- Verificar os artigos pilares de "O Sexto Sentido"
/*
SELECT 
  m.title as filme,
  m.year,
  mpa.id as relacionamento_id,
  mpa.title as artigo,
  mpa.slug,
  mpa."createdAt"
FROM "MoviePillarArticle" mpa
JOIN "Movie" m ON mpa."movieId" = m.id
WHERE m.title = 'O Sexto Sentido' AND m.year = 1999
ORDER BY mpa."createdAt" DESC;
*/

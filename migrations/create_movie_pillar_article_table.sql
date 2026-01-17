-- ============================================
-- Migration: Create MoviePillarArticle Table
-- Data: 2026-01-17
-- Descrição: Tabela para relacionar filmes com artigos pilares do blog
-- ATENÇÃO: Esta migration é SEGURA - apenas CRIA uma nova tabela
-- ============================================

-- Verificar se a tabela já existe antes de criar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'MoviePillarArticle'
    ) THEN
        -- Criar a tabela MoviePillarArticle
        CREATE TABLE "MoviePillarArticle" (
            id SERIAL PRIMARY KEY,
            "movieId" UUID NOT NULL,
            "blogArticleId" VARCHAR(255) NOT NULL,
            title VARCHAR(500) NOT NULL,
            slug VARCHAR(255) NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            
            -- Foreign Key para Movie com CASCADE DELETE
            CONSTRAINT "MoviePillarArticle_movieId_fkey" 
                FOREIGN KEY ("movieId") 
                REFERENCES "Movie"(id) 
                ON DELETE CASCADE 
                ON UPDATE CASCADE,
            
            -- Constraint de unicidade: um filme não pode ter o mesmo artigo duplicado
            CONSTRAINT "MoviePillarArticle_movieId_blogArticleId_unique" 
                UNIQUE ("movieId", "blogArticleId")
        );

        -- Criar índices para melhor performance
        CREATE INDEX "MoviePillarArticle_movieId_idx" ON "MoviePillarArticle"("movieId");
        CREATE INDEX "MoviePillarArticle_blogArticleId_idx" ON "MoviePillarArticle"("blogArticleId");
        CREATE INDEX "MoviePillarArticle_slug_idx" ON "MoviePillarArticle"(slug);

        -- Log de sucesso
        RAISE NOTICE 'Tabela MoviePillarArticle criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela MoviePillarArticle já existe. Nenhuma alteração foi feita.';
    END IF;
END $$;

-- ============================================
-- Verificação pós-migration
-- ============================================

-- Verificar se a tabela foi criada
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE tablename = 'MoviePillarArticle';

-- Verificar constraints
SELECT
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public."MoviePillarArticle"'::regclass;

-- Verificar índices
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'MoviePillarArticle';

-- ============================================
-- Rollback (caso necessário)
-- ============================================
-- ATENÇÃO: Execute apenas se precisar reverter a migration
-- 
-- DROP TABLE IF EXISTS "MoviePillarArticle" CASCADE;
-- 
-- RAISE NOTICE 'Tabela MoviePillarArticle removida.';

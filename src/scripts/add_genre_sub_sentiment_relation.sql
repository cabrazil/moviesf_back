-- 1. Criar a tabela de junção GenreSubSentiment
CREATE TABLE IF NOT EXISTS "GenreSubSentiment" (
    "id" SERIAL PRIMARY KEY,
    "genreId" INTEGER NOT NULL,
    "subSentimentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GenreSubSentiment_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GenreSubSentiment_subSentimentId_fkey" FOREIGN KEY ("subSentimentId") REFERENCES "SubSentiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GenreSubSentiment_genreId_subSentimentId_key" UNIQUE ("genreId", "subSentimentId")
);

-- 2. Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS "GenreSubSentiment_genreId_idx" ON "GenreSubSentiment"("genreId");
CREATE INDEX IF NOT EXISTS "GenreSubSentiment_subSentimentId_idx" ON "GenreSubSentiment"("subSentimentId");

-- 3. Adicionar coluna genreIds na tabela Movie
ALTER TABLE "Movie" ADD COLUMN IF NOT EXISTS "genreIds" INTEGER[];

-- 4. Inserir os SubSentiments por gênero
DO $$
DECLARE
    neutral_sentiment_id INTEGER;
    drama_id INTEGER;
    comedia_id INTEGER;
    crime_id INTEGER;
    ficcao_cientifica_id INTEGER;
BEGIN
    -- Buscar o ID do MainSentiment "Neutro / Indiferente"
    SELECT id INTO neutral_sentiment_id FROM "MainSentiment" WHERE name = 'Neutro / Indiferente';
    
    -- Buscar IDs dos gêneros
    SELECT id INTO drama_id FROM "Genre" WHERE name = 'Drama';
    SELECT id INTO comedia_id FROM "Genre" WHERE name = 'Comédia';
    SELECT id INTO crime_id FROM "Genre" WHERE name = 'Crime';
    SELECT id INTO ficcao_cientifica_id FROM "Genre" WHERE name = 'Ficção Científica';

    -- Drama: Contemplação e Reflexão
    WITH new_sub_sentiment AS (
        INSERT INTO "SubSentiment" (name, description, keywords, "mainSentimentId", "createdAt", "updatedAt")
        VALUES (
            'Contemplação e Reflexão',
            'Filmes que exploram temas profundos e convidam à reflexão',
            ARRAY['contemplação', 'reflexão', 'introspecção', 'análise', 'profundidade', 'complexidade', 'humanidade', 'emoção', 'sentimento', 'experiência'],
            neutral_sentiment_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id
    )
    INSERT INTO "GenreSubSentiment" ("genreId", "subSentimentId", "createdAt", "updatedAt")
    SELECT drama_id, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM new_sub_sentiment;

    -- Drama: Superação e Crescimento
    WITH new_sub_sentiment AS (
        INSERT INTO "SubSentiment" (name, description, keywords, "mainSentimentId", "createdAt", "updatedAt")
        VALUES (
            'Superação e Crescimento',
            'Histórias de transformação pessoal e desenvolvimento',
            ARRAY['superação', 'crescimento', 'transformação', 'desenvolvimento', 'evolução', 'mudança', 'aprendizado', 'desafio', 'conquista', 'vitória'],
            neutral_sentiment_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id
    )
    INSERT INTO "GenreSubSentiment" ("genreId", "subSentimentId", "createdAt", "updatedAt")
    SELECT drama_id, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM new_sub_sentiment;

    -- Comédia: Leveza e Diversão
    INSERT INTO "SubSentiment" (id, name, description, "mainSentimentId", keywords)
    VALUES (
        gen_random_uuid(),
        'Leveza e Diversão',
        'Filmes que trazem alegria e descontração',
        neutral_sentiment_id,
        ARRAY[
            'diversão', 'alegria', 'descontração', 'leveza', 'humor',
            'autodescoberta', 'reflexão', 'música', 'jazz', 'vida após a morte',
            'considerado', 'pensativo', 'filosófico', 'existencial', 'espiritual'
        ]
    );

    -- Comédia: Sátira e Crítica Social
    INSERT INTO "SubSentiment" (id, name, description, "mainSentimentId", keywords)
    VALUES (
        gen_random_uuid(),
        'Sátira e Crítica Social',
        'Filmes que usam o humor para criticar a sociedade',
        neutral_sentiment_id,
        ARRAY[
            'sátira', 'crítica', 'sociedade', 'ironia', 'paródia',
            'política', 'comportamento', 'costumes', 'tradições', 'valores',
            'hipocrisia', 'preconceito', 'injustiça', 'desigualdade', 'corrupção'
        ]
    );

    -- Crime: Análise Criminal
    WITH new_sub_sentiment AS (
        INSERT INTO "SubSentiment" (name, description, keywords, "mainSentimentId", "createdAt", "updatedAt")
        VALUES (
            'Análise Criminal',
            'Filmes que exploram a mente criminosa e a investigação',
            ARRAY['análise', 'investigação', 'detetive', 'mistério', 'crime', 'resolução', 'pista', 'evidência', 'dedução', 'lógica'],
            neutral_sentiment_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id
    )
    INSERT INTO "GenreSubSentiment" ("genreId", "subSentimentId", "createdAt", "updatedAt")
    SELECT crime_id, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM new_sub_sentiment;

    -- Crime: Consequências e Justiça
    WITH new_sub_sentiment AS (
        INSERT INTO "SubSentiment" (name, description, keywords, "mainSentimentId", "createdAt", "updatedAt")
        VALUES (
            'Consequências e Justiça',
            'Exploração das consequências do crime e busca por justiça',
            ARRAY['consequência', 'justiça', 'moral', 'ética', 'responsabilidade', 'culpa', 'redenção', 'arrependimento', 'perdão', 'punição'],
            neutral_sentiment_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id
    )
    INSERT INTO "GenreSubSentiment" ("genreId", "subSentimentId", "createdAt", "updatedAt")
    SELECT crime_id, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM new_sub_sentiment;

    -- Ficção Científica: Exploração Científica
    WITH new_sub_sentiment AS (
        INSERT INTO "SubSentiment" (name, description, keywords, "mainSentimentId", "createdAt", "updatedAt")
        VALUES (
            'Exploração Científica',
            'Filmes que exploram conceitos científicos e tecnológicos',
            ARRAY['ciência', 'tecnologia', 'futuro', 'inovação', 'descoberta', 'experimento', 'pesquisa', 'análise', 'investigação', 'exploração'],
            neutral_sentiment_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id
    )
    INSERT INTO "GenreSubSentiment" ("genreId", "subSentimentId", "createdAt", "updatedAt")
    SELECT ficcao_cientifica_id, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM new_sub_sentiment;

    -- Ficção Científica: Reflexão Filosófica
    WITH new_sub_sentiment AS (
        INSERT INTO "SubSentiment" (name, description, keywords, "mainSentimentId", "createdAt", "updatedAt")
        VALUES (
            'Reflexão Filosófica',
            'Exploração de questões filosóficas através da ficção científica',
            ARRAY['filosofia', 'existência', 'consciência', 'realidade', 'humanidade', 'ética', 'moral', 'futuro', 'evolução', 'transformação'],
            neutral_sentiment_id,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id
    )
    INSERT INTO "GenreSubSentiment" ("genreId", "subSentimentId", "createdAt", "updatedAt")
    SELECT ficcao_cientifica_id, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM new_sub_sentiment;

    -- 5. Atualizar os filmes existentes com os IDs dos gêneros
    UPDATE "Movie" m
    SET "genreIds" = (
        SELECT ARRAY_AGG(g.id)
        FROM "Genre" g
        WHERE g.name = ANY(m.genres)
    )
    WHERE m."genreIds" IS NULL;

END $$; 
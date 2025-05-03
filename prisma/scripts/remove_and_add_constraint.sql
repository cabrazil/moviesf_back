-- Remover todas as restrições de unicidade existentes
DO $$ 
BEGIN
    -- Remover a primeira restrição se existir
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'MovieSuggestionFlow_journeyOptionFlowId_movieId_key'
    ) THEN
        ALTER TABLE "MovieSuggestionFlow" 
        DROP CONSTRAINT "MovieSuggestionFlow_journeyOptionFlowId_movieId_key";
    END IF;

    -- Remover a segunda restrição se existir
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_movie_suggestion_flow'
    ) THEN
        ALTER TABLE "MovieSuggestionFlow" 
        DROP CONSTRAINT "unique_movie_suggestion_flow";
    END IF;

    -- Remover a terceira restrição se existir
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'movie_suggestion_flow_unique'
    ) THEN
        ALTER TABLE "MovieSuggestionFlow" 
        DROP CONSTRAINT "movie_suggestion_flow_unique";
    END IF;
END $$;

-- Adicionar uma nova restrição de unicidade
ALTER TABLE "MovieSuggestionFlow" 
ADD CONSTRAINT "movie_suggestion_flow_unique_constraint" 
UNIQUE ("journeyOptionFlowId", "movieId"); 
-- Primeiro, remover a restrição existente se ela existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'MovieSuggestionFlow_journeyOptionFlowId_movieId_key'
    ) THEN
        ALTER TABLE "MovieSuggestionFlow" 
        DROP CONSTRAINT "MovieSuggestionFlow_journeyOptionFlowId_movieId_key";
    END IF;
END $$;

-- Agora, adicionar a restrição novamente
ALTER TABLE "MovieSuggestionFlow" 
ADD CONSTRAINT "MovieSuggestionFlow_journeyOptionFlowId_movieId_key" 
UNIQUE ("journeyOptionFlowId", "movieId"); 
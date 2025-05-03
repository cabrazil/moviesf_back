-- Primeiro, remover a restrição existente
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

-- Remover registros duplicados mantendo o mais recente
DELETE FROM "MovieSuggestionFlow" msf1
WHERE EXISTS (
    SELECT 1 FROM "MovieSuggestionFlow" msf2
    WHERE msf2.journeyOptionFlowId = msf1.journeyOptionFlowId
    AND msf2.movieId = msf1.movieId
    AND msf2.id > msf1.id
);

-- Adicionar uma nova restrição com um nome diferente
ALTER TABLE "MovieSuggestionFlow" 
ADD CONSTRAINT "unique_movie_suggestion_flow" 
UNIQUE ("journeyOptionFlowId", "movieId"); 
-- Listar constraints existentes
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'MovieSuggestionFlow'::regclass;

-- Remover constraints existentes
ALTER TABLE "MovieSuggestionFlow" 
DROP CONSTRAINT IF EXISTS "MovieSuggestionFlow_journeyOptionFlowId_movieId_key";

ALTER TABLE "MovieSuggestionFlow" 
DROP CONSTRAINT IF EXISTS "movie_suggestion_flow_unique";

ALTER TABLE "MovieSuggestionFlow" 
DROP CONSTRAINT IF EXISTS "movie_suggestion_flow_unique_constraint";

-- Recriar constraints necessárias
ALTER TABLE "MovieSuggestionFlow" 
ADD CONSTRAINT "MovieSuggestionFlow_pkey" PRIMARY KEY ("id");

ALTER TABLE "MovieSuggestionFlow" 
ADD CONSTRAINT "MovieSuggestionFlow_journeyOptionFlowId_fkey" 
FOREIGN KEY ("journeyOptionFlowId") 
REFERENCES "JourneyOptionFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MovieSuggestionFlow" 
ADD CONSTRAINT "MovieSuggestionFlow_movieId_fkey" 
FOREIGN KEY ("movieId") 
REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 
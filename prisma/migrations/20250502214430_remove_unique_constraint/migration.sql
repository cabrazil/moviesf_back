-- Remover a constraint de unicidade
ALTER TABLE "MovieSuggestionFlow" 
DROP CONSTRAINT IF EXISTS "MovieSuggestionFlow_journeyOptionFlowId_movieId_key"; 
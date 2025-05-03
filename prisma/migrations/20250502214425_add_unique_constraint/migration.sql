-- Adicionar a restrição de unicidade
ALTER TABLE "MovieSuggestionFlow" 
ADD CONSTRAINT "MovieSuggestionFlow_journeyOptionFlowId_movieId_key" 
UNIQUE ("journeyOptionFlowId", "movieId"); 
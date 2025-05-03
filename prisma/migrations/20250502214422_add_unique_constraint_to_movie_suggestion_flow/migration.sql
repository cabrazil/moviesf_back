-- Adicionar chave única composta para evitar duplicatas
ALTER TABLE "MovieSuggestionFlow" 
ADD CONSTRAINT "MovieSuggestionFlow_journeyOptionFlowId_movieId_key" 
UNIQUE ("journeyOptionFlowId", "movieId"); 
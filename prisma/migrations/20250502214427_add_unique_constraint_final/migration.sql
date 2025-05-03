-- Adicionar a restrição de unicidade com um nome diferente
ALTER TABLE "MovieSuggestionFlow" 
ADD CONSTRAINT "movie_suggestion_flow_unique" 
UNIQUE ("journeyOptionFlowId", "movieId"); 
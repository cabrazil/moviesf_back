-- Primeiro, remover todas as constraints de unicidade existentes
ALTER TABLE "MovieSuggestionFlow" 
DROP CONSTRAINT IF EXISTS "MovieSuggestionFlow_journeyOptionFlowId_movieId_key";

ALTER TABLE "MovieSuggestionFlow" 
DROP CONSTRAINT IF EXISTS "movie_suggestion_flow_unique";

ALTER TABLE "MovieSuggestionFlow" 
DROP CONSTRAINT IF EXISTS "movie_suggestion_flow_unique_constraint";

-- Remover índices duplicados se existirem
DROP INDEX IF EXISTS "MovieSuggestionFlow_journeyOptionFlowId_movieId_key";
DROP INDEX IF EXISTS "movie_suggestion_flow_unique";
DROP INDEX IF EXISTS "movie_suggestion_flow_unique_constraint";

-- Recriar os índices necessários
CREATE INDEX IF NOT EXISTS "MovieSuggestionFlow_journeyOptionFlowId_idx" ON "MovieSuggestionFlow"("journeyOptionFlowId");
CREATE INDEX IF NOT EXISTS "MovieSuggestionFlow_movieId_idx" ON "MovieSuggestionFlow"("movieId"); 
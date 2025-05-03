-- Adicionar a coluna thumbnail à tabela Movie
ALTER TABLE "Movie" 
ADD COLUMN IF NOT EXISTS thumbnail TEXT; 
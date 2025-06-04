-- Adiciona a coluna runtime se ela não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Movie' 
        AND column_name = 'runtime'
    ) THEN
        ALTER TABLE "Movie" ADD COLUMN "runtime" INTEGER;
    END IF;
END $$; 
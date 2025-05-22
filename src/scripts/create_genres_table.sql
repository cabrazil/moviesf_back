-- CreateTable
CREATE TABLE IF NOT EXISTS "Genre" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Genre_name_key" ON "Genre"("name");

-- Populate genres
INSERT INTO "Genre" ("name") VALUES
    ('Ação'),
    ('Aventura'),
    ('Animação'),
    ('Biografia'),
    ('Comédia'),
    ('Crime'),
    ('Documentário'),
    ('Drama'),
    ('Esporte'),
    ('Família'),
    ('Fantasia'),
    ('Ficção Científica'),
    ('Guerra'),
    ('História'),
    ('Mistério'),
    ('Musical'),
    ('Romance'),
    ('Suspense'),
    ('Terror'),
    ('Thriller'),
    ('Faroeste')
ON CONFLICT ("name") DO NOTHING; 
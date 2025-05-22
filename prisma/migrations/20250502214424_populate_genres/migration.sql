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
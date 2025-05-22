import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateGenres() {
  const genres = [
    'Ação',
    'Aventura',
    'Animação',
    'Biografia',
    'Comédia',
    'Crime',
    'Documentário',
    'Drama',
    'Esporte',
    'Família',
    'Fantasia',
    'Ficção Científica',
    'Guerra',
    'História',
    'Mistério',
    'Musical',
    'Romance',
    'Suspense',
    'Terror',
    'Thriller',
    'Faroeste'
  ];

  console.log('Iniciando população de gêneros...');

  for (const genre of genres) {
    try {
      await prisma.genre.create({
        data: {
          name: genre
        }
      });
      console.log(`Gênero "${genre}" criado com sucesso!`);
    } catch (error) {
      if (error.code === 'P2002') {
        console.log(`Gênero "${genre}" já existe, pulando...`);
      } else {
        console.error(`Erro ao criar gênero "${genre}":`, error);
      }
    }
  }

  console.log('População de gêneros concluída!');
}

populateGenres()
  .catch((error) => {
    console.error('Erro durante a população de gêneros:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
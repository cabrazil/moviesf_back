import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const movies = await prisma.movie.findMany({
      include: {
        movieSentiments: {
          include: {
            mainSentiment: true,
            subSentiment: true
          }
        }
      }
    });

    console.log('=== Filmes Cadastrados ===');
    movies.forEach(movie => {
      console.log(`\nTítulo: ${movie.title}`);
      console.log(`Ano: ${movie.year}`);
      console.log(`Diretor: ${movie.director}`);
      console.log(`Gêneros: ${movie.genres.join(', ')}`);
      console.log(`Plataformas: ${movie.streamingPlatforms.join(', ')}`);
      console.log('Sentimentos:');
      movie.movieSentiments.forEach(sentiment => {
        console.log(`- ${sentiment.mainSentiment.name} > ${sentiment.subSentiment.name}`);
      });
    });

  } catch (error) {
    console.error('Erro ao buscar filmes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
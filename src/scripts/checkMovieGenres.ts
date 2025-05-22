import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMovieGenres() {
  console.log('Iniciando verificação de gêneros...\n');

  // Buscar todos os gêneros padronizados
  const standardGenres = await prisma.genre.findMany();
  const standardGenreNames = standardGenres.map(g => g.name);
  
  console.log('Gêneros padronizados:');
  console.log(standardGenreNames.join(', '));
  console.log('\n-----------------------------------\n');

  // Buscar todos os filmes
  const movies = await prisma.movie.findMany({
    select: {
      id: true,
      title: true,
      genres: true
    }
  });

  // Mapear gêneros não padronizados
  const nonStandardGenres = new Set<string>();
  const moviesWithNonStandardGenres: { title: string; genres: string[] }[] = [];

  for (const movie of movies) {
    const nonStandard = movie.genres.filter(genre => !standardGenreNames.includes(genre));
    
    if (nonStandard.length > 0) {
      nonStandard.forEach(genre => nonStandardGenres.add(genre));
      moviesWithNonStandardGenres.push({
        title: movie.title,
        genres: nonStandard
      });
    }
  }

  // Exibir resultados
  if (nonStandardGenres.size > 0) {
    console.log('Gêneros não padronizados encontrados:');
    console.log(Array.from(nonStandardGenres).join(', '));
    console.log('\nFilmes com gêneros não padronizados:');
    moviesWithNonStandardGenres.forEach(movie => {
      console.log(`\n${movie.title}:`);
      console.log(`Gêneros não padronizados: ${movie.genres.join(', ')}`);
    });
  } else {
    console.log('Todos os gêneros estão padronizados! 🎉');
  }

  // Estatísticas
  console.log('\n-----------------------------------');
  console.log('Estatísticas:');
  console.log(`Total de gêneros padronizados: ${standardGenreNames.length}`);
  console.log(`Total de gêneros não padronizados: ${nonStandardGenres.size}`);
  console.log(`Total de filmes com gêneros não padronizados: ${moviesWithNonStandardGenres.length}`);
}

checkMovieGenres()
  .catch((error) => {
    console.error('Erro durante a verificação:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
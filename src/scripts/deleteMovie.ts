import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

function parseArgs(): { title?: string; year?: number } {
  const args: { title?: string; year?: number } = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--title=')) {
      args.title = arg.split('=')[1].replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--year=')) {
      args.year = parseInt(arg.split('=')[1], 10);
    }
  });
  return args;
}

async function main() {
  const { title, year } = parseArgs();

  if (!title) {
    console.error("❌ Por favor, forneça o título do filme. Exemplo: --title=\"Drawing Closer\"");
    return;
  }

  // Busca o filme pelo título (e opcionalmente pelo ano)
  const movies = await prisma.movie.findMany({
    where: {
      ...(year ? { year } : {}),
      OR: [
        { title: { contains: title, mode: 'insensitive' } },
        { original_title: { contains: title, mode: 'insensitive' } }
      ]
    }
  });

  if (movies.length === 0) {
    console.log(`❌ Nenhum filme encontrado com o título "${title}"${year ? ` e ano ${year}` : ''}.`);
    return;
  }

  if (movies.length > 1) {
    console.log(`⚠️ Encontrado mais de um filme com esse título. Refine a busca adicionando --year=XXXX`);
    movies.forEach(m => console.log(`   - ${m.title} (${m.year}) [ID: ${m.id}]`));
    return;
  }

  const movie = movies[0];
  console.log(`🎬 Preparando para apagar o filme: ${movie.title} (${movie.year})`);
  console.log(`ID: ${movie.id}`);

  // Apagar tabelas filhas na ordem correta
  console.log('🧹 Limpando tabelas filhas...');
  
  await prisma.movieCast.deleteMany({ where: { movieId: movie.id } });
  console.log('  - Elenco (MovieCast) apagado.');

  await prisma.movieStreamingPlatform.deleteMany({ where: { movieId: movie.id } });
  console.log('  - Streamings (MovieStreamingPlatform) apagados.');

  await prisma.movieSentiment.deleteMany({ where: { movieId: movie.id } });
  console.log('  - Sentimentos (MovieSentiment) apagados.');

  await prisma.movieSuggestionFlow.deleteMany({ where: { movieId: movie.id } });
  console.log('  - Curadoria (MovieSuggestionFlow) apagada.');

  await prisma.movieTrailer.deleteMany({ where: { movieId: movie.id } });
  console.log('  - Trailers apagados.');

  await prisma.movieAwardNomination.deleteMany({ where: { movieId: movie.id } });
  await prisma.movieAwardWin.deleteMany({ where: { movieId: movie.id } });
  console.log('  - Prêmios apagados.');

  await prisma.quote.deleteMany({ where: { movieId: movie.id } });
  console.log('  - Citações apagadas.');

  await prisma.moviePillarArticle.deleteMany({ where: { movieId: movie.id } });
  console.log('  - Artigos Pilares desvinculados.');

  // Apagar o filme
  await prisma.movie.delete({ where: { id: movie.id } });
  console.log(`✅ O filme "${movie.title}" foi apagado do banco com total segurança!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

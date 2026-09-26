import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { jevService, getCategoryThreshold } from '../services/jevService';

const prisma = new PrismaClient();

async function main() {
  const rawArgs = process.argv.slice(2);
  let customGlobalThreshold: number | undefined;
  let searchTitle: string | undefined;
  let searchYear: number | undefined;
  let searchTmdbId: number | undefined;
  const positionalArgs: string[] = [];

  for (const arg of rawArgs) {
    if (arg.startsWith('--thresh=') || arg.startsWith('--threshold=')) {
      const val = parseFloat(arg.split('=')[1]);
      if (!isNaN(val) && val > 0 && val <= 1) {
        customGlobalThreshold = val;
      }
    } else if (arg.startsWith('--year=') || arg.startsWith('-y=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val)) {
        searchYear = val;
      }
    } else if (arg.startsWith('--title=')) {
      searchTitle = arg.split('=')[1];
    } else if (arg.startsWith('--tmdb=') || arg.startsWith('--id=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val)) {
        searchTmdbId = val;
      }
    } else {
      positionalArgs.push(arg);
    }
  }

  if (positionalArgs.length > 0) {
    if (!searchTitle && !searchTmdbId) {
      if (positionalArgs.length >= 2 && !isNaN(Number(positionalArgs[1]))) {
        searchTitle = positionalArgs[0];
        if (!searchYear) searchYear = parseInt(positionalArgs[1], 10);
      } else if (positionalArgs.length === 1 && !isNaN(Number(positionalArgs[0])) && positionalArgs[0].length >= 5) {
        searchTmdbId = parseInt(positionalArgs[0], 10);
      } else {
        searchTitle = positionalArgs[0];
      }
    }
  }

  console.log('🎬 === TESTE DE CONTENT WARNINGS COM JEV (TYPESAFE AI) ===\n');

  const movieInclude = {
    movieSentiments: {
      include: { subSentiment: true },
      orderBy: { relevance: 'desc' as const },
      take: 3
    }
  };

  let movie = null;
  if (searchTmdbId) {
    movie = await prisma.movie.findUnique({
      where: { tmdbId: searchTmdbId },
      include: movieInclude
    });
  } else if (searchTitle) {
    // 1. Tentar correspondência exata de título (com ano, se fornecido)
    movie = await prisma.movie.findFirst({
      where: {
        title: { equals: searchTitle, mode: 'insensitive' },
        ...(searchYear ? { year: searchYear } : {})
      },
      include: movieInclude
    });

    // 2. Se não encontrou exato, tentar por 'contains' (com ano, se fornecido)
    if (!movie) {
      movie = await prisma.movie.findFirst({
        where: {
          title: { contains: searchTitle, mode: 'insensitive' },
          ...(searchYear ? { year: searchYear } : {})
        },
        include: movieInclude
      });
    }

    // 3. Se ainda não encontrou e era numérico, tentar como tmdbId
    if (!movie && !isNaN(Number(searchTitle))) {
      movie = await prisma.movie.findUnique({
        where: { tmdbId: parseInt(searchTitle, 10) },
        include: movieInclude
      });
    }
  } else {
    // Pegar um filme que já tenha contentWarnings para comparar
    movie = await prisma.movie.findFirst({
      where: { contentWarnings: { not: null } },
      include: movieInclude
    });
  }

  if (!movie) {
    console.error(`❌ Nenhum filme encontrado${searchTitle ? ` com título "${searchTitle}"` : ''}${searchYear ? ` (${searchYear})` : ''}.`);
    console.log('💡 Dica: Verifique se o filme está cadastrado ou especifique o ano: npx ts-node src/scripts/testJevWarnings.ts "Título" ANO');
    process.exit(1);
  }

  console.log(`📌 Filme selecionado: ${movie.title} (${movie.year})`);
  console.log(`🏷 Gêneros: ${movie.genres.join(', ')}`);
  console.log(`🔑 Keywords (${movie.keywords.length}): ${movie.keywords.slice(0, 15).join(', ')}`);
  console.log(`📝 Sinopse: ${movie.description?.substring(0, 150)}...`);
  if (movie.contentWarnings) {
    console.log(`🏛 Alerta atual no banco (LLM legado): "${movie.contentWarnings}"`);
  }
  if (customGlobalThreshold) {
    console.log(`⚙️ Limiar global customizado via CLI: ${(customGlobalThreshold * 100).toFixed(0)}%`);
  }
  console.log('\n⏳ Chamando Jev via OpenRouter...');

  const startTime = Date.now();
  const sentimentContext = movie.movieSentiments.length > 0
    ? movie.movieSentiments.map(ms => `${ms.subSentiment.name}: ${ms.explanation || ''}`).join(' | ')
    : undefined;

  const result = await jevService.evaluateContentWarnings(
    {
      title: movie.title,
      year: movie.year || undefined,
      genres: movie.genres,
      keywords: movie.keywords,
      description: movie.description || undefined,
      sentimentContext
    },
    customGlobalThreshold ? { thresholds: customGlobalThreshold } : undefined
  );

  const duration = Date.now() - startTime;

  if (!result.success) {
    console.error(`❌ Falha: ${result.error}`);
    process.exit(1);
  }

  console.log(`\n✅ Resposta recebida em ${duration}ms!`);
  console.log(`💰 Custo da inferência: $${result.cost?.toFixed(6) || 'N/A'}`);
  console.log('\n📊 Probabilidades calculadas pelo Jev:');
  console.table(
    Object.entries(result.probabilities || {}).map(([key, value]) => {
      const thresh = customGlobalThreshold ?? getCategoryThreshold(key);
      const isMet = value >= thresh;
      return {
        Categoria: key,
        Probabilidade: `${(value * 100).toFixed(1)}%`,
        Limiar: `${(thresh * 100).toFixed(0)}%`,
        Ativado: isMet ? `SIM (>= ${(thresh * 100).toFixed(0)}%)` : 'NÃO'
      };
    })
  );

  console.log(`\n🎯 Alerta Gerado pelo Jev:\n"${result.warning}"\n`);
}


main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

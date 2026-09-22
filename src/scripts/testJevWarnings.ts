import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { jevService, getCategoryThreshold } from '../services/jevService';

const prisma = new PrismaClient();

async function main() {
  const rawArgs = process.argv.slice(2);
  let customGlobalThreshold: number | undefined;
  const filteredArgs: string[] = [];

  for (const arg of rawArgs) {
    if (arg.startsWith('--thresh=') || arg.startsWith('--threshold=')) {
      const val = parseFloat(arg.split('=')[1]);
      if (!isNaN(val) && val > 0 && val <= 1) {
        customGlobalThreshold = val;
      }
    } else {
      filteredArgs.push(arg);
    }
  }

  const input = filteredArgs[0];

  console.log('🎬 === TESTE DE CONTENT WARNINGS COM JEV (TYPESAFE AI) ===\n');

  let movie = null;
  if (input && !isNaN(Number(input))) {
    movie = await prisma.movie.findUnique({
      where: { tmdbId: parseInt(input, 10) },
      include: {
        movieSentiments: {
          include: { subSentiment: true },
          orderBy: { relevance: 'desc' },
          take: 3
        }
      }
    });
  } else if (input) {
    movie = await prisma.movie.findFirst({
      where: { title: { contains: input, mode: 'insensitive' } },
      include: {
        movieSentiments: {
          include: { subSentiment: true },
          orderBy: { relevance: 'desc' },
          take: 3
        }
      }
    });
  } else {
    // Pegar um filme que já tenha contentWarnings para comparar
    movie = await prisma.movie.findFirst({
      where: { contentWarnings: { not: null } },
      include: {
        movieSentiments: {
          include: { subSentiment: true },
          orderBy: { relevance: 'desc' },
          take: 3
        }
      }
    });
  }

  if (!movie) {
    console.error('❌ Nenhum filme encontrado.');
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

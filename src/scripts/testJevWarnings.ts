import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { jevService } from '../services/jevService';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const input = args[0];

  console.log('🎬 === TESTE DE CONTENT WARNINGS COM JEV (TYPESAFE AI) ===\n');

  let movie = null;
  if (input && !isNaN(Number(input))) {
    movie = await prisma.movie.findUnique({
      where: { tmdbId: parseInt(input, 10) },
      include: {
        movieSentiments: {
          include: { subSentiment: true },
          orderBy: { relevance: 'desc' },
          take: 1
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
          take: 1
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
          take: 1
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
  console.log(`🔑 Keywords (${movie.keywords.length}): ${movie.keywords.slice(0, 10).join(', ')}`);
  console.log(`📝 Sinopse: ${movie.description?.substring(0, 150)}...`);
  if (movie.contentWarnings) {
    console.log(`🏛 Alerta atual no banco (LLM legado): "${movie.contentWarnings}"`);
  }
  console.log('\n⏳ Chamando Jev via OpenRouter...');

  const startTime = Date.now();
  const sentimentContext = movie.movieSentiments.length > 0
    ? `${movie.movieSentiments[0].subSentiment.name}: ${movie.movieSentiments[0].explanation || ''}`
    : undefined;

  const result = await jevService.evaluateContentWarnings({
    title: movie.title,
    year: movie.year || undefined,
    genres: movie.genres,
    keywords: movie.keywords,
    description: movie.description || undefined,
    sentimentContext
  });

  const duration = Date.now() - startTime;

  if (!result.success) {
    console.error(`❌ Falha: ${result.error}`);
    process.exit(1);
  }

  console.log(`\n✅ Resposta recebida em ${duration}ms!`);
  console.log(`💰 Custo da inferência: $${result.cost?.toFixed(6) || 'N/A'}`);
  console.log('\n📊 Probabilidades calculadas pelo Jev:');
  console.table(
    Object.entries(result.probabilities || {}).map(([key, value]) => ({
      Categoria: key,
      Probabilidade: `${(value * 100).toFixed(1)}%`,
      Ativado: value >= 0.70 ? 'SIM (>= 70%)' : 'NÃO'
    }))
  );

  console.log(`\n🎯 Alerta Gerado pelo Jev:\n"${result.warning}"\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

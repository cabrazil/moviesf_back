/**
 * updateContentWarnings.ts
 *
 * Atualiza o campo `contentWarnings` de filmes no banco de dados usando a Jev Engine (OpenRouter).
 * Não altera jornadas, reflexões ou sugestões já gravadas.
 *
 * Uso:
 *   # Para um filme específico:
 *   npx ts-node src/scripts/updateContentWarnings.ts --title="A Captura" --year=2026
 *
 *   # Modo simulação (apenas exibe sem salvar):
 *   npx ts-node src/scripts/updateContentWarnings.ts --title="A Vida Depois" --year=2021 --dry-run
 *
 *   # Para todos os filmes que estão com contentWarnings = null:
 *   npx ts-node src/scripts/updateContentWarnings.ts --missing
 */

import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { jevService, getCategoryThreshold } from '../services/jevService';

const prisma = new PrismaClient();

async function processMovieWarnings(
  movie: {
    id: string;
    title: string;
    year: number | null;
    genres: string[];
    keywords: string[];
    description: string | null;
    certification?: string | null;
    contentWarnings: string | null;
  },
  dryRun: boolean
): Promise<{ success: boolean; warning?: string; cost?: number }> {
  console.log(`\n🎬 Processando: "${movie.title}" (${movie.year || 'N/A'})`);
  console.log(`   🏷 Gêneros: ${movie.genres.join(', ') || 'N/A'}`);
  console.log(`   🏛 Alerta atual: ${movie.contentWarnings ? `"${movie.contentWarnings}"` : 'null'}`);

  const movieSentiments = await prisma.movieSentiment.findMany({
    where: { movieId: movie.id },
    include: { subSentiment: true },
    orderBy: { relevance: 'desc' },
    take: 3
  });

  const sentimentContext = movieSentiments.length > 0
    ? movieSentiments.map(ms => `${ms.subSentiment.name}: ${ms.explanation || ''}`).join(' | ')
    : undefined;

  const result = await jevService.evaluateContentWarnings({
    title: movie.title,
    year: movie.year || undefined,
    genres: movie.genres,
    keywords: movie.keywords,
    description: movie.description || undefined,
    sentimentContext,
    certification: movie.certification || undefined
  });

  if (!result.success || !result.warning) {
    console.error(`   ❌ Falha ao avaliar via Jev: ${result.error || 'Nenhum alerta gerado'}`);
    return { success: false };
  }

  console.log(`   ⚠️ Novo Alerta Jev: "${result.warning}" (Custo: $${result.cost?.toFixed(6) || '0.00004'})`);

  if (!dryRun) {
    await prisma.movie.update({
      where: { id: movie.id },
      data: { contentWarnings: result.warning }
    });
    console.log(`   💾 Salvo com sucesso no banco de dados.`);
  } else {
    console.log(`   👁️ Modo --dry-run ativo: nenhuma alteração gravada.`);
  }

  return { success: true, warning: result.warning, cost: result.cost };
}

async function main() {
  const args = process.argv.slice(2);
  let searchTitle: string | undefined;
  let searchYear: number | undefined;
  let processMissing = false;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--title=')) {
      searchTitle = arg.split('=')[1].replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--year=') || arg.startsWith('-y=')) {
      searchYear = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--missing' || arg === '--all-missing') {
      processMissing = true;
    } else if (arg === '--dry-run' || arg === '--preview') {
      dryRun = true;
    } else if (!arg.startsWith('--') && !searchTitle) {
      searchTitle = arg;
    }
  }

  if (!searchTitle && !processMissing) {
    console.log(`
⚠️ Uso do script updateContentWarnings:
  npx ts-node src/scripts/updateContentWarnings.ts --title="Nome do Filme" [--year=2024] [--dry-run]
  npx ts-node src/scripts/updateContentWarnings.ts --missing [--dry-run]
`);
    process.exit(0);
  }

  const startTime = Date.now();

  if (processMissing) {
    console.log(`🔍 Buscando filmes com contentWarnings = null no banco de dados...`);
    const movies = await prisma.movie.findMany({
      where: { contentWarnings: null },
      select: {
        id: true,
        title: true,
        year: true,
        genres: true,
        keywords: true,
        description: true,
        certification: true,
        contentWarnings: true
      },
      orderBy: { title: 'asc' }
    });

    console.log(`Encontrados ${movies.length} filme(s) sem contentWarnings.`);

    let successCount = 0;
    let totalCost = 0;

    for (const m of movies) {
      const res = await processMovieWarnings(m, dryRun);
      if (res.success) {
        successCount++;
        totalCost += res.cost || 0.00004;
      }
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 Finalizado em ${durationSec}s! ${successCount}/${movies.length} filmes atualizados. Custo total aprox: $${totalCost.toFixed(5)}`);
  } else if (searchTitle) {
    const movie = await prisma.movie.findFirst({
      where: {
        title: { equals: searchTitle, mode: 'insensitive' },
        ...(searchYear ? { year: searchYear } : {})
      },
      select: {
        id: true,
        title: true,
        year: true,
        genres: true,
        keywords: true,
        description: true,
        certification: true,
        contentWarnings: true
      }
    });

    if (!movie) {
      console.error(`❌ Filme "${searchTitle}"${searchYear ? ` (${searchYear})` : ''} não encontrado no banco.`);
      process.exit(1);
    }

    await processMovieWarnings(movie, dryRun);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

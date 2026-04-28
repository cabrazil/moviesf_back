/**
 * updateMovieEntryTypes.ts
 *
 * Popula o campo `emotionalEntryType` nos filmes existentes usando a função
 * `inferEntryType` baseada nos SubSentiments com relevância >= MIN_RELEVANCE.
 *
 * Uso:
 *   # Ver o que seria atualizado sem salvar
 *   npx ts-node src/scripts/updateMovieEntryTypes.ts --dry-run
 *
 *   # Aplicar em todos os filmes
 *   npx ts-node src/scripts/updateMovieEntryTypes.ts
 *
 *   # Aplicar em um filme específico
 *   npx ts-node src/scripts/updateMovieEntryTypes.ts --title="The Shape of Water" --year=2017
 *
 *   # Forçar recálculo mesmo em filmes que já têm o campo preenchido
 *   npx ts-node src/scripts/updateMovieEntryTypes.ts --force
 */

import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { inferEntryType, EmotionalEntryType } from '../utils/emotionalEntryType';

const prisma = new PrismaClient();

// Somente subSentiments com relevância suficiente entram na inferência
const MIN_RELEVANCE = 0.90;

interface UpdateResult {
  movieId: string;
  title: string;
  year: number | null;
  subSentimentsUsed: number;
  subSentimentsTotal: number;
  inferredType: EmotionalEntryType;
  previousType: string | null;
  changed: boolean;
  updated: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

async function processMovie(
  movie: { id: string; title: string; year: number | null; emotionalEntryType: string | null },
  dryRun: boolean,
  force: boolean
): Promise<UpdateResult | null> {

  // Buscar TODOS os MovieSentiments do filme com seus SubSentiment names
  const movieSentiments = await prisma.movieSentiment.findMany({
    where: { movieId: movie.id },
    select: {
      relevance: true,
      subSentiment: { select: { name: true } },
    },
  });

  if (movieSentiments.length === 0) {
    console.log(`  ⚠️  Sem MovieSentiments — pulando`);
    return null;
  }

  // Filtrar por threshold de relevância
  const qualified = movieSentiments.filter(
    ms => ms.relevance !== null && Number(ms.relevance) >= MIN_RELEVANCE
  );

  if (qualified.length === 0) {
    console.log(`  ⚠️  Nenhum SubSentiment com relevância ≥ ${MIN_RELEVANCE} — pulando`);
    return null;
  }

  const subNames = qualified.map(ms => ms.subSentiment.name);
  const inferredType = inferEntryType(subNames);
  const previousType = movie.emotionalEntryType;
  const changed = previousType !== inferredType;

  const result: UpdateResult = {
    movieId: movie.id,
    title: movie.title,
    year: movie.year,
    subSentimentsUsed: qualified.length,
    subSentimentsTotal: movieSentiments.length,
    inferredType,
    previousType,
    changed,
    updated: false,
  };

  // Log de diagnóstico
  const changeLabel = !previousType
    ? '🆕 novo'
    : changed
    ? `🔄 ${previousType} → ${inferredType}`
    : `✅ igual (${inferredType})`;

  console.log(`  SubSentiments: ${qualified.length}/${movieSentiments.length} qualificados (≥ ${MIN_RELEVANCE})`);
  console.log(`  Inferido: ${inferredType} ${changeLabel}`);

  // Pular se já está preenchido e não é --force
  if (previousType && !force && !changed) {
    console.log(`  ⏭️  Já preenchido e sem alteração — pulando (use --force para sobrescrever)`);
    return result;
  }

  // Aplicar no banco se não for dry-run
  if (!dryRun && (changed || !previousType || force)) {
    await prisma.movie.update({
      where: { id: movie.id },
      data: { emotionalEntryType: inferredType },
    });
    result.updated = true;
    console.log(`  💾 Salvo no banco`);
  } else if (dryRun) {
    console.log(`  🔍 Seria salvo (dry-run)`);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  let title: string | undefined;
  let year: number | undefined;
  let startsWith: string | undefined;
  let dryRun = false;
  let force = false;

  for (const arg of args) {
    if (arg.startsWith('--title=')) title = arg.split('=')[1].replace(/"/g, '');
    else if (arg.startsWith('--year=')) year = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--startsWith=')) startsWith = arg.split('=')[1].replace(/"/g, '');
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--force') force = true;
  }

  if (title && !year) {
    console.error('❌ --title requer --year');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎭 ATUALIZAÇÃO: emotionalEntryType');
  console.log(`📏 Threshold de relevância: ≥ ${MIN_RELEVANCE}`);
  console.log(`${dryRun ? '🔍 MODO DRY-RUN (sem gravação)' : '💾 MODO GRAVAÇÃO'}${force ? ' + --force (sobrescreve existentes)' : ''}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Montar filtro de busca
    const whereClause: any = {};
    if (title && year) {
      // Busca por filme específico — sempre inclui, independente de já ter o campo
      whereClause.title = { contains: title, mode: 'insensitive' };
      whereClause.year = year;
    } else {
      if (!force) {
        // Sem título e sem --force → processa apenas filmes ainda sem o campo
        whereClause.emotionalEntryType = null;
      }
      if (startsWith) {
        whereClause.title = { startsWith: startsWith, mode: 'insensitive' };
      }
    }

    const movies = await prisma.movie.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        year: true,
        emotionalEntryType: true,
      },
      orderBy: { title: 'asc' },
    });

    if (movies.length === 0) {
      console.log('⚠️  Nenhum filme encontrado para processar.');
      console.log('   (Use --force para reprocessar filmes já preenchidos)');
      return;
    }

    console.log(`📋 Filmes a processar: ${movies.length}\n`);
    console.log('─'.repeat(63));

    const results: UpdateResult[] = [];

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i] as { id: string; title: string; year: number | null; emotionalEntryType: string | null };
      console.log(`\n[${i + 1}/${movies.length}] 🎬 ${movie.title} (${movie.year ?? '?'})`);

      const result = await processMovie(movie, dryRun, force);
      if (result) results.push(result);

      console.log('─'.repeat(63));
    }

    // ── Resumo ──────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMO');
    console.log('═══════════════════════════════════════════════════════════');

    const updated  = results.filter(r => r.updated).length;
    const skipped  = results.filter(r => !r.updated && !dryRun).length;
    const wouldUpdate = results.filter(r => !r.updated && dryRun && (r.changed || !r.previousType)).length;

    const byType = results.reduce((acc, r) => {
      acc[r.inferredType] = (acc[r.inferredType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`Total processados:  ${results.length}`);
    if (dryRun) {
      console.log(`Seriam atualizados: ${wouldUpdate}`);
      console.log(`Sem alteração:      ${results.length - wouldUpdate}`);
    } else {
      console.log(`✅ Atualizados:     ${updated}`);
      console.log(`⏭️  Sem alteração:   ${skipped}`);
    }

    console.log('\nDistribuição por tipo:');
    console.log(`  ALIGNED      → ${byType['ALIGNED'] || 0} filmes`);
    console.log(`  TRANSITIONAL → ${byType['TRANSITIONAL'] || 0} filmes`);
    console.log(`  COMPLEX      → ${byType['COMPLEX'] || 0} filmes`);

    // Top exemplos por tipo
    const examples = (type: string) =>
      results
        .filter(r => r.inferredType === type)
        .slice(0, 3)
        .map(r => r.title)
        .join(', ');

    if (results.length > 0) {
      console.log('\nExemplos:');
      if (byType['ALIGNED'])      console.log(`  ALIGNED:      ${examples('ALIGNED')}`);
      if (byType['TRANSITIONAL']) console.log(`  TRANSITIONAL: ${examples('TRANSITIONAL')}`);
      if (byType['COMPLEX'])      console.log(`  COMPLEX:      ${examples('COMPLEX')}`);
    }

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

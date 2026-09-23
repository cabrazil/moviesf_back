import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { jevService, SubSentimentCandidate } from '../services/jevService';

const prisma = new PrismaClient();

/**
 * Calcula o relevanceScore oficial a partir de uma lista de relevâncias
 * Fórmula: min( (Média^1.5 * 10) * sqrt(matches/total) + (cobertura >= 0.5 ? 0.5 : 0), 10.0 )
 */
function computeRelevanceScore(relevances: number[], totalExpected: number): number {
  if (relevances.length === 0 || totalExpected === 0) return 0;
  const avg = relevances.reduce((acc, r) => acc + r, 0) / relevances.length;
  const intensity = Math.pow(avg, 1.5) * 10;
  const coverage = relevances.length / totalExpected;
  const bonus = coverage >= 0.5 ? 0.5 : 0.0;
  const score = intensity * Math.sqrt(coverage) + bonus;
  return Math.min(Number(score.toFixed(3)), 10.0);
}

async function main() {
  const args = process.argv.slice(2);
  let customThreshold = 0.55;
  let targetJofId: number | undefined;
  let targetLensId: number | undefined;
  let searchInput: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--thresh=') || arg.startsWith('--threshold=')) {
      const val = parseFloat(arg.split('=')[1]);
      if (!isNaN(val) && val > 0 && val <= 1) customThreshold = val;
    } else if (arg.startsWith('--jof=')) {
      targetJofId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--lens=')) {
      targetLensId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--title=')) {
      searchInput = arg.split('=')[1];
    } else if (!searchInput && !arg.startsWith('--')) {
      searchInput = arg;
    }
  }

  console.log('🎬 === PROVA DE CONCEITO: ANÁLISE DE SENTIMENTOS COM JEV (TYPESAFE AI) ===\n');

  // 1. Buscar Filme
  let movie: any = null;
  if (searchInput && !isNaN(Number(searchInput))) {
    movie = await prisma.movie.findUnique({
      where: { tmdbId: parseInt(searchInput, 10) },
      include: {
        movieSentiments: {
          include: { subSentiment: true }
        },
        movieSuggestionFlows: {
          include: { journeyOptionFlow: true }
        }
      }
    });
  } else if (searchInput) {
    movie = await prisma.movie.findFirst({
      where: { title: { contains: searchInput, mode: 'insensitive' } },
      include: {
        movieSentiments: {
          include: { subSentiment: true }
        },
        movieSuggestionFlows: {
          include: { journeyOptionFlow: true }
        }
      }
    });
  } else {
    // Pegar o filme curado mais recente
    const recentSuggestion = await prisma.movieSuggestionFlow.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        movie: {
          include: {
            movieSentiments: {
              include: { subSentiment: true }
            },
            movieSuggestionFlows: {
              include: { journeyOptionFlow: true }
            }
          }
        },
        journeyOptionFlow: true
      }
    });
    if (recentSuggestion) {
      movie = recentSuggestion.movie;
      if (!targetJofId) targetJofId = recentSuggestion.journeyOptionFlowId;
    }
  }

  if (!movie) {
    console.error('❌ Nenhum filme encontrado no banco para o critério informado.');
    console.log('Dica: Use `npx ts-node src/scripts/testJevSentimentAnalysis.ts "Nome do Filme"` ou passe um TMDB ID.');
    process.exit(1);
  }

  // 2. Determinar JourneyOptionFlow
  if (!targetJofId) {
    if (movie.movieSuggestionFlows && movie.movieSuggestionFlows.length > 0) {
      targetJofId = movie.movieSuggestionFlows[0].journeyOptionFlowId;
    } else {
      console.error('❌ Filme não possui jornada associada (movieSuggestionFlow). Especifique `--jof=ID`.');
      process.exit(1);
    }
  }

  const jof = await prisma.journeyOptionFlow.findUnique({
    where: { id: targetJofId },
    include: {
      journeyStepFlow: {
        include: {
          journeyFlow: {
            include: { mainSentiment: true }
          }
        }
      }
    }
  });

  if (!jof) {
    console.error(`❌ JourneyOptionFlow com ID ${targetJofId} não encontrado.`);
    process.exit(1);
  }

  // 3. Determinar Lente Principal
  const mainSentiment = targetLensId
    ? await prisma.mainSentiment.findUnique({ where: { id: targetLensId } })
    : jof.journeyStepFlow?.journeyFlow?.mainSentiment || null;

  // Buscar SubSentimentos da JOF
  const jofSubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
    where: { journeyOptionFlowId: targetJofId },
    orderBy: { weight: 'desc' }
  });

  const subSentimentIds = jofSubSentiments.map(s => s.subSentimentId);
  const subSentiments = await prisma.subSentiment.findMany({
    where: { id: { in: subSentimentIds } }
  });

  const subMap = new Map(subSentiments.map(s => [s.id, s]));

  const candidates: SubSentimentCandidate[] = jofSubSentiments.map(jofss => {
    const sub = subMap.get(jofss.subSentimentId);
    return {
      id: jofss.subSentimentId,
      name: sub?.name || `SubSentiment ${jofss.subSentimentId}`,
      keywords: sub?.keywords || [],
      expectedWeight: Number(jofss.weight)
    };
  });

  console.log(`📌 Filme: "${movie.title}" (${movie.year}) [TMDB: ${movie.tmdbId}]`);
  console.log(`🏷 Gêneros: ${movie.genres?.join(', ') || 'N/A'}`);
  console.log(`🔑 Keywords (${movie.keywords?.length || 0}): ${movie.keywords?.slice(0, 15).join(', ') || 'N/A'}`);
  console.log(`📝 Sinopse: ${movie.description?.substring(0, 180)}...`);
  console.log(`\n🎯 Jornada Alvo [ID ${jof.id}]: "${jof.text}"`);
  console.log(`🎭 Lente: ${mainSentiment ? `${mainSentiment.name} (ID: ${mainSentiment.id})` : 'Padrão'}`);
  console.log(`⚙️ Limiar de Ativação do Jev: ${(customThreshold * 100).toFixed(0)}%`);
  console.log(`📋 SubSentimentos configurados na JOF: ${candidates.length}`);

  // Mapa de sentimentos existentes no banco gravados pelo LLM Legado
  const dbSentimentsMap = new Map<number, { relevance: number; explanation?: string }>();
  for (const ms of movie.movieSentiments || []) {
    dbSentimentsMap.set(ms.subSentimentId, {
      relevance: Number(ms.relevance),
      explanation: ms.explanation || undefined
    });
  }

  // 5. Chamar o Jev
  console.log('\n⏳ Enviando perguntas estruturadas ao Jev via OpenRouter...');
  const jevResult = await jevService.evaluateSentimentAlignment(
    {
      title: movie.title,
      year: movie.year || undefined,
      genres: movie.genres,
      keywords: movie.keywords,
      description: movie.description || undefined,
      journeyOptionText: jof.text,
      mainSentimentName: mainSentiment?.name,
      mainSentimentKeywords: mainSentiment?.keywords || [],
      candidates
    },
    { threshold: customThreshold }
  );

  if (!jevResult.success || !jevResult.alignments) {
    console.error(`❌ Falha no Jev: ${jevResult.error}`);
    process.exit(1);
  }

  console.log(`✅ Resposta do Jev recebida em ${jevResult.durationMs}ms!`);
  console.log(`💰 Custo da inferência Jev: $${jevResult.cost?.toFixed(6) || 'N/A'}`);

  // 6. Montar Comparação Lado a Lado
  const jevAlignmentsMap = new Map<number, typeof jevResult.alignments[0]>();
  for (const al of jevResult.alignments) {
    jevAlignmentsMap.set(al.subSentimentId, al);
  }

  const comparisonRows = candidates.map(cand => {
    const dbRecord = dbSentimentsMap.get(cand.id);
    const jevRecord = jevAlignmentsMap.get(cand.id);

    const dbRelevance = dbRecord ? dbRecord.relevance : null;
    const jevRelevance = jevRecord ? jevRecord.relevance : 0;
    const isJevActive = jevRelevance >= customThreshold;
    const isDbActive = dbRecord !== undefined;

    let deltaStr = '-';
    if (dbRelevance !== null) {
      const diff = jevRelevance - dbRelevance;
      deltaStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`;
    }

    return {
      id: cand.id,
      name: cand.name,
      expectedWeight: cand.expectedWeight?.toFixed(1) || '1.0',
      dbRelevance: dbRelevance !== null ? dbRelevance.toFixed(2) : '-',
      dbStatus: isDbActive ? '✅ Gravado' : '❌ Não gravado',
      jevRelevance: jevRelevance.toFixed(2),
      jevProb: `${(jevRelevance * 100).toFixed(1)}%`,
      jevStatus: isJevActive ? `✅ Ativo` : '❌ Descartado',
      delta: deltaStr,
      isDbActive,
      isJevActive,
      numericDbRelevance: dbRelevance,
      numericJevRelevance: jevRelevance
    };
  });

  console.log('\n📊 === TABELA COMPARATIVA: LLM LEGADO vs. JEV (TYPESAFE AI) ===');
  console.table(
    comparisonRows.map(row => ({
      'SubSentimento': row.name,
      'Peso JOF': row.expectedWeight,
      'LLM Legado': row.dbRelevance,
      'Status LLM': row.dbStatus,
      'Jev (Score)': row.jevRelevance,
      'Decisão Jev': row.jevStatus,
      'Delta (Jev - LLM)': row.delta
    }))
  );

  // 7. Estatísticas e Impacto no RelevanceScore
  const dbActiveList = comparisonRows.filter(r => r.isDbActive && r.numericDbRelevance !== null);
  const jevActiveList = comparisonRows.filter(r => r.isJevActive);

  const dbRelevances = dbActiveList.map(r => r.numericDbRelevance!);
  const jevRelevances = jevActiveList.map(r => r.numericJevRelevance);

  const dbScore = computeRelevanceScore(dbRelevances, candidates.length);
  const jevScore = computeRelevanceScore(jevRelevances, candidates.length);

  console.log('\n📈 === COMPARAÇÃO DE RELEVANCE SCORE DA JORNADA ===');
  console.log(`📋 Total de SubSentimentos esperados na JOF: ${candidates.length}`);
  console.log(`🤖 LLM Legado:  ${dbActiveList.length}/${candidates.length} matches | Score Calculado: ${dbScore.toFixed(3)}`);
  console.log(`⚡ Jev Engine:   ${jevActiveList.length}/${candidates.length} matches | Score Calculado: ${jevScore.toFixed(3)}`);

  const existingFlowScore = movie.movieSuggestionFlows?.find((f: any) => f.journeyOptionFlowId === targetJofId)?.relevanceScore;
  if (existingFlowScore) {
    console.log(`🏛 Score salvo no banco (MovieSuggestionFlow): ${Number(existingFlowScore).toFixed(3)}`);
  }

  // 8. Diagnóstico de Alinhamento
  const concordances = comparisonRows.filter(r => r.isDbActive === r.isJevActive).length;
  const concordanceRate = ((concordances / comparisonRows.length) * 100).toFixed(1);
  console.log(`\n🎯 Taxa de Concordância de Decisão: ${concordanceRate}% (${concordances}/${comparisonRows.length} conceitos)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface RecalculationResult {
  movieId: string;
  movieTitle: string;
  journeyOptionFlowId: number;
  journeyName: string;
  oldScore: number;
  newScore: number;
  matchCount: number;
  averageWeight: number;
  updated: boolean;
  coverageRatio?: number;
  intensity?: number;
  totalExpected?: number;
}

/**
 * Calcula o relevanceScore usando a fórmula refinada de Intensidade × Abrangência:
 * 
 * Intensidade (Base): (Média das Relevâncias)^1.5 × 10
 * Abrangência (Cobertura): × √(Matches Únicos / Total Únicos Esperados)
 * Bônus: +0.5 se cobertura >= 50%
 * Teto máximo: 10.0
 * 
 * @param uniqueMatches - Map de nomes únicos de SubSentiments com suas maiores relevâncias
 * @param totalUniqueExpected - Total de nomes únicos esperados pela jornada
 */
function calculateRelevanceScore(
  uniqueMatches: Map<string, number>,
  totalUniqueExpected: number
): {
  score: number;
  average: number;
  matchCount: number;
  coverageRatio: number;
  intensity: number;
  bonus: number;
} {
  if (uniqueMatches.size === 0 || totalUniqueExpected === 0) {
    return {
      score: 0,
      average: 0,
      matchCount: 0,
      coverageRatio: 0,
      intensity: 0,
      bonus: 0
    };
  }

  const matchCount = uniqueMatches.size;
  const relevances = Array.from(uniqueMatches.values());
  const average = relevances.reduce((sum, r) => sum + r, 0) / matchCount;

  // INTENSIDADE: (Média)^1.5 × 10
  const intensity = Math.pow(average, 1.5) * 10;

  // ABRANGÊNCIA: Raiz quadrada da razão de cobertura
  const coverageRatio = matchCount / totalUniqueExpected;
  const sqrtCoverage = Math.sqrt(coverageRatio);

  // SCORE BASE: Intensidade × √Abrangência
  let score = intensity * sqrtCoverage;

  // BÔNUS: +0.5 se cobertura >= 50%
  let bonus = 0;
  if (coverageRatio >= 0.5) {
    bonus = 0.5;
    score += bonus;
  }

  // Aplicar teto de 10.0
  score = Math.min(score, 10.0);

  // Arredondar para 3 casas decimais
  score = Math.round(score * 1000) / 1000;

  return {
    score,
    average,
    matchCount,
    coverageRatio: Math.round(coverageRatio * 1000) / 1000,
    intensity: Math.round(intensity * 1000) / 1000,
    bonus
  };
}

/**
 * Busca um filme por ID ou por título + ano
 */
async function findMovie(
  movieId?: string,
  title?: string,
  year?: number
): Promise<{ id: string; title: string } | null> {
  if (movieId) {
    // Buscar por ID
    return await prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true, title: true }
    });
  } else if (title && year) {
    // Buscar por título e ano
    return await prisma.movie.findFirst({
      where: {
        title: title,
        year: year
      },
      select: { id: true, title: true }
    });
  }
  return null;
}

async function recalculateForMovie(
  movieId: string,
  minScore: number,
  dryRun: boolean,
  jofId?: number
): Promise<RecalculationResult[]> {
  const results: RecalculationResult[] = [];

  // Buscar o filme
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { id: true, title: true }
  });

  if (!movie) {
    throw new Error(`Filme com ID ${movieId} não encontrado`);
  }

  console.log(`\n🎬 Processando: ${movie.title} (${movieId})`);
  if (jofId) {
    console.log(`🎯 Jornada específica: ${jofId}`);
  }
  console.log(`📊 Filtro: Apenas scores < ${minScore}`);
  console.log(`${dryRun ? '🔍 MODO DRY-RUN (sem gravação)' : '💾 MODO GRAVAÇÃO'}\n`);

  // Buscar todas as sugestões deste filme
  const whereClause: any = {
    movieId: movieId,
    relevanceScore: {
      lt: minScore
    }
  };

  // Se jofId foi especificado, filtrar por ele
  if (jofId) {
    whereClause.journeyOptionFlowId = jofId;
  }

  const suggestions = await prisma.movieSuggestionFlow.findMany({
    where: whereClause,
    include: {
      journeyOptionFlow: true
    },
    orderBy: {
      relevanceScore: 'asc'
    }
  });

  if (suggestions.length === 0) {
    console.log(`⚠️  Nenhuma sugestão encontrada com score < ${minScore}`);
    return results;
  }

  console.log(`📋 Encontradas ${suggestions.length} sugestões para processar\n`);

  for (const suggestion of suggestions) {
    const journeyOptionFlowId = suggestion.journeyOptionFlowId;
    const oldScoreDecimal = suggestion.relevanceScore;
    const oldScore = oldScoreDecimal ? Number(oldScoreDecimal) : 0;

    // PASSO 1: NORMALIZAÇÃO - Buscar SubSentiments esperados
    const expectedSubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
      where: {
        journeyOptionFlowId: journeyOptionFlowId
      },
      select: {
        subSentimentId: true
      }
    });

    const subSentimentIds = expectedSubSentiments.map(item => item.subSentimentId);

    if (subSentimentIds.length === 0) {
      console.log(`⚠️  Jornada ${journeyOptionFlowId} não tem SubSentiments configurados. Pulando...`);
      continue;
    }

    // Buscar os nomes dos SubSentiments para criar Set de nomes únicos
    const subSentiments = await prisma.subSentiment.findMany({
      where: {
        id: {
          in: subSentimentIds
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Criar Set de nomes únicos para definir o denominador real
    const uniqueExpectedNames = new Set<string>();
    subSentiments.forEach(ss => {
      uniqueExpectedNames.add(ss.name);
    });

    const totalUniqueExpected = uniqueExpectedNames.size;

    // PASSO 2: MAPEAMENTO SEMÂNTICO - Buscar TODOS os sentimentos do filme
    // Usar queryRaw com INNER JOIN para evitar registros órfãos automaticamente
    const allMovieSentiments: Array<{
      movieId: string;
      mainSentimentId: number;
      subSentimentId: number;
      relevance: any;
      subSentiment: {
        id: number;
        name: string;
      };
    }> = await prisma.$queryRaw`
      SELECT 
        ms."movieId",
        ms."mainSentimentId",
        ms."subSentimentId",
        ms.relevance,
        jsonb_build_object('id', ss.id, 'name', ss.name) as "subSentiment"
      FROM "MovieSentiment" ms
      INNER JOIN "SubSentiment" ss ON ms."subSentimentId" = ss.id
      WHERE ms."movieId" = ${movieId}::uuid
    `;

    // Filtrar apenas os que têm subSentiment válido e nome correspondente aos esperados
    const movieSentiments = allMovieSentiments.filter(ms =>
      ms.subSentiment && uniqueExpectedNames.has(ms.subSentiment.name)
    );

    // Regra de Conflito: Para cada nome, manter apenas a MAIOR relevância
    const uniqueMatches = new Map<string, number>();

    movieSentiments.forEach(ms => {
      if (!ms.subSentiment) return; // Proteção extra

      const name = ms.subSentiment.name;
      const relevance = Number(ms.relevance);

      if (!uniqueMatches.has(name) || uniqueMatches.get(name)! < relevance) {
        uniqueMatches.set(name, relevance);
      }
    });

    // PASSO 3: CÁLCULO - Nova fórmula de Intensidade × Abrangência
    const { score: newScore, average, matchCount, coverageRatio, intensity, bonus } =
      calculateRelevanceScore(uniqueMatches, totalUniqueExpected);

    const journeyName = `${movie.title} | Jornada ${journeyOptionFlowId}`;

    const result: RecalculationResult = {
      movieId: movie.id,
      movieTitle: movie.title,
      journeyOptionFlowId,
      journeyName,
      oldScore,
      newScore,
      matchCount,
      averageWeight: average,
      updated: false,
      coverageRatio,
      intensity,
      totalExpected: totalUniqueExpected
    };

    // Mostrar comparação
    const scoreDiff = newScore - oldScore;
    const diffSymbol = scoreDiff > 0 ? '📈' : scoreDiff < 0 ? '📉' : '➡️';
    const diffColor = scoreDiff > 0 ? '+' : '';

    console.log(`${diffSymbol} ${journeyName}`);
    console.log(`   Matches: ${matchCount}/${totalUniqueExpected} nomes únicos | Cobertura: ${(coverageRatio * 100).toFixed(1)}%`);
    console.log(`   Intensidade: ${intensity.toFixed(3)} × √Cobertura: ${Math.sqrt(coverageRatio).toFixed(3)}${bonus > 0 ? ` + Bônus: ${bonus}` : ''}`);
    console.log(`   Média: ${average.toFixed(3)} | Score: ${oldScore.toFixed(3)} → ${newScore.toFixed(3)} (${diffColor}${scoreDiff.toFixed(3)})`);

    // Atualizar sempre (sem trava de "apenas se maior")
    if (!dryRun) {
      await prisma.movieSuggestionFlow.update({
        where: {
          id: suggestion.id
        },
        data: {
          relevanceScore: new Prisma.Decimal(newScore)
        }
      });
      result.updated = true;
      console.log(`   ✅ Atualizado no banco`);
    } else {
      console.log(`   🔍 Seria atualizado (dry-run)`);
    }

    console.log('');
    results.push(result);
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);

  // Parse argumentos
  let movieId: string | undefined;
  let title: string | undefined;
  let year: number | undefined;
  let journeyId: number | undefined;
  let jofId: number | undefined;
  let minScore = 5.0;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--movieId=')) {
      movieId = arg.split('=')[1];
    } else if (arg.startsWith('--title=')) {
      title = arg.split('=')[1].replace(/"/g, ''); // Remove aspas
    } else if (arg.startsWith('--year=')) {
      year = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--journeyId=')) {
      journeyId = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--jofId=')) {
      jofId = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--minScore=')) {
      minScore = parseFloat(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  // Validar parâmetros obrigatórios
  const hasMovieIdentifier = movieId || (title && year);

  if (!hasMovieIdentifier && !journeyId && !jofId) {
    console.error('❌ Erro: Especifique um filme (--movieId ou --title + --year), --journeyId ou --jofId');
    console.log('\nUso:');
    console.log('  npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --movieId=ID [--jofId=ID] [--minScore=5.0] [--dry-run]');
    console.log('  npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --title="Título" --year=YYYY [--jofId=ID] [--minScore=5.0] [--dry-run]');
    console.log('  npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --journeyId=ID [--minScore=5.0] [--dry-run]');
    console.log('  npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --jofId=ID [--minScore=5.0] [--dry-run]');
    console.log('\nExemplos:');
    console.log('  # Recalcular um filme específico por ID');
    console.log('  npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --movieId=abc123 --dry-run');
    console.log('  # Recalcular um filme específico por título e ano');
    console.log('  npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --title="Meu Amigo Totoro" --year=1988 --dry-run');
    console.log('  # Recalcular apenas uma jornada de um filme');
    console.log('  npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --title="Meu Amigo Totoro" --year=1988 --jofId=42 --dry-run');
    console.log('  # Recalcular todos os filmes de uma jornada específica (jofId)');
    console.log('  npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --jofId=42 --dry-run');
    console.log('  # Recalcular todos os filmes de uma jornada (journeyId - DEPRECATED)');
    console.log('  npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --journeyId=42 --minScore=3.0');
    process.exit(1);
  }

  // Validar que title e year vêm juntos
  if ((title && !year) || (!title && year)) {
    console.error('❌ Erro: --title e --year devem ser usados juntos');
    process.exit(1);
  }

  // Validar exclusividade
  const identifierCount = [movieId, title, journeyId, jofId].filter(Boolean).length;
  if (identifierCount > 1 && !(movieId && jofId) && !(title && jofId)) {
    console.error('❌ Erro: Use apenas UMA forma de identificar o que processar');
    console.error('  Opções válidas:');
    console.error('  - --movieId [--jofId]');
    console.error('  - --title + --year [--jofId]');
    console.error('  - --journeyId');
    console.error('  - --jofId');
    process.exit(1);
  }

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔄 RECÁLCULO DE RELEVANCE SCORE');
    console.log('💡 Nova Fórmula: Intensidade × Abrangência');
    console.log('═══════════════════════════════════════════════════════════');

    let allResults: RecalculationResult[] = [];

    if (movieId || (title && year)) {
      // Modo: Um filme específico (com ou sem jofId)

      // Buscar o filme (por ID ou por título+ano)
      const movie = await findMovie(movieId, title, year);

      if (!movie) {
        if (movieId) {
          console.error(`❌ Filme não encontrado com ID: ${movieId}`);
        } else {
          console.error(`❌ Filme não encontrado: "${title}" (${year})`);
        }
        process.exit(1);
      }

      console.log(`\n✅ Filme encontrado: ${movie.title} (ID: ${movie.id})`);

      const results = await recalculateForMovie(movie.id, minScore, dryRun, jofId);
      allResults = results;
    } else if (jofId) {
      // Modo: Todos os filmes de uma jornada específica (jofId)
      console.log(`\n🎯 Modo: Recalcular todos os filmes da Jornada ${jofId}`);
      console.log(`📊 Filtro: Apenas scores < ${minScore}`);
      console.log(`${dryRun ? '🔍 MODO DRY-RUN (sem gravação)' : '💾 MODO GRAVAÇÃO'}\n`);

      // Buscar todos os movieId únicos desta jornada
      const suggestions = await prisma.movieSuggestionFlow.findMany({
        where: {
          journeyOptionFlowId: jofId,
          relevanceScore: {
            lt: minScore
          }
        },
        select: {
          movieId: true
        },
        distinct: ['movieId']
      });

      const uniqueMovieIds = suggestions.map(s => s.movieId);

      if (uniqueMovieIds.length === 0) {
        console.log(`⚠️  Nenhum filme encontrado na jornada ${jofId} com score < ${minScore}`);
      } else {
        console.log(`📋 Encontrados ${uniqueMovieIds.length} filmes para processar\n`);
        console.log('─'.repeat(63));

        // Processar cada filme com o jofId específico
        for (let i = 0; i < uniqueMovieIds.length; i++) {
          const currentMovieId = uniqueMovieIds[i];
          console.log(`\n[${i + 1}/${uniqueMovieIds.length}] Processando filme: ${currentMovieId}`);

          const results = await recalculateForMovie(currentMovieId, minScore, dryRun, jofId);
          allResults.push(...results);

          console.log('─'.repeat(63));
        }
      }
    } else if (journeyId) {
      // Modo: Todos os filmes de uma jornada (DEPRECATED - use jofId)
      console.log(`\n⚠️  AVISO: --journeyId está deprecated. Use --jofId para jornadas específicas.`);
      console.log(`🎯 Modo: Recalcular todos os filmes da Jornada ${journeyId}`);
      console.log(`📊 Filtro: Apenas scores < ${minScore}`);
      console.log(`${dryRun ? '🔍 MODO DRY-RUN (sem gravação)' : '💾 MODO GRAVAÇÃO'}\n`);

      // Buscar todos os movieId únicos desta jornada
      const suggestions = await prisma.movieSuggestionFlow.findMany({
        where: {
          journeyOptionFlowId: journeyId,
          relevanceScore: {
            lt: minScore
          }
        },
        select: {
          movieId: true
        },
        distinct: ['movieId']
      });

      const uniqueMovieIds = suggestions.map(s => s.movieId);

      if (uniqueMovieIds.length === 0) {
        console.log(`⚠️  Nenhum filme encontrado na jornada ${journeyId} com score < ${minScore}`);
      } else {
        console.log(`📋 Encontrados ${uniqueMovieIds.length} filmes para processar\n`);
        console.log('─'.repeat(63));

        // Processar cada filme
        for (let i = 0; i < uniqueMovieIds.length; i++) {
          const currentMovieId = uniqueMovieIds[i];
          console.log(`\n[${i + 1}/${uniqueMovieIds.length}] Processando filme: ${currentMovieId}`);

          const results = await recalculateForMovie(currentMovieId, minScore, dryRun);
          allResults.push(...results);

          console.log('─'.repeat(63));
        }
      }
    }

    // Resumo final
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMO GERAL');
    console.log('═══════════════════════════════════════════════════════════');

    if (journeyId) {
      const uniqueMovies = new Set(allResults.map(r => r.movieId)).size;
      console.log(`Filmes processados: ${uniqueMovies}`);
    }

    console.log(`Total de sugestões processadas: ${allResults.length}`);

    const updated = allResults.filter(r => r.updated).length;
    const wouldUpdate = allResults.filter(r => r.newScore > r.oldScore && !r.updated).length;
    const noChange = allResults.filter(r => r.newScore <= r.oldScore).length;

    if (dryRun) {
      console.log(`Seriam atualizados: ${wouldUpdate}`);
      console.log(`Não seriam alterados: ${noChange}`);
    } else {
      console.log(`✅ Atualizados: ${updated}`);
      console.log(`⏭️  Não alterados: ${noChange}`);
    }

    // Estatísticas
    if (allResults.length > 0) {
      const avgOldScore = allResults.reduce((sum, r) => sum + r.oldScore, 0) / allResults.length;
      const avgNewScore = allResults.reduce((sum, r) => sum + r.newScore, 0) / allResults.length;
      const avgCoverage = allResults.reduce((sum, r) => sum + (r.coverageRatio || 0), 0) / allResults.length;
      const avgIntensity = allResults.reduce((sum, r) => sum + (r.intensity || 0), 0) / allResults.length;

      console.log(`\nMédia de scores:`);
      console.log(`  Antes: ${avgOldScore.toFixed(3)}`);
      console.log(`  Depois: ${avgNewScore.toFixed(3)}`);
      console.log(`  Diferença: ${(avgNewScore - avgOldScore).toFixed(3)}`);
      console.log(`\nMétricas da nova fórmula:`);
      console.log(`  Cobertura média: ${(avgCoverage * 100).toFixed(1)}%`);
      console.log(`  Intensidade média: ${avgIntensity.toFixed(3)}`);

      // Top 5 maiores melhorias
      if (wouldUpdate > 0 || updated > 0) {
        const improvements = allResults
          .filter(r => r.newScore > r.oldScore)
          .sort((a, b) => (b.newScore - b.oldScore) - (a.newScore - a.oldScore))
          .slice(0, 5);

        console.log(`\n🏆 Top 5 Maiores Melhorias:`);
        improvements.forEach((r, i) => {
          const diff = r.newScore - r.oldScore;
          console.log(`  ${i + 1}. ${r.movieTitle} | Jornada ${r.journeyOptionFlowId}: +${diff.toFixed(3)}`);
        });
      }
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

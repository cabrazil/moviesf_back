import './scripts-helper';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CandidateEvaluation {
  id: string;
  title: string;
  year: number | null;
  jofScore: number;
  genres: string[];
  keywords: string[];
  cosineSimilarity: number;
  genreSimilarity: number;
  keywordScore: number;
  keywordMatches: string[];
  tonalPenalty: number;
  tonalReason?: string;
  commonSubSentiments: Array<{ name: string; relA: number; relB: number }>;
  finalAffinityScore: number;
}


function calculateCosineSimilarity(
  vecA: Map<number, number>,
  vecB: Map<number, number>
): { cosine: number; commonIds: number[] } {
  if (vecA.size === 0 || vecB.size === 0) {
    return { cosine: 0, commonIds: [] };
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const commonIds: number[] = [];

  for (const [id, valA] of vecA.entries()) {
    normA += valA * valA;
    if (vecB.has(id)) {
      const valB = vecB.get(id)!;
      dotProduct += valA * valB;
      commonIds.push(id);
    }
  }

  for (const [, valB] of vecB.entries()) {
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return { cosine: 0, commonIds: [] };

  return {
    cosine: dotProduct / denominator,
    commonIds
  };
}

function calculateGenreSimilarity(genresA: string[], genresB: string[]): number {
  if (genresA.length === 0 || genresB.length === 0) return 0;
  const setA = new Set(genresA.map(g => g.toLowerCase().trim()));
  const setB = new Set(genresB.map(g => g.toLowerCase().trim()));

  const intersection = Array.from(setA).filter(g => setB.has(g));
  const union = new Set([...Array.from(setA), ...Array.from(setB)]);

  // Jaccard similarity puro (evita bônus artificiais que distorcem a alma do filme)
  return intersection.length / union.size;
}

function calculateKeywordSimilarity(kwsA: string[], kwsB: string[]): { score: number; matches: string[] } {
  if (kwsA.length === 0 || kwsB.length === 0) return { score: 0, matches: [] };
  const setA = new Set(kwsA.map(k => k.toLowerCase().trim()));
  const setB = new Set(kwsB.map(k => k.toLowerCase().trim()));

  const matches = Array.from(setA).filter(k => setB.has(k));
  if (matches.length === 0) return { score: 0, matches: [] };

  // Cada keyword temática em comum é sinal forte de afinidade dramática:
  // 1 kw = 0.40, 2 kws = 0.70, 3+ kws = 1.00
  const score = Math.min(1.0, matches.length * 0.35);
  return { score, matches };
}

interface TonalPenaltyResult {
  penalty: number;
  reason?: string;
}

function calculateTonalPenalty(genresA: string[], genresB: string[]): TonalPenaltyResult {
  const normA = new Set(genresA.map(g => g.toLowerCase().trim()));
  const normB = new Set(genresB.map(g => g.toLowerCase().trim()));

  const isGrittyA = normA.has('faroeste') || normA.has('western') || normA.has('guerra') || normA.has('terror') || normA.has('horror');
  const hasRomanceA = normA.has('romance');
  const isRomanceB = normB.has('romance');
  const isGrittyB = normB.has('faroeste') || normB.has('western') || normB.has('guerra') || normB.has('terror') || normB.has('horror');

  // 1. Árido/Brutal/Guerra/Faroeste vs Romance Doce (sem tom áspero compartilhado)
  if (isGrittyA && !hasRomanceA && isRomanceB && !isGrittyB) {
    return {
      penalty: 1.2,
      reason: 'Conflito tonal: Universo áspero/brutal vs Romance'
    };
  }

  if (normA.has('romance') && !isGrittyA && isGrittyB && !normB.has('romance')) {
    return {
      penalty: 1.2,
      reason: 'Conflito tonal: Romance vs Universo brutal/guerra/horror'
    };
  }

  // 2. Família / Infantil / Animação vs Terror / Guerra / Violência Extrema
  const isFamilyA = normA.has('família') || normA.has('familia') || normA.has('animação') || normA.has('animacao');
  const isDarkB = normB.has('terror') || normB.has('horror') || normB.has('guerra');
  const isFamilyB = normB.has('família') || normB.has('familia') || normB.has('animação') || normB.has('animacao');
  const isDarkA = normA.has('terror') || normA.has('horror') || normA.has('guerra');

  if (isFamilyA && !isDarkA && isDarkB && !isFamilyB) {
    return {
      penalty: 1.5,
      reason: 'Conflito tonal: Familiar/Animação vs Terror/Guerra'
    };
  }

  if (isDarkA && !isFamilyA && isFamilyB && !isDarkB) {
    return {
      penalty: 1.5,
      reason: 'Conflito tonal: Sombrio/Violento vs Familiar/Animação'
    };
  }

  // 3. Comédia Leve vs Guerra / Terror Pesado
  const isComedyOnlyA = (normA.has('comédia') || normA.has('comedia')) && !normA.has('drama');
  if (isComedyOnlyA && isDarkB) {
    return {
      penalty: 1.5,
      reason: 'Conflito tonal: Comédia descontraída vs Guerra/Terror'
    };
  }

  return { penalty: 0 };
}


async function main() {
  const args = process.argv.slice(2);
  let searchTitle: string = 'Boogie Nights';
  let searchYear: number | undefined;

  let forcedJofId: number | undefined;

  for (const arg of args) {
    if (arg.startsWith('--title=')) {
      searchTitle = arg.split('=')[1].replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--year=') || arg.startsWith('-y=')) {
      searchYear = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--jof=') || arg.startsWith('--jofId=')) {
      forcedJofId = parseInt(arg.split('=')[1], 10);
    } else if (!arg.startsWith('--') && isNaN(Number(arg))) {
      searchTitle = arg;
    } else if (!arg.startsWith('--') && !isNaN(Number(arg))) {
      forcedJofId = parseInt(arg, 10);
    }
  }

  console.log(`\n🔬 === SIMULADOR DE AFINIDADE RELACIONAL DE VIBE ===`);
  console.log(`🎯 Filme Alvo: "${searchTitle}" ${searchYear ? `(${searchYear})` : ''}`);

  // 1. Buscar o filme de origem
  const movie = await prisma.movie.findFirst({
    where: {
      title: { contains: searchTitle, mode: 'insensitive' },
      ...(searchYear ? { year: searchYear } : {})
    },
    include: {
      movieSentiments: {
        include: { subSentiment: true }
      },
      movieSuggestionFlows: {
        include: { journeyOptionFlow: true },
        orderBy: { relevanceScore: 'desc' }
      }
    }
  });

  if (!movie) {
    console.error(`❌ Filme "${searchTitle}" não encontrado no banco.`);
    process.exit(1);
  }

  console.log(`✅ Filme localizado: "${movie.title}" (${movie.year}) [ID: ${movie.id}]`);
  console.log(`🎬 Gêneros: ${movie.genres.join(', ') || 'Nenhum'}`);
  console.log(`🏷️ Keywords (${movie.keywords.length}): ${movie.keywords.slice(0, 8).join(', ')}...`);
  console.log(`🧬 Sentimentos Registrados: ${movie.movieSentiments.length}`);

  // 2. Determinar a JOF a ser simulada
  let targetJofId = forcedJofId;
  if (!targetJofId) {
    if (movie.movieSuggestionFlows.length > 0) {
      targetJofId = movie.movieSuggestionFlows[0].journeyOptionFlowId;
      console.log(`🧭 Usando JOF campeã gravada no banco: #${targetJofId}`);
    } else {
      console.log(`⚠️ Filme não possui JOF gravada no banco. Por favor, forneça --jof=<id>.`);
      process.exit(1);
    }
  } else {
    console.log(`🧭 JOF definida pelo usuário para teste: #${targetJofId}`);
  }

  const jof = await prisma.journeyOptionFlow.findUnique({
    where: { id: targetJofId },
    include: {
      journeyStepFlow: {
        include: {
          journeyFlow: { include: { mainSentiment: true } },
          emotionalIntentionJourneySteps: {
            include: { emotionalIntention: { include: { mainSentiment: true } } }
          }
        }
      }
    }
  });

  if (!jof) {
    console.error(`❌ JOF #${targetJofId} não encontrada.`);
    process.exit(1);
  }

  const eij = jof.journeyStepFlow?.emotionalIntentionJourneySteps?.[0]?.emotionalIntention;
  const mainSent = eij?.mainSentiment || jof.journeyStepFlow?.journeyFlow?.mainSentiment;

  console.log(`\n📌 JORNADA TESTADA: [JOF #${jof.id}] ${mainSent?.name?.toUpperCase() || ''} ➔ ${eij?.intentionType || ''}`);
  console.log(`📝 Texto: "${jof.text}"`);
  console.log(`🏷️ Título no Frontend: "${jof.displayTitle || 'N/A'}"`);

  // Montar vetor de sentimentos do filme alvo
  const targetVec = new Map<number, number>();
  const targetSubNames = new Map<number, string>();
  for (const s of movie.movieSentiments) {
    targetVec.set(s.subSentimentId, Number(s.relevance));
    targetSubNames.set(s.subSentimentId, s.subSentiment.name);
  }

  // 3. Buscar candidatos da mesma JOF
  const candidateFlows = await prisma.movieSuggestionFlow.findMany({
    where: {
      journeyOptionFlowId: targetJofId,
      movieId: { not: movie.id }
    },
    include: {
      movie: {
        include: {
          movieSentiments: {
            include: { subSentiment: true }
          }
        }
      }
    },
    orderBy: { relevanceScore: 'desc' }
  });

  if (candidateFlows.length === 0) {
    console.log(`\n⚠️ Não há outros filmes cadastrados na JOF #${targetJofId} para comparar.`);
    process.exit(0);
  }

  console.log(`\n📊 Encontrados ${candidateFlows.length} filmes candidatos na JOF #${targetJofId}.`);

  // 4. Calcular o modelo Antigo (Top 6 por RelevanceScore da JOF)
  const oldVitrine = candidateFlows.slice(0, 6).map(cf => ({
    title: `${cf.movie.title} (${cf.movie.year || 'N/A'})`,
    score: Number(cf.relevanceScore || 0).toFixed(3),
    genres: cf.movie.genres.slice(0, 3).join(', ')
  }));

  // 5. Calcular o modelo Novo (Afinidade Relacional)
  // Pesos Recalibrados:
  // - DNA Emocional (50%): Cosseno dos SubSentimentos (alma do filme)
  // - Força na JOF (30%): RelevanceScore da jornada (garante qualidade temática)
  // - Keywords Semânticas (12%): Overlap de termos dramáticos centrais
  // - Compatibilidade de Gênero (8%): Anti-choque tonal (sem bônus distorcido)
  const W_SENT = 0.50;
  const W_JOF = 0.30;
  const W_KEYWORD = 0.12;
  const W_GENRE = 0.08;

  const evaluatedCandidates: CandidateEvaluation[] = [];

  for (const cf of candidateFlows) {
    const cand = cf.movie;
    const candVec = new Map<number, number>();
    for (const s of cand.movieSentiments) {
      candVec.set(s.subSentimentId, Number(s.relevance));
    }

    const { cosine, commonIds } = calculateCosineSimilarity(targetVec, candVec);
    const genreSim = calculateGenreSimilarity(movie.genres, cand.genres);
    const kwSim = calculateKeywordSimilarity(movie.keywords, cand.keywords);
    const tonal = calculateTonalPenalty(movie.genres, cand.genres);

    const jofScoreNorm = Math.min(1.0, (Number(cf.relevanceScore) || 0) / 10.0);

    const commonSubs = commonIds.map(id => ({
      name: targetSubNames.get(id) || `Sub ${id}`,
      relA: targetVec.get(id) || 0,
      relB: candVec.get(id) || 0
    }));

    // Score Base de Afinidade (0 a 10)
    const rawAffinity =
      (cosine * W_SENT) +
      (jofScoreNorm * W_JOF) +
      (kwSim.score * W_KEYWORD) +
      (genreSim * W_GENRE);

    const baseScore = rawAffinity * 10;
    const finalScore = Number(Math.max(0, baseScore - tonal.penalty).toFixed(3));

    evaluatedCandidates.push({
      id: cand.id,
      title: cand.title,
      year: cand.year,
      jofScore: Number(cf.relevanceScore || 0),
      genres: cand.genres,
      keywords: cand.keywords,
      cosineSimilarity: cosine,
      genreSimilarity: genreSim,
      keywordScore: kwSim.score,
      keywordMatches: kwSim.matches,
      tonalPenalty: tonal.penalty,
      tonalReason: tonal.reason,
      commonSubSentiments: commonSubs,
      finalAffinityScore: finalScore
    });
  }

  // Ordenar pela Afinidade Final
  evaluatedCandidates.sort((a, b) => b.finalAffinityScore - a.finalAffinityScore);
  const newVitrine = evaluatedCandidates.slice(0, 6);

  // 6. Exibir Comparativo Lado a Lado
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🏛️ VITRINE ATUAL (Apenas Score da JOF - Estático)`);
  console.log(`${'═'.repeat(80)}`);
  console.table(oldVitrine);

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`✨ NOVA VITRINE CONTEXTUAL (Parentesco Emocional + Estético com "${movie.title}")`);
  console.log(`⚖️ Pesos: DNA Emocional (${(W_SENT*100).toFixed(0)}%) | JOF (${(W_JOF*100).toFixed(0)}%) | Keywords (${(W_KEYWORD*100).toFixed(0)}%) | Gênero (${(W_GENRE*100).toFixed(0)}%)`);
  console.log(`🛡️ Penalidade Tonal: Ativa para incompatibilidades estéticas/temáticas drásticas`);
  console.log(`${'═'.repeat(80)}`);
  console.table(
    newVitrine.map((c, idx) => ({
      '#': `${idx + 1}º`,
      'Filme': `${c.title} (${c.year || 'N/A'})`,
      'Afinidade': c.finalAffinityScore.toFixed(3),
      'Score JOF': c.jofScore.toFixed(3),
      'DNA Emocional': `${(c.cosineSimilarity * 100).toFixed(0)}%`,
      'Keywords': c.keywordMatches.length > 0 ? `${c.keywordMatches.length} em comum` : '-',
      'Gêneros': c.genres.slice(0, 2).join(', '),
      'Penalidade': c.tonalPenalty > 0 ? `-${c.tonalPenalty.toFixed(1)} (${c.tonalReason?.slice(0, 25)}...)` : '0'
    }))
  );


  console.log(`\n🔍 POR QUE CADA FILME DO TOP 3 ENTROU NA NOVA VITRINE?`);
  newVitrine.slice(0, 3).forEach((c, idx) => {
    console.log(`\n${idx + 1}. 🎬 ${c.title} (${c.year}) [Afinidade: ${c.finalAffinityScore.toFixed(3)}]`);
    console.log(`   🧬 SubSentimentos em comum (${c.commonSubSentiments.length}): ${c.commonSubSentiments.slice(0, 4).map(s => `${s.name}`).join(', ')}`);
    console.log(`   🎭 Gêneros compartilhados: ${c.genres.filter(g => movie.genres.includes(g)).join(', ') || 'Nenhum direto'}`);
    if (c.keywordMatches.length > 0) {
      console.log(`   🏷️ Keywords temáticas em comum: ${c.keywordMatches.join(', ')}`);
    }
    if (c.tonalPenalty > 0) {
      console.log(`   ⚠️ Penalidade aplicada: -${c.tonalPenalty.toFixed(1)} -> ${c.tonalReason}`);
    }
  });

  console.log(`\n✨ Simulação finalizada com sucesso.\n`);
}

main()
  .catch(err => {
    console.error('❌ Erro na simulação:', err);
  })
  .finally(() => prisma.$disconnect());

// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import { jevService, SubSentimentCandidate } from '../services/jevService';
import { createAIProvider, getDefaultConfig } from '../utils/aiProvider';

const prisma = new PrismaClient();

interface JofEvaluationCandidate {
  jofId: number;
  jofText: string;
  mainSentimentId: number;
  mainSentimentName: string;
  mainSentimentKeywords: string[];
  candidates: SubSentimentCandidate[];
}

interface JofEvaluationResult {
  jofId: number;
  jofText: string;
  mainSentimentName: string;
  score: number;
  tier: 'Ouro' | 'Prata' | 'Bronze' | 'Sem Bônus';
  matchesCount: number;
  totalExpected: number;
  coverageRatio: number;
  averageRelevance: number;
  activeAlignments: Array<{ name: string; relevance: number }>;
}

/**
 * Fórmula oficial de RelevanceScore do Vibesfilm
 */
function computeScore(relevances: number[], totalExpected: number): {
  score: number;
  tier: 'Ouro' | 'Prata' | 'Bronze' | 'Sem Bônus';
  coverageRatio: number;
  averageRelevance: number;
} {
  if (relevances.length === 0 || totalExpected === 0) {
    return { score: 0, tier: 'Sem Bônus', coverageRatio: 0, averageRelevance: 0 };
  }
  const avg = relevances.reduce((acc, r) => acc + r, 0) / relevances.length;
  const intensity = Math.pow(avg, 1.5) * 10;
  const coverageRatio = relevances.length / totalExpected;

  let bonus = 0;
  let tier: 'Ouro' | 'Prata' | 'Bronze' | 'Sem Bônus' = 'Sem Bônus';
  if (coverageRatio >= 0.75) {
    bonus = 0.6;
    tier = 'Ouro';
  } else if (coverageRatio >= 0.65) {
    bonus = 0.4;
    tier = 'Prata';
  } else if (coverageRatio >= 0.50) {
    bonus = 0.2;
    tier = 'Bronze';
  }

  const rawScore = intensity * Math.sqrt(coverageRatio) + bonus;
  const score = Math.min(Number(rawScore.toFixed(3)), 10.0);

  return {
    score,
    tier,
    coverageRatio,
    averageRelevance: Number(avg.toFixed(3))
  };
}

/**
 * Salva a curadoria oficial da campeã no banco de dados
 */
async function saveChampionToDatabase(
  movieId: string,
  champion: JofEvaluationResult,
  movie: { title: string; year: number | null; keywords: string[]; description: string | null },
  dnaSubSentiments: Array<{ id: number; name: string; mainSentimentId?: number }>
) {
  console.log(`\n💾 === GRAVANDO CAMPEÃ NO BANCO (JOF ${champion.jofId}) ===`);

  // 1. Gerar micro-explicações e reflexão poética
  let reflection = '';
  const explanationsMap = new Map<string, string>();

  try {
    const ai = createAIProvider(getDefaultConfig('deepseek'));
    const approvedList = champion.activeAlignments
      .map(a => `- ${a.name} (Score Jev: ${(a.relevance * 100).toFixed(0)}%)`)
      .join('\n');

    const prompt = `Você é um curador especialista em cinema do "vibesfilm".
A engine analítica Jev validou que o filme "${movie.title}" (${movie.year}) possui com alta certeza os seguintes sentimentos comprovados:
${approvedList}

Dados do Filme:
- Sinopse: ${movie.description || 'N/A'}
- Keywords: ${movie.keywords.slice(0, 15).join(', ')}
- Contexto emocional: ${champion.mainSentimentName}

Tarefas:
1. Para cada sentimento confirmado acima, escreva UMA ÚNICA frase curta (estilo microconto, máx. 160 caracteres) descrevendo a CENA ou DINÂMICA específica do filme que encarna esse sentimento. Proibido clichês como "O filme mostra...".
2. Escreva uma reflexão recomendatória poética (entre 15 e 24 palavras) começando com letra minúscula (ex: "descobrir como a sobrevivência...") que resume a essência dessa jornada.

Retorne em formato JSON STRICT:
{
  "explanations": {
    "Nome Exato do Sentimento": "Frase descritiva da cena..."
  },
  "reflection": "frase poética curta..."
}`;

    const resp = await ai.generateResponse("Você é um curador de cinema.", prompt, { temperature: 0.7 });
    let jsonString = resp.content.trim();
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonString = jsonMatch[0];

    const parsed = JSON.parse(jsonString);
    reflection = parsed.reflection || '';
    if (parsed.explanations) {
      for (const [k, v] of Object.entries(parsed.explanations)) {
        explanationsMap.set(k, String(v));
      }
    }
  } catch (err) {
    console.warn('   ⚠️ Geração LLM de reflexão falhou, gerando fallback estruturado...');
    reflection = `a essência de ${champion.activeAlignments.slice(0, 3).map(a => a.name.toLowerCase()).join(', ')} na jornada do espectador`;
  }

  // 2. Rephraser para Frase Nominal
  if (reflection) {
    try {
      const ai = createAIProvider(getDefaultConfig('deepseek'));
      const prompt = `Transforme a frase abaixo em uma Frase Nominal poética, direta e curta (máx. 24 palavras), sem verbo inicial:
Frase: "${reflection}" Responda APENAS com a nova frase.`;
      const repResp = await ai.generateResponse('Você é um editor de texto.', prompt, { temperature: 0.7 });
      reflection = repResp.content.trim().replace(/^["']|["']$/g, '');
    } catch {
      // mantém a reflexão original
    }
  }

  // 3. Gravar em MovieSentiment
  const subMap = new Map(dnaSubSentiments.map(s => [s.name, s]));
  for (const match of champion.activeAlignments) {
    const sub = subMap.get(match.name);
    if (!sub) continue;

    const existing = await prisma.movieSentiment.findFirst({
      where: { movieId, subSentimentId: sub.id }
    });

    const explanation = explanationsMap.get(match.name) ||
      `Alinhamento verificado via Jev Engine (${(match.relevance * 100).toFixed(0)}%).`;

    if (!existing) {
      await prisma.movieSentiment.create({
        data: {
          movieId,
          mainSentimentId: sub.mainSentimentId || 18,
          subSentimentId: sub.id,
          relevance: match.relevance,
          explanation
        }
      });
      console.log(`   ✅ Criado MovieSentiment: ${match.name} (${match.relevance.toFixed(2)})`);
    } else if (match.relevance > Number(existing.relevance)) {
      await prisma.movieSentiment.update({
        where: {
          movieId_mainSentimentId_subSentimentId: {
            movieId,
            mainSentimentId: existing.mainSentimentId,
            subSentimentId: sub.id
          }
        },
        data: {
          relevance: match.relevance,
          explanation,
          updatedAt: new Date()
        }
      });
      console.log(`   🔄 Atualizado MovieSentiment: ${match.name} (${Number(existing.relevance).toFixed(2)} → ${match.relevance.toFixed(2)})`);
    }
  }

  // 4. Gravar ou atualizar em MovieSuggestionFlow
  const existingSuggestion = await prisma.movieSuggestionFlow.findFirst({
    where: { movieId, journeyOptionFlowId: champion.jofId }
  });

  if (existingSuggestion) {
    await prisma.movieSuggestionFlow.update({
      where: { id: existingSuggestion.id },
      data: {
        relevanceScore: champion.score,
        reason: reflection || existingSuggestion.reason
      }
    });
    console.log(`   🔄 MovieSuggestionFlow atualizado (Score: ${champion.score.toFixed(3)})`);
  } else {
    await prisma.movieSuggestionFlow.create({
      data: {
        movieId,
        journeyOptionFlowId: champion.jofId,
        relevanceScore: champion.score,
        reason: reflection || "Reflexão curatorial sobre o filme.",
        relevance: 1
      }
    });
    console.log(`   ✨ Novo MovieSuggestionFlow criado com sucesso (Score: ${champion.score.toFixed(3)})`);
  }

  console.log(`   📝 Reflexão Oficial: "${reflection}"`);
  console.log(`\n🎉 Gravação da campeã (JOF ${champion.jofId}) concluída com sucesso!`);
}

async function main() {
  const rawArgs = process.argv.slice(2);
  let searchTitle: string | undefined;
  let searchYear: number | undefined;
  let tmdbId: number | undefined;
  let threshold = 0.55;
  let topCount = 5;
  let shouldSave = false;
  let targetSentimentFilter: string | undefined;
  const positionalArgs: string[] = [];

  for (const arg of rawArgs) {
    if (arg.startsWith('--title=')) {
      searchTitle = arg.split('=')[1];
    } else if (arg.startsWith('--year=') || arg.startsWith('-y=')) {
      searchYear = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--tmdb=') || arg.startsWith('--id=')) {
      tmdbId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--thresh=') || arg.startsWith('--threshold=')) {
      const val = parseFloat(arg.split('=')[1]);
      if (!isNaN(val) && val > 0 && val <= 1) threshold = val;
    } else if (arg.startsWith('--top=')) {
      topCount = parseInt(arg.split('=')[1], 10) || 5;
    } else if (arg.startsWith('--sentiment=')) {
      targetSentimentFilter = arg.split('=')[1].toLowerCase();
    } else if (arg === '--save') {
      shouldSave = true;
    } else if (!arg.startsWith('--')) {
      positionalArgs.push(arg);
    }
  }

  if (positionalArgs.length > 0 && !searchTitle && !tmdbId) {
    if (positionalArgs.length >= 2 && !isNaN(Number(positionalArgs[1]))) {
      searchTitle = positionalArgs[0];
      if (!searchYear) searchYear = parseInt(positionalArgs[1], 10);
    } else if (positionalArgs.length === 1 && !isNaN(Number(positionalArgs[0])) && positionalArgs[0].length >= 5) {
      tmdbId = parseInt(positionalArgs[0], 10);
    } else {
      searchTitle = positionalArgs[0];
    }
  }

  console.log('🔍 === FIND BEST JOF: LOCALIZADOR DE JORNADAS IDEAIS (JEV ENGINE) ===\n');

  // 1. Localizar Filme no banco
  let movie = null;
  const movieSelect = {
    id: true,
    title: true,
    year: true,
    genres: true,
    keywords: true,
    description: true,
    tmdbId: true
  };

  if (tmdbId) {
    movie = await prisma.movie.findUnique({ where: { tmdbId }, select: movieSelect });
  } else if (searchTitle) {
    // Busca exata primeiro
    movie = await prisma.movie.findFirst({
      where: {
        title: { equals: searchTitle, mode: 'insensitive' },
        ...(searchYear ? { year: searchYear } : {})
      },
      select: movieSelect
    });

    if (!movie) {
      movie = await prisma.movie.findFirst({
        where: {
          title: { contains: searchTitle, mode: 'insensitive' },
          ...(searchYear ? { year: searchYear } : {})
        },
        select: movieSelect
      });
    }
  }

  if (!movie) {
    console.error(`❌ Nenhum filme encontrado${searchTitle ? ` para "${searchTitle}"` : ''}${searchYear ? ` (${searchYear})` : ''}.`);
    console.log('Uso: npx ts-node src/scripts/findBestJof.ts "Título do Filme" [ANO] [--save] [--thresh=0.55] [--top=5]');
    process.exit(1);
  }

  console.log(`🎬 Filme Alvo: "${movie.title}" (${movie.year || 'N/A'}) [TMDB: ${movie.tmdbId || 'N/A'}]`);
  console.log(`🏷 Gêneros: ${movie.genres?.join(', ') || 'N/A'}`);
  console.log(`🔑 Keywords (${movie.keywords?.length || 0}): ${movie.keywords?.slice(0, 15).join(', ')}...`);
  console.log(`⚙️ Limiar de Ativação Jev: ${(threshold * 100).toFixed(0)}%`);
  console.log(`📊 Modo de Gravação: ${shouldSave ? '💾 ATIVO (--save habilitado)' : '👁️ SIMULAÇÃO (Apenas ranking)'}`);

  // 2. Carregar todas as SubSentiments e mapear
  const allSubSentiments = await prisma.subSentiment.findMany();
  const subMap = new Map(allSubSentiments.map(s => [s.id, s]));

  // 3. Carregar todas as JOFs com relações
  const allJofs = await prisma.journeyOptionFlow.findMany({
    include: {
      journeyStepFlow: {
        include: {
          journeyFlow: {
            include: { mainSentiment: true }
          },
          emotionalIntentionJourneySteps: {
            include: {
              emotionalIntention: {
                include: { mainSentiment: true }
              }
            }
          }
        }
      }
    },
    orderBy: { id: 'asc' }
  });

  const jofRels = await prisma.journeyOptionFlowSubSentiment.findMany({
    orderBy: { weight: 'desc' }
  });

  const jofRelsMap = new Map<number, typeof jofRels>();
  for (const rel of jofRels) {
    if (!jofRelsMap.has(rel.journeyOptionFlowId)) {
      jofRelsMap.set(rel.journeyOptionFlowId, []);
    }
    jofRelsMap.get(rel.journeyOptionFlowId)!.push(rel);
  }

  // 4. Montar lista de JOFs candidatas com seus DNA
  const evaluationCandidates: JofEvaluationCandidate[] = [];

  for (const jof of allJofs) {
    const rels = jofRelsMap.get(jof.id) || [];
    if (rels.length < 4) continue; // Pula JOFs com DNA incompleto ou não configurado (< 4 subsentimentos)

    const mainSent =
      jof.journeyStepFlow?.emotionalIntentionJourneySteps?.[0]?.emotionalIntention?.mainSentiment ||
      jof.journeyStepFlow?.journeyFlow?.mainSentiment ||
      null;

    const mainSentName = mainSent?.name || 'Geral';
    const mainSentKeywords = mainSent?.keywords || [];

    // Filtro por sentimento se fornecido
    if (targetSentimentFilter && !mainSentName.toLowerCase().includes(targetSentimentFilter)) {
      continue;
    }

    const candidates: SubSentimentCandidate[] = rels.map(rel => {
      const s = subMap.get(rel.subSentimentId);
      return {
        id: rel.subSentimentId,
        name: s?.name || `Sub ${rel.subSentimentId}`,
        keywords: s?.keywords || [],
        expectedWeight: Number(rel.weight)
      };
    });

    evaluationCandidates.push({
      jofId: jof.id,
      jofText: jof.text,
      mainSentimentId: mainSent?.id || 18,
      mainSentimentName: mainSentName,
      mainSentimentKeywords: mainSentKeywords,
      candidates
    });
  }

  console.log(`\n📋 Varrendo ${evaluationCandidates.length} opções de jornada com Jev Engine...`);

  // 5. Executar Jev em lotes concorrentes para máxima performance
  const results: JofEvaluationResult[] = [];
  const BATCH_SIZE = 4;
  const startTime = Date.now();

  for (let i = 0; i < evaluationCandidates.length; i += BATCH_SIZE) {
    const chunk = evaluationCandidates.slice(i, i + BATCH_SIZE);
    process.stdout.write(`   ⏳ Processando JOFs ${i + 1} a ${Math.min(i + BATCH_SIZE, evaluationCandidates.length)} de ${evaluationCandidates.length}...\r`);

    const chunkPromises = chunk.map(async item => {
      try {
        const jevRes = await jevService.evaluateSentimentAlignment(
          {
            title: movie!.title,
            year: movie!.year || undefined,
            genres: movie!.genres,
            keywords: movie!.keywords,
            description: movie!.description || undefined,
            journeyOptionText: item.jofText,
            mainSentimentName: item.mainSentimentName,
            mainSentimentKeywords: item.mainSentimentKeywords,
            candidates: item.candidates
          },
          { threshold }
        );

        if (!jevRes.success || !jevRes.alignments) return null;

        const active = jevRes.alignments.filter(a => a.isActivated);
        const { score, tier, coverageRatio, averageRelevance } = computeScore(
          active.map(a => a.relevance),
          item.candidates.length
        );

        return {
          jofId: item.jofId,
          jofText: item.jofText,
          mainSentimentName: item.mainSentimentName,
          score,
          tier,
          matchesCount: active.length,
          totalExpected: item.candidates.length,
          coverageRatio,
          averageRelevance,
          activeAlignments: active.map(a => ({ name: a.name, relevance: a.relevance }))
        } as JofEvaluationResult;
      } catch {
        return null;
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    for (const res of chunkResults) {
      if (res) results.push(res);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Varredura concluída em ${durationSec}s! ${results.length} JOFs avaliadas.\n`);

  // 6. Ordenar por score decrescente
  results.sort((a, b) => b.score - a.score);

  const topResults = results.slice(0, topCount);

  console.log(`🏆 === TOP ${topResults.length} JORNADAS PARA "${movie.title}" ===\n`);

  console.table(
    topResults.map((r, idx) => ({
      '#': `${idx + 1}º`,
      'JOF ID': r.jofId,
      'Score': r.score.toFixed(3),
      'Patamar': r.tier,
      'Cobertura': `${(r.coverageRatio * 100).toFixed(0)}% (${r.matchesCount}/${r.totalExpected})`,
      'Média': r.averageRelevance.toFixed(2),
      'Sentimento Lente': r.mainSentimentName,
      'Texto da Jornada': r.jofText.length > 55 ? r.jofText.substring(0, 52) + '...' : r.jofText
    }))
  );

  console.log('\n🔍 Detalhes dos SubSentimentos da Campeã (1º Lugar):');
  const champion = topResults[0];
  if (champion) {
    console.log(`🥇 [JOF ${champion.jofId}] (${champion.mainSentimentName}) "${champion.jofText}"`);
    console.log(`   Score Oficial: ${champion.score.toFixed(3)} | Patamar: ${champion.tier}`);
    champion.activeAlignments.forEach(a => {
      console.log(`   ✅ ${a.name.padEnd(35)} | Score: ${(a.relevance * 100).toFixed(0)}%`);
    });

    // 7. Salvar campeã se solicitado
    if (shouldSave) {
      const dna = allSubSentiments.map(s => ({
        id: s.id,
        name: s.name,
        mainSentimentId: s.mainSentimentId
      }));

      await saveChampionToDatabase(
        movie.id,
        champion,
        {
          title: movie.title,
          year: movie.year,
          keywords: movie.keywords,
          description: movie.description
        },
        dna
      );
    } else {
      console.log(`\n💡 Dica: Para gravar o filme diretamente na jornada campeã (JOF ${champion.jofId}), execute:`);
      console.log(`   npx ts-node src/scripts/reprocessMovieSentiments.ts --title="${movie.title}" --year=${movie.year} --jofId=${champion.jofId} --ai-provider=jev`);
      console.log(`   Ou reexecute com --save:`);
      console.log(`   npx ts-node src/scripts/findBestJof.ts "${movie.title}" ${movie.year} --save`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

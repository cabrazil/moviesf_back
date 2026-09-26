// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import { jevService, SubSentimentCandidate } from '../services/jevService';
import { OscarDataService } from '../services/OscarDataService';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';
import { updateRelevanceRankingForMovie } from '../utils/relevanceRanking';
import { inferEntryType } from '../utils/emotionalEntryType';
import { processSingleMovie } from './populateMovies';

const prisma = new PrismaClient();

interface JofEvaluationCandidate {
  jofId: number;
  jofText: string;
  mainSentimentId: number;
  mainSentimentName: string;
  mainSentimentKeywords: string[];
  intentionType: string;
  intentionDescription: string;
  candidates: SubSentimentCandidate[];
}

interface JofEvaluationResult {
  jofId: number;
  jofText: string;
  mainSentimentName: string;
  intentionType: string;
  intentionDescription: string;
  score: number;
  tier: 'Ouro' | 'Prata' | 'Bronze' | 'Sem Bônus';
  matchesCount: number;
  totalExpected: number;
  coverageRatio: number;
  averageRelevance: number;
  activeAlignments: Array<{ id: number; name: string; relevance: number }>;
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
 * Enriquece o filme com keywords emocionais e semânticas profundas
 */
async function enrichMovieKeywords(
  movieId: string,
  tmdbId: number,
  title: string,
  year: number | null,
  description: string | null,
  currentKeywords: string[],
  provider: AIProvider = 'deepseek'
): Promise<{ success: boolean; addedCount: number }> {
  try {
    const config = getDefaultConfig(provider);
    const ai = createAIProvider(config);

    const systemPrompt = "Você é um especialista em análise cinematográfica e metadados semânticos.";
    const prompt = `Filme: '${title}' (${year || 'N/A'}).
Keywords atuais: ${currentKeywords.slice(0, 30).join(', ')}
Sinopse: ${description || 'Sinopse não disponível.'}

Sua tarefa é gerar uma lista de 10 a 15 keywords enriquecidas em português para este filme.
Você deve focar em:
- Análise semântica da sinopse e tom dramático
- Temas emocionais profundos (ex: amadurecimento, perda, reencontro, crise de identidade)
- Atmosfera e sensação psicológica transmitida ao espectador
- Conexões com sentimentos e jornadas de vida

As novas keywords devem:
- Ser em português (minúsculas)
- Ser termos ou expressões curtas (máximo 3-4 palavras)
- NÃO REPETIR as keywords atuais

Formatação estrita: retorne APENAS os termos separados por VÍRGULA, sem numeração, sem aspas, sem introdução.
Exemplo: nostalgia afetiva, busca por pertencimento, inocência infantil, choque de realidade, calor familiar`;

    const response = await ai.generateResponse(systemPrompt, prompt, {
      maxTokens: 250,
      temperature: 0.6
    });

    if (!response.success || !response.content) {
      return { success: false, addedCount: 0 };
    }

    const aiText = response.content.replace(/```[\s\S]*?```/g, '').trim();
    const rawNewKeywords = aiText
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 2);

    const existingLower = new Set(currentKeywords.map(k => k.toLowerCase()));
    const newKeywords = Array.from(new Set(rawNewKeywords.filter(k => !existingLower.has(k))));

    if (newKeywords.length === 0) {
      return { success: true, addedCount: 0 };
    }

    const keywordsStringLiteral = newKeywords.map(k => `'${k.replace(/'/g, "''")}'`).join(',');
    const updateQuery = `
      UPDATE "Movie" 
      SET keywords = (
        SELECT ARRAY_AGG(DISTINCT x) 
        FROM UNNEST(keywords || ARRAY[${keywordsStringLiteral}]::text[]) AS x
      )
      WHERE id = '${movieId}';
    `;

    await prisma.$executeRawUnsafe(updateQuery);
    return { success: true, addedCount: newKeywords.length };
  } catch (error) {
    console.warn(`   ⚠️ Erro ao enriquecer keywords: ${error instanceof Error ? error.message : error}`);
    return { success: false, addedCount: 0 };
  }
}

/**
 * Gera ganchos de Landing Page (TargetAudience e Hook)
 */
async function generateLandingPageHook(
  tmdbId: number,
  title: string,
  year: number | null,
  genres: string[] | null,
  keywords: string[] | null,
  description: string | null,
  sentimentName: string,
  provider: AIProvider = 'deepseek'
): Promise<{ success: boolean; hook?: string; targetAudience?: string }> {
  try {
    const config = getDefaultConfig(provider);
    const ai = createAIProvider(config);

    const emotionalPrompt = `Filme: '${title}' (${year || 'N/A'}). Gêneros: ${genres?.join(', ') || 'N/A'}. Keywords: ${keywords?.slice(0, 10).join(', ') || 'N/A'}. Lente emocional: ${sentimentName}.
Sinopse: ${description || 'N/A'}

Qual é o principal benefício emocional ou experiência interna que este filme oferece a quem o assiste?
Responda em UMA ÚNICA FRASE curta (máximo 12 palavras), começando com verbo no infinitivo ou substantivo.
Exemplo: "uma reflexão comovente sobre a coragem de recomeçar" ou "se reconectar com a própria infância e a leveza da vida".
Responda APENAS com essa frase, sem aspas.`;

    const emotionalResp = await ai.generateResponse("Você é um curador de cinema.", emotionalPrompt, { maxTokens: 100, temperature: 0.5 });
    const emotionalBenefit = emotionalResp.content?.trim().replace(/^["']|["']$/g, '') || `uma jornada marcante de ${sentimentName.toLowerCase()}`;
    const targetAudience = `Este filme pode ser perfeito para quem busca ${emotionalBenefit}.`;

    const hookPrompt = `Filme: '${title}' (${year || 'N/A'}). Gêneros: ${genres?.join(', ') || 'N/A'}. Keywords: ${keywords?.slice(0, 10).join(', ') || 'N/A'}.
Crie um gancho emocional imersivo (cerca de 25-35 palavras) para a página do filme.
Capture a atmosfera, o impacto e a vibe do filme sem clichês de marketing (NUNCA use "Prepare-se", "Imperdível", "Assista", nem cite nomes de personagens).
Responda APENAS com a frase direta, sem aspas.`;

    const hookResp = await ai.generateResponse("Você é um redator cinematográfico de elite.", hookPrompt, { maxTokens: 150, temperature: 0.7 });
    let hook = hookResp.content?.trim().replace(/^["']|["']$/g, '') || '';
    hook = hook.replace(/```[\s\S]*?```/g, '').trim();

    if (targetAudience && hook) {
      await prisma.movie.update({
        where: { tmdbId },
        data: {
          landingPageHook: hook,
          targetAudienceForLP: targetAudience
        }
      });
      return { success: true, hook, targetAudience };
    }
    return { success: false };
  } catch (error) {
    return { success: false };
  }
}

/**
 * Salva a curadoria de uma jornada sugerida diretamente no banco via Prisma
 */
async function saveSuggestionFlow(
  movieId: string,
  targetJof: JofEvaluationResult,
  movie: { title: string; year: number | null; keywords: string[]; description: string | null },
  dnaSubSentiments: Array<{ id: number; name: string; mainSentimentId?: number }>,
  positionLabel: string = '1ª Opção',
  provider: AIProvider = 'deepseek'
): Promise<{ reflection: string }> {
  console.log(`\n💾 Gravando ${positionLabel}: [JOF ${targetJof.jofId}] (${targetJof.mainSentimentName} ➔ ${targetJof.intentionType}) - Score: ${targetJof.score.toFixed(3)}...`);

  let reflection = '';
  const explanationsMap = new Map<string, string>();

  try {
    const ai = createAIProvider(getDefaultConfig(provider));
    const approvedList = targetJof.activeAlignments
      .map(a => `- ${a.name} (Alinhamento Jev: ${(a.relevance * 100).toFixed(0)}%)`)
      .join('\n');

    const prompt = `Você é o curador especialista em cinema do "vibesfilm".
A engine analítica validou que o filme "${movie.title}" (${movie.year || 'N/A'}) possui com alta certeza os seguintes sentimentos comprovados:
${approvedList}

Dados do Filme:
- Sinopse: ${movie.description || 'N/A'}
- Keywords: ${movie.keywords.slice(0, 15).join(', ')}
- Contexto emocional: ${targetJof.mainSentimentName}
- Intenção emocional: ${targetJof.intentionType}${targetJof.intentionDescription ? ` ("${targetJof.intentionDescription}")` : ''}
- Jornada alvo: "${targetJof.jofText}"

Tarefas:
1. Para cada sentimento confirmado acima, escreva UMA ÚNICA frase curta (estilo microconto, máx. 160 caracteres) descrevendo a CENA ou DINÂMICA específica do filme que encarna esse sentimento. Proibido clichês como "O filme mostra...".
2. Escreva uma reflexão poética recomendatória (entre 14 e 24 palavras) em Frase Nominal (sem verbo inicial) que resume a essência dessa jornada.

Retorne em formato JSON STRICT:
{
  "explanations": {
    "Nome Exato do Sentimento": "Frase descritiva da cena..."
  },
  "reflection": "frase poética nominal curta..."
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
  } catch {
    reflection = `a essência de ${targetJof.activeAlignments.slice(0, 3).map(a => a.name.toLowerCase()).join(', ')} na jornada do espectador`;
  }

  // Refinamento de frase nominal se necessário
  if (reflection && /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][a-zà-ÿ]+(ndo|ram|riam|rá|rão|va|ram|sou|sse)\b/.test(reflection)) {
    try {
      const ai = createAIProvider(getDefaultConfig(provider));
      const repPrompt = `Transforme em Frase Nominal poética e direta (sem verbo inicial, máx. 24 palavras):\n"${reflection}"\nResponda APENAS com a nova frase.`;
      const repResp = await ai.generateResponse('Você é um editor de texto.', repPrompt, { temperature: 0.7 });
      reflection = repResp.content.trim().replace(/^["']|["']$/g, '');
    } catch {
      // mantém
    }
  }

  // Gravar MovieSentiment
  const subMap = new Map(dnaSubSentiments.map(s => [s.name, s]));
  for (const match of targetJof.activeAlignments) {
    const sub = subMap.get(match.name) || dnaSubSentiments.find(s => s.id === match.id);
    if (!sub) continue;

    const explanation = explanationsMap.get(match.name) ||
      `Alinhamento verificado via Jev Engine (${(match.relevance * 100).toFixed(0)}%).`;

    await prisma.movieSentiment.upsert({
      where: {
        movieId_mainSentimentId_subSentimentId: {
          movieId,
          mainSentimentId: sub.mainSentimentId || 18,
          subSentimentId: sub.id
        }
      },
      update: {
        relevance: match.relevance,
        explanation,
        updatedAt: new Date()
      },
      create: {
        movieId,
        mainSentimentId: sub.mainSentimentId || 18,
        subSentimentId: sub.id,
        relevance: match.relevance,
        explanation
      }
    });
  }

  // Gravar MovieSuggestionFlow
  const existingSuggestion = await prisma.movieSuggestionFlow.findFirst({
    where: { movieId, journeyOptionFlowId: targetJof.jofId }
  });

  if (existingSuggestion) {
    await prisma.movieSuggestionFlow.update({
      where: { id: existingSuggestion.id },
      data: {
        relevanceScore: targetJof.score,
        reason: reflection || existingSuggestion.reason
      }
    });
  } else {
    await prisma.movieSuggestionFlow.create({
      data: {
        movieId,
        journeyOptionFlowId: targetJof.jofId,
        relevanceScore: targetJof.score,
        reason: reflection || "Reflexão curatorial sobre o filme.",
        relevance: 1
      }
    });
  }

  return { reflection };
}

async function main() {
  const rawArgs = process.argv.slice(2);
  let searchTitle: string | undefined;
  let searchYear: number | undefined;
  let tmdbId: number | undefined;
  let targetSentiment: string | undefined;
  let targetIntention: string | undefined;
  let forcedJofId: number | undefined;
  let provider: AIProvider = 'deepseek';
  let threshold = 0.55;
  let topCount = 3;
  let previewOnly = false;

  for (const arg of rawArgs) {
    if (arg.startsWith('--title=')) {
      searchTitle = arg.split('=')[1].replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--year=') || arg.startsWith('-y=')) {
      searchYear = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--tmdb=') || arg.startsWith('--id=')) {
      tmdbId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--sentiment=') || arg.startsWith('--lens=')) {
      targetSentiment = arg.split('=')[1].toLowerCase().replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--intention=') || arg.startsWith('-i=')) {
      targetIntention = arg.split('=')[1].toLowerCase().replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--jof=') || arg.startsWith('--jofId=')) {
      forcedJofId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--provider=') || arg.startsWith('--ai-provider=')) {
      const p = arg.split('=')[1].toLowerCase();
      if (p === 'openai' || p === 'deepseek' || p === 'gemini') {
        provider = p as AIProvider;
      }
    } else if (arg.startsWith('--thresh=') || arg.startsWith('--threshold=')) {
      const val = parseFloat(arg.split('=')[1]);
      if (!isNaN(val) && val > 0 && val <= 1) threshold = val;
    } else if (arg.startsWith('--top=')) {
      topCount = parseInt(arg.split('=')[1], 10) || 3;
    } else if (arg === '--preview' || arg === '--dry-run') {
      previewOnly = true;
    } else if (!arg.startsWith('--') && !searchTitle) {
      searchTitle = arg;
    }
  }

  if (!searchTitle && !tmdbId) {
    console.log(`
🎬 === CURATE MOVIE: CURADORIA INTELIGENTE VIBESFILM ===
Uso:
  npx ts-node src/scripts/curateMovie.ts --title="Nome do Filme" --year=2024 [opções]

Opções:
  --sentiment="feliz"    Filtra pelas jornadas desse sentimento inicial (calmo, introspectivo, animado, ansioso, cansado, etc.)
  --intention="maintain" Filtra pela intenção emocional (maintain, process, transform, explore)
  --jofId=54             Força a análise e gravação em uma JOF específica
  --provider=deepseek    Provider de IA para reflexão e metadados (deepseek, openai, gemini)
  --threshold=0.55       Limiar de ativação dos subsentimentos na Jev Engine (padrão: 0.55)
  --top=3                Quantidade de melhores jornadas para exibir (padrão: 3)
  --preview              Apenas simula a avaliação e exibe o ranking sem gravar no banco
`);
    process.exit(0);
  }

  const startTime = Date.now();
  console.log(`\n🎬 === INICIANDO CURADORIA INTELIGENTE: ${searchTitle || `TMDB ${tmdbId}`} ===`);
  console.log(`🤖 AI Provider: ${provider.toUpperCase()} | ⚙️ Threshold Jev: ${(threshold * 100).toFixed(0)}%`);
  if (targetSentiment) console.log(`🎭 Filtro Sentimento: "${targetSentiment}"`);
  if (targetIntention) console.log(`🎯 Filtro Intenção: "${targetIntention.toUpperCase()}"`);

  // ==========================================
  // ETAPA 1: INGESTÃO E METADADOS DO FILME
  // ==========================================
  console.log(`\n📥 [1/4] Ingestão e Verificação do Filme...`);

  let movie = null;
  const selectFields = {
    id: true,
    title: true,
    year: true,
    genres: true,
    keywords: true,
    description: true,
    tmdbId: true
  };

  if (tmdbId) {
    movie = await prisma.movie.findUnique({ where: { tmdbId }, select: selectFields });
  } else if (searchTitle) {
    movie = await prisma.movie.findFirst({
      where: {
        title: { equals: searchTitle, mode: 'insensitive' },
        ...(searchYear ? { year: searchYear } : {})
      },
      select: selectFields
    });
  }

  if (!movie) {
    console.log(`   🔍 Filme não encontrado no banco local. Executando ingestão multilíngue TMDB...`);
    const ingest = await processSingleMovie(searchTitle!, searchYear);
    if (!ingest.success || !ingest.movieId) {
      console.error(`❌ Falha na ingestão do filme no TMDB/OMDb.`);
      process.exit(1);
    }
    movie = await prisma.movie.findUnique({ where: { id: ingest.movieId }, select: selectFields });
  } else {
    console.log(`   ✅ Filme já catalogado na base: "${movie.title}" (${movie.year || 'N/A'}) [TMDB: ${movie.tmdbId}]`);
  }

  if (!movie || !movie.tmdbId) {
    console.error(`❌ Não foi possível carregar os dados completos do filme.`);
    process.exit(1);
  }

  // Enriquecer dados do Oscar
  try {
    const oscarService = new OscarDataService();
    await oscarService.enrichMovieAwards(movie.tmdbId);
  } catch (err) {
    // Falha não-bloqueante
  }

  // ==========================================
  // ETAPA 2: ENRIQUECIMENTO SEMÂNTICO DE KEYWORDS
  // ==========================================
  console.log(`\n🏷️ [2/4] Enriquecimento Semântico de Keywords...`);
  console.log(`   Keywords originais TMDB (${movie.keywords?.length || 0}): ${movie.keywords?.slice(0, 8).join(', ')}...`);

  const enrichRes = await enrichMovieKeywords(
    movie.id,
    movie.tmdbId,
    movie.title,
    movie.year,
    movie.description,
    movie.keywords || [],
    provider
  );

  if (enrichRes.addedCount > 0) {
    console.log(`   ✨ Adicionadas ${enrichRes.addedCount} keywords emocionais profundas.`);
    // Recarregar keywords atualizadas
    const updatedMovie = await prisma.movie.findUnique({ where: { id: movie.id }, select: { keywords: true } });
    if (updatedMovie?.keywords) movie.keywords = updatedMovie.keywords;
  } else {
    console.log(`   ✅ Keywords já otimizadas.`);
  }

  // ==========================================
  // ETAPA 3: AVALIAÇÃO VIA JEV ENGINE
  // ==========================================
  console.log(`\n🧠 [3/4] Avaliação de Sentimentos e Jornadas (Jev Engine)...`);

  const allSubSentiments = await prisma.subSentiment.findMany();
  const subMap = new Map(allSubSentiments.map(s => [s.id, s]));

  const allJofs = await prisma.journeyOptionFlow.findMany({
    where: forcedJofId ? { id: forcedJofId } : undefined,
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

  const evaluationCandidates: JofEvaluationCandidate[] = [];

  for (const jof of allJofs) {
    const rels = jofRelsMap.get(jof.id) || [];
    if (rels.length < 4 && !forcedJofId) continue;

    const eij = jof.journeyStepFlow?.emotionalIntentionJourneySteps?.[0]?.emotionalIntention;
    const mainSent =
      eij?.mainSentiment ||
      jof.journeyStepFlow?.journeyFlow?.mainSentiment ||
      null;

    const mainSentName = mainSent?.name || 'Geral';
    const mainSentKeywords = mainSent?.keywords || [];
    const intentionType = eij?.intentionType || 'GERAL';
    const intentionDescription = eij?.description || '';

    // Filtro por sentimento se fornecido
    if (targetSentiment) {
      const match =
        mainSentName.toLowerCase().includes(targetSentiment) ||
        mainSentKeywords.some(k => k.toLowerCase().includes(targetSentiment));
      if (!match) continue;
    }

    // Filtro por intenção se fornecido
    if (targetIntention) {
      if (!intentionType.toLowerCase().includes(targetIntention)) {
        continue;
      }
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
      intentionType,
      intentionDescription,
      candidates
    });
  }

  if (evaluationCandidates.length === 0) {
    console.error(`❌ Nenhuma jornada elegível encontrada${targetSentiment ? ` para o sentimento "${targetSentiment}"` : ''}${targetIntention ? ` e intenção "${targetIntention}"` : ''}.`);
    process.exit(1);
  }

  console.log(`   🔍 Analisando ${evaluationCandidates.length} opções de jornada com Jev Engine...`);

  const results: JofEvaluationResult[] = [];
  const BATCH_SIZE = 4;

  for (let i = 0; i < evaluationCandidates.length; i += BATCH_SIZE) {
    const chunk = evaluationCandidates.slice(i, i + BATCH_SIZE);
    process.stdout.write(`   ⏳ Processando ${i + 1} a ${Math.min(i + BATCH_SIZE, evaluationCandidates.length)} de ${evaluationCandidates.length}...\r`);

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
            intentionType: item.intentionType,
            intentionDescription: item.intentionDescription,
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
          intentionType: item.intentionType,
          intentionDescription: item.intentionDescription,
          score,
          tier,
          matchesCount: active.length,
          totalExpected: item.candidates.length,
          coverageRatio,
          averageRelevance,
          activeAlignments: active.map(a => ({ id: a.subSentimentId, name: a.name, relevance: a.relevance }))
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

  results.sort((a, b) => b.score - a.score);
  const topResults = results.slice(0, topCount);

  console.log(`\n\n🏆 === TOP ${topResults.length} JORNADAS IDENTIFICADAS ===`);
  console.table(
    topResults.map((r, idx) => ({
      '#': `${idx + 1}º`,
      'JOF ID': r.jofId,
      'Score': r.score.toFixed(3),
      'Patamar': r.tier,
      'Cobertura': `${(r.coverageRatio * 100).toFixed(0)}% (${r.matchesCount}/${r.totalExpected})`,
      'Média': r.averageRelevance.toFixed(2),
      'Lente': r.mainSentimentName,
      'Intenção': r.intentionType,
      'Texto': r.jofText.length > 45 ? r.jofText.substring(0, 42) + '...' : r.jofText
    }))
  );

  // Se nenhum sentimento foi filtrado, exibir o melhor de cada Sentimento Inicial
  if (!targetSentiment && results.length > 0) {
    const bestBySentiment = new Map<string, JofEvaluationResult>();
    for (const r of results) {
      if (!bestBySentiment.has(r.mainSentimentName) || bestBySentiment.get(r.mainSentimentName)!.score < r.score) {
        bestBySentiment.set(r.mainSentimentName, r);
      }
    }

    console.log(`\n🌟 === MELHOR OPÇÃO POR SENTIMENTO INICIAL ===`);
    console.table(
      Array.from(bestBySentiment.values()).map(r => ({
        'Sentimento Inicial': r.mainSentimentName,
        'JOF ID': r.jofId,
        'Intenção': r.intentionType,
        'Score': r.score.toFixed(3),
        'Patamar': r.tier,
        'Texto da Jornada': r.jofText.length > 50 ? r.jofText.substring(0, 47) + '...' : r.jofText
      }))
    );
  }

  const champion = topResults[0];
  if (!champion) {
    console.error(`❌ Nenhuma jornada atingiu ativação mínima.`);
    process.exit(1);
  }

  console.log(`\n🥇 CAMPEÃ ELEITA: [JOF ${champion.jofId}] (${champion.mainSentimentName} ➔ ${champion.intentionType})`);
  if (champion.intentionDescription) {
    console.log(`   🎯 Intenção: "${champion.intentionDescription}"`);
  }
  console.log(`   📝 Jornada: "${champion.jofText}"`);
  console.log(`   Score Oficial: ${champion.score.toFixed(3)} | Patamar: ${champion.tier}`);
  console.log(`   SubSentimentos Comprovados:`);
  champion.activeAlignments.forEach(a => {
    console.log(`     ✅ ${a.name.padEnd(35)} ${(a.relevance * 100).toFixed(0)}%`);
  });

  // 1. Campeã Principal (1º Maior Score)
  const champion1 = topResults[0];

  // 2. Segunda Campeã: buscar a melhor de um OUTRO estado de humor; se não houver, a 2ª colocada geral
  let champion2 = results.find(
    r => r.jofId !== champion1.jofId && r.mainSentimentName !== champion1.mainSentimentName
  );

  if (!champion2 && results.length > 1) {
    champion2 = results.find(r => r.jofId !== champion1.jofId);
  }

  // ==========================================
  // ETAPA 4: GRAVAÇÃO & VITRINE (2 MAIORES SCORES)
  // ==========================================
  if (previewOnly) {
    const previewPayload = {
      success: true,
      mode: 'preview',
      movie: {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        tmdbId: movie.tmdbId
      },
      topOptions: [
        {
          jofId: champion1.jofId,
          score: Number(champion1.score.toFixed(3)),
          tier: champion1.tier,
          sentiment: champion1.mainSentimentName,
          intention: champion1.intentionType,
          intentionDescription: champion1.intentionDescription,
          journeyText: champion1.jofText,
          coverage: `${(champion1.coverageRatio * 100).toFixed(0)}%`,
          activeCount: champion1.matchesCount
        },
        ...(champion2 ? [{
          jofId: champion2.jofId,
          score: Number(champion2.score.toFixed(3)),
          tier: champion2.tier,
          sentiment: champion2.mainSentimentName,
          intention: champion2.intentionType,
          intentionDescription: champion2.intentionDescription,
          journeyText: champion2.jofText,
          coverage: `${(champion2.coverageRatio * 100).toFixed(0)}%`,
          activeCount: champion2.matchesCount
        }] : [])
      ]
    };

    console.log('\n---JSON_RESULT_START---');
    console.log(JSON.stringify(previewPayload, null, 2));
    console.log('---JSON_RESULT_END---\n');

    console.log(`\n👁️ Modo --preview ativo: Nenhuma alteração foi persistida no banco.`);
    process.exit(0);
  }

  const selectedToSave: Array<{ jof: JofEvaluationResult; label: string }> = [
    { jof: champion1, label: '1ª Opção (Principal)' }
  ];

  if (champion2) {
    const isDistinctMood = champion2.mainSentimentName !== champion1.mainSentimentName;
    selectedToSave.push({
      jof: champion2,
      label: isDistinctMood
        ? `2ª Opção (Humor Alternativo: ${champion2.mainSentimentName})`
        : '2ª Opção (Alternativa)'
    });
  }

  console.log(`\n💾 [4/4] Gravando Curadoria (${selectedToSave.length} jornadas selecionadas) e Atualizando Vitrine...`);

  const dna = allSubSentiments.map(s => ({
    id: s.id,
    name: s.name,
    mainSentimentId: s.mainSentimentId
  }));

  const savedResults: Array<{ jof: JofEvaluationResult; label: string; reflection: string }> = [];

  for (const item of selectedToSave) {
    const { reflection } = await saveSuggestionFlow(
      movie.id,
      item.jof,
      {
        title: movie.title,
        year: movie.year,
        keywords: movie.keywords,
        description: movie.description
      },
      dna,
      item.label,
      provider
    );
    console.log(`   📝 Reflexão Oficial: "${reflection}"`);
    savedResults.push({ jof: item.jof, label: item.label, reflection });
  }

  // Inferir e salvar o EmotionalEntryType (ALIGNED, TRANSITIONAL, COMPLEX)
  try {
    const allMovieSentiments = await prisma.movieSentiment.findMany({
      where: { movieId: movie.id },
      include: { subSentiment: true }
    });
    const subNames = allMovieSentiments.map(ms => ms.subSentiment.name);
    const entryType = inferEntryType(subNames);
    await prisma.movie.update({
      where: { id: movie.id },
      data: { emotionalEntryType: entryType }
    });
    console.log(`   🎭 EmotionalEntryType inferido: ${entryType}`);
  } catch (entryErr) {
    console.warn(`   ⚠️ Erro ao inferir emotionalEntryType: ${entryErr}`);
  }

  // Content Warnings via Jev
  try {
    const warningsResult = await jevService.evaluateContentWarnings({
      title: movie.title,
      year: movie.year || undefined,
      genres: movie.genres,
      keywords: movie.keywords,
      description: movie.description || undefined
    });

    if (warningsResult.success && warningsResult.warning) {
      await prisma.movie.update({
        where: { id: movie.id },
        data: { contentWarnings: warningsResult.warning }
      });
      console.log(`   ⚠️ Content Warning (Jev): "${warningsResult.warning}" (Custo: $${warningsResult.cost?.toFixed(6) || '0.00004'})`);
    }
  } catch (cwErr) {
    console.warn(`   ⚠️ Alerta de conteúdo: pulado (${cwErr})`);
  }

  // Landing Page Hook & Target Audience (usando a lente da 1ª campeã)
  await generateLandingPageHook(
    movie.tmdbId,
    movie.title,
    movie.year,
    movie.genres,
    movie.keywords,
    movie.description,
    champion1.mainSentimentName,
    provider
  );

  // Atualizar Ranking de Relevância (ordena as sugestões gravadas pelo score)
  try {
    await updateRelevanceRankingForMovie(movie.id);
    console.log(`   🔄 Ranking de relevância recalculado.`);
  } catch (rankErr) {
    // Não bloqueante
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 === CURADORIA FINALIZADA COM SUCESSO EM ${durationSec}s! ===`);
  console.log(`Filme: "${movie.title}" (${movie.year || 'N/A'})`);
  for (const s of savedResults) {
    console.log(`\n📌 ${s.label}:`);
    console.log(`   JOF: ${s.jof.jofId} | Humor: ${s.jof.mainSentimentName} ➔ ${s.jof.intentionType}`);
    console.log(`   Jornada: "${s.jof.jofText}"`);
    console.log(`   Score: ${s.jof.score.toFixed(3)} (${s.jof.tier})`);
    console.log(`   Reflexão: "${s.reflection}"`);
  }
  console.log('');

  const finalMovie = await prisma.movie.findUnique({
    where: { id: movie.id },
    select: { slug: true }
  });

  const savedPayload = {
    success: true,
    mode: 'saved',
    movie: {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      tmdbId: movie.tmdbId,
      slug: finalMovie?.slug,
      url: `https://vibesfilm.com/filme/${finalMovie?.slug || movie.id}`
    },
    savedSuggestions: savedResults.map(s => ({
      label: s.label,
      jofId: s.jof.jofId,
      score: Number(s.jof.score.toFixed(3)),
      tier: s.jof.tier,
      sentiment: s.jof.mainSentimentName,
      intention: s.jof.intentionType,
      journeyText: s.jof.jofText,
      reflection: s.reflection
    }))
  };

  console.log('\n---JSON_RESULT_START---');
  console.log(JSON.stringify(savedPayload, null, 2));
  console.log('---JSON_RESULT_END---\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

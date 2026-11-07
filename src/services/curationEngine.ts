import { prismaApp as prisma } from '../prisma';
import { jevService, SubSentimentCandidate } from './jevService';
import { OscarDataService } from './OscarDataService';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';
import { updateRelevanceRankingForMovie } from '../utils/relevanceRanking';
import { inferEntryType } from '../utils/emotionalEntryType';
import { processSingleMovie, hasNonLatinCharacters, resolveLocalizedMovieTitle } from '../scripts/populateMovies';
import { generateUniqueSlug } from '../utils/slugGenerator';

/**
 * Limita uma Promise a um tempo máximo (ms). Se exceder, rejeita com timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operação'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout de ${ms}ms atingido em: ${label}`)), ms)
    )
  ]);
}

export interface JofEvaluationResult {
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
  jofAffinity?: number;
  activeAlignments: Array<{ id: number; name: string; relevance: number }>;
}

export interface CurationPreviewOutput {
  movie: {
    id: string;
    title: string;
    year: number | null;
    tmdbId: number;
    slug?: string;
    description?: string | null;
    keywords?: string[];
  };
  topSelections: JofEvaluationResult[];
  allResults: JofEvaluationResult[];
}

export interface CurationSavedOutput {
  movie: {
    id: string;
    title: string;
    year: number | null;
    tmdbId: number;
    slug?: string;
    url: string;
  };
  savedSuggestions: Array<{
    label: string;
    jofId: number;
    score: number;
    tier: string;
    sentiment: string;
    intention: string;
    journeyText: string;
    reflection: string;
  }>;
}

/**
 * Fórmula oficial de RelevanceScore do Vibesfilm (com ponderação por expectedWeight, afinidade direta JOF e suavização de superlotação)
 */
export function computeScore(
  activeAlignments: Array<{ relevance: number; expectedWeight?: number }>,
  allCandidates: Array<{ expectedWeight?: number }>,
  jofAffinity?: number,
  currentJofMovieCount?: number,
  isForcedJof: boolean = false
): {
  score: number;
  tier: 'Ouro' | 'Prata' | 'Bronze' | 'Sem Bônus';
  coverageRatio: number;
  averageRelevance: number;
} {
  const totalExpected = allCandidates.length;
  if (activeAlignments.length === 0 || totalExpected === 0) {
    return { score: 0, tier: 'Sem Bônus', coverageRatio: 0, averageRelevance: 0 };
  }

  // 1. Média ponderada pelo quadrado do expectedWeight (privilegia subSentiments nucleares da JOF, weight >= 0.90)
  let weightedSum = 0;
  let weightTotalActive = 0;
  let hasCoreSubActivated = false;

  for (const a of activeAlignments) {
    const w = a.expectedWeight ?? 0.8;
    const wSq = w * w;
    weightedSum += a.relevance * wSq;
    weightTotalActive += wSq;
    if (w >= 0.95 && a.relevance >= 0.65) {
      hasCoreSubActivated = true;
    }
  }

  const weightedAvg = weightTotalActive > 0
    ? weightedSum / weightTotalActive
    : activeAlignments.reduce((acc, r) => acc + r.relevance, 0) / activeAlignments.length;

  // Se jofAffinity (coerência direta do filme com a prateleira) estiver presente, combina 75% subSentiments + 25% afinidade direta
  const effectiveAvg = typeof jofAffinity === 'number'
    ? weightedAvg * 0.75 + jofAffinity * 0.25
    : weightedAvg;

  const intensity = Math.pow(effectiveAvg, 1.5) * 10;

  // 2. Cobertura inteligente sobre o núcleo (máx 9 quando jofAffinity >= 0.72)
  const highShelfAffinity = typeof jofAffinity === 'number' && jofAffinity >= 0.72;
  const effectiveDenominator = highShelfAffinity ? Math.min(totalExpected, 9) : totalExpected;
  const coverageRatio = Math.min(1.0, activeAlignments.length / effectiveDenominator);

  // 3. Bônus de Cobertura (exige que pelo menos 1 subSentiment nuclear >= 0.95 esteja ativo e afinidade mínima com a prateleira)
  const affinityOkForGold = typeof jofAffinity === 'number' ? jofAffinity >= 0.68 : true;
  let bonus = 0;
  let tier: 'Ouro' | 'Prata' | 'Bronze' | 'Sem Bônus' = 'Sem Bônus';
  if (coverageRatio >= 0.75 && hasCoreSubActivated && affinityOkForGold) {
    bonus = 0.6;
    tier = 'Ouro';
  } else if (coverageRatio >= 0.65 && hasCoreSubActivated) {
    bonus = 0.4;
    tier = 'Prata';
  } else if (coverageRatio >= 0.50) {
    bonus = 0.2;
    tier = 'Bronze';
  }

  let rawScore = intensity * Math.sqrt(coverageRatio) + bonus;

  // 4. Penalidade de incoerência de prateleira (ex: filmes de ação/terror/comédia caindo em prateleiras incompatíveis)
  if (typeof jofAffinity === 'number' && jofAffinity < 0.58) {
    const penaltyFactor = Math.max(0.35, jofAffinity / 0.68);
    rawScore *= penaltyFactor;
  }

  // 5. Balanceamento de catálogo (evita concentração excessiva nas mesmas JOFs superlotadas)
  if (!isForcedJof && typeof currentJofMovieCount === 'number') {
    if (currentJofMovieCount > 35) {
      const saturationPenalty = Math.min(0.45, (currentJofMovieCount - 35) * 0.012);
      rawScore -= saturationPenalty;
    } else if (currentJofMovieCount < 18) {
      const scarcityBoost = Math.min(0.20, (18 - currentJofMovieCount) * 0.02);
      rawScore += scarcityBoost;
    }
  }

  const score = Math.max(0, Math.min(Number(rawScore.toFixed(3)), 10.0));

  return {
    score,
    tier,
    coverageRatio,
    averageRelevance: Number(effectiveAvg.toFixed(3))
  };
}

/**
 * Enriquece o filme com keywords emocionais e semânticas fiéis ao gênero e tom real da obra
 */
export async function enrichMovieKeywords(
  movieId: string,
  tmdbId: number,
  title: string,
  year: number | null,
  genres: string[] | null,
  description: string | null,
  currentKeywords: string[],
  provider: AIProvider = 'deepseek'
): Promise<{ success: boolean; addedCount: number }> {
  try {
    const config = getDefaultConfig(provider);
    const ai = createAIProvider(config);

    const systemPrompt = "Você é um especialista em análise cinematográfica e metadados semânticos.";
    const prompt = `Filme: '${title}' (${year || 'N/A'}).
Gêneros oficiais: ${genres?.join(', ') || 'N/A'}
Keywords atuais: ${currentKeywords.slice(0, 30).join(', ')}
Sinopse: ${description || 'Sinopse não disponível.'}

Sua tarefa é gerar uma lista de 10 a 15 keywords enriquecidas em português para este filme, sendo 100% FIEL ao tom predominante e aos gêneros da obra:
- Se for Comédia, Sátira, Animação, Aventura, Romance ou Família: respeite o subgênero exato da obra (ex: humor ácido, sátira social, ironia afiada e situações absurdas para comédias satíricas/irreverentes; ou humor contagiante, aventura encantadora, leveza familiar e romance solar para obras leves/familiares).
- Se for Ação, Ficção Científica, Crime, Thriller ou Terror: foque no ritmo, tensão, medo, sobrenatural, espetáculo ou intriga (ex: tensão sobrenatural, pavor crescente, adrenalina pura, ritmo eletrizante, reviravolta inteligente, ação visceral).
- APENAS use termos de melancolia, luto, solidão, tristeza íntima ou esgotamento se o filme for genuinamente um Drama focado nesses temas. NUNCA dramatize artificialmente filmes de ação, aventura, comédia, animação ou terror/horror.

As novas keywords devem:
- Ser em português (minúsculas)
- Ser termos ou expressões curtas (máximo 3-4 palavras)
- NÃO REPETIR as keywords atuais

Formatação estrita: retorne APENAS os termos separados por VÍRGULA, sem numeração, sem aspas, sem introdução.
Exemplo: humor contagiante, ritmo eletrizante, encanto visual, calor familiar, mistério engenhoso`;

    const response = await withTimeout(
      ai.generateResponseWithFallback(systemPrompt, prompt, {
        maxTokens: 250,
        temperature: 0.6
      }),
      25000, 'enriquecimento de keywords'
    );

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
    return { success: false, addedCount: 0 };
  }
}

/**
 * Salva a curadoria de uma jornada sugerida
 */
export async function saveSuggestionFlow(
  movieId: string,
  targetJof: JofEvaluationResult,
  movie: { title: string; year: number | null; keywords: string[]; description: string | null },
  dnaSubSentiments: Array<{ id: number; name: string; mainSentimentId?: number }>,
  positionLabel: string = '1ª Opção',
  provider: AIProvider = 'deepseek'
): Promise<{ reflection: string }> {
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

    const resp = await withTimeout(
      ai.generateResponseWithFallback("Você é um curador de cinema.", prompt, { temperature: 0.7 }),
      30000, 'geração de reflexão'
    );
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
      const repResp = await withTimeout(
        ai.generateResponseWithFallback('Você é um editor de texto.', repPrompt, { temperature: 0.7 }),
        20000, 'refinamento de frase nominal'
      );
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

/**
 * Gera ganchos de Landing Page
 */
export async function generateLandingPageHook(
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
Responda APENAS com essa frase, sem aspas.`;

    const emotionalResp = await withTimeout(
      ai.generateResponseWithFallback("Você é um curador de cinema.", emotionalPrompt, { maxTokens: 100, temperature: 0.5 }),
      15000, 'benefício emocional'
    );
    const emotionalBenefit = emotionalResp.content?.trim().replace(/^["']|["']$/g, '') || `uma jornada marcante de ${sentimentName.toLowerCase()}`;
    const targetAudience = `Este filme pode ser perfeito para quem busca ${emotionalBenefit}.`;

    const hookPrompt = `Filme: '${title}' (${year || 'N/A'}). Gêneros: ${genres?.join(', ') || 'N/A'}. Keywords: ${keywords?.slice(0, 10).join(', ') || 'N/A'}.
Crie um gancho emocional imersivo (cerca de 25-35 palavras) para a página do filme.
Capture a atmosfera, o impacto e a vibe do filme sem clichês de marketing (NUNCA use "Prepare-se", "Imperdível", "Assista", nem cite nomes de personagens).
Responda APENAS com a frase direta, sem aspas.`;

    const hookResp = await withTimeout(
      ai.generateResponseWithFallback("Você é um redator cinematográfico de elite.", hookPrompt, { maxTokens: 150, temperature: 0.7 }),
      20000, 'landing page hook'
    );
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
 * Executa a avaliação completa (Preview) de um filme contra as jornadas
 */
export async function evaluateMovie(
  title: string,
  year?: number,
  options?: {
    sentiment?: string;
    intention?: string;
    jofId?: number;
    replace?: boolean;
    provider?: AIProvider;
    threshold?: number;
  }
): Promise<CurationPreviewOutput> {
  const provider = options?.provider || 'deepseek';
  const threshold = options?.threshold ?? 0.55;
  const forcedJofId = options?.jofId;
  const targetSentiment = options?.sentiment?.toLowerCase().trim();
  const targetIntention = options?.intention?.toLowerCase().trim();

  const selectFields = {
    id: true,
    title: true,
    year: true,
    genres: true,
    keywords: true,
    description: true,
    tmdbId: true,
    slug: true,
    certification: true
  };

  let movie = await prisma.movie.findFirst({
    where: {
      title: { equals: title, mode: 'insensitive' },
      ...(year ? { year } : {})
    },
    select: selectFields
  });

  if (!movie) {
    const ingest = await processSingleMovie(title, year);
    if (!ingest.success || !ingest.movieId) {
      throw new Error(`Falha na ingestão do filme "${title}" no TMDB/OMDb.`);
    }
    movie = await prisma.movie.findUnique({ where: { id: ingest.movieId }, select: selectFields });
  }

  if (!movie || !movie.tmdbId) {
    throw new Error('Não foi possível carregar os dados completos do filme.');
  }

  // Auto-healing: verificar se o título possui caracteres não-latinos
  if (hasNonLatinCharacters(movie.title)) {
    const localizedTitle = await resolveLocalizedMovieTitle(movie.tmdbId, movie.title, movie.title);
    if (localizedTitle !== movie.title) {
      const newSlug = await generateUniqueSlug(localizedTitle, movie.year || undefined, movie.tmdbId);
      await prisma.movie.update({
        where: { id: movie.id },
        data: { title: localizedTitle, slug: newSlug }
      });
      movie.title = localizedTitle;
      movie.slug = newSlug;
    }
  }

  // Enriquecer Oscars
  try {
    const oscarService = new OscarDataService();
    await oscarService.enrichMovieAwards(movie.tmdbId);
  } catch {
    // ignorar
  }

  // Enriquecer keywords
  const enrichRes = await enrichMovieKeywords(
    movie.id,
    movie.tmdbId,
    movie.title,
    movie.year,
    movie.genres || [],
    movie.description,
    movie.keywords || [],
    provider
  );

  if (enrichRes.addedCount > 0) {
    const updatedMovie = await prisma.movie.findUnique({ where: { id: movie.id }, select: { keywords: true } });
    if (updatedMovie?.keywords) movie.keywords = updatedMovie.keywords;
  }

  // Carregar SubSentiments e JOFs
  const allSubSentiments = await prisma.subSentiment.findMany();
  const subMap = new Map(allSubSentiments.map(s => [s.id, s]));

  // Contagem de filmes atuais por JOF para balanceamento de superlotação
  const jofCountsRaw = await prisma.movieSuggestionFlow.groupBy({
    by: ['journeyOptionFlowId'],
    _count: { id: true }
  });
  const jofMovieCountsMap = new Map<number, number>(
    jofCountsRaw.map(c => [c.journeyOptionFlowId, c._count.id])
  );

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

  const evaluationCandidates: Array<{
    jofId: number;
    jofText: string;
    mainSentimentId: number;
    mainSentimentName: string;
    mainSentimentKeywords: string[];
    intentionType: string;
    intentionDescription: string;
    candidates: SubSentimentCandidate[];
  }> = [];

  const horrorInGenres = (movie.genres || []).some(g => /\b(terror|horror)\b/i.test(g));
  const horrorInText = /\b(terror|horror|sobrenatural|supernatural|possess[ãa]o|possession|exorcismo|dem[ôo]nio|demoniac|maldi[çc][ãa]o|assombra[çc][ãa]o|assombrado|seance|haunting|slasher|macabr[oa]s?|gore)\b|esp[íi]rito(s)?\s+(malign|vingativ|demon|obsessor|sombri|do mal)/i.test(
    `${(movie.keywords || []).join(' ')} ${movie.description || ''}`
  );
  const isFamilyOrLightGenre = (movie.genres || []).some(g => /anima(ção|cao)|fam[íi]lia|romance|com[eé]dia/i.test(g.trim()));
  const isHorrorGenre = horrorInGenres || (horrorInText && !isFamilyOrLightGenre);
  const HORROR_ELIGIBLE_JOFS = new Set([10, 60, 87, 98, 99, 100, 101, 105, 180]);

  for (const jof of allJofs) {
    if (!jof.isEndState && !forcedJofId) continue;
    if (!forcedJofId && isHorrorGenre && !HORROR_ELIGIBLE_JOFS.has(jof.id)) {
      continue;
    }
    const rels = jofRelsMap.get(jof.id) || [];
    if (rels.length < 4 && !forcedJofId) continue;

    const eij = jof.journeyStepFlow?.emotionalIntentionJourneySteps?.[0]?.emotionalIntention;
    const mainSent = eij?.mainSentiment || jof.journeyStepFlow?.journeyFlow?.mainSentiment || null;

    const mainSentName = mainSent?.name || 'Geral';
    const mainSentKeywords = mainSent?.keywords || [];
    const intentionType = eij?.intentionType || 'GERAL';
    const intentionDescription = eij?.description || '';

    if (targetSentiment) {
      const match =
        mainSentName.toLowerCase().includes(targetSentiment) ||
        mainSentKeywords.some(k => k.toLowerCase().includes(targetSentiment));
      if (!match) continue;
    }

    if (targetIntention && !intentionType.toLowerCase().includes(targetIntention)) {
      continue;
    }

    const seenNames = new Set<string>();
    const candidates: SubSentimentCandidate[] = [];
    for (const rel of rels) {
      const s = subMap.get(rel.subSentimentId);
      const name = s?.name || `Sub ${rel.subSentimentId}`;
      const normName = name.toLowerCase().trim();
      if (seenNames.has(normName)) continue;
      seenNames.add(normName);
      candidates.push({
        id: rel.subSentimentId,
        name,
        keywords: s?.keywords || [],
        expectedWeight: Number(rel.weight)
      });
    }

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
    throw new Error(`Nenhuma jornada elegível encontrada para os filtros fornecidos.`);
  }

  // Avaliação Jev em lotes
  const results: JofEvaluationResult[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < evaluationCandidates.length; i += BATCH_SIZE) {
    const chunk = evaluationCandidates.slice(i, i + BATCH_SIZE);
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
        const currentCount = jofMovieCountsMap.get(item.jofId) || 0;
        const { score, tier, coverageRatio, averageRelevance } = computeScore(
          active.map(a => ({ relevance: a.relevance, expectedWeight: a.expectedWeight })),
          item.candidates.map(c => ({ expectedWeight: c.expectedWeight })),
          jevRes.jofAffinity,
          currentCount,
          Boolean(forcedJofId)
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
          jofAffinity: jevRes.jofAffinity,
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

  if (results.length === 0) {
    throw new Error('Nenhuma jornada atingiu pontuação mínima de ativação.');
  }

  const champion1 = results[0];
  const MIN_SCORE_OPTION2 = 6.0;

  let champion2 = results.find(
    r => r.jofId !== champion1.jofId &&
         r.mainSentimentName !== champion1.mainSentimentName &&
         r.score >= MIN_SCORE_OPTION2
  );

  if (!champion2) {
    champion2 = results.find(
      r => r.jofId !== champion1.jofId &&
           r.score >= MIN_SCORE_OPTION2
    );
  }

  const topSelections = [champion1];
  if (champion2) topSelections.push(champion2);

  return {
    movie: {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      tmdbId: movie.tmdbId,
      slug: movie.slug || undefined,
      description: movie.description,
      keywords: movie.keywords
    },
    topSelections,
    allResults: results
  };
}

/**
 * Persiste as seleções aprovadas, reflexões, content warnings e vitrine
 */
export async function commitCurations(
  movieId: string,
  selections: JofEvaluationResult[],
  provider: AIProvider = 'deepseek',
  replaceExisting: boolean = false
): Promise<CurationSavedOutput> {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      slug: true,
      description: true,
      keywords: true,
      genres: true,
      certification: true
    }
  });

  if (!movie || !movie.tmdbId) {
    throw new Error(`Filme ID ${movieId} não encontrado no banco.`);
  }

  if (replaceExisting) {
    await prisma.movieSuggestionFlow.deleteMany({ where: { movieId: movie.id } });
    await prisma.movieSentiment.deleteMany({ where: { movieId: movie.id } });
  }

  const allSubSentiments = await prisma.subSentiment.findMany();
  const dna = allSubSentiments.map(s => ({
    id: s.id,
    name: s.name,
    mainSentimentId: s.mainSentimentId
  }));

  const savedSuggestions: CurationSavedOutput['savedSuggestions'] = [];

  for (let idx = 0; idx < selections.length; idx++) {
    const item = selections[idx];
    const label = idx === 0 ? '1ª Opção (Principal)' : `2ª Opção (Humor Alternativo: ${item.mainSentimentName})`;
    const { reflection } = await saveSuggestionFlow(
      movie.id,
      item,
      {
        title: movie.title,
        year: movie.year,
        keywords: movie.keywords,
        description: movie.description
      },
      dna,
      label,
      provider
    );

    savedSuggestions.push({
      label,
      jofId: item.jofId,
      score: item.score,
      tier: item.tier,
      sentiment: item.mainSentimentName,
      intention: item.intentionType,
      journeyText: item.jofText,
      reflection
    });
  }

  // EmotionalEntryType
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
  } catch {
    // ignorar
  }

  // Content Warnings via Jev
  try {
    const warningsResult = await jevService.evaluateContentWarnings({
      title: movie.title,
      year: movie.year || undefined,
      genres: movie.genres,
      keywords: movie.keywords,
      description: movie.description || undefined,
      certification: movie.certification || undefined
    });

    if (warningsResult.success && warningsResult.warning) {
      await prisma.movie.update({
        where: { id: movie.id },
        data: { contentWarnings: warningsResult.warning }
      });
    }
  } catch {
    // ignorar
  }

  // Landing Page Hook & Target Audience
  await generateLandingPageHook(
    movie.tmdbId,
    movie.title,
    movie.year,
    movie.genres,
    movie.keywords,
    movie.description,
    selections[0].mainSentimentName,
    provider
  );

  // Recalcular Ranking de Relevância
  try {
    await updateRelevanceRankingForMovie(movie.id);
  } catch {
    // ignorar
  }

  return {
    movie: {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      tmdbId: movie.tmdbId,
      slug: movie.slug || undefined,
      url: `https://vibesfilm.com/filme/${movie.slug || movie.id}`
    },
    savedSuggestions
  };
}

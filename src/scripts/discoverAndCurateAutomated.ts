// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import { searchMovie } from './populateMovies';
import { validateMovieSentiments } from './validateMovieSentiments';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';

// Criar PrismaClient com configurações otimizadas
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Determinar provedor de IA baseado em argumentos ou variável de ambiente
function getAIProvider(): AIProvider {
  const args = process.argv.slice(2);
  const providerArg = args.find(arg => arg.startsWith('--ai-provider='));
  const provider = providerArg ? providerArg.split('=')[1] as AIProvider : process.env.AI_PROVIDER as AIProvider;

  // Validar e retornar apenas openai, deepseek ou gemini (padrão: openai)
  if (provider === 'deepseek' || provider === 'openai' || provider === 'gemini') {
    return provider;
  }

  // Fallback para openai se provider inválido ou não especificado
  return 'openai';
}

interface EmotionalIntention {
  id: number;
  mainSentimentId: number;
  intentionType: 'PROCESS' | 'TRANSFORM' | 'MAINTAIN' | 'EXPLORE';
  description: string;
  preferredGenres: string[];
  avoidGenres: string[];
  emotionalTone: string;
  subSentimentWeights: any;
}

interface JourneyPath {
  mainSentimentId: number;
  mainSentimentName: string;
  emotionalIntentionId?: number;
  emotionalIntentionType?: string;
  journeyFlowId: number;
  steps: Array<{
    stepId: number;
    optionId: number;
  }>;
}

interface SentimentAnalysisResult {
  success: boolean;
  mainSentiment?: string;
  subSentiments?: Array<{
    name: string;
    score: number;
  }>;
  message?: string;
}

// ===== FUNÇÃO PRINCIPAL AUTOMATIZADA =====
async function automatedCuration(
  tmdbId: number,
  targetSentimentId: number,
  journeyOptionFlowId: number,
  intentionType: 'PROCESS' | 'TRANSFORM' | 'MAINTAIN' | 'EXPLORE' = 'PROCESS'
) {
  try {
    console.log("🎬 === SISTEMA DE CURAÇÃO AUTOMÁTICA DE FILMES (AUTOMATIZADO) ===");
    console.log(`🎯 Objetivo: Adicionar filme (TMDB ID: ${tmdbId}) como sugestão de filme`);
    console.log(`🎭 Sentimento alvo: ID ${targetSentimentId}`);
    console.log(`🧠 Intenção emocional: ${intentionType}`);
    console.log();

    // FASE 1: Descobrimento do filme
    const movie = await discoverMovieByTmdbId(tmdbId);

    // FASE 1.5: Seleção automática da intenção emocional
    const emotionalIntention = await selectEmotionalIntentionAutomated(
      targetSentimentId,
      movie.genres,
      intentionType,
      journeyOptionFlowId
    );

    // FASE 2: Análise de sentimentos
    const sentimentAnalysis = await analyzeMovieSentiments(movie.id, targetSentimentId);

    if (!sentimentAnalysis.success) {
      console.log(`❌ Análise de sentimentos falhou: ${sentimentAnalysis.message}`);
      return { success: false, error: sentimentAnalysis.message };
    }

    // FASE 3: Curadoria e validação da jornada (automatizada)
    const curationResult = await curateAndValidateJourneyAutomated(
      movie.id,
      sentimentAnalysis,
      journeyOptionFlowId,
      emotionalIntention
    );

    if (!curationResult.success) {
      console.log(`❌ Curadoria falhou: ${curationResult.message}`);
      return { success: false, error: curationResult.message };
    }

    // FASE 4: População da sugestão
    const success = await populateSuggestion(movie.id, curationResult.journeyPath!);

    if (success) {
      console.log("\n🎉 === CURADORIA CONCLUÍDA COM SUCESSO! ===");
      console.log(`✅ Filme: ${movie.title} (${movie.year})`);
      console.log(`✅ Sentimento: ${sentimentAnalysis.mainSentiment}`);
      console.log(`✅ Intenção Emocional: ${intentionType}`);
      console.log(`✅ UUID: ${movie.id}`);
      return { success: true, movie };
    } else {
      console.log("\n❌ === CURADORIA FALHOU NA FASE FINAL ===");
      return { success: false, error: "Falha na população da sugestão" };
    }

  } catch (error) {
    console.error('❌ Erro durante a curadoria:', error);
    return { success: false, error: `Erro inesperado: ${error}` };
  }
}

// ===== FUNÇÕES AUXILIARES AUTOMATIZADAS =====

async function discoverMovieByTmdbId(tmdbId: number) {
  console.log(`\n🎬 === FASE 1: DESCOBRIMENTO DO FILME ===`);
  console.log(`🔍 Buscando filme por TMDB ID: ${tmdbId}...`);

  // Garantir que Prisma está conectado (com retry)
  let retries = 3;
  while (retries > 0) {
    try {
      await prisma.$connect();
      break;
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      console.log(`⚠️ Tentando reconectar... (${3 - retries}/3)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const movie = await prisma.movie.findUnique({
    where: {
      tmdbId: tmdbId
    }
  });

  if (movie) {
    console.log(`✅ Filme encontrado no banco: "${movie.title}" (${movie.year}) (TMDB ID: ${movie.tmdbId})`);
    return movie;
  }

  throw new Error(`Filme com TMDB ID "${tmdbId}" não encontrado no banco`);
}

async function selectEmotionalIntentionAutomated(
  mainSentimentId: number,
  movieGenres: string[],
  intentionType: 'PROCESS' | 'TRANSFORM' | 'MAINTAIN' | 'EXPLORE',
  journeyOptionFlowId?: number
): Promise<EmotionalIntention | undefined> {
  console.log(`\n🎭 === FASE 1.5: SELEÇÃO AUTOMÁTICA DA INTENÇÃO EMOCIONAL ===`);

  // Se temos journeyOptionFlowId, mostrar que está sendo usado
  if (journeyOptionFlowId) {
    console.log(`🎯 Usando journeyOptionFlowId fornecido: ${journeyOptionFlowId}`);

    // Buscar informações da jornada para mostrar detalhes
    const journeyOption = await prisma.journeyOptionFlow.findUnique({
      where: { id: journeyOptionFlowId },
      include: {
        journeyStepFlow: {
          include: {
            journeyFlow: {
              include: {
                mainSentiment: true
              }
            }
          }
        }
      }
    });

    if (journeyOption) {
      console.log(`📋 Jornada selecionada: ${journeyOption.journeyStepFlow?.journeyFlow?.mainSentiment?.name || 'Nome não disponível'}`);
      console.log(`🎭 Sentimento da jornada: ${journeyOption.journeyStepFlow?.journeyFlow?.mainSentiment?.name || 'Sentimento não disponível'}`);
      console.log(`📝 Opção: "${journeyOption.text}"`);
      console.log(`ℹ️ Pulando seleção automática - usando jornada específica fornecida`);
    } else {
      console.log(`⚠️ JourneyOptionFlow ID ${journeyOptionFlowId} não encontrado`);
    }

    return undefined; // Retornar undefined para usar a jornada específica
  }

  // Se não temos journeyOptionFlowId, fazer seleção automática
  console.log(`🧠 Selecionando intenção emocional para o sentimento ID: ${mainSentimentId}`);

  const mainSentiment = await prisma.mainSentiment.findUnique({
    where: { id: mainSentimentId }
  });

  if (!mainSentiment) {
    console.log(`❌ Sentimento não encontrado: ID ${mainSentimentId}`);
    return undefined;
  }

  console.log(`📊 Sentimento encontrado: ${mainSentiment.name}`);

  const selectedIntention = await prisma.emotionalIntention.findFirst({
    where: {
      mainSentimentId: mainSentimentId,
      intentionType: intentionType
    }
  });

  if (!selectedIntention) {
    console.log(`⚠️ Intenção ${intentionType} não encontrada para ${mainSentiment.name}`);
    console.log(`ℹ️ Continuando com jornada tradicional...`);
    return undefined;
  }

  const intentionLabel = getIntentionLabel(selectedIntention.intentionType);
  console.log(`🎉 Intenção selecionada: ${intentionLabel}`);
  console.log(`📝 Descrição: ${selectedIntention.description}`);

  return selectedIntention as EmotionalIntention;
}

async function curateAndValidateJourneyAutomated(
  movieId: string,
  sentimentAnalysis: SentimentAnalysisResult,
  journeyOptionFlowId: number,
  emotionalIntention?: EmotionalIntention
): Promise<{ success: boolean; journeyPath?: JourneyPath; message?: string }> {
  console.log(`\n🎯 === FASE 3: CURADORIA E VALIDAÇÃO DA JORNADA (AUTOMATIZADA) ===`);

  try {
    let mainSentimentId: number;

    if (emotionalIntention) {
      mainSentimentId = emotionalIntention.mainSentimentId;
      const intentionSentiment = await prisma.mainSentiment.findUnique({
        where: { id: mainSentimentId }
      });
      console.log(`🎭 Usando sentimento da intenção emocional: ${intentionSentiment?.name} (ID: ${mainSentimentId})`);
    } else if (sentimentAnalysis.mainSentiment) {
      const mainSentiment = await prisma.mainSentiment.findFirst({
        where: { name: sentimentAnalysis.mainSentiment }
      });

      if (mainSentiment) {
        mainSentimentId = mainSentiment.id;
        console.log(`🎭 Usando sentimento detectado na análise: ${sentimentAnalysis.mainSentiment} (ID: ${mainSentimentId})`);
      } else {
        throw new Error(`Sentimento "${sentimentAnalysis.mainSentiment}" não encontrado no banco`);
      }
    } else {
      throw new Error("Nenhum sentimento disponível para curadoria");
    }

    // Criar jornada simplificada com a opção específica
    const journeyPath = await createAutomatedJourneyPath(mainSentimentId, journeyOptionFlowId, emotionalIntention);

    // Validar compatibilidade
    const movieDetails = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (movieDetails) {
      const option = await prisma.journeyOptionFlow.findUnique({
        where: { id: journeyOptionFlowId }
      });

      if (option) {
        console.log(`🔍 Validando opção: "${option.text}"`);

        // Verificar se há subsentimentos associados
        const optionSubSentimentRels = await prisma.journeyOptionFlowSubSentiment.findMany({
          where: { journeyOptionFlowId: journeyOptionFlowId }
        });

        const optionSubSentimentIds = optionSubSentimentRels.map(rel => rel.subSentimentId);
        const optionSubSentiments = await prisma.subSentiment.findMany({
          where: { id: { in: optionSubSentimentIds } }
        });

        const movieSubSentiments = await prisma.movieSentiment.findMany({
          where: { movieId: movieId },
          include: {
            subSentiment: {
              include: {
                mainSentiment: true
              }
            }
          }
        });

        console.log(`📊 SubSentiments da opção: ${optionSubSentiments.length}`);
        console.log(`📊 SubSentiments do filme: ${movieSubSentiments.length}`);

        // COMPARAÇÃO SEMÂNTICA: Match por NOME, não por ID
        const compatibleSubSentiments = movieSubSentiments.filter(mss =>
          optionSubSentiments.some(optSub => {
            const rel = optionSubSentimentRels.find(r => r.subSentimentId === optSub.id);
            return optSub.name === mss.subSentiment.name && rel && rel.weight.toNumber() >= 0.5;
          })
        );

        if (compatibleSubSentiments.length > 0) {
          console.log(`✅ Filme compatível com a jornada (${compatibleSubSentiments.length} subsentimentos compatíveis)`);
          compatibleSubSentiments.forEach(css => {
            console.log(`   - ${css.subSentiment.name} (${css.subSentiment.mainSentiment.name})`);
          });
        } else {
          console.log(`⚠️ Filme não tem subsentimentos compatíveis, mas continuando...`);
        }
      }
    }

    return { success: true, journeyPath };

  } catch (error) {
    console.error('Erro na curadoria da jornada:', error);
    return { success: false, message: `Erro: ${error}` };
  }
}

async function createAutomatedJourneyPath(
  mainSentimentId: number,
  journeyOptionFlowId: number,
  emotionalIntention?: EmotionalIntention
): Promise<JourneyPath> {
  const mainSentiment = await prisma.mainSentiment.findUnique({
    where: { id: mainSentimentId }
  });

  const journeyFlow = await prisma.journeyFlow.findFirst({
    where: { mainSentimentId }
  });

  if (!journeyFlow) {
    throw new Error("JourneyFlow não encontrado para este sentimento");
  }

  return {
    mainSentimentId,
    mainSentimentName: mainSentiment?.name || "",
    emotionalIntentionId: emotionalIntention?.id,
    emotionalIntentionType: emotionalIntention ? getIntentionLabel(emotionalIntention.intentionType) : undefined,
    journeyFlowId: journeyFlow.id,
    steps: [{
      stepId: 0, // Simplified
      optionId: journeyOptionFlowId
    }]
  };
}

async function analyzeMovieSentiments(movieId: string, targetSentimentId?: number): Promise<SentimentAnalysisResult> {
  console.log(`\n🧠 === FASE 2: ANÁLISE DE SENTIMENTOS ===`);
  console.log(`📊 Analisando sentimentos para: "${movieId}"`);

  // Buscar sentimentos já existentes
  const existingMovieSentiments = await prisma.movieSentiment.findMany({
    where: { movieId },
    include: {
      subSentiment: {
        include: {
          mainSentiment: true
        }
      }
    }
  });

  if (existingMovieSentiments.length > 0) {
    console.log(`✅ Filme já possui ${existingMovieSentiments.length} sentimentos analisados`);
    console.log(`ℹ️  Nota: A análise foi executada na Etapa 2 do Orchestrator`);
    console.log(`ℹ️  Novos sentimentos (se houver) foram adicionados automaticamente`);

    const targetMainSentiment = await prisma.mainSentiment.findUnique({
      where: { id: targetSentimentId }
    });

    return {
      success: true,
      mainSentiment: targetMainSentiment?.name,
      subSentiments: existingMovieSentiments.map(ems => ({
        name: ems.subSentiment.name,
        score: 1.0
      }))
    };
  }

  return {
    success: false,
    message: "Filme não possui sentimentos analisados"
  };
}

async function populateSuggestion(movieId: string, journeyPath: JourneyPath): Promise<boolean> {
  console.log(`\n🎯 === FASE 4: POPULAÇÃO DA SUGESTÃO ===`);

  try {
    const lastStep = journeyPath.steps[journeyPath.steps.length - 1];
    const optionId = lastStep.optionId;

    // Verificar se já existe
    const existingSuggestion = await prisma.movieSuggestionFlow.findFirst({
      where: {
        movieId,
        journeyOptionFlowId: optionId
      }
    });

    if (existingSuggestion) {
      console.log(`✅ Sugestão já existe (ID: ${existingSuggestion.id}) - Atualizando reflexão...`);

      // Buscar informações do filme
      const movie = await prisma.movie.findUnique({
        where: { id: movieId }
      });

      if (!movie) {
        console.log(`❌ Filme não encontrado: ${movieId}`);
        return false;
      }

      // Buscar opção da jornada
      console.log(`🔍 Buscando opção da jornada ID: ${optionId}`);
      const option = await prisma.journeyOptionFlow.findUnique({
        where: { id: optionId }
      });
      console.log(`📝 Opção encontrada: "${option?.text}"`);

      if (!option) {
        console.log(`❌ Opção não encontrada: ${optionId}`);
        return false;
      }

      // Calcular relevanceScore baseado nos matches de subsentimentos
      const relevanceScore = await calculateRelevanceScore(movieId, optionId);

      // Gerar nova reflexão
      console.log(`🎯 Iniciando geração de reflexão para: ${movie.title}`);
      const reflection = await generateReflectionForMovie(movie, option);
      console.log(`✅ Reflexão gerada: "${reflection}"`);

      // Atualizar a sugestão existente
      await prisma.movieSuggestionFlow.update({
        where: { id: existingSuggestion.id },
        data: {
          reason: reflection,
          relevanceScore: relevanceScore,
          updatedAt: new Date()
        }
      });

      console.log(`📊 Relevance Score atualizado: ${relevanceScore?.toFixed(3) || 'N/A'}`);

      console.log(`✅ Sugestão atualizada (ID: ${existingSuggestion.id})`);
      console.log(`📝 Opção: ${option.text}`);
      console.log(`🎬 Filme: ${movie.title} (${movie.year})`);

      return true;
    }

    // Buscar informações do filme
    const movie = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (!movie) {
      console.log(`❌ Filme não encontrado: ${movieId}`);
      return false;
    }

    // Buscar opção da jornada
    console.log(`🔍 Buscando opção da jornada ID: ${optionId}`);
    const option = await prisma.journeyOptionFlow.findUnique({
      where: { id: optionId }
    });
    console.log(`📝 Opção encontrada: "${option?.text}"`);

    if (!option) {
      console.log(`❌ Opção não encontrada: ${optionId}`);
      return false;
    }

    // Calcular relevanceScore baseado nos matches de subsentimentos
    const relevanceScore = await calculateRelevanceScore(movieId, optionId);

    // Gerar reflexão
    console.log(`🎯 Iniciando geração de reflexão para: ${movie.title}`);
    const reflection = await generateReflectionForMovie(movie, option);
    console.log(`✅ Reflexão gerada: "${reflection}"`);

    // Criar sugestão com relevanceScore incluído
    // Nota: relevance será calculado automaticamente pela função updateRelevanceRankingForMovie
    const suggestion = await prisma.movieSuggestionFlow.create({
      data: {
        movieId,
        journeyOptionFlowId: optionId,
        reason: reflection,
        relevance: 1, // Valor temporário, será recalculado abaixo
        relevanceScore: relevanceScore,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`📊 Relevance Score definido: ${relevanceScore?.toFixed(3) || 'N/A'}`);

    console.log(`✅ Sugestão criada (ID: ${suggestion.id})`);
    console.log(`📝 Opção: ${option.text}`);
    console.log(`🎬 Filme: ${movie.title} (${movie.year})`);
    console.log(`📊 Relevance Score: ${relevanceScore?.toFixed(3) || 'N/A'}`);

    return true;

  } catch (error) {
    console.error('Erro ao popular sugestão:', error);
    return false;
  }
}

// Função para calcular o relevanceScore baseado nos matches de subsentimentos
// Nova fórmula: Intensidade × √Abrangência + Bônus
async function calculateRelevanceScore(movieId: string, journeyOptionFlowId: number): Promise<number | null> {
  try {
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
      console.log(`⚠️ Jornada ${journeyOptionFlowId} não tem SubSentiments configurados`);
      return 0;
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
    const allMovieSentiments = await prisma.movieSentiment.findMany({
      where: {
        movieId: movieId
      },
      include: {
        subSentiment: true
      }
    });

    // Filtrar apenas os que têm nome correspondente aos esperados
    const movieSentiments = allMovieSentiments.filter(ms =>
      uniqueExpectedNames.has(ms.subSentiment.name)
    );

    // Regra de Conflito: Para cada nome, manter apenas a MAIOR relevância
    const uniqueMatches = new Map<string, number>();

    movieSentiments.forEach(ms => {
      const name = ms.subSentiment.name;
      const relevance = Number(ms.relevance);

      if (!uniqueMatches.has(name) || uniqueMatches.get(name)! < relevance) {
        uniqueMatches.set(name, relevance);
      }

      // Log do match
      console.log(`🎯 Match encontrado: ${name} (Relevância: ${relevance.toFixed(3)})`);
    });

    // PASSO 3: CÁLCULO - Nova fórmula de Intensidade × Abrangência
    if (uniqueMatches.size === 0 || totalUniqueExpected === 0) {
      console.log(`⚠️ Nenhum match de subsentimento encontrado para o filme`);
      return 0;
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

    // BÔNUS POR PATAMARES (Tiers):
    // Bronze (50-64%): +0.2 (Reconhecimento)
    // Prata (65-74%):  +0.4 (Forte aderência)
    // Ouro (75-100%):  +0.6 (Filme definitivo da jornada)
    let bonus = 0;
    let tier = '';

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

    if (bonus > 0) {
      score += bonus;
    }

    // Aplicar teto de 10.0
    score = Math.min(score, 10.0);

    // Arredondar para 3 casas decimais
    const relevanceScore = Math.round(score * 1000) / 1000;

    console.log(`📊 Relevance Score calculado: ${relevanceScore}`);
    console.log(`   Matches: ${matchCount}/${totalUniqueExpected} nomes únicos | Cobertura: ${(coverageRatio * 100).toFixed(1)}%`);
    console.log(`   Intensidade: ${intensity.toFixed(3)} × √Cobertura: ${sqrtCoverage.toFixed(3)}${bonus > 0 ? ` + Bônus: ${bonus} (${tier})` : ''}`);
    console.log(`   Média: ${average.toFixed(3)}`);

    return relevanceScore;

  } catch (error) {
    console.error('Erro ao calcular relevance score:', error);
    return null;
  }
}

async function generateReflectionForMovie(movie: any, option: any): Promise<string> {
  // Buscar informações do filme no banco para obter keywords dos sentimentos
  const movieWithSentiments = await prisma.movie.findUnique({
    where: { id: movie.id },
    include: {
      movieSentiments: {
        include: {
          subSentiment: true
        }
      }
    }
  });

  const keywords = movieWithSentiments?.movieSentiments
    .flatMap(ms => ms.subSentiment.keywords)
    .filter((value, index, self) => self.indexOf(value) === index) || [];

  // Buscar dados do TMDB para obter sinopse (sem verificar streaming - já foi feito na Etapa 1)
  // Usar tmdbId diretamente para evitar problemas com títulos traduzidos
  const tmdbMovie = await searchMovie(undefined, undefined, movie.tmdbId || undefined, true); // skipStreaming: true
  const movieData = tmdbMovie?.movie;

  if (!movieData) {
    return `Uma reflexão inspiradora sobre ${movie.title} que explora temas profundos da experiência humana.`;
  }

  return await generateReflectionWithAI(movieData, keywords, option);
}

async function generateReflectionWithAI(movie: any, keywords: string[], option: any): Promise<string> {
  console.log(`🔍 Gerando reflexão para: ${movie.title}`);
  console.log(`📝 Opção de jornada: "${option.text}"`);

  const prompt = `
Você é um curador especialista em psicologia cinematográfica do "vibesfilm".

### 🎬 DADOS DO FILME
- Título: ${movie.title} (${movie.year || 'Ano não especificado'})
- Sinopse: ${movie.overview || 'N/A'}
- Gêneros: ${movie.genres.map((g: any) => g.name).join(', ')}
- Keywords: ${keywords.slice(0, 15).join(', ') || 'N/A'}

### 🎯 OPÇÃO DE JORNADA EMOCIONAL
"${option.text}"

### 📝 MISSÃO: O COMPLEMENTO PERFEITO (CONTINUAÇÃO DE FRASE)
O frontend exibe: "Este filme é perfeito para quem busca..."
Sua tarefa é escrever APENAS o restante da frase (o complemento).

1. **FORMATO**: Comece com letra MINÚSCULA.
   - **REGRA DE OURO (ARTIGO)**: Inicie OBRIGATORIAMENTE com um ARTIGO (o, a, um, uma).
   - **ESTRUTURA FRASAL**: Use FRASES NOMINAIS.
   - **MENU DE SUBSTANTIVOS (VARIEDADE)**: Use um destes se possível, evitando repetir sempre o mesmo:
     * "um retrato..."
     * "uma análise..."
     * "uma odisséia..."
     * "um estudo..."
     * "um convite..."
     * "uma celebração..."
     * "uma exploração..."
     * "um manifesto..."
     * "um quebra-cabeça..." (suspense/thriller)
     * "uma espiral..." (suspense/thriller)
     * "uma dissecação..."
     * "um duelo..."
     * "um labirinto..." (psicológico)
     * "uma crônica..."
   - **REGRA ANTI-REPETIÇÃO**: A palavra "imersão" (e "mergulho") está PROIBIDA se o filme anterior usou algo similar. Prefira substantivos táteis ou geométricos (espiral, mosaico, labirinto, duelo). USE "IMERSÃO" APENAS EM ÚLTIMO CASO.
   - **PROIBIÇÃO TOTAL**: JAMAIS inicie com VERBOS (ex: "descobrir", "testemunhar").
   - **PROIBIÇÃO DE REDUNDÂNCIA**: EVITE iniciar com "uma busca" ou "a busca" (pois repete o frontend).

2. **CONTEÚDO**: Conecte a essência do filme ao desejo profundo do usuário.

3. **PROIBIDO**: NÃO repita "para quem busca". NÃO use ponto final se possível (mas aceitável).

4. **ESTILO**: Fluido, elegante e direto. Máx 180 caracteres.

Exemplos Bons:
- "aprender que o silêncio não é um vazio, mas uma nova frequência para reencontrar a própria voz."
- "vivenciar a transformação da dor em propósito, onde cada golpe na arena é uma palavra na sentença final de um homem contra a tirania."
- "entender que a verdadeira coragem reside na aceitação da própria vulnerabilidade."

RESPONDA APENAS COM O TEXTO DA REFLEXÃO, SEM JSON OU FORMATAÇÃO ESPECIAL.
`;

  try {
    const provider = getAIProvider();
    const config = getDefaultConfig(provider);
    const aiProvider = createAIProvider(config);

    const systemPrompt = 'Você é um curador especialista em psicologia cinematográfica. Escreva reflexões poéticas e envolventes que conectem a essência do filme ao desejo emocional profundo do usuário. Use linguagem fluida e elegante. IMPORTANTE: Responda APENAS com o texto da reflexão, sem formatação JSON ou markdown.';

    const response = await aiProvider.generateResponse(systemPrompt, prompt, {
      temperature: 0.7,
      maxTokens: 150
    });

    if (!response.success) {
      console.error(`Erro na API ${provider}:`, response.error);
      return `uma experiência que atende perfeitamente à sua busca emocional atual.`;
    }

    return response.content.trim();
  } catch (error) {
    console.error(`Erro ao gerar justificativa com ${getAIProvider()}:`, error);
    return `uma experiência que atende perfeitamente à sua busca emocional atual.`;
  }
}

function getIntentionLabel(intentionType: string): string {
  const labels = {
    'PROCESS': 'PROCESSAR',
    'TRANSFORM': 'TRANSFORMAR',
    'MAINTAIN': 'MANTER',
    'EXPLORE': 'EXPLORAR'
  };
  return labels[intentionType as keyof typeof labels] || intentionType;
}

// ===== FUNÇÃO PRINCIPAL =====
async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length < 4) {
      console.log("🎬 === SISTEMA DE CURAÇÃO AUTOMÁTICA DE FILMES ===");
      console.log("Uso: npx ts-node discoverAndCurateAutomated.ts \"Nome do Filme\" ano sentimentoId journeyOptionFlowId [intentionType]");
      console.log("Exemplo: npx ts-node discoverAndCurateAutomated.ts \"Moonlight: Sob a Luz do Luar\" 2016 15 81 PROCESS");
      return;
    }

    const tmdbId = parseInt(args[0]);
    const targetSentimentId = parseInt(args[1]);
    const journeyOptionFlowId = parseInt(args[2]);
    const intentionType = (args[3] as any) || 'PROCESS';

    const result = await automatedCuration(
      tmdbId,
      targetSentimentId,
      journeyOptionFlowId,
      intentionType
    );

    if (!result.success) {
      console.log(`❌ Curadoria falhou: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro durante a curadoria:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
} 
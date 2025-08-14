import { PrismaClient } from '@prisma/client';
import { searchMovie } from './populateMovies';
import { validateMovieSentiments } from './validateMovieSentiments';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';

const prisma = new PrismaClient();

// Determinar provedor de IA baseado em argumentos ou variável de ambiente
function getAIProvider(): AIProvider {
  const args = process.argv.slice(2);
  const providerArg = args.find(arg => arg.startsWith('--ai-provider='));
  const provider = providerArg ? providerArg.split('=')[1] as AIProvider : process.env.AI_PROVIDER as AIProvider;
  
  return provider === 'gemini' ? 'gemini' : 'openai';
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
      intentionType
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
  intentionType: 'PROCESS' | 'TRANSFORM' | 'MAINTAIN' | 'EXPLORE'
): Promise<EmotionalIntention | undefined> {
  console.log(`\n🎭 === FASE 1.5: SELEÇÃO AUTOMÁTICA DA INTENÇÃO EMOCIONAL ===`);
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
        const optionSubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
          where: { journeyOptionFlowId: journeyOptionFlowId }
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

        const compatibleSubSentiments = movieSubSentiments.filter(mss => 
          optionSubSentiments.some(jofss => 
            jofss.subSentimentId === mss.subSentimentId && jofss.weight.toNumber() >= 0.5
          )
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
      console.log(`✅ Sugestão já existe (ID: ${existingSuggestion.id})`);
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
    const option = await prisma.journeyOptionFlow.findUnique({
      where: { id: optionId }
    });

    if (!option) {
      console.log(`❌ Opção não encontrada: ${optionId}`);
      return false;
    }

    // Calcular relevanceScore baseado nos matches de subsentimentos
    const relevanceScore = await calculateRelevanceScore(movieId, optionId);

    // Gerar reflexão
    const reflection = await generateReflectionForMovie(movie);

    // Criar sugestão
    const suggestion = await prisma.movieSuggestionFlow.create({
      data: {
        movieId,
        journeyOptionFlowId: optionId,
        reason: reflection,
        relevance: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Atualizar o relevanceScore após a criação (quando o campo estiver disponível)
    if (relevanceScore !== null) {
      try {
        await prisma.$executeRaw`
          UPDATE "MovieSuggestionFlow" 
          SET "relevanceScore" = ${relevanceScore}
          WHERE id = ${suggestion.id}
        `;
        console.log(`📊 Relevance Score atualizado: ${relevanceScore.toFixed(3)}`);
      } catch (error) {
        console.log(`⚠️ Campo relevanceScore ainda não disponível no banco: ${error}`);
      }
    }

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
async function calculateRelevanceScore(movieId: string, journeyOptionFlowId: number): Promise<number | null> {
  try {
    // Buscar os subsentimentos associados à opção da jornada
    const optionSubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
      where: { journeyOptionFlowId: journeyOptionFlowId }
    });

    // Buscar os subsentimentos do filme
    const movieSubSentiments = await prisma.movieSentiment.findMany({
      where: { movieId: movieId }
    });

    // Buscar detalhes dos subsentimentos separadamente
    const subSentimentIds = [...new Set([
      ...optionSubSentiments.map(oss => oss.subSentimentId),
      ...movieSubSentiments.map(mss => mss.subSentimentId)
    ])];

    const subSentiments = await prisma.subSentiment.findMany({
      where: { id: { in: subSentimentIds } }
    });

    let totalRelevanceScore = 0;
    let matchCount = 0;

    // Para cada subsentimento da opção, verificar se há match no filme
    for (const optionSub of optionSubSentiments) {
      const movieMatch = movieSubSentiments.find(movieSub => 
        movieSub.subSentimentId === optionSub.subSentimentId
      );

      if (movieMatch) {
        // Se há match, somar a relevância (weight) do subsentimento da opção
        totalRelevanceScore += optionSub.weight.toNumber();
        matchCount++;
        
        // Buscar o nome do subsentimento
        const subSentiment = subSentiments.find(ss => ss.id === optionSub.subSentimentId);
        const subSentimentName = subSentiment?.name || `ID ${optionSub.subSentimentId}`;
        
        console.log(`🎯 Match encontrado: ${subSentimentName} (Relevância: ${optionSub.weight.toNumber()})`);
      }
    }

    // Retornar o score total se houver pelo menos um match
    if (matchCount > 0) {
      console.log(`📊 Relevance Score calculado: ${totalRelevanceScore.toFixed(3)} (${matchCount} matches)`);
      return totalRelevanceScore;
    }

    console.log(`⚠️ Nenhum match de subsentimento encontrado para o filme`);
    return null;

  } catch (error) {
    console.error('Erro ao calcular relevance score:', error);
    return null;
  }
}

async function generateReflectionForMovie(movie: any): Promise<string> {
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

  // Buscar dados do TMDB para obter sinopse
  const tmdbMovie = await searchMovie(movie.title, movie.year);
  const movieData = tmdbMovie?.movie;

  if (!movieData) {
    return `Uma reflexão inspiradora sobre ${movie.title} que explora temas profundos da experiência humana.`;
  }

  return await generateReflectionWithAI(movieData, keywords);
}

async function generateReflectionWithAI(movie: any, keywords: string[]): Promise<string> {
  const prompt = `
Filme: ${movie.title} (${movie.year || 'Ano não especificado'})
Sinopse: ${movie.overview}
Gêneros: ${movie.genres.map((g: any) => g.name).join(', ')}
Palavras-chave emocionais: ${keywords.join(', ')}

Escreva uma reflexão curta e inspiradora sobre este filme, capturando sua essência emocional e os temas principais da história.

REGRAS IMPORTANTES:
- Escreva APENAS o texto da reflexão, sem formatação JSON
- Use entre 20-35 palavras
- Seja inspiradora e envolvente
- Capture o tom e tema específico do filme
- Termine com um ponto final
- Não repita o nome do filme
- Conecte os temas principais com o impacto emocional
- Seja específico para este filme, não genérico

RESPONDA APENAS COM O TEXTO DA REFLEXÃO, SEM JSON OU FORMATAÇÃO ESPECIAL.
`;

  try {
    const provider = getAIProvider();
    const config = getDefaultConfig(provider);
    const aiProvider = createAIProvider(config);
    
    const systemPrompt = 'Você é um crítico de cinema especializado em análise emocional de filmes. Escreva reflexões concisas e inspiradoras que capturem a essência emocional única de cada filme. IMPORTANTE: Responda APENAS com o texto da reflexão, sem formatação JSON ou markdown.';
    
    const response = await aiProvider.generateResponse(systemPrompt, prompt, {
      temperature: 0.8,
      maxTokens: 120
    });

    if (!response.success) {
      console.error(`Erro na API ${provider}:`, response.error);
      return `Uma jornada cinematográfica que explora a complexidade das emoções humanas com profundidade e sensibilidade.`;
    }

    return response.content.trim();
  } catch (error) {
    console.error(`Erro ao gerar reflexão com ${getAIProvider()}:`, error);
    return `Uma jornada cinematográfica que explora a complexidade das emoções humanas com profundidade e sensibilidade.`;
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
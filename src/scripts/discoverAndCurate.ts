import { PrismaClient } from '@prisma/client';
import { searchMovie } from './populateMovies';
import { validateMovieSentiments } from './validateMovieSentiments';
import axios from 'axios';
import * as readline from 'readline';

const prisma = new PrismaClient();

interface JourneyPath {
  mainSentimentId: number;
  mainSentimentName: string;
  journeyFlowId: number;
  steps: Array<{
    stepId: number;
    optionId: number;
  }>;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
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

// Interface para leitura de input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

// ===== FASE 1: DESCOBRIMENTO DO FILME =====
async function discoverMovie(movieTitle: string, movieYear: number) {
  console.log(`\n🎬 === FASE 1: DESCOBRIMENTO DO FILME ===`);
  console.log(`🔍 Buscando filme: "${movieTitle}" (${movieYear})...`);
  
  // Buscar filme no banco
  const movie = await prisma.movie.findFirst({
    where: {
      title: { contains: movieTitle, mode: 'insensitive' },
      year: movieYear
    }
  });

  if (movie) {
    console.log(`✅ Filme encontrado no banco: "${movie.title}" (ID: ${movie.id})`);
    return movie;
  }

  console.log(`❌ Filme "${movieTitle}" (${movieYear}) não encontrado no banco`);
  const addMovie = await question("Deseja adicionar o filme ao banco? (s/n): ");
  
  if (addMovie.toLowerCase() === 's') {
    console.log("🔄 Adicionando filme ao banco...");
    
    // Buscar no TMDB (versão silenciosa)
    console.log("🔍 Buscando no TMDB...");
    const tmdbMovie = await searchMovieSilent(movieTitle, movieYear);
    if (!tmdbMovie) {
      throw new Error("Filme não encontrado no TMDB");
    }

    console.log(`✅ Filme encontrado no TMDB: "${tmdbMovie.movie.title}"`);

    // Criar filme no banco com todos os dados do TMDB
    const newMovie = await prisma.movie.create({
      data: {
        title: tmdbMovie.movie.title,
        year: parseInt(tmdbMovie.movie.release_date?.split('-')[0] || movieYear.toString()),
        director: tmdbMovie.director,
        genres: tmdbMovie.movie.genres?.map((g: any) => g.name) || [],
        runtime: tmdbMovie.movie.runtime || 0,
        vote_average: tmdbMovie.movie.vote_average || 0,
        vote_count: tmdbMovie.movie.vote_count || 0,
        keywords: tmdbMovie.keywords || [],
        streamingPlatforms: tmdbMovie.platforms || [],
        description: tmdbMovie.movie.overview,
        thumbnail: tmdbMovie.movie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.movie.poster_path}` : null,
        original_title: tmdbMovie.movie.original_title,
        certification: tmdbMovie.certification,
        adult: tmdbMovie.movie.adult || false,
        genreIds: tmdbMovie.movie.genres?.map((g: any) => g.id) || []
      }
    });

    console.log(`✅ Filme adicionado: "${newMovie.title}" (ID: ${newMovie.id})`);
    console.log(`📊 Dados salvos:`);
    console.log(`   - Director: ${newMovie.director || 'Não informado'}`);
    console.log(`   - Description: ${newMovie.description ? 'Sim' : 'Não'}`);
    console.log(`   - Thumbnail: ${newMovie.thumbnail ? 'Sim' : 'Não'}`);
    console.log(`   - Original Title: ${newMovie.original_title || 'Não informado'}`);
    console.log(`   - Certification: ${newMovie.certification || 'Não informado'}`);
    console.log(`   - Keywords: ${newMovie.keywords.length} keywords`);
    console.log(`   - Streaming Platforms: ${newMovie.streamingPlatforms.length} plataformas`);
    console.log(`   - Genre IDs: ${newMovie.genreIds ? newMovie.genreIds.length : 0} IDs`);
    
    return newMovie;
  }

  throw new Error("Filme não encontrado e não foi adicionado");
}

// Função auxiliar para buscar no TMDB de forma silenciosa
async function searchMovieSilent(movieTitle: string, movieYear?: number) {
  // Temporariamente suprimir logs do console
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = () => {}; // Suprimir logs
  console.error = () => {}; // Suprimir erros
  
  try {
    const result = await searchMovie(movieTitle, movieYear);
    return result;
  } finally {
    // Restaurar logs
    console.log = originalLog;
    console.error = originalError;
  }
}

// ===== FASE 2: ANÁLISE DE SENTIMENTOS =====
async function analyzeMovieSentiments(movieId: string, targetSentimentId?: number): Promise<SentimentAnalysisResult> {
  console.log(`\n🧠 === FASE 2: ANÁLISE DE SENTIMENTOS ===`);
  
  try {
    // Buscar filme com detalhes
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        movieSentiments: {
          include: {
            subSentiment: {
              include: {
                mainSentiment: true
              }
            }
          }
        }
      }
    });

    if (!movie) {
      return { success: false, message: "Filme não encontrado" };
    }

    console.log(`📊 Analisando sentimentos para: "${movie.title}"`);
    console.log(`🎭 Gêneros: ${movie.genres.join(', ')}`);

    // Se já tem sentimentos, mostrar
    if (movie.movieSentiments.length > 0) {
      console.log(`✅ Filme já possui análise de sentimentos:`);
      
      const mainSentiments = new Map<string, Array<{ name: string; score: number }>>();
      
      movie.movieSentiments.forEach(ms => {
        const mainSentimentName = ms.subSentiment.mainSentiment.name;
        if (!mainSentiments.has(mainSentimentName)) {
          mainSentiments.set(mainSentimentName, []);
        }
        mainSentiments.get(mainSentimentName)!.push({
          name: ms.subSentiment.name,
          score: 1.0 // Valor padrão já que o score não está disponível no include
        });
      });

      mainSentiments.forEach((subSentiments, mainSentiment) => {
        console.log(`   📍 ${mainSentiment}:`);
        subSentiments.forEach(ss => {
          console.log(`      - ${ss.name}: ${ss.score.toFixed(2)}`);
        });
      });

      return {
        success: true,
        mainSentiment: Array.from(mainSentiments.keys())[0],
        subSentiments: Array.from(mainSentiments.values()).flat()
      };
    }

    // Se não tem sentimentos, executar análise
    console.log(`🔄 Executando análise de sentimentos...`);
    
    // Se um sentimento específico foi passado, analisar apenas ele
    if (targetSentimentId) {
      const targetSentiment = await prisma.mainSentiment.findUnique({
        where: { id: targetSentimentId }
      });
      
      if (!targetSentiment) {
        return { success: false, message: `Sentimento ID ${targetSentimentId} não encontrado` };
      }
      
      console.log(`🎯 Analisando apenas sentimento: ${targetSentiment.name} (ID: ${targetSentimentId})`);
      
      const result = await validateMovieSentiments({
        mainSentiment: targetSentiment.name,
        movieTitle: movie.title,
        year: movie.year || undefined,
        flow: 'genre',
        genre: movie.genres.join(', ')
      });

      if (result.success) {
        console.log(`✅ Correspondência encontrada: ${targetSentiment.name}`);
        return {
          success: true,
          mainSentiment: targetSentiment.name,
          subSentiments: []
        };
      } else {
        console.log(`❌ Nenhuma correspondência encontrada para ${targetSentiment.name}`);
        return { success: false, message: `Nenhuma correspondência encontrada para ${targetSentiment.name}` };
      }
    }
    
    // Se não foi passado sentimento específico, analisar todos (comportamento original)
    console.log(`🔄 Analisando todos os sentimentos...`);
    const mainSentiments = await prisma.mainSentiment.findMany();
    let bestMatch: SentimentAnalysisResult = { success: false, message: "Nenhuma correspondência encontrada" };

    for (const mainSentiment of mainSentiments) {
      const result = await validateMovieSentiments({
        mainSentiment: mainSentiment.name,
        movieTitle: movie.title,
        year: movie.year || undefined,
        flow: 'genre',
        genre: movie.genres.join(', ')
      });

      if (result.success) {
        console.log(`✅ Correspondência encontrada: ${mainSentiment.name}`);
        bestMatch = {
          success: true,
          mainSentiment: mainSentiment.name,
          subSentiments: [] // A função validateMovieSentiments não retorna subSentiments
        };
        break;
      }
    }

    if (bestMatch.success) {
      console.log(`🎯 Melhor correspondência: ${bestMatch.mainSentiment}`);
      bestMatch.subSentiments?.forEach(ss => {
        console.log(`   - ${ss.name}: ${ss.score.toFixed(2)}`);
      });
    } else {
      console.log(`❌ Nenhuma correspondência de sentimentos encontrada`);
    }

    return bestMatch;

  } catch (error) {
    console.error('Erro na análise de sentimentos:', error);
    return { success: false, message: `Erro: ${error}` };
  }
}

// ===== FASE 3: CURADORIA E VALIDAÇÃO DA JORNADA =====
async function curateAndValidateJourney(movieId: string, sentimentAnalysis: SentimentAnalysisResult): Promise<{ success: boolean; journeyPath?: JourneyPath; message?: string }> {
  console.log(`\n🎯 === FASE 3: CURADORIA E VALIDAÇÃO DA JORNADA ===`);
  
  try {
    // 1. Escolher jornada baseada no sentimento
    let mainSentimentId: number;
    
    if (sentimentAnalysis.mainSentiment) {
      const mainSentiment = await prisma.mainSentiment.findFirst({
        where: { name: sentimentAnalysis.mainSentiment }
      });
      
      if (mainSentiment) {
        mainSentimentId = mainSentiment.id;
        console.log(`🎭 Usando sentimento detectado: ${sentimentAnalysis.mainSentiment} (ID: ${mainSentimentId})`);
      } else {
        throw new Error(`Sentimento "${sentimentAnalysis.mainSentiment}" não encontrado no banco`);
      }
    } else {
      // Escolha manual se não foi detectado
      console.log("\n📋 Escolha o sentimento principal:");
      const mainSentiments = await prisma.mainSentiment.findMany({ orderBy: { id: 'asc' } });
      
      mainSentiments.forEach((sentiment, index) => {
        console.log(`${index + 1}. ${sentiment.name} - ID: ${sentiment.id}`);
      });

      const choice = await question("\nDigite o número da opção: ");
      const selectedIndex = parseInt(choice) - 1;
      
      if (selectedIndex < 0 || selectedIndex >= mainSentiments.length) {
        throw new Error("Opção inválida");
      }

      mainSentimentId = mainSentiments[selectedIndex].id;
    }

    // 2. Descobrir jornada
    const journeyPath = await discoverJourneySteps(mainSentimentId);
    
    // 3. Validar última opção da jornada
    const lastStep = journeyPath.steps[journeyPath.steps.length - 1];
    const option = await prisma.journeyOptionFlow.findUnique({
      where: { id: lastStep.optionId }
    });

    if (!option) {
      throw new Error(`Opção não encontrada: ${lastStep.optionId}`);
    }

    console.log(`\n🔍 Validando última opção: "${option.text}"`);

    // 4. Buscar SubSentiments da opção
    const optionSubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
      where: { journeyOptionFlowId: lastStep.optionId }
    });

    console.log(`📊 SubSentiments associados à opção: ${optionSubSentiments.length}`);

    // 5. Buscar SubSentiments do filme
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

    console.log(`📊 SubSentiments do filme: ${movieSubSentiments.length}`);

    // 6. Verificar compatibilidade
    const compatibleSubSentiments = movieSubSentiments.filter(mss => 
      optionSubSentiments.some(jofss => jofss.subSentimentId === mss.subSentimentId)
    );

    // LÓGICA ESPECIAL PARA SENTIMENTO "INDIFERENTE"
    const indiferenteSentiment = await prisma.mainSentiment.findFirst({
      where: { name: "Indiferente" }
    });
    
    if (indiferenteSentiment && mainSentimentId === indiferenteSentiment.id) {
      console.log(`\n🎭 Sentimento "Indiferente" detectado - aplicando lógica especial`);
      console.log(`💡 Para o estado inicial "Indiferente", qualquer subsentimento é válido`);
      
      if (movieSubSentiments.length > 0) {
        console.log(`✅ Filme possui ${movieSubSentiments.length} subsentimentos - válido para jornada "Indiferente"`);
        movieSubSentiments.forEach(mss => {
          console.log(`   - ${mss.subSentiment.name} (${mss.subSentiment.mainSentiment.name})`);
        });
        
        // Associar automaticamente os subsentimentos do filme à opção se não estiverem associados
        for (const mss of movieSubSentiments) {
          const existingAssociation = await prisma.journeyOptionFlowSubSentiment.findFirst({
            where: {
              journeyOptionFlowId: lastStep.optionId,
              subSentimentId: mss.subSentimentId
            }
          });

          if (!existingAssociation) {
            await prisma.journeyOptionFlowSubSentiment.create({
              data: {
                journeyOptionFlowId: lastStep.optionId,
                subSentimentId: mss.subSentimentId,
                weight: 1.0,
                updatedAt: new Date()
              }
            });
            console.log(`   🔗 Associado automaticamente: ${mss.subSentiment.name}`);
          }
        }
        
        return { success: true, journeyPath };
      } else {
        console.log(`❌ Filme não possui subsentimentos - inválido para jornada`);
        return { success: false, message: "Filme sem subsentimentos para jornada Indiferente" };
      }
    }

    // LÓGICA NORMAL PARA OUTROS SENTIMENTOS
    if (compatibleSubSentiments.length === 0) {
      console.log(`❌ Nenhum SubSentiment compatível encontrado`);
      
      // 7. RESOLUÇÃO AUTOMÁTICA: Associar SubSentiments do filme à opção
      const shouldAssociate = await question(
        `\n💡 Deseja associar os SubSentiments do filme à opção "${option.text}"? (s/n): `
      );

      if (shouldAssociate.toLowerCase() === 's') {
        console.log(`🔄 Associando SubSentiments à opção...`);
        
        for (const mss of movieSubSentiments) {
          // Verificar se já existe associação
          const existingAssociation = await prisma.journeyOptionFlowSubSentiment.findFirst({
            where: {
              journeyOptionFlowId: lastStep.optionId,
              subSentimentId: mss.subSentimentId
            }
          });

          if (!existingAssociation) {
            await prisma.journeyOptionFlowSubSentiment.create({
              data: {
                journeyOptionFlowId: lastStep.optionId,
                subSentimentId: mss.subSentimentId,
                weight: 1.0, // Peso padrão
                updatedAt: new Date()
              }
            });
            console.log(`   ✅ Associado: ${mss.subSentiment.name}`);
          } else {
            console.log(`   ⏭️ Já associado: ${mss.subSentiment.name}`);
          }
        }

        // Recarregar associações
        const updatedOptionSubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
          where: { journeyOptionFlowId: lastStep.optionId }
        });

        console.log(`✅ Total de associações após atualização: ${updatedOptionSubSentiments.length}`);
        
        return { success: true, journeyPath };
      } else {
        return { success: false, message: "Associação de SubSentiments rejeitada" };
      }
    }

    console.log(`✅ SubSentiments compatíveis encontrados: ${compatibleSubSentiments.length}`);
    compatibleSubSentiments.forEach(css => {
      console.log(`   - ${css.subSentiment.name} (score: 1.0)`);
    });

    return { success: true, journeyPath };

  } catch (error) {
    console.error('Erro na curadoria da jornada:', error);
    return { success: false, message: `Erro: ${error}` };
  }
}

async function discoverJourneySteps(mainSentimentId: number): Promise<JourneyPath> {
  console.log(`\n🎯 Descobrindo jornada para o sentimento ID: ${mainSentimentId}...`);
  
  // Buscar JourneyFlow
  const journeyFlow = await prisma.journeyFlow.findFirst({
    where: { mainSentimentId }
  });

  if (!journeyFlow) {
    throw new Error("JourneyFlow não encontrado para este sentimento");
  }

  // Buscar Steps
  const steps = await prisma.journeyStepFlow.findMany({
    where: { journeyFlowId: journeyFlow.id },
    orderBy: { order: 'asc' }
  });

  const selectedSteps: Array<{ stepId: number; optionId: number }> = [];

  // Começar com o primeiro step (ordem 1)
  let currentStep = steps.find(s => s.order === 1);
  
  while (currentStep) {
    console.log(`\n📝 Passo: ${currentStep.question}`);
    
    // Buscar opções do step atual
    const options = await prisma.journeyOptionFlow.findMany({
      where: { journeyStepFlowId: currentStep.id },
      orderBy: { id: 'asc' }
    });

    options.forEach((option, index) => {
      const finalIndicator = option.isEndState ? " ✅ FINAL" : "";
      console.log(`${index + 1}. ${option.text} (ID: ${option.id})${finalIndicator}`);
    });

    const choice = await question("\nDigite o número da opção: ");
    const selectedIndex = parseInt(choice) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= options.length) {
      throw new Error("Opção inválida");
    }

    const selectedOption = options[selectedIndex];
    selectedSteps.push({
      stepId: currentStep.id,
      optionId: selectedOption.id
    });

    // Se é estado final, parar
    if (selectedOption.isEndState) {
      break;
    }

    // Buscar o próximo step baseado no nextStepId da opção escolhida
    if (selectedOption.nextStepId) {
      currentStep = steps.find(s => s.stepId === selectedOption.nextStepId);
      if (!currentStep) {
        console.log(`⚠️ Próximo step não encontrado para nextStepId: ${selectedOption.nextStepId}`);
        break;
      }
    } else {
      // Se não há nextStepId, buscar o próximo step por ordem
      currentStep = steps.find(s => s.order === currentStep!.order + 1);
      if (!currentStep) {
        console.log("⚠️ Não há mais steps na jornada");
        break;
      }
    }
  }

  return {
    mainSentimentId,
    mainSentimentName: (await prisma.mainSentiment.findUnique({ where: { id: mainSentimentId } }))?.name || "",
    journeyFlowId: journeyFlow.id,
    steps: selectedSteps
  };
}

// ===== FASE 4: POPULAÇÃO DA SUGESTÃO =====
async function populateSuggestion(movieId: string, journeyPath: JourneyPath): Promise<boolean> {
  console.log(`\n🎬 === FASE 4: POPULAÇÃO DA SUGESTÃO ===`);
  
  try {
    // 1. Buscar detalhes do filme
    const movieDetails = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        movieSentiments: {
          include: {
            subSentiment: true
          }
        }
      }
    });

    if (!movieDetails) {
      console.log('❌ Detalhes do filme não encontrados');
      return false;
    }

    // 2. Buscar filme no TMDB para obter sinopse
    const tmdbMovie = await searchMovieSilent(movieDetails.title, movieDetails.year || undefined);
    if (!tmdbMovie) {
      console.log('❌ Filme não encontrado no TMDB');
      return false;
    }

    // 3. Gerar reflexão usando OpenAI
    const keywords = movieDetails.movieSentiments
      .flatMap(ms => ms.subSentiment.keywords)
      .filter((value, index, self) => self.indexOf(value) === index);

    console.log(`🔄 Gerando reflexão inspiradora...`);
    const reason = await generateReflectionWithOpenAI(tmdbMovie.movie, keywords);

    // 4. Criar entrada na MovieSuggestionFlow
    const lastStep = journeyPath.steps[journeyPath.steps.length - 1];
    
    await prisma.movieSuggestionFlow.create({
      data: {
        movieId: movieId,
        journeyOptionFlowId: lastStep.optionId,
        reason: reason,
        relevance: 1
      }
    });

    console.log(`✅ Sugestão criada com sucesso!`);
    console.log(`📝 Reflexão: "${reason}"`);
    
    return true;

  } catch (error) {
    console.error('Erro ao popular sugestão:', error);
    return false;
  }
}

async function generateReflectionWithOpenAI(movie: any, keywords: string[]): Promise<string> {
  const prompt = `
Sinopse: ${movie.overview}
Gêneros: ${movie.genres.map((g: any) => g.name).join(', ')}
Palavras-chave: ${keywords.join(', ')}

Com base nessas informações, escreva uma reflexão curta, inspiradora e única sobre o filme, conectando os temas principais e o impacto emocional da história. 
A reflexão deve ter no máximo 30 palavras e terminar com um ponto final.
Não repita o nome do filme.
`;

  try {
    const response = await axios.post<OpenAIResponse>(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um crítico de cinema especializado em análise emocional de filmes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro ao gerar reflexão:', error);
    return 'Filme que explora temas profundos e emocionais.';
  }
}

// ===== FUNÇÃO PRINCIPAL =====
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log("🎬 === SISTEMA DE CURAÇÃO AUTOMÁTICA DE FILMES ===");
      console.log("Uso: npx ts-node discoverAndCurate.ts \"Nome do Filme\" ano [sentimentoId]");
      console.log("Exemplo: npx ts-node discoverAndCurate.ts \"Imperdoável\" 2021 14");
      console.log("\nEste script irá:");
      console.log("1. Descobrir/adicionar o filme ao banco");
      console.log("2. Analisar sentimentos automaticamente (ou apenas o sentimento especificado)");
      console.log("3. Curar e validar a jornada (com resolução automática de problemas)");
      console.log("4. Popular a sugestão final");
      return;
    }

    const movieTitle = args[0];
    const movieYear = parseInt(args[1]);
    const targetSentimentId = args[2] ? parseInt(args[2]) : undefined;

    console.log("🎬 === SISTEMA DE CURAÇÃO AUTOMÁTICA DE FILMES ===");
    console.log(`🎯 Objetivo: Adicionar "${movieTitle}" (${movieYear}) como sugestão de filme`);
    if (targetSentimentId) {
      console.log(`🎭 Sentimento alvo: ID ${targetSentimentId}`);
    }
    console.log();

    // FASE 1: Descobrimento do filme
    const movie = await discoverMovie(movieTitle, movieYear);

    // FASE 2: Análise de sentimentos
    const sentimentAnalysis = await analyzeMovieSentiments(movie.id, targetSentimentId);
    
    if (!sentimentAnalysis.success) {
      console.log(`❌ Análise de sentimentos falhou: ${sentimentAnalysis.message}`);
      return;
    }

    // FASE 3: Curadoria e validação da jornada
    const curationResult = await curateAndValidateJourney(movie.id, sentimentAnalysis);
    
    if (!curationResult.success) {
      console.log(`❌ Curadoria falhou: ${curationResult.message}`);
      return;
    }

    // FASE 4: População da sugestão
    const success = await populateSuggestion(movie.id, curationResult.journeyPath!);

    if (success) {
      console.log("\n🎉 === CURADORIA CONCLUÍDA COM SUCESSO! ===");
      console.log(`✅ Filme: ${movie.title} (${movie.year})`);
      console.log(`✅ Sentimento: ${sentimentAnalysis.mainSentiment}`);
      console.log(`✅ Jornada: ${curationResult.journeyPath!.mainSentimentName}`);
      console.log(`✅ UUID: ${movie.id}`);
    } else {
      console.log("\n❌ === CURADORIA FALHOU NA FASE FINAL ===");
    }

  } catch (error) {
    console.error('❌ Erro durante a curadoria:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();

/// <reference types="node" />
// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import { writeFileSync } from 'fs';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';
import { OscarDataService } from '../services/OscarDataService';

const prisma = new PrismaClient();

interface MovieToProcess {
  title: string;
  year: number;
  journeyOptionFlowId: number;
  analysisLens: number;
  journeyValidation: number;
  aiProvider?: 'openai' | 'deepseek' | 'gemini';
  tmdbId?: number; // opcional: quando fornecido, substitui title+year
}




interface ProcessingResult {
  success: boolean;
  movie?: { title: string; year: number; id: string };
  curedData?: any;
  error?: string;
}

class MovieCurationOrchestrator {
  private readonly scriptsPath = path.join(__dirname);
  private readonly insertFile = path.join(__dirname, '../../inserts.sql');

  async processMovieList(movies: MovieToProcess[], approveNewSubSentiments: boolean): Promise<ProcessingResult[]> {
    console.log(`\n🎬 === ORQUESTRADOR DE CURADORIA DE FILMES ===`);
    console.log(`📋 Processando ${movies.length} filmes...`);

    const results: ProcessingResult[] = [];

    for (const movie of movies) {
      console.log(`\n🔄 Processando: ${movie.title} (${movie.year})`);
      const result = await this.processSingleMovie(movie, approveNewSubSentiments);
      results.push(result);
    }

    return results;
  }

  private async processSingleMovie(movie: MovieToProcess, approveNewSubSentiments: boolean): Promise<ProcessingResult> {
    try {
      // Auto-calibração de Lente: Se houver JOF, garantir que a lente e a validação correspondam ao sentimento correto
      if (movie.journeyOptionFlowId) {
        const jofDetails = await prisma.journeyOptionFlow.findUnique({
          where: { id: movie.journeyOptionFlowId },
          select: {
            journeyStepFlow: {
              select: {
                journeyFlow: {
                  select: { mainSentimentId: true }
                }
              }
            }
          }
        });

        const resolvedLens = jofDetails?.journeyStepFlow?.journeyFlow?.mainSentimentId;
        if (resolvedLens && resolvedLens !== movie.analysisLens) {
          console.log(`🎯 Auto-calibração: Ajustando lente ${movie.analysisLens} -> ${resolvedLens} para JOF ${movie.journeyOptionFlowId}`);
          movie.analysisLens = resolvedLens;
          movie.journeyValidation = resolvedLens;
        }
      }

      // Etapa 0: Limpar arquivo de inserts
      writeFileSync(this.insertFile, '');
      console.log(`🧹 Arquivo inserts.sql limpo.`);

      // Verificar se o filme já existe no banco antes de adicionar
      // Busca flexível por título (case-insensitive e contains) e ano
      let tmdbId: number | null = null;
      const existingMovie = await prisma.movie.findFirst({
        where: {
          title: {
            contains: movie.title,
            mode: 'insensitive'
          },
          year: movie.year
        },
        select: {
          tmdbId: true,
          id: true,
          title: true
        }
      });

      // Se não encontrou com contains, tentar busca reversa (verificar se o título do banco contém o título buscado)
      let movieFound = existingMovie;
      if (!movieFound) {
        // Buscar todos os filmes do mesmo ano e verificar se algum título contém ou é contido
        const moviesSameYear = await prisma.movie.findMany({
          where: {
            year: movie.year
          },
          select: {
            tmdbId: true,
            id: true,
            title: true,
            original_title: true
          }
        });

        // Verificar similaridade de títulos
        for (const dbMovie of moviesSameYear) {
          const dbTitle = (dbMovie.title || '').toLowerCase().trim();
          const dbOriginalTitle = (dbMovie.original_title || '').toLowerCase().trim();
          const searchTitle = movie.title.toLowerCase().trim();

          // Verificar se os títulos são similares (um contém o outro ou são muito parecidos)
          if (dbTitle.includes(searchTitle) || searchTitle.includes(dbTitle) ||
            dbOriginalTitle.includes(searchTitle) || searchTitle.includes(dbOriginalTitle)) {
            movieFound = dbMovie;
            break;
          }
        }
      }

      if (movieFound && movieFound.tmdbId) {
        tmdbId = movieFound.tmdbId;
        console.log(`✅ Filme já existe no banco: ${movieFound.title} (${movie.year}) | TMDB: ${tmdbId}`);
      }

      // Etapa 1: Adicionar/Atualizar filme (sempre executa para reprocessar streaming)
      console.log(`📥 Etapa 1: Processando filme no banco...`);
      const addResult = await this.runScript('populateMovies.ts', [`--title=${movie.title}`, `--year=${movie.year.toString()}`]);

      if (!addResult.success) {
        return { success: false, error: `Falha ao processar filme: ${addResult.error}` };
      }

      // Capturar o TMDB ID do output (pode ser do filme existente ou recém-criado)
      const tmdbIdMatch = addResult.output.match(/TMDB_ID_FOUND: (\d+)/);
      if (!tmdbIdMatch) {
        // Se não encontrou no output mas já temos o tmdbId do filme existente, usar ele
        if (tmdbId) {
          console.log(`🎯 Usando TMDB ID do filme existente: ${tmdbId}`);
        } else {
          return { success: false, error: 'TMDB ID não encontrado no output do populateMovies.ts' };
        }
      } else {
        tmdbId = parseInt(tmdbIdMatch[1]);
      }

      if (!tmdbId) {
        return { success: false, error: 'TMDB ID não disponível para continuar o processamento' };
      }

      // Etapa 1.5: Enriquecer dados de Oscar (Automático)
      try {
        const oscarService = new OscarDataService();
        await oscarService.enrichMovieAwards(tmdbId);
      } catch (oscarError) {
        console.error('⚠️ Falha não crítica ao enriquecer Oscars:', oscarError);
      }

      // Usar o AI Provider especificado ou padrão (openai)
      const finalAiProvider = movie.aiProvider || 'openai';

      // Etapa 1.6: Enriquecer Keywords Semânticas
      console.log(`� Etapa 1.6: Enriquecendo keywords semânticas (${finalAiProvider.toUpperCase()})...`);
      const enrichResult = await this.enrichMovieKeywords(tmdbId, finalAiProvider);
      if (!enrichResult.success) {
        console.log(`⚠️ Aviso: Falha ao enriquecer keywords: ${enrichResult.error}`);
      } else {
        console.log(`✅ Keywords enriquecidas com sucesso! Novas adicionadas: ${enrichResult.addedCount}`);
      }
      console.log(`�🤖 Etapa 2: Analisando sentimentos (${finalAiProvider.toUpperCase()})...`);
      const analysisArgs = [
        tmdbId.toString(), // Usar tmdbId 
        movie.journeyOptionFlowId.toString(),
        movie.analysisLens.toString()
      ];

      // Adicionar provedor de IA final
      if (finalAiProvider) {
        analysisArgs.push(`--ai-provider=${finalAiProvider}`);
      }

      const analysisResult = await this.runScript('analyzeMovieSentiments.ts', analysisArgs);

      if (!analysisResult.success) {
        console.log(`✅ Análise concluída com sucesso`);
        return { success: false, error: `Falha na análise: ${analysisResult.error}` };
      }

      // Etapa 2.5: Verificação de Aprovação do Curador
      const approvalLine = analysisResult.output.split('\n').find((line: string) => line.startsWith('CURATOR_APPROVAL_NEEDED'));
      if (approvalLine) {
        if (!approveNewSubSentiments) {
          const jsonString = approvalLine.replace('CURATOR_APPROVAL_NEEDED: ', '');
          const suggestions = JSON.parse(jsonString);

          console.log('\n--------------------------------------------------');
          console.log('⚠️ APROVAÇÃO DO CURADOR NECESSÁRIA ⚠️');
          console.log('A IA sugeriu a criação dos seguintes SubSentimentos:');
          suggestions.forEach((sug: { name: string; explanation: string }) => {
            console.log(`\n  - Nome: "${sug.name}"`);
            console.log(`    Explicação: ${sug.explanation}`);
          });
          console.log('\nPara aprovar, execute o comando novamente adicionando a flag: --approve-new-subsentiments');
          console.log('--------------------------------------------------');
          return { success: false, error: 'Aprovação necessária para novo subsentimento.' };
        }
        console.log('✅ Novos subsentimentos aprovados via flag. Continuando processo...');
      }

      // Etapa 3: Executar INSERTs
      console.log(`💾 Etapa 3: Executando INSERTs...`);
      const insertResult = await this.runScript('executeSqlFromFile.ts', [this.insertFile]);
      if (!insertResult.success) {
        console.log(`⚠️ Aviso: Falha ao executar INSERTs: ${insertResult.error}`);
      }

      // Etapa 4: Descobrir e curar
      console.log(`🎯 Etapa 4: Descobrindo e curando...`);
      const curateArgs = [
        tmdbId.toString(), // Usar tmdbId
        movie.journeyValidation.toString(),
        movie.journeyOptionFlowId.toString(),
        'PROCESS'
      ];

      // Adicionar provedor de IA final
      if (finalAiProvider) {
        curateArgs.push(`--ai-provider=${finalAiProvider}`);
      }

      const curateResult = await this.runScript('discoverAndCurateAutomated.ts', curateArgs);

      if (!curateResult.success) {
        return { success: false, error: `Falha na curadoria: ${curateResult.error}` };
      }

      // Etapa 5: Verificar se deve atualizar campos genéricos baseado no relevanceScore
      const shouldUpdateGenericFields = await this.shouldUpdateGenericFields(tmdbId, movie.journeyOptionFlowId);

      if (shouldUpdateGenericFields.shouldUpdate) {
        console.log(`🎯 Etapa 5: Atualizando campos genéricos (relevanceScore: ${shouldUpdateGenericFields.currentScore} > ${shouldUpdateGenericFields.existingScore || 'N/A'})...`);

        const hookResult = await this.generateLandingPageHook(tmdbId, finalAiProvider);
        if (!hookResult.success) {
          console.log(`⚠️ Aviso: Falha ao gerar landingPageHook: ${hookResult.error}`);
        } else {
          console.log(`🎯 TargetAudienceForLP gerado: "${hookResult.targetAudience}"`);
          console.log(`🎣 LandingPageHook gerado: "${hookResult.hook}"`);
        }

        const warningsResult = await this.generateContentWarnings(tmdbId, finalAiProvider);
        if (!warningsResult.success) {
          console.log(`⚠️ Aviso: Falha ao gerar contentWarnings: ${warningsResult.error}`);
        } else {
          console.log(`⚠️ ContentWarning gerado: "${warningsResult.warning}"`);
        }
      } else {
        console.log(`🔒 Etapa 5: Mantendo campos genéricos existentes (relevanceScore atual: ${shouldUpdateGenericFields.currentScore} ≤ melhor existente: ${shouldUpdateGenericFields.existingScore})`);
      }

      // Etapa 6: Atualizar ranking de relevance
      // Buscar filme usando tmdbId (mais confiável que título/ano)
      const createdMovie = await prisma.movie.findUnique({
        where: { tmdbId: tmdbId }
      });

      if (!createdMovie) {
        console.error(`❌ Filme não encontrado no banco de dados (tmdbId: ${tmdbId}).`);
        const fallbackMovie = await prisma.movie.findFirst({
          where: { title: movie.title, year: movie.year }
        });
        if (!fallbackMovie) {
          return { success: false, error: 'Filme não encontrado no banco de dados após o processo.' };
        }
        try {
          const { updateRelevanceRankingForMovie } = await import('../utils/relevanceRanking');
          await updateRelevanceRankingForMovie(fallbackMovie.id);
        } catch (error) {
          console.error(`❌ Erro ao atualizar ranking:`, error);
        }
        return {
          success: true,
          movie: { title: fallbackMovie.title, year: fallbackMovie.year || 0, id: fallbackMovie.id }
        };
      }

      console.log(`🔄 Etapa 6: Atualizando ranking de relevance...`);

      try {
        const { updateRelevanceRankingForMovie } = await import('../utils/relevanceRanking');
        await updateRelevanceRankingForMovie(createdMovie.id);
      } catch (rankingError) {
        console.error(`❌ Erro ao atualizar ranking:`, rankingError);
      }

      console.log(`✅ Filme processado com sucesso: ${movie.title} (${movie.year})`);

      // Buscar dados finais incluindo o nome real do sentimento via cadeia JourneyOptionFlow -> JourneyStepFlow -> JourneyFlow -> MainSentiment
      const finalSuggestion = await prisma.movieSuggestionFlow.findFirst({
        where: {
          movieId: createdMovie.id,
          journeyOptionFlowId: movie.journeyOptionFlowId
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          relevanceScore: true,
          reason: true,
          journeyOptionFlow: {
            select: {
              text: true,
              journeyStepFlow: {
                select: {
                  journeyFlow: {
                    select: {
                      mainSentiment: {
                        select: { name: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Resolver nome do sentimento: prefere o nome real do banco, com fallback para lensToSentiment
      const lensToSentiment: Record<number, string> = {
        13: 'Feliz / Alegre', 14: 'Triste', 15: 'Calmo(a)',
        16: 'Ansioso(a)', 17: 'Animado(a)', 18: 'Cansado(a)'
      };
      const jofSentimentName = finalSuggestion?.journeyOptionFlow?.journeyStepFlow?.journeyFlow?.mainSentiment?.name;
      const sentimentName = jofSentimentName || (lensToSentiment[movie.analysisLens] || 'Desconhecido');

      return {
        success: true,
        movie: {
          title: createdMovie.title,
          year: createdMovie.year || 0,
          id: createdMovie.id
        },
        curedData: finalSuggestion ? {
          relevanceScore: finalSuggestion.relevanceScore,
          reason: finalSuggestion.reason,
          sentiment: sentimentName,
          journeyOptionText: finalSuggestion.journeyOptionFlow?.text
        } : null
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Erro ao processar ${movie.title}:`, errorMessage);
      return { success: false, error: `Erro inesperado: ${errorMessage}` };
    }
  }

  private async shouldUpdateGenericFields(tmdbId: number, currentJourneyOptionFlowId: number): Promise<{ shouldUpdate: boolean; currentScore?: number; existingScore?: number }> {
    try {
      // Buscar o relevanceScore da jornada atual que acabou de ser processada
      const currentJourneyResult = await prisma.movieSuggestionFlow.findFirst({
        where: {
          movie: { tmdbId: tmdbId },
          journeyOptionFlowId: currentJourneyOptionFlowId
        },
        select: {
          relevanceScore: true
        }
      });

      if (!currentJourneyResult || !currentJourneyResult.relevanceScore) {
        console.log('⚠️ Jornada atual não encontrada ou sem relevanceScore, gerando campos genéricos por padrão');
        return { shouldUpdate: true };
      }

      const currentScore = Number(currentJourneyResult.relevanceScore);

      // Buscar o maior relevanceScore existente entre todas as jornadas do filme
      const bestExistingJourney = await prisma.movieSuggestionFlow.findFirst({
        where: {
          movie: { tmdbId: tmdbId },
          journeyOptionFlowId: { not: currentJourneyOptionFlowId }, // Excluir a jornada atual
          relevanceScore: { not: null } // Garantir que tem relevanceScore
        },
        orderBy: {
          relevanceScore: 'desc'
        },
        select: {
          relevanceScore: true
        }
      });

      if (!bestExistingJourney || !bestExistingJourney.relevanceScore) {
        // Primeira jornada do filme com score válido - sempre atualizar
        console.log('✅ Primeira jornada do filme com relevanceScore válido - gerando campos genéricos');
        return { shouldUpdate: true, currentScore };
      }

      const existingScore = Number(bestExistingJourney.relevanceScore);
      const shouldUpdate = currentScore > existingScore;

      return {
        shouldUpdate,
        currentScore,
        existingScore
      };

    } catch (error) {
      console.error('❌ Erro ao verificar relevanceScore:', error);
      // Em caso de erro, sempre gerar por segurança
      return { shouldUpdate: true };
    }
  }

  private async generateLandingPageHook(tmdbId: number, aiProvider?: string): Promise<{ success: boolean; hook?: string; targetAudience?: string; error?: string }> {
    try {
      // Buscar dados do filme com sentimentos e explicações
      const movie = await prisma.movie.findUnique({
        where: { tmdbId: tmdbId },
        select: {
          title: true,
          year: true,
          genres: true,
          keywords: true,
          description: true,
          movieSentiments: {
            select: {
              relevance: true,
              explanation: true,
              subSentiment: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              relevance: 'desc'
            },
            take: 3 // Pegar os 3 mais relevantes
          }
        }
      });

      if (!movie) {
        return { success: false, error: 'Filme não encontrado no banco de dados' };
      }

      // Construir o contexto emocional
      let sentimentContext = '';
      if (movie.movieSentiments && movie.movieSentiments.length > 0) {
        sentimentContext = '\n\nAnálise emocional do filme:\n';
        movie.movieSentiments.forEach((sentiment, index) => {
          sentimentContext += `${index + 1}. ${sentiment.subSentiment.name} (Relevância: ${sentiment.relevance}): ${sentiment.explanation}\n`;
        });
      }

      // Configurar IA Provider (validar openai, deepseek ou gemini)
      let provider: AIProvider = 'openai';
      if (aiProvider === 'deepseek' || aiProvider === 'openai' || aiProvider === 'gemini') {
        provider = aiProvider as AIProvider;
      } else if (aiProvider) {
        console.warn(`⚠️ Provider '${aiProvider}' não suportado nesta função. Usando 'openai' como padrão.`);
      }
      const config = getDefaultConfig(provider);
      const ai = createAIProvider(config);
      console.log(`🤖 Gerando conteúdo com provider: ${provider.toUpperCase()}`);

      // PROMPT 1: Gerar targetAudienceForLP
      const targetAudiencePrompt = 'Para o filme \'' + movie.title + '\' (' + movie.year + '), com gêneros: ' + (movie.genres?.join(', ') || 'N/A') + ', palavras-chave principais: ' + (movie.keywords?.slice(0, 10).join(', ') || 'N/A') + ', e sinopse: ' + (movie.description || 'N/A') + '.' + sentimentContext + '\n\nFormule uma única frase concisa (máximo 25 palavras) que descreva o principal **benefício emocional ou experiência** que este filme oferece ao espectador, com base nos subsentimentos identificados. Esta frase deve se encaixar perfeitamente após \'Este filme é ideal para quem busca...\'. Foque no **impacto emocional e na síntese das qualidades**, evitando listar termos separados com barras. Não inclua JSON, formatação de lista, quebras de linha ou aspas. O resultado deve sintetizar as características emocionais em uma frase fluída.\n\nExemplo de saída esperada para \'Os Descendentes\':\n\'uma profunda reflexão sobre o crescimento pessoal e aceitação do destino, em meio a paisagens deslumbrantes e desafios familiares.\'\n\nIMPORTANTE: Responda APENAS com o texto da frase, sem aspas, sem formatação JSON ou markdown.';

      const targetAudienceResponse = await ai.generateResponse(
        "Você é um especialista em marketing cinematográfico que cria descrições precisas do público-alvo de filmes.",
        targetAudiencePrompt,
        {
          maxTokens: 200,
          temperature: 0.7
        }
      );

      if (!targetAudienceResponse.success) {
        return { success: false, error: `Falha na geração do targetAudience: ${targetAudienceResponse.error}` };
      }

      let emotionalBenefit = targetAudienceResponse.content.trim();

      // Remover blocos de código JSON se presentes (problema do Gemini)
      emotionalBenefit = emotionalBenefit.replace(/```[\s\S]*?```/g, '').trim();

      // Se ainda houver JSON, tentar extrair apenas o texto após o JSON
      if (emotionalBenefit.includes('{') && emotionalBenefit.includes('}')) {
        const lines = emotionalBenefit.split('\n');
        const nonJsonLines = lines.filter(line =>
          !line.trim().startsWith('{') &&
          !line.trim().startsWith('}') &&
          !line.includes('"name":') &&
          !line.includes('"relevance":') &&
          !line.includes('"explanation":') &&
          !line.includes('suggestedSubSentiments') &&
          line.trim().length > 10 &&
          line.trim().startsWith('Este filme é ideal') // Pegar especificamente a linha que queremos
        );
        if (nonJsonLines.length > 0) {
          emotionalBenefit = nonJsonLines[0].trim(); // Pegar apenas a primeira linha válida
        }
      }

      // Remover o prefixo se a IA já o incluiu
      emotionalBenefit = emotionalBenefit.replace(/^Este filme é ideal para quem busca\s*/i, '');

      // Remover pontos extras no final
      emotionalBenefit = emotionalBenefit.replace(/\.+$/, '');

      // Montar o texto simplificado sem sufixos padronizados
      const targetAudience = `Este filme pode ser perfeito para quem busca ${emotionalBenefit}.`;

      // PROMPT 2: Gerar landingPageHook (gancho emocional)
      // PROMPT 2: Gerar landingPageHook (gancho emocional)
      const hookPrompt = `Filme: '${movie.title}' (${movie.year}). Gêneros: ${movie.genres?.join(', ') || 'N/A'}. Palavras-chave: ${movie.keywords?.slice(0, 5).join(', ') || 'N/A'}.${sentimentContext}\n\nSua tarefa é criar um gancho emocional imersivo (cerca de 30 palavras) que capture a atmosfera, a tensão ou o impacto da experiência de assistir ao filme.\n\nExemplos de estilo desejado (varie a estrutura, não fique preso a um único modelo):\n- "A obsessão sombria de um gênio da cirurgia, onde os limites da vingança e da identidade se dissolvem em um thriller perturbador sobre os extremos do amor transformado em monstro."\n- "A banalidade do mal: um jardim idílico e uma família perfeita escondem o genocídio ao lado, desafiando tudo o que você entende sobre humanidade."\n- "Em um frenesi cinético de vingança pura, onde cada bala é um passo na dança mortal de um assassino aposentado que despertou."\n- "O loop temporal de adrenalina e sobrevivência: a mesma batalha revivida à exaustão, onde a morte brutal é o único ensaio para a maestria absoluta."\n- "Uma jornada inesquecível: Gran Torino te confronta com a amargura de um veterano e a redenção através da conexão humana, em uma história que reavalia a vida e redefine o significado de família."\n\nREGRAS MANDATÓRIAS:\n1. PROIBIDO FAZER RESUMO DA SINOPSE OU CITAR NOME DE PERSONAGENS. Foque apenas na VIBE, no tema e na sensação transmitida.\n2. Mantenha em uma única frase impetuosa e marcante.\n3. NUNCA use termos de marketing como "Prepare-se", "Não perca", "Descubra o que acontece", "Assista a".\n\nResponda APENAS com o texto exigido, sem aspas.`;

      const hookResponse = await ai.generateResponse(
        "Você é um especialista em marketing cinematográfico que cria ganchos cativantes para landing pages de filmes.",
        hookPrompt,
        {
          maxTokens: 300,
          temperature: 0.7
        }
      );

      if (!hookResponse.success) {
        return { success: false, error: `Falha na geração do hook: ${hookResponse.error}` };
      }

      let hook = hookResponse.content.trim();

      // Remover blocos de código JSON se presentes (problema do Gemini)
      hook = hook.replace(/```[\s\S]*?```/g, '').trim();

      // Se ainda houver JSON, tentar extrair apenas o texto após o JSON
      if (hook.includes('{') && hook.includes('}')) {
        const lines = hook.split('\n');
        const nonJsonLines = lines.filter(line =>
          !line.trim().startsWith('{') &&
          !line.trim().startsWith('}') &&
          !line.includes('"name":') &&
          !line.includes('"relevance":') &&
          !line.includes('"explanation":') &&
          !line.includes('suggestedSubSentiments') &&
          line.trim().length > 10
        );
        if (nonJsonLines.length > 0) {
          hook = nonJsonLines.join(' ').trim();
        }
      }

      // Validar se os textos foram gerados
      if (!targetAudience || targetAudience.length < 10) {
        return { success: false, error: 'TargetAudience gerado muito curto ou vazio' };
      }

      if (!hook || hook.length < 10) {
        return { success: false, error: 'Hook gerado muito curto ou vazio' };
      }

      // Atualizar o filme no banco de dados com os dois campos separados
      await prisma.movie.update({
        where: { tmdbId: tmdbId },
        data: {
          landingPageHook: hook,
          targetAudienceForLP: targetAudience
        }
      });

      return { success: true, hook: hook, targetAudience: targetAudience };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Erro ao gerar landingPageHook: ${errorMessage}` };
    }
  }

  private async generateContentWarnings(tmdbId: number, aiProvider?: string): Promise<{ success: boolean; warning?: string; error?: string }> {
    try {
      // Buscar dados do filme com sentimentos e explicações
      const movie = await prisma.movie.findUnique({
        where: { tmdbId: tmdbId },
        select: {
          title: true,
          year: true,
          genres: true,
          keywords: true,
          description: true,
          movieSentiments: {
            select: {
              relevance: true,
              explanation: true,
              subSentiment: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              relevance: 'desc'
            },
            take: 1 // Pegar apenas o mais relevante para contexto
          }
        }
      });

      if (!movie) {
        return { success: false, error: 'Filme não encontrado no banco de dados' };
      }

      // Construir o contexto emocional se disponível
      let sentimentContext = '';
      if (movie.movieSentiments && movie.movieSentiments.length > 0) {
        const topSentiment = movie.movieSentiments[0];
        sentimentContext = `\n\nContexto emocional principal: ${topSentiment.subSentiment.name} (Relevância: ${topSentiment.relevance}): ${topSentiment.explanation}`;
      }

      const prompt = `Com base no filme '${movie.title}' (${movie.year}), gêneros: ${movie.genres?.join(', ') || 'N/A'}, palavras-chave principais: ${movie.keywords?.slice(0, 15).join(', ') || 'N/A'}, e sinopse: ${movie.description || 'N/A'}.${sentimentContext}

Sintetize os principais alertas de tonalidade ou conteúdo para o espectador em UMA ÚNICA FRASE concisa e objetiva, começando com 'Atenção:'. **Não inclua numeração, marcadores de lista, ou quebras de linha. O resultado deve ser apenas a frase sintetizada.**

**Instrução de precisão:** Seja cuidadoso com a intensidade do alerta. Diferencie entre 'abordar um tema' (ex: o filme fala sobre sexualidade) e 'conter cenas explícitas' (ex: o filme mostra cenas de sexo). Use o termo 'explícito(a)' apenas quando houver representação gráfica e direta de violência, nudez ou sexo.

Considere as seguintes categorias de alerta para identificar:
- Violência (física, psicológica)
- **Conteúdo Adulto Explícito** (violência gráfica, nudez frontal, sexualidade explícita)
- **Temas Adultos Sugeridos ou Discutidos** (aborda a descoberta da sexualidade, contém sugestão sexual ou insinuações, uso de drogas/álcool, linguagem forte/ofensiva)
- Intensidade emocional (cenas que podem ser perturbadoras, muito tristes ou angustiantes)
- Temas de preconceito/discriminação (racial, de gênero, por orientação sexual, etc.)
- Representação LGBTQIA+ (se a representação em si ou os desafios dos personagens forem um ponto de atenção para o conteúdo)
- Humor ácido/controverso
- Outros elementos que possam causar impacto (flashbacks intensos, edição caótica, temas de abuso)

Exemplo de saída esperada (sem numeração ou quebras de linha):
"Atenção: contém cenas intensas de violência, temas adultos e pode ser emocionalmente perturbador."
"Atenção: explora preconceito racial e contém linguagem forte."
"Atenção: aborda a descoberta da sexualidade e temas LGBTQIA+."
"Atenção: possui humor ácido e situações controversas."

Se não houver alertas significativos, responda apenas com:
"Atenção: nenhum alerta de conteúdo significativo."`;

      // Configurar IA Provider (validar openai, deepseek ou gemini)
      let provider: AIProvider = 'openai';
      if (aiProvider === 'deepseek' || aiProvider === 'openai' || aiProvider === 'gemini') {
        provider = aiProvider as AIProvider;
      } else if (aiProvider) {
        console.warn(`⚠️ Provider '${aiProvider}' não suportado nesta função. Usando 'openai' como padrão.`);
      }
      const config = getDefaultConfig(provider);
      const ai = createAIProvider(config);
      console.log(`🤖 Gerando conteúdo com provider: ${provider.toUpperCase()}`);

      // Gerar texto com IA
      const systemPrompt = "Você é um especialista em análise de conteúdo cinematográfico que identifica alertas importantes para espectadores.";
      const response = await ai.generateResponse(systemPrompt, prompt, {
        maxTokens: 300,
        temperature: 0.3
      });

      if (!response.success) {
        return { success: false, error: `Falha na geração: ${response.error}` };
      }

      // Extrair o texto gerado
      const generatedText = response.content.trim();

      // Validar se o texto foi gerado
      if (!generatedText || generatedText.length < 10) {
        return { success: false, error: 'Texto gerado muito curto ou vazio' };
      }

      // Remover quaisquer blocos de código (ex.: ```json ... ```)
      const withoutCodeBlocks = generatedText.replace(/```[\s\S]*?```/g, '').trim();

      // Tentar extrair explicitamente a última linha que contenha "Atenção:"
      const attentionLines = withoutCodeBlocks
        .split('\n')
        .map(l => l.trim())
        .filter(l => /(^|\s)Atenção:/i.test(l));

      let warning = '';
      if (attentionLines.length > 0) {
        // Pegar a última ocorrência
        warning = attentionLines[attentionLines.length - 1];
      } else {
        // Se não houver linha específica, usar o texto inteiro sem blocos de código
        warning = withoutCodeBlocks;
      }

      // Normalizar: manter somente a frase começando em "Atenção:" até o final
      const match = warning.match(/Atenção:\s*(.*)$/i);
      if (match && match[1]) {
        warning = `Atenção: ${match[1].trim()}`;
      }

      // Remover aspas iniciais/finais, se existirem
      warning = warning.replace(/^\s*["']|["']\s*$/g, '').trim();

      // Garantias finais
      if (!warning || warning.length < 10) {
        if (generatedText.toLowerCase().includes('nenhum alerta') || generatedText.toLowerCase().includes('sem alertas')) {
          warning = 'Atenção: nenhum alerta de conteúdo significativo.';
        } else {
          warning = 'Atenção: conteúdo pode conter temas adultos.';
        }
      }

      // Atualizar o filme no banco de dados
      await prisma.movie.update({
        where: { tmdbId: tmdbId },
        data: { contentWarnings: warning }
      });

      return { success: true, warning };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Erro ao gerar contentWarnings: ${errorMessage}` };
    }
  }

  private async enrichMovieKeywords(tmdbId: number, aiProvider?: string): Promise<{ success: boolean; addedCount?: number; error?: string }> {
    try {
      // 1. Buscar filme e suas keywords/sinopse atuais
      const movie = await prisma.movie.findUnique({
        where: { tmdbId: tmdbId },
        select: {
          id: true,
          title: true,
          year: true,
          description: true,
          keywords: true
        }
      });

      if (!movie) {
        return { success: false, error: 'Filme não encontrado no banco' };
      }

      const currentKeywords = movie.keywords || [];
      const description = movie.description || 'Sinopse não disponível.';

      // 2. Configurar a IA
      let provider: AIProvider = 'openai';
      if (aiProvider === 'deepseek' || aiProvider === 'openai' || aiProvider === 'gemini') {
        provider = aiProvider as AIProvider;
      }
      const config = getDefaultConfig(provider);
      const ai = createAIProvider(config);

      // 3. Montar Prompt
      const systemPrompt = "Você é um especialista em análise cinematográfica e metadados semânticos.";
      const prompt = `Filme: '${movie.title}' (${movie.year}).
Keywords atuais: ${currentKeywords.join(', ')}
Sinopse: ${description}

Sua tarefa é gerar automaticamente uma lista de keywords enriquecidas para este filme.
Você deve combinar:
- análise semântica da sinopse
- temas emocionais profundos
- contexto histórico ou narrativo
- elementos visuais ou estéticos

As novas keywords devem:
- ser em português
- refletir elementos narrativos e emocionais
- ser extremamente úteis para fazer matching com sub-sentimentos emocionais
- NÃO REPETIR as keywords originais

**Instrução SUPER CRÍTICA de formatação:** 
Retorne APENAS uma lista de palavras ou frases curtas (max 3-4 palavras cada) separadas por VÍRGULA. 
Não inclua introduções, explicações, quebras de linha ou aspas. Apenas a lista.
Exemplo: melancolia poética, tragédia familiar, luto silencioso, arte nascida da dor, perda de um filho`;

      // 4. Chamar IA
      const response = await ai.generateResponse(systemPrompt, prompt, {
        maxTokens: 200,
        temperature: 0.6
      });

      if (!response.success) {
        return { success: false, error: `Falha na IA: ${response.error}` };
      }

      // 5. Tratar resposta da IA
      let aiText = response.content.trim();
      // Remover eventuais blocos de código
      aiText = aiText.replace(/```[\s\S]*?```/g, '').trim();

      if (!aiText || aiText.length < 5) {
        return { success: false, error: 'Resposta da IA vazia ou muito curta' };
      }

      // Converter para array limpando espaços
      const rawNewKeywords = aiText.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

      // Filtrar keywords que já existem no array original
      const newKeywords = rawNewKeywords.filter(k => !currentKeywords.map(ck => ck.toLowerCase()).includes(k));

      if (newKeywords.length === 0) {
        return { success: true, addedCount: 0 };
      }

      // 6. Atualizar no banco via SQL RAW garantindo unicidade (ARRAY_AGG e DISTINCT)
      // Array literals in Postgres SQL raw queries require proper formatting
      const keywordsStringLiteral = newKeywords.map(k => `'${k.replace(/'/g, "''")}'`).join(',');

      const updateQuery = `
        UPDATE "Movie" 
        SET keywords = (
          SELECT ARRAY_AGG(DISTINCT x) 
          FROM UNNEST(keywords || ARRAY[${keywordsStringLiteral}]::text[]) AS x
        )
        WHERE id = '${movie.id}';
      `;

      await prisma.$executeRawUnsafe(updateQuery);

      return { success: true, addedCount: newKeywords.length };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Erro inesperado: ${errorMessage}` };
    }
  }

  private async runScript(scriptName: string, args: string[]): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise(async (resolve) => {
      // Fechar conexões do Prisma antes de executar processo filho
      // Isso libera conexões para o processo filho
      try {
        await prisma.$disconnect();
      } catch (error) {
        // Ignorar erros de desconexão
      }

      const scriptPath = path.join(this.scriptsPath, scriptName);

      // Passar variáveis de ambiente explicitamente para o processo filho
      const env = {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
        DATABASE_URL: process.env.DATABASE_URL,
        DIRECT_URL: process.env.DIRECT_URL,
        BLOG_DATABASE_URL: process.env.BLOG_DATABASE_URL,
        BLOG_DIRECT_URL: process.env.BLOG_DIRECT_URL,
        SILENT_ENV_LOG: 'true', // Suprimir banner de ambiente nos subprocessos
      };

      const child = spawn('npx', ['ts-node', scriptPath, ...args], {
        stdio: 'pipe',
        cwd: path.dirname(this.scriptsPath),
        env: env
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        if (!chunk.startsWith('CURATOR_APPROVAL_NEEDED')) {
          process.stdout.write(chunk);
        }
        output += chunk;
      });

      child.stderr.on('data', (data) => {
        process.stderr.write(data);
        errorOutput += data.toString();
      });

      child.on('close', async (code) => {
        // Reconectar Prisma após processo filho terminar
        try {
          await prisma.$connect();
        } catch (error) {
          // Ignorar erros de reconexão, será reconectado automaticamente na próxima query
        }

        if (code === 0) {
          resolve({ success: true, output });
        } else {
          resolve({ success: false, output, error: errorOutput || `Script ${scriptName} falhou com código ${code}` });
        }
      });
    });
  }
}

function parseNamedArgs(args: string[]): Partial<MovieToProcess> {
  const parsed: Partial<MovieToProcess> = {};

  // Função auxiliar para remover aspas de um valor
  const removeQuotes = (value: string): string => {
    if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  };

  // Função auxiliar para extrair valor de argumento
  const extractValue = (arg: string, prefix: string): string | null => {
    if (!arg.startsWith(prefix)) return null;
    return arg.substring(prefix.length);
  };

  // Processar argumentos, agrupando valores que podem ter espaços
  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--title=')) {
      let title = extractValue(arg, '--title=');

      if (title) {
        // Remover aspas se presentes
        title = removeQuotes(title);

        // Se o valor após o = não contém espaços e o próximo argumento não é um parâmetro,
        // pode ser que o título foi dividido pelo shell/npm
        // Exemplo: --title=O Exterminador do Futuro vira ["--title=O", "Exterminador", "do", "Futuro"]
        if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          // Título pode estar dividido em múltiplos argumentos
          const titleParts: string[] = [title];
          i++;
          // Coletar todos os argumentos seguintes até encontrar um parâmetro (--xxx)
          while (i < args.length && !args[i].startsWith('--')) {
            titleParts.push(removeQuotes(args[i]));
            i++;
          }
          i--; // Ajustar para não pular o próximo argumento na próxima iteração
          parsed.title = titleParts.join(' ');
        } else {
          parsed.title = title;
        }
      }
    }
    else if (arg.startsWith('--year=')) {
      const yearStr = extractValue(arg, '--year=');
      if (yearStr) {
        const year = parseInt(removeQuotes(yearStr));
        if (!isNaN(year)) parsed.year = year;
      }
    }
    else if (arg.startsWith('--journeyOptionFlowId=')) {
      const idStr = extractValue(arg, '--journeyOptionFlowId=');
      if (idStr) {
        const id = parseInt(removeQuotes(idStr));
        if (!isNaN(id)) parsed.journeyOptionFlowId = id;
      }
    }
    else if (arg.startsWith('--analysisLens=')) {
      const lensStr = extractValue(arg, '--analysisLens=');
      if (lensStr) {
        const lens = parseInt(removeQuotes(lensStr));
        if (!isNaN(lens)) parsed.analysisLens = lens;
      }
    }
    else if (arg.startsWith('--journeyValidation=')) {
      const validationStr = extractValue(arg, '--journeyValidation=');
      if (validationStr) {
        const validation = parseInt(removeQuotes(validationStr));
        if (!isNaN(validation)) parsed.journeyValidation = validation;
      }
    }
    else if (arg.startsWith('--tmdbId=')) {
      const tmdbIdStr = extractValue(arg, '--tmdbId=');
      if (tmdbIdStr) {
        const tmdbId = parseInt(removeQuotes(tmdbIdStr));
        if (!isNaN(tmdbId)) parsed.tmdbId = tmdbId;
      }
    }
    else if (arg.startsWith('--ai-provider=')) {
      const provider = extractValue(arg, '--ai-provider=');
      if (provider) {
        const cleanProvider = removeQuotes(provider);
        const allowed = ['openai', 'deepseek', 'gemini'];
        if (allowed.includes(cleanProvider)) {
          parsed.aiProvider = cleanProvider as MovieToProcess['aiProvider'];
        } else {
          console.warn(`⚠️ Provider '${cleanProvider}' não suportado. Use 'openai', 'deepseek' ou 'gemini'. Usando 'openai' como padrão.`);
          parsed.aiProvider = 'openai';
        }
      }
    }

    i++;
  }

  // Log para debug (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log('📋 Argumentos parseados:', parsed);
  }

  return parsed;
}

async function main() {
  const orchestrator = new MovieCurationOrchestrator();
  try {
    const args = process.argv.slice(2);

    // Log de debug para ver argumentos recebidos
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Argumentos recebidos do processo:', args);
    }

    const approveNewSubSentiments = args.includes('--approve-new-subsentiments');
    const filteredArgs = args.filter(arg => arg !== '--approve-new-subsentiments');

    if (filteredArgs.length === 0 || filteredArgs.includes('--help')) {
      console.log(`🎬 === ORQUESTRADOR DE CURADORIA DE FILMES ===`);
      console.log(`\nUso: npx ts-node orchestrator.ts --title="Título" --year=2023 --journeyOptionFlowId=81 --analysisLens=14 --journeyValidation=15`);
      console.log(`\nFlags opcionais:`);
      console.log(`   --approve-new-subsentiments: Aprova automaticamente a criação de novos subsentimentos sugeridos pela IA.`);
      console.log(`   --ai-provider=openai|deepseek|gemini: Escolhe o provedor de IA (padrão: openai).`);
      return;
    }

    const parsed = parseNamedArgs(filteredArgs);

    // Suporte a --tmdbId: busca título e ano no banco quando tmdbId é fornecido
    if (parsed.tmdbId && (!parsed.title || !parsed.year)) {
      console.log(`🔍 Buscando filme por TMDB ID: ${parsed.tmdbId}...`);
      const existingMovie = await prisma.movie.findFirst({
        where: { tmdbId: parsed.tmdbId },
        select: { title: true, year: true }
      });
      if (existingMovie) {
        parsed.title = existingMovie.title;
        parsed.year = existingMovie.year || 0;
        console.log(`✅ Filme encontrado no banco: ${parsed.title} (${parsed.year})`);
      } else {
        console.log(`❌ Filme com TMDB ID ${parsed.tmdbId} não encontrado no banco de dados.`);
        return;
      }
    }

    if (!parsed.title || !parsed.year || !parsed.journeyOptionFlowId || !parsed.analysisLens || !parsed.journeyValidation) {
      console.log('❌ Erro: Forneça (title + year) ou --tmdbId, mais journeyOptionFlowId, analysisLens e journeyValidation. Use --help para mais informações.');
      return;
    }

    const movie: MovieToProcess = parsed as MovieToProcess;
    const results = await orchestrator.processMovieList([movie], approveNewSubSentiments);

    // Imprimir resultado JSON para captura por ferramentas externas (n8n)
    if (results.length > 0) {
      console.log('\n---JSON_RESULT_START---');
      console.log(JSON.stringify(results[0], null, 2));
      console.log('---JSON_RESULT_END---');
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { MovieCurationOrchestrator };

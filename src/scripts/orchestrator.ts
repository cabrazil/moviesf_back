/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import { writeFileSync } from 'fs';
import { selectOptimalAIProvider, createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';

const prisma = new PrismaClient();

interface MovieToProcess {
  title: string;
  year: number;
  journeyOptionFlowId: number;
  analysisLens: number;
  journeyValidation: number;
  aiProvider?: 'openai' | 'gemini' | 'deepseek' | 'auto';
}

interface ProcessingResult {
  success: boolean;
  movie?: { title: string; year: number; id: string };
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
        console.log(`✅ Filme já existe no banco: ${movieFound.title} (${movie.year})`);
        console.log(`🎯 TMDB ID encontrado: ${tmdbId}`);
        console.log(`⏭️  Pulando Etapa 1 (filme já adicionado anteriormente)`);
      } else {
        // Etapa 1: Adicionar filme
        console.log(`📥 Etapa 1: Adicionando filme ao banco...`);
        const addResult = await this.runScript('populateMovies.ts', [`--title=${movie.title}`, `--year=${movie.year.toString()}`]);
        
        if (!addResult.success) {
          return { success: false, error: `Falha ao adicionar filme: ${addResult.error}` };
        }

        // Capturar o TMDB ID do output
        const tmdbIdMatch = addResult.output.match(/TMDB_ID_FOUND: (\d+)/);
        if (!tmdbIdMatch) {
          return { success: false, error: 'TMDB ID não encontrado no output do populateMovies.ts' };
        }
        tmdbId = parseInt(tmdbIdMatch[1]);
        console.log(`🎯 TMDB ID capturado: ${tmdbId}`);
      }

      if (!tmdbId) {
        return { success: false, error: 'TMDB ID não disponível para continuar o processamento' };
      }

      // Determinar o AI Provider automaticamente se necessário
      let finalAiProvider = movie.aiProvider;
      if (movie.aiProvider === 'auto') {
        // Buscar informações do filme para decisão automática
        const movieData = await prisma.movie.findUnique({ 
          where: { tmdbId: tmdbId }
        });

        if (movieData) {
          const context = {
            genres: movieData.genres || [],
            keywords: movieData.keywords || [],
            analysisLens: movie.analysisLens,
            isComplexDrama: movieData.genres?.some((g: string) => g.toLowerCase().includes('drama')) || false
          };

          finalAiProvider = selectOptimalAIProvider(context);
          console.log(`🤖 AI Provider selecionado automaticamente: ${finalAiProvider.toUpperCase()}`);
          console.log(`📊 Baseado em: Gêneros [${context.genres?.join(', ')}], Lente ${movie.analysisLens}`);
        } else {
          finalAiProvider = 'gemini'; // Fallback para economia
          console.log(`⚠️ Dados do filme não encontrados, usando Gemini como fallback`);
        }
      }

      // Etapa 2: Analisar sentimentos
      console.log(`🧠 Etapa 2: Analisando sentimentos...`);
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

      const createdMovie = await prisma.movie.findFirst({ 
        where: { title: movie.title, year: movie.year },
        include: { 
          movieSuggestionFlows: {
            where: { journeyOptionFlowId: movie.journeyOptionFlowId },
            orderBy: { updatedAt: 'desc' },
            take: 1
          }
        }
      });
      if (!createdMovie) {
        return { success: false, error: 'Filme não encontrado no banco de dados após o processo.' };
      }

      console.log(`✅ Filme processado com sucesso: ${movie.title} (${movie.year})`);
      // Log da reflexão sobre o filme (reason) da sugestão específica atualizada
      if (createdMovie.movieSuggestionFlows.length > 0) {
        const updatedSuggestion = createdMovie.movieSuggestionFlows[0];
        console.log(`💭 Reflexão sobre o filme: ${updatedSuggestion.reason}`);
      }
      return { 
        success: true, 
        movie: { 
          title: createdMovie.title, 
          year: createdMovie.year || 0, 
          id: createdMovie.id 
        } 
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

      // Configurar IA Provider
      const provider = aiProvider as AIProvider || 'openai';
      const config = getDefaultConfig(provider);
      const ai = createAIProvider(config);

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
      const hookPrompt = 'Para o filme \'' + movie.title + '\' (' + movie.year + '), com gêneros: ' + (movie.genres?.join(', ') || 'N/A') + ', palavras-chave principais: ' + (movie.keywords?.slice(0, 10).join(', ') || 'N/A') + ', e sinopse: ' + (movie.description || 'N/A') + '.' + sentimentContext + '\n\nCrie uma única frase de gancho cativante e instigante (máximo 35 palavras) para uma landing page. **OBRIGATORIAMENTE comece com "Prepare-se para..."** seguido de uma chamada impactante que convide à imersão. Ela deve destacar o principal apelo emocional ou temático do filme, usando a análise de subsentimentos para torná-la mais precisa e atraente para o público. Não inclua JSON, formatação de lista ou quebras de linha adicionais. O resultado deve ser apenas a frase sintetizada.\n\nExemplo de saída esperada para \'Os Descendentes\':\n\'Prepare-se para uma viagem emocional: Os Descendentes te leva às belas praias do Havaí, onde um pai deve navegar pelas turbulentas águas da traição e tragédia, redescobrindo o valor da família e do perdão.\'';

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

      // Configurar IA Provider
      const provider = aiProvider as AIProvider || 'openai';
      const config = getDefaultConfig(provider);
      const ai = createAIProvider(config);

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

  private async runScript(scriptName: string, args: string[]): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const scriptPath = path.join(this.scriptsPath, scriptName);
      const child = spawn('npx', ['ts-node', scriptPath, ...args], {
        stdio: 'pipe',
        cwd: path.dirname(this.scriptsPath)
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

      child.on('close', (code) => {
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
  for (const arg of args) {
    if (arg.startsWith('--title=')) parsed.title = arg.split('=')[1];
    else if (arg.startsWith('--year=')) parsed.year = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--journeyOptionFlowId=')) parsed.journeyOptionFlowId = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--analysisLens=')) parsed.analysisLens = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--journeyValidation=')) parsed.journeyValidation = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--ai-provider=')) parsed.aiProvider = arg.split('=')[1] as 'openai' | 'gemini' | 'deepseek' | 'auto';
  }
  return parsed;
}

async function main() {
  const orchestrator = new MovieCurationOrchestrator();
  try {
    const args = process.argv.slice(2);
    const approveNewSubSentiments = args.includes('--approve-new-subsentiments');
    const filteredArgs = args.filter(arg => arg !== '--approve-new-subsentiments');

    if (filteredArgs.length === 0 || filteredArgs.includes('--help')) {
      console.log(`🎬 === ORQUESTRADOR DE CURADORIA DE FILMES ===`);
      console.log(`\nUso: npx ts-node orchestrator.ts --title="Título" --year=2023 --journeyOptionFlowId=81 --analysisLens=14 --journeyValidation=15`);
      console.log(`\nFlags opcionais:`);
      console.log(`   --approve-new-subsentiments: Aprova automaticamente a criação de novos subsentimentos sugeridos pela IA.`);
      console.log(`   --ai-provider=openai|gemini|deepseek|auto: Escolhe o provedor de IA (padrão: openai, auto=seleção automática baseada no filme).`);
      return;
    }

    const parsed = parseNamedArgs(filteredArgs);
    if (!parsed.title || !parsed.year || !parsed.journeyOptionFlowId || !parsed.analysisLens || !parsed.journeyValidation) {
      console.log('❌ Erro: Todos os parâmetros são obrigatórios (title, year, journeyOptionFlowId, analysisLens, journeyValidation). Use --help para mais informações.');
      return;
    }

    const movie: MovieToProcess = parsed as MovieToProcess;
    await orchestrator.processMovieList([movie], approveNewSubSentiments);

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

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
  aiProvider?: 'openai' | 'gemini' | 'auto';
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
      const tmdbId = parseInt(tmdbIdMatch[1]);
      console.log(`🎯 TMDB ID capturado: ${tmdbId}`);

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

      // Etapa 5: Gerar landingPageHook
      console.log(`🎣 Etapa 5: Gerando landingPageHook...`);
      const hookResult = await this.generateLandingPageHook(tmdbId, finalAiProvider);
      if (!hookResult.success) {
        console.log(`⚠️ Aviso: Falha ao gerar landingPageHook: ${hookResult.error}`);
      } else {
        console.log(`🎣 LandingPageHook gerado: "${hookResult.hook}"`);
      }

      // Etapa 6: Gerar contentWarnings
      console.log(`⚠️ Etapa 6: Gerando contentWarnings...`);
      const warningsResult = await this.generateContentWarnings(tmdbId, finalAiProvider);
      if (!warningsResult.success) {
        console.log(`⚠️ Aviso: Falha ao gerar contentWarnings: ${warningsResult.error}`);
      } else {
        console.log(`⚠️ ContentWarning gerado: "${warningsResult.warning}"`);
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

  private async generateLandingPageHook(tmdbId: number, aiProvider?: string): Promise<{ success: boolean; hook?: string; error?: string }> {
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

      // Construir o prompt com explicações dos sentimentos
      let sentimentContext = '';
      if (movie.movieSentiments && movie.movieSentiments.length > 0) {
        sentimentContext = '\n\nAnálise emocional do filme:\n';
        movie.movieSentiments.forEach((sentiment, index) => {
          sentimentContext += `${index + 1}. ${sentiment.subSentiment.name} (Relevância: ${sentiment.relevance}): ${sentiment.explanation}\n`;
        });
      }

      const prompt = 'Para o filme \'' + movie.title + '\' (' + movie.year + '), com gêneros: ' + (movie.genres?.join(', ') || 'N/A') + ', palavras-chave principais: ' + (movie.keywords?.slice(0, 10).join(', ') || 'N/A') + ', e sinopse: ' + (movie.description || 'N/A') + '.' + sentimentContext + '\n\nAnalise os sentimentos emocionais do filme e crie uma estrutura JSON com os subsentimentos mais relevantes, seguida de uma frase de gancho cativante.\n\nFORMATO DE RESPOSTA OBRIGATÓRIO (SEM BLOCO DE CÓDIGO):\n{\n  "suggestedSubSentiments": [\n    {\n      "name": "Nome do SubSentimento",\n      "relevance": 0.95,\n      "explanation": "Explicação detalhada de como este subsentimento se manifesta no filme",\n      "isNew": false\n    }\n  ]\n}\n\nPrepare-se para [emoção/experiência]: ' + movie.title + ' [descrição cativante do apelo principal].\n\nIMPORTANTE: Responda SEM usar blocos de código. Use apenas o JSON puro seguido do texto do hook. Use as análises emocionais fornecidas para identificar os 3 subsentimentos mais relevantes e criar um gancho impactante.';

      // Configurar IA Provider
      const provider = aiProvider as AIProvider || 'openai';
      const config = getDefaultConfig(provider);
      const ai = createAIProvider(config);

      // Gerar texto com IA
      const systemPrompt = "Você é um especialista em marketing cinematográfico que cria ganchos cativantes para landing pages de filmes.";
      const response = await ai.generateResponse(systemPrompt, prompt, {
        maxTokens: 800,
        temperature: 0.7
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

      // Salvar a estrutura JSON completa (com suggestedSubSentiments + texto do hook)
      const completeStructure = generatedText.trim();

      // Atualizar o filme no banco de dados
      await prisma.movie.update({
        where: { tmdbId: tmdbId },
        data: { landingPageHook: completeStructure }
      });

      return { success: true, hook: completeStructure };

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

Considere as seguintes categorias de alerta para identificar:
- Violência (física, psicológica, explícita)
- Temas adultos (nudez, sexualidade explícita, uso de drogas, linguagem forte/ofensiva)
- Intensidade emocional (cenas que podem ser perturbadoras, muito tristes ou angustiantes)
- Temas de preconceito/discriminação (racial, de gênero, por orientação sexual, por identidade de gênero, por deficiência, etc.)
- Representação LGBTQIA+ (se a representação em si ou os desafios dos personagens forem um ponto de atenção para o conteúdo)
- Humor ácido/controverso
- Outros elementos que possam causar impacto (flashbacks intensos, barulhos altos, edição caótica, temas de abuso/assédio)

Exemplo de saída esperada (sem numeração ou quebras de linha):
"Atenção: contém cenas intensas de violência, temas adultos e pode ser emocionalmente perturbador."
"Atenção: explora preconceito racial e contém linguagem forte."
"Atenção: aborda temas LGBTQIA+ com foco em desafios sociais."
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
    else if (arg.startsWith('--ai-provider=')) parsed.aiProvider = arg.split('=')[1] as 'openai' | 'gemini' | 'auto';
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
      console.log(`   --ai-provider=openai|gemini|auto: Escolhe o provedor de IA (padrão: openai, auto=seleção automática baseada no filme).`);
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

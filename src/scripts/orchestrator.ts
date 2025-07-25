import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import { writeFileSync } from 'fs';

const prisma = new PrismaClient();

interface MovieToProcess {
  title: string;
  year: number;
  journeyOptionFlowId: number;
  analysisLens: number;
  journeyValidation: number;
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
      const movieIdMatch = addResult.output.match(/MOVIE_ID_FOUND: (\S+)/);
      if (!movieIdMatch || !movieIdMatch[1]) {
        return { success: false, error: `Não foi possível extrair o Movie ID da saída de populateMovies.ts` };
      }
      const movieId = movieIdMatch[1];
      console.log(`✅ Filme adicionado. ID: ${movieId}`);

      // Etapa 2: Analisar sentimentos
      console.log(`🧠 Etapa 2: Analisando sentimentos...`);
      const analysisResult = await this.runScript('analyzeMovieSentiments.ts', [
        movieId,
        movie.journeyOptionFlowId.toString(),
        movie.analysisLens.toString() // analysisLens é o mainSentimentId aqui
      ]);
      
      if (!analysisResult.success) {
        return { success: false, error: `Falha na análise: ${analysisResult.error}` };
      }
      console.log(`
--- Saída da Análise de Sentimentos ---
${analysisResult.output}
--------------------------------------`);

      // Etapa 2.5: Verificação de Aprovação do Curador
      const approvalLine = analysisResult.output.split('\n').find(line => line.startsWith('CURATOR_APPROVAL_NEEDED'));
      if (approvalLine) {
        if (!approveNewSubSentiments) {
            const jsonString = approvalLine.replace('CURATOR_APPROVAL_NEEDED: ', '');
            const suggestions = JSON.parse(jsonString);

            console.log('\n--------------------------------------------------');
            console.log('⚠️ APROVAÇÃO DO CURADOR NECESSÁRIA ⚠️');
            console.log('A IA sugeriu a criação dos seguintes SubSentimentos:');
            suggestions.forEach((sug: any) => {
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
      console.log(`
--- Saída da Execução de INSERTs ---
${insertResult.output}
------------------------------------`);


      // Etapa 4: Descobrir e curar
      console.log(`🎯 Etapa 4: Descobrindo e curando...`);
      const curateResult = await this.runScript('discoverAndCurateAutomated.ts', [
        movie.title,
        movie.year.toString(),
        movie.journeyValidation.toString(),
        movie.journeyOptionFlowId.toString(),
        'PROCESS'
      ]);
      
      if (!curateResult.success) {
        return { success: false, error: `Falha na curadoria: ${curateResult.error}` };
      }
      console.log(`
--- Saída da Curadoria ---
${curateResult.output}
--------------------------`);

      const createdMovie = await prisma.movie.findFirst({ 
        where: { title: movie.title, year: movie.year },
        include: { movieSuggestionFlows: true }
      });
      if (!createdMovie) {
        return { success: false, error: 'Filme não encontrado no banco de dados após o processo.' };
      }

      if (createdMovie.movieSuggestionFlows.length > 0) {
        const latestSuggestion = createdMovie.movieSuggestionFlows[createdMovie.movieSuggestionFlows.length - 1];
        console.log(`💭 Reflexão sobre o filme: ${latestSuggestion.reason}`);
      }
      console.log(`
✅ Curadoria e processamento de "${movie.title}" (${movie.year}) concluídos com sucesso!`);
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
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
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
  const parsed: any = {};
  for (const arg of args) {
    if (arg.startsWith('--title=')) parsed.title = arg.split('=')[1];
    else if (arg.startsWith('--year=')) parsed.year = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--journeyOptionFlowId=')) parsed.journeyOptionFlowId = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--analysisLens=')) parsed.analysisLens = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--journeyValidation=')) parsed.journeyValidation = parseInt(arg.split('=')[1]);
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

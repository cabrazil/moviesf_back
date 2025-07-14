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

  async processMovieList(movies: MovieToProcess[]): Promise<ProcessingResult[]> {
    console.log(`\n🎬 === ORQUESTRADOR DE CURADORIA DE FILMES ===`);
    console.log(`📋 Processando ${movies.length} filmes...`);
    
    const results: ProcessingResult[] = [];
    
    for (const movie of movies) {
      console.log(`\n🔄 Processando: ${movie.title} (${movie.year})`);
      const result = await this.processingleMovie(movie);
      results.push(result);
    }
    
    return results;
  }

  private async processingleMovie(movie: MovieToProcess): Promise<ProcessingResult> {
    try {
      // Etapa 0: Limpar arquivo de inserts para evitar conflitos
      try {
        writeFileSync(this.insertFile, '');
        console.log(`🧹 Arquivo inserts.sql limpo para novo processamento`);
      } catch (cleanupError) {
        console.log(`⚠️ Aviso: Não foi possível limpar inserts.sql`);
      }

      // Etapa 1: Adicionar filme (se não existir)
      console.log(`📥 Etapa 1: Adicionando filme ao banco...`);
      const addResult = await this.runScript('populateMovies.ts', [
        `--title=${movie.title}`,
        `--year=${movie.year.toString()}`
      ]);
      
      if (!addResult.success) {
        return { success: false, error: `Falha ao adicionar filme: ${addResult.error}` };
      }

      // Etapa 2: Analisar sentimentos
      console.log(`🧠 Etapa 2: Analisando sentimentos...`);
      const analysisResult = await this.runScript('analyzeMovieSentiments.ts', [
        movie.title,
        movie.year.toString(),
        movie.journeyOptionFlowId.toString(),
        movie.analysisLens.toString()
      ]);
      
      if (!analysisResult.success) {
        return { success: false, error: `Falha na análise: ${analysisResult.error}` };
      }

      // Etapa 3: Executar INSERTs (se há arquivo de inserts)
      console.log(`💾 Etapa 3: Executando INSERTs...`);
      const insertResult = await this.runScript('executeSqlFromFile.ts', [this.insertFile]);
      
      if (!insertResult.success) {
        console.log(`⚠️ Aviso: Falha ao executar INSERTs: ${insertResult.error}`);
      }

      // Etapa 4: Descobrir e curar (versão automatizada)
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

      // Buscar filme criado
      const createdMovie = await prisma.movie.findFirst({
        where: { title: movie.title, year: movie.year }
      });

      if (!createdMovie) {
        return { success: false, error: 'Filme não encontrado após processamento' };
      }

      console.log(`✅ Filme processado com sucesso: ${movie.title} (${movie.year})`);
      return { 
        success: true, 
        movie: { 
          title: createdMovie.title, 
          year: createdMovie.year || 0, 
          id: createdMovie.id 
        } 
      };
      
    } catch (error) {
      console.error(`❌ Erro ao processar ${movie.title}:`, error);
      return { success: false, error: `Erro inesperado: ${error}` };
    }
  }

  private async runScript(scriptName: string, args: string[]): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const scriptPath = path.join(this.scriptsPath, scriptName);
      const child = spawn('npx', ['ts-node', scriptPath, ...args], {
        stdio: 'inherit',
        cwd: path.dirname(this.scriptsPath)
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `Script ${scriptName} falhou com código ${code}` });
        }
      });
    });
  }

  private async runScriptWithInput(scriptName: string, args: string[], input: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const scriptPath = path.join(this.scriptsPath, scriptName);
      const child = spawn('npx', ['ts-node', scriptPath, ...args], {
        stdio: 'pipe',
        cwd: path.dirname(this.scriptsPath)
      });

      // Enviar input para o script
      child.stdin.write(input);
      child.stdin.end();

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data); // Mostrar output em tempo real
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data); // Mostrar erros em tempo real
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `Script ${scriptName} falhou com código ${code}` });
        }
      });
    });
  }
}

function parseNamedArgs(args: string[]): Partial<MovieToProcess> {
  const parsed: any = {};
  
  for (const arg of args) {
    if (arg.startsWith('--title=')) {
      parsed.title = arg.split('=')[1];
    } else if (arg.startsWith('--year=')) {
      parsed.year = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--journeyOptionFlowId=')) {
      parsed.journeyOptionFlowId = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--analysisLens=')) {
      parsed.analysisLens = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--journeyValidation=')) {
      parsed.journeyValidation = parseInt(arg.split('=')[1]);
    }
  }
  
  return parsed;
}

async function main() {
  const orchestrator = new MovieCurationOrchestrator();
  
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help')) {
      console.log(`🎬 === ORQUESTRADOR DE CURADORIA DE FILMES ===`);
      console.log(`\nUso:`);
      console.log(`1. Curadoria com argumentos nomeados:`);
      console.log(`   npx ts-node orchestrator.ts --title="Título" --year=2023 --journeyOptionFlowId=81 --analysisLens=14 --journeyValidation=15`);
      console.log(`\n2. Filme único (legacy):`);
      console.log(`   npx ts-node orchestrator.ts --single "Título" 2023 72 13 15`);
      console.log(`\nParâmetros:`);
      console.log(`   --title: Título do filme`);
      console.log(`   --year: Ano do filme`);
      console.log(`   --journeyOptionFlowId: ID da opção final da jornada`);
      console.log(`   --analysisLens: ID do sentimento para análise (lente)`);
      console.log(`   --journeyValidation: ID do sentimento para validação da jornada`);
      return;
    }

    // Verificar se é o novo formato com argumentos nomeados
    if (args.some(arg => arg.startsWith('--title='))) {
      const parsed = parseNamedArgs(args);
      
      if (!parsed.title || !parsed.year || !parsed.journeyOptionFlowId || !parsed.analysisLens || !parsed.journeyValidation) {
        console.log('❌ Erro: Todos os parâmetros são obrigatórios (title, year, journeyOptionFlowId, analysisLens, journeyValidation)');
        return;
      }
      
      const movie: MovieToProcess = parsed as MovieToProcess;
      const results = await orchestrator.processMovieList([movie]);
      console.log('\n📊 Resultado:', results[0]);
      
    } else if (args[0] === '--single') {
      const [, title, year, journeyOptionFlowId, analysisLens, journeyValidation] = args;
      const movie: MovieToProcess = {
        title,
        year: parseInt(year),
        journeyOptionFlowId: parseInt(journeyOptionFlowId),
        analysisLens: parseInt(analysisLens),
        journeyValidation: parseInt(journeyValidation)
      };
      
      const results = await orchestrator.processMovieList([movie]);
      console.log('\n📊 Resultado:', results[0]);
      
    } else {
      console.log('❌ Opção inválida. Use --help para ver as opções disponíveis.');
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
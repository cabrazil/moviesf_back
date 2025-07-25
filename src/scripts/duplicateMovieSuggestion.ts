import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ScriptArgs {
  title: string;
  year: number;
  journeyOptionFlowId: number;
}

async function duplicateMovieSuggestion(args: ScriptArgs) {
  try {
    console.log('🎬 Iniciando duplicação de sugestão de filme...');
    console.log('📋 Parâmetros:', args);

    // 1. Localizar o filme na tabela Movie
    console.log('🔍 Buscando filme...');
    const movie = await prisma.movie.findFirst({
      where: {
        title: args.title,
        year: args.year
      }
    });

    if (!movie) {
      throw new Error(`Filme não encontrado: ${args.title} (${args.year})`);
    }

    console.log(`✅ Filme encontrado: ${movie.title} (ID: ${movie.id})`);

    // 2. Obter o registro existente na MovieSuggestionFlow
    console.log('🔍 Buscando sugestão existente...');
    const existingSuggestion = await prisma.movieSuggestionFlow.findFirst({
      where: {
        movieId: movie.id
      }
    });

    if (!existingSuggestion) {
      throw new Error(`Nenhuma sugestão encontrada para o filme: ${args.title} (${args.year})`);
    }

    console.log(`✅ Sugestão encontrada (ID: ${existingSuggestion.id})`);

    // 3. Inserir novo registro com o novo journeyOptionFlowId
    console.log('📝 Criando nova sugestão...');
    const newSuggestion = await prisma.movieSuggestionFlow.create({
      data: {
        journeyOptionFlowId: args.journeyOptionFlowId,
        movieId: movie.id,
        reason: existingSuggestion.reason,
        relevance: existingSuggestion.relevance
      }
    });

    console.log('🎉 Sugestão duplicada com sucesso!');
    console.log('📊 Resumo:');
    console.log(`   Filme: ${movie.title} (${movie.year})`);
    console.log(`   ID do filme: ${movie.id}`);
    console.log(`   Sugestão original: ${existingSuggestion.id}`);
    console.log(`   Nova sugestão: ${newSuggestion.id}`);
    console.log(`   Novo journeyOptionFlowId: ${args.journeyOptionFlowId}`);
    console.log(`   Reason: ${existingSuggestion.reason}`);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Função para processar argumentos da linha de comando
function parseArgs(): ScriptArgs {
  const args = process.argv.slice(2);
  const parsed: any = {};

  args.forEach(arg => {
    if (arg.startsWith('--title=')) {
      parsed.title = arg.split('=')[1];
    } else if (arg.startsWith('--year=')) {
      parsed.year = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--journeyOptionFlowId=')) {
      parsed.journeyOptionFlowId = parseInt(arg.split('=')[1]);
    }
  });

  // Validação dos parâmetros obrigatórios
  if (!parsed.title || !parsed.year || !parsed.journeyOptionFlowId) {
    console.log('❌ Uso: npx ts-node src/scripts/duplicateMovieSuggestion.ts --title="Nome do Filme" --year=2023 --journeyOptionFlowId=25');
    console.log('📋 Parâmetros obrigatórios:');
    console.log('   --title: Título do filme');
    console.log('   --year: Ano do filme');
    console.log('   --journeyOptionFlowId: ID do novo journeyOptionFlow');
    process.exit(1);
  }

  return parsed as ScriptArgs;
}

// Execução do script
async function main() {
  const args = parseArgs();
  await duplicateMovieSuggestion(args);
}

if (require.main === module) {
  main();
} 
/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();



interface ScriptArgs {
  title: string;
  year: number;
  journeyOptionFlowId: number;
  baseJourneyOptionFlowId?: number; // ID da sugestão base para copiar dados
}

async function duplicateMovieSuggestion(args: ScriptArgs) {
  try {
    console.log('🎬 Iniciando duplicação/atualização de sugestão de filme...');
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

    // 2. Obter o registro base na MovieSuggestionFlow
    console.log('🔍 Buscando sugestão base...');
    let baseSuggestion;
    
    if (args.baseJourneyOptionFlowId) {
      // Buscar sugestão específica pelo journeyOptionFlowId
      baseSuggestion = await prisma.movieSuggestionFlow.findFirst({
        where: {
          movieId: movie.id,
          journeyOptionFlowId: args.baseJourneyOptionFlowId
        }
      });
      
      if (!baseSuggestion) {
        throw new Error(`Nenhuma sugestão encontrada para o filme ${args.title} com journeyOptionFlowId ${args.baseJourneyOptionFlowId}`);
      }
      
      console.log(`✅ Sugestão base encontrada (ID: ${baseSuggestion.id}, JourneyOptionFlowId: ${args.baseJourneyOptionFlowId})`);
    } else {
      // Buscar a sugestão mais recente como padrão
      baseSuggestion = await prisma.movieSuggestionFlow.findFirst({
        where: {
          movieId: movie.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!baseSuggestion) {
        throw new Error(`Nenhuma sugestão encontrada para o filme: ${args.title} (${args.year})`);
      }

      console.log(`✅ Sugestão base encontrada (ID: ${baseSuggestion.id}, JourneyOptionFlowId: ${baseSuggestion.journeyOptionFlowId})`);
    }

    // 3. Verificar se já existe uma sugestão com o novo journeyOptionFlowId
    console.log('🔍 Verificando se já existe sugestão com o novo journeyOptionFlowId...');
    const existingWithNewFlow = await prisma.movieSuggestionFlow.findFirst({
      where: {
        movieId: movie.id,
        journeyOptionFlowId: args.journeyOptionFlowId
      }
    });

    if (existingWithNewFlow) {
      console.log(`⚠️ Já existe uma sugestão para este filme com journeyOptionFlowId ${args.journeyOptionFlowId}`);
      console.log(`📊 Sugestão existente ID: ${existingWithNewFlow.id}`);
      
      // 3.1. Atualizar os campos reason, relevance e relevanceScore da sugestão base
      console.log('📝 Atualizando sugestão existente...');
      const updatedSuggestion = await prisma.movieSuggestionFlow.update({
        where: {
          id: existingWithNewFlow.id
        },
        data: {
          reason: baseSuggestion.reason,
          relevance: baseSuggestion.relevance,
          relevanceScore: baseSuggestion.relevanceScore // Copia o relevanceScore da sugestão base
        }
      });
      
      console.log('🎉 Sugestão atualizada com sucesso!');
      console.log('📊 Resumo da atualização:');
      console.log(`   Filme: ${movie.title} (${movie.year})`);
      console.log(`   ID do filme: ${movie.id}`);
      console.log(`   Sugestão atualizada: ${updatedSuggestion.id}`);
      console.log(`   JourneyOptionFlowId: ${args.journeyOptionFlowId}`);
      console.log(`   Reason: ${updatedSuggestion.reason}`);
      console.log(`   Relevance: ${updatedSuggestion.relevance}`);
      console.log(`   RelevanceScore: ${updatedSuggestion.relevanceScore || 'N/A'}`);
      return;
    }

    // 4. Inserir novo registro com o novo journeyOptionFlowId
    console.log('📝 Criando nova sugestão...');
    const newSuggestion = await prisma.movieSuggestionFlow.create({
      data: {
        journeyOptionFlowId: args.journeyOptionFlowId,
        movieId: movie.id,
        reason: baseSuggestion.reason,
        relevance: baseSuggestion.relevance,
        relevanceScore: baseSuggestion.relevanceScore // Copia o relevanceScore da sugestão base
      }
    });

    console.log('🎉 Sugestão duplicada com sucesso!');
    console.log('📊 Resumo:');
    console.log(`   Filme: ${movie.title} (${movie.year})`);
    console.log(`   ID do filme: ${movie.id}`);
    console.log(`   Sugestão base: ${baseSuggestion.id}`);
    console.log(`   Nova sugestão: ${newSuggestion.id}`);
    console.log(`   Novo journeyOptionFlowId: ${args.journeyOptionFlowId}`);
    console.log(`   Reason: ${baseSuggestion.reason}`);
    console.log(`   RelevanceScore: ${newSuggestion.relevanceScore?.toFixed(3) || 'N/A'}`);

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
    } else if (arg.startsWith('--baseJourneyOptionFlowId=')) {
      parsed.baseJourneyOptionFlowId = parseInt(arg.split('=')[1]);
    }
  });

  // Validação dos parâmetros obrigatórios
  if (!parsed.title || !parsed.year || !parsed.journeyOptionFlowId) {
    console.log('❌ Uso: npx ts-node src/scripts/duplicateMovieSuggestion.ts --title="Nome do Filme" --year=2023 --journeyOptionFlowId=25 [--baseJourneyOptionFlowId=10]');
    console.log('📋 Parâmetros obrigatórios:');
    console.log('   --title: Título do filme');
    console.log('   --year: Ano do filme');
    console.log('   --journeyOptionFlowId: ID do journeyOptionFlow (cria nova sugestão ou atualiza existente)');
    console.log('📋 Parâmetros opcionais:');
    console.log('   --baseJourneyOptionFlowId: ID da sugestão base para copiar dados (padrão: sugestão mais recente)');
    console.log('📝 Comportamento:');
    console.log('   - Se não existir sugestão com o journeyOptionFlowId: cria nova sugestão copiando dados da base');
    console.log('   - Se já existir sugestão com o journeyOptionFlowId: atualiza reason, relevance e relevanceScore');
    console.log('   - O relevanceScore é sempre copiado da sugestão base (sem recálculo)');
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
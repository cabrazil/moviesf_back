/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ScriptArgs {
  tmdbIdOrigem: number;
  journeyOptionFlowId: number;
  tmdbIdDestino: number;
}

async function copyMovieSuggestion(args: ScriptArgs) {
  try {
    console.log('🎬 Iniciando cópia de sugestão de filme...');
    console.log('📋 Parâmetros:', args);

    // 1. Buscar filme origem pelo tmdbId
    console.log(`🔍 Buscando filme origem (TMDB ID: ${args.tmdbIdOrigem})...`);
    const movieOrigem = await prisma.movie.findUnique({
      where: {
        tmdbId: args.tmdbIdOrigem
      }
    });

    if (!movieOrigem) {
      throw new Error(`Filme origem não encontrado com TMDB ID: ${args.tmdbIdOrigem}`);
    }

    console.log(`✅ Filme origem encontrado: ${movieOrigem.title} (${movieOrigem.year})`);

    // 2. Buscar filme destino pelo tmdbId
    console.log(`🔍 Buscando filme destino (TMDB ID: ${args.tmdbIdDestino})...`);
    const movieDestino = await prisma.movie.findUnique({
      where: {
        tmdbId: args.tmdbIdDestino
      }
    });

    if (!movieDestino) {
      throw new Error(`Filme destino não encontrado com TMDB ID: ${args.tmdbIdDestino}`);
    }

    console.log(`✅ Filme destino encontrado: ${movieDestino.title} (${movieDestino.year})`);

    // 3. Verificar se o filme destino tem pelo menos 3 entradas em MovieSentiment
    console.log(`🔍 Verificando MovieSentiment do filme destino...`);
    const sentimentsDestino = await prisma.movieSentiment.findMany({
      where: {
        movieId: movieDestino.id
      }
    });

    console.log(`📊 Total de MovieSentiment encontrados: ${sentimentsDestino.length}`);

    if (sentimentsDestino.length < 3) {
      throw new Error(
        `Filme destino deve ter pelo menos 3 entradas em MovieSentiment. ` +
        `Encontrados apenas ${sentimentsDestino.length} registros.`
      );
    }

    console.log(`✅ Validação passada: filme destino tem ${sentimentsDestino.length} registros de MovieSentiment`);

    // 4. Buscar a sugestão origem na MovieSuggestionFlow
    console.log(`🔍 Buscando sugestão origem...`);
    const suggestionOrigem = await prisma.movieSuggestionFlow.findFirst({
      where: {
        movieId: movieOrigem.id,
        journeyOptionFlowId: args.journeyOptionFlowId
      }
    });

    if (!suggestionOrigem) {
      throw new Error(
        `Nenhuma sugestão encontrada para o filme "${movieOrigem.title}" ` +
        `com journeyOptionFlowId ${args.journeyOptionFlowId}`
      );
    }

    console.log(`✅ Sugestão origem encontrada (ID: ${suggestionOrigem.id})`);
    console.log(`   Reason: ${suggestionOrigem.reason.substring(0, 80)}...`);
    console.log(`   RelevanceScore: ${suggestionOrigem.relevanceScore || 'N/A'}`);

    // 5. Verificar se já existe sugestão para o filme destino com o mesmo journeyOptionFlowId
    console.log(`🔍 Verificando se já existe sugestão no filme destino...`);
    const existingSuggestion = await prisma.movieSuggestionFlow.findFirst({
      where: {
        movieId: movieDestino.id,
        journeyOptionFlowId: args.journeyOptionFlowId
      }
    });

    if (existingSuggestion) {
      console.log(`⚠️ Já existe uma sugestão para o filme destino com journeyOptionFlowId ${args.journeyOptionFlowId}`);
      console.log(`📊 Sugestão existente ID: ${existingSuggestion.id}`);
      
      // Atualizar sugestão existente
      console.log('📝 Atualizando sugestão existente...');
      const updatedSuggestion = await prisma.movieSuggestionFlow.update({
        where: {
          id: existingSuggestion.id
        },
        data: {
          reason: suggestionOrigem.reason,
          relevance: suggestionOrigem.relevance,
          relevanceScore: suggestionOrigem.relevanceScore
        }
      });

      console.log('🎉 Sugestão atualizada com sucesso!');
      console.log('📊 Resumo da atualização:');
      console.log(`   Filme origem: ${movieOrigem.title} (${movieOrigem.year})`);
      console.log(`   Filme destino: ${movieDestino.title} (${movieDestino.year})`);
      console.log(`   JourneyOptionFlowId: ${args.journeyOptionFlowId}`);
      console.log(`   Sugestão atualizada ID: ${updatedSuggestion.id}`);
      console.log(`   Reason: ${updatedSuggestion.reason.substring(0, 80)}...`);
      console.log(`   RelevanceScore: ${updatedSuggestion.relevanceScore || 'N/A'}`);

      // Atualizar ranking de relevance para o filme destino
      console.log('\n🔄 Atualizando ranking de relevance para o filme destino...');
      try {
        const { updateRelevanceRankingForMovie } = await import('../utils/relevanceRanking');
        await updateRelevanceRankingForMovie(movieDestino.id);
        console.log('✅ Ranking de relevance atualizado');
      } catch (rankingError) {
        console.log(`⚠️ Aviso: Falha ao atualizar ranking de relevance: ${rankingError instanceof Error ? rankingError.message : 'Erro desconhecido'}`);
      }

      // Exibir filmes que têm registros com o journeyOptionFlowId informado (no final)
      console.log(`\n🔍 Buscando filmes com journeyOptionFlowId ${args.journeyOptionFlowId}...`);
      const moviesWithJourney = await prisma.movieSuggestionFlow.findMany({
        where: {
          journeyOptionFlowId: args.journeyOptionFlowId
        },
        include: {
          movie: {
            select: {
              title: true,
              year: true,
              tmdbId: true
            }
          }
        },
        orderBy: {
          movie: {
            title: 'asc'
          }
        }
      });

      if (moviesWithJourney.length > 0) {
        console.log(`📊 Encontrados ${moviesWithJourney.length} filme(s) com journeyOptionFlowId ${args.journeyOptionFlowId}:`);
        moviesWithJourney.forEach((suggestion, index) => {
          console.log(`   ${index + 1}. ${suggestion.movie.title} (${suggestion.movie.year || 'N/A'}) - TMDB ID: ${suggestion.movie.tmdbId || 'N/A'}`);
        });
      } else {
        console.log(`⚠️ Nenhum filme encontrado com journeyOptionFlowId ${args.journeyOptionFlowId}`);
      }
      
      return;
    }

    // 6. Criar nova sugestão para o filme destino
    console.log('📝 Criando nova sugestão para o filme destino...');
    const newSuggestion = await prisma.movieSuggestionFlow.create({
      data: {
        movieId: movieDestino.id,
        journeyOptionFlowId: args.journeyOptionFlowId,
        reason: suggestionOrigem.reason,
        relevance: suggestionOrigem.relevance,
        relevanceScore: suggestionOrigem.relevanceScore
      }
    });

    console.log('🎉 Sugestão copiada com sucesso!');
    console.log('📊 Resumo:');
    console.log(`   Filme origem: ${movieOrigem.title} (${movieOrigem.year}) - TMDB ID: ${args.tmdbIdOrigem}`);
    console.log(`   Filme destino: ${movieDestino.title} (${movieDestino.year}) - TMDB ID: ${args.tmdbIdDestino}`);
    console.log(`   JourneyOptionFlowId: ${args.journeyOptionFlowId}`);
    console.log(`   Sugestão origem ID: ${suggestionOrigem.id}`);
    console.log(`   Nova sugestão ID: ${newSuggestion.id}`);
    console.log(`   Reason: ${newSuggestion.reason.substring(0, 80)}...`);
    console.log(`   RelevanceScore: ${newSuggestion.relevanceScore?.toFixed(3) || 'N/A'}`);

    // 7. Atualizar ranking de relevance para o filme destino
    console.log('\n🔄 Atualizando ranking de relevance para o filme destino...');
    try {
      const { updateRelevanceRankingForMovie } = await import('../utils/relevanceRanking');
      await updateRelevanceRankingForMovie(movieDestino.id);
      console.log('✅ Ranking de relevance atualizado');
    } catch (rankingError) {
      console.log(`⚠️ Aviso: Falha ao atualizar ranking de relevance: ${rankingError instanceof Error ? rankingError.message : 'Erro desconhecido'}`);
    }

    // 8. Exibir filmes que têm registros com o journeyOptionFlowId informado (no final)
    console.log(`\n🔍 Buscando filmes com journeyOptionFlowId ${args.journeyOptionFlowId}...`);
    const moviesWithJourney = await prisma.movieSuggestionFlow.findMany({
      where: {
        journeyOptionFlowId: args.journeyOptionFlowId
      },
      include: {
        movie: {
          select: {
            title: true,
            year: true,
            tmdbId: true
          }
        }
      },
      orderBy: {
        movie: {
          title: 'asc'
        }
      }
    });

    if (moviesWithJourney.length > 0) {
      console.log(`📊 Encontrados ${moviesWithJourney.length} filme(s) com journeyOptionFlowId ${args.journeyOptionFlowId}:`);
      moviesWithJourney.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion.movie.title} (${suggestion.movie.year || 'N/A'}) - TMDB ID: ${suggestion.movie.tmdbId || 'N/A'}`);
      });
    } else {
      console.log(`⚠️ Nenhum filme encontrado com journeyOptionFlowId ${args.journeyOptionFlowId}`);
    }

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
    if (arg.startsWith('--tmdbId-origem=')) {
      parsed.tmdbIdOrigem = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--journeyOptionFlowId=')) {
      parsed.journeyOptionFlowId = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--tmdbId-destino=')) {
      parsed.tmdbIdDestino = parseInt(arg.split('=')[1]);
    }
  });

  // Validação dos parâmetros obrigatórios
  if (!parsed.tmdbIdOrigem || !parsed.journeyOptionFlowId || !parsed.tmdbIdDestino) {
    console.log('❌ Uso: npx ts-node src/scripts/copyMovieSuggestion.ts --tmdbId-origem=9999999 --journeyOptionFlowId=999 --tmdbId-destino=9999999');
    console.log('📋 Parâmetros obrigatórios:');
    console.log('   --tmdbId-origem: TMDB ID do filme origem (de onde copiar a sugestão)');
    console.log('   --journeyOptionFlowId: ID do journeyOptionFlow da sugestão a ser copiada');
    console.log('   --tmdbId-destino: TMDB ID do filme destino (para onde copiar a sugestão)');
    console.log('📝 Comportamento:');
    console.log('   - Verifica se o filme destino tem pelo menos 3 registros em MovieSentiment');
    console.log('   - Se já existir sugestão no destino: atualiza reason, relevance e relevanceScore');
    console.log('   - Se não existir: cria nova sugestão copiando dados da origem');
    console.log('   - Atualiza automaticamente o ranking de relevance do filme destino');
    process.exit(1);
  }

  return parsed as ScriptArgs;
}

// Execução do script
async function main() {
  const args = parseArgs();
  await copyMovieSuggestion(args);
}

if (require.main === module) {
  main();
}

export { copyMovieSuggestion };


/// <reference types="node" />
// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import { updateRelevanceRankingForMovie } from '../utils/relevanceRanking';

const prisma = new PrismaClient();

/**
 * Função auxiliar para copiar todos os MovieSentiment de um filme
 */
async function copyMovieSentiments(movieId: string) {
  console.log('\n📊 Iniciando cópia de MovieSentiment...');

  // Buscar todos os MovieSentiment do filme
  const existingSentiments = await prisma.movieSentiment.findMany({
    where: {
      movieId: movieId
    }
  });

  if (existingSentiments.length === 0) {
    console.log('⚠️ Nenhum MovieSentiment encontrado para este filme.');
    return;
  }

  console.log(`📋 Encontrados ${existingSentiments.length} registros de MovieSentiment`);

  let copiedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const sentiment of existingSentiments) {
    try {
      // Verificar se já existe este MovieSentiment
      const existing = await prisma.movieSentiment.findUnique({
        where: {
          movieId_mainSentimentId_subSentimentId: {
            movieId: sentiment.movieId,
            mainSentimentId: sentiment.mainSentimentId,
            subSentimentId: sentiment.subSentimentId
          }
        }
      });

      if (existing) {
        // Atualizar registro existente
        await prisma.movieSentiment.update({
          where: {
            movieId_mainSentimentId_subSentimentId: {
              movieId: sentiment.movieId,
              mainSentimentId: sentiment.mainSentimentId,
              subSentimentId: sentiment.subSentimentId
            }
          },
          data: {
            relevance: sentiment.relevance,
            explanation: sentiment.explanation
          }
        });
        updatedCount++;
        console.log(`   ↻ Atualizado: MainSentiment ${sentiment.mainSentimentId}, SubSentiment ${sentiment.subSentimentId}`);
      } else {
        // Criar novo registro
        await prisma.movieSentiment.create({
          data: {
            movieId: sentiment.movieId,
            mainSentimentId: sentiment.mainSentimentId,
            subSentimentId: sentiment.subSentimentId,
            relevance: sentiment.relevance,
            explanation: sentiment.explanation
          }
        });
        copiedCount++;
        console.log(`   ✓ Copiado: MainSentiment ${sentiment.mainSentimentId}, SubSentiment ${sentiment.subSentimentId}`);
      }
    } catch (error: any) {
      errorCount++;
      console.error(`   ✗ Erro ao copiar MovieSentiment (Main: ${sentiment.mainSentimentId}, Sub: ${sentiment.subSentimentId}):`, error.message);
    }
  }

  console.log('\n📊 Resumo da cópia de MovieSentiment:');
  console.log(`   ✓ Copiados: ${copiedCount}`);
  console.log(`   ↻ Atualizados: ${updatedCount}`);
  console.log(`   ✗ Erros: ${errorCount}`);
  console.log(`   📊 Total processados: ${existingSentiments.length}`);
}

interface ScriptArgs {
  title: string;
  year: number;
  journeyOptionFlowId: number;
  baseJourneyOptionFlowId?: number; // ID da sugestão base para copiar dados
  copyMovieSentiments?: boolean; // Se true, copia todos os MovieSentiment do filme
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

      // Copiar MovieSentiment se solicitado (mesmo quando atualiza sugestão existente)
      if (args.copyMovieSentiments) {
        await copyMovieSentiments(movie.id);
      }

      // 6. Reorganizar ranking de relevance (mesmo na atualização)
      console.log('🔄 Reorganizando ranking de relevance...');
      const relevanceUpdated = await updateRelevanceRankingForMovie(movie.id);
      if (relevanceUpdated) {
        console.log('✅ Ranking de relevance atualizado com sucesso!');

        // Mostrar estado final
        const finalState = await prisma.movieSuggestionFlow.findUnique({ where: { id: existingWithNewFlow.id } });
        console.log(`📊 Estado FINAL da sugestão:`);
        console.log(`   Relevance: ${finalState?.relevance} (Pós-reorganização)`);
      } else {
        console.log('⚠️ Falha ao atualizar ranking de relevance (ou sem necessidade).');
      }

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

    // 5. Copiar registros de MovieSentiment se solicitado
    if (args.copyMovieSentiments) {
      await copyMovieSentiments(movie.id);
    }

    // 6. Reorganizar ranking de relevance
    console.log('🔄 Reorganizando ranking de relevance...');
    const relevanceUpdated = await updateRelevanceRankingForMovie(movie.id);
    if (relevanceUpdated) {
      console.log('✅ Ranking de relevance atualizado com sucesso!');

      // Mostrar estado final
      const finalState = await prisma.movieSuggestionFlow.findUnique({ where: { id: newSuggestion.id } });
      console.log(`📊 Estado FINAL da sugestão:`);
      console.log(`   Relevance: ${finalState?.relevance} (Pós-reorganização)`);
    } else {
      console.log('⚠️ Falha ao atualizar ranking de relevance (ou sem necessidade).');
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
    else if (arg.startsWith('--baseJourneyOptionFlowId=')) {
      const idStr = extractValue(arg, '--baseJourneyOptionFlowId=');
      if (idStr) {
        const id = parseInt(removeQuotes(idStr));
        if (!isNaN(id)) parsed.baseJourneyOptionFlowId = id;
      }
    }
    else if (arg === '--copyMovieSentiments' || arg === '--copy-sentiments') {
      parsed.copyMovieSentiments = true;
    }

    i++;
  }

  // Validação dos parâmetros obrigatórios
  if (!parsed.title || !parsed.year || !parsed.journeyOptionFlowId) {
    console.log('❌ Uso: npx ts-node src/scripts/duplicateMovieSuggestion.ts --title="Nome do Filme" --year=2023 --journeyOptionFlowId=25 [--baseJourneyOptionFlowId=10] [--copyMovieSentiments]');
    console.log('📋 Parâmetros obrigatórios:');
    console.log('   --title: Título do filme');
    console.log('   --year: Ano do filme');
    console.log('   --journeyOptionFlowId: ID do journeyOptionFlow (cria nova sugestão ou atualiza existente)');
    console.log('📋 Parâmetros opcionais:');
    console.log('   --baseJourneyOptionFlowId: ID da sugestão base para copiar dados (padrão: sugestão mais recente)');
    console.log('   --copyMovieSentiments: Copia todos os registros de MovieSentiment do filme');
    console.log('📝 Comportamento:');
    console.log('   - Se não existir sugestão com o journeyOptionFlowId: cria nova sugestão copiando dados da base');
    console.log('   - Se já existir sugestão com o journeyOptionFlowId: atualiza reason, relevance e relevanceScore');
    console.log('   - O relevanceScore é sempre copiado da sugestão base (sem recálculo)');
    console.log('   - Com --copyMovieSentiments: copia todos os MovieSentiment do filme (atualiza se já existirem)');
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
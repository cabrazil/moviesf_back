/**
 * 🎯 Utilitário para Gerenciar Ranking de Relevance
 * 
 * Atualiza o campo 'relevance' na tabela MovieSuggestionFlow baseado no ranking
 * de relevanceScore para cada filme. O campo relevance funciona como um ranking:
 * - relevance = 1: melhor jornada (maior relevanceScore)
 * - relevance = 2: segunda melhor jornada
 * - E assim por diante
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Atualiza o ranking de relevance para um filme específico
 * 
 * @param movieId - ID do filme (UUID)
 * @returns Promise<boolean> - true se atualizado com sucesso, false caso contrário
 */
export async function updateRelevanceRankingForMovie(movieId: string): Promise<boolean> {
  try {
    console.log(`\n🔄 === INICIANDO ATUALIZAÇÃO DE RANKING DE RELEVANCE ===`);

    // Buscar todas as sugestões do filme
    // Vamos ordenar manualmente para garantir que NULLs fiquem no final
    const allSuggestions = await prisma.movieSuggestionFlow.findMany({
      where: {
        movieId: movieId
      },
      select: {
        id: true,
        relevanceScore: true,
        journeyOptionFlowId: true
      }
    });

    // Converter relevanceScore para número (Prisma Decimal precisa ser convertido)
    const suggestionsWithNumericScore = allSuggestions.map(s => {
      let numericScore: number | null = null;
      if (s.relevanceScore !== null && s.relevanceScore !== undefined) {
        // Prisma Decimal pode ser convertido usando .toNumber() ou Number()
        if (typeof s.relevanceScore === 'object' && 'toNumber' in s.relevanceScore) {
          numericScore = (s.relevanceScore as any).toNumber();
        } else {
          numericScore = Number(s.relevanceScore);
        }
        // Validar se a conversão resultou em um número válido
        if (numericScore !== null && isNaN(numericScore)) {
          numericScore = null;
        }
      }
      return {
        ...s,
        relevanceScoreNumeric: numericScore
      };
    });

    // Ordenar manualmente: primeiro por relevanceScore DESC (NULLs no final), depois por ID ASC
    const suggestions = suggestionsWithNumericScore.sort((a, b) => {
      // Se ambos têm score, ordenar por score DESC
      if (a.relevanceScoreNumeric !== null && b.relevanceScoreNumeric !== null) {
        if (b.relevanceScoreNumeric !== a.relevanceScoreNumeric) {
          return b.relevanceScoreNumeric - a.relevanceScoreNumeric;
        }
        // Desempate por ID ASC (id é string)
        return String(a.id).localeCompare(String(b.id));
      }
      // Se apenas a tem score, a vem primeiro
      if (a.relevanceScoreNumeric !== null && b.relevanceScoreNumeric === null) {
        return -1;
      }
      // Se apenas b tem score, b vem primeiro
      if (a.relevanceScoreNumeric === null && b.relevanceScoreNumeric !== null) {
        return 1;
      }
      // Se ambos são NULL, ordenar por ID ASC (id é string)
      return String(a.id).localeCompare(String(b.id));
    });

    if (suggestions.length === 0) {
      console.log(`⚠️ Nenhuma sugestão encontrada para o filme: ${movieId}`);
      return false;
    }

    // Filtrar apenas sugestões com relevanceScore válido (não NULL)
    const suggestionsWithScore = suggestions.filter(s => s.relevanceScoreNumeric !== null && s.relevanceScoreNumeric !== undefined);
    
    console.log(`📊 Total de sugestões encontradas: ${suggestions.length}`);
    console.log(`📊 Sugestões com score válido: ${suggestionsWithScore.length}`);
    
    if (suggestionsWithScore.length === 0) {
      console.log(`⚠️ Nenhuma sugestão com relevanceScore válido encontrada para o filme: ${movieId}`);
      // Mesmo assim, atualizar o relevance para undefined (indicando que não há ranking válido)
      // Prisma não aceita null para campos Int, então não atualizamos o campo
      const updatePromises = suggestions.map((suggestion) => {
        return prisma.movieSuggestionFlow.update({
          where: { id: suggestion.id },
          data: { 
            // Não atualizar relevance se não há score válido (deixar como está ou undefined)
            updatedAt: new Date()
          }
        });
      });
      await Promise.all(updatePromises);
      return false;
    }

    // Log das sugestões ordenadas antes da atualização
    console.log(`📋 Sugestões ordenadas por relevanceScore (DESC):`);
    suggestionsWithScore.forEach((s, idx) => {
      console.log(`   ${idx + 1}. JourneyFlowId: ${s.journeyOptionFlowId}, Score: ${s.relevanceScoreNumeric} (original: ${s.relevanceScore})`);
    });

    // Atualizar cada sugestão com o novo ranking baseado no relevanceScore
    // Maior relevanceScore = relevance 1 (melhor)
    const updatePromises: (Promise<any> | null)[] = suggestions.map((suggestion, index) => {
      // Se não tem score, não atualizar o relevance (deixar como está)
      if (suggestion.relevanceScoreNumeric === null || suggestion.relevanceScoreNumeric === undefined) {
        // Não atualizar relevance para sugestões sem score
        return null;
      }
      
      // Para sugestões com score, usar o índice baseado apenas nas que têm score
      const scoreIndex = suggestionsWithScore.findIndex(s => s.id === suggestion.id);
      if (scoreIndex === -1) {
        // Não encontrado na lista de sugestões com score, pular
        return null;
      }
      
      const newRelevance = scoreIndex + 1; // relevance = 1, 2, 3...
      
      return prisma.movieSuggestionFlow.update({
        where: { id: suggestion.id },
        data: { 
          relevance: newRelevance,
          updatedAt: new Date()
        }
      });
    });

    // Filtrar atualizações válidas (remover nulls)
    const validUpdates = updatePromises.filter((p): p is Promise<any> => p !== null);
    await Promise.all(validUpdates);

    return true;

  } catch (error) {
    console.error(`❌ Erro ao atualizar ranking de relevance para filme ${movieId}:`, error);
    return false;
  }
}

/**
 * Atualiza o ranking de relevance para múltiplos filmes
 * 
 * @param movieIds - Array de IDs dos filmes (UUID[])
 * @returns Promise<number> - Número de filmes atualizados com sucesso
 */
export async function updateRelevanceRankingForMovies(movieIds: string[]): Promise<number> {
  let successCount = 0;

  for (const movieId of movieIds) {
    const success = await updateRelevanceRankingForMovie(movieId);
    if (success) {
      successCount++;
    }
  }

  console.log(`✅ Ranking atualizado para ${successCount}/${movieIds.length} filmes`);
  return successCount;
}

/**
 * Atualiza o ranking de relevance para todos os filmes no banco
 * (Útil para migração inicial ou correção em massa)
 * 
 * @returns Promise<number> - Número total de filmes atualizados
 */
export async function updateRelevanceRankingForAllMovies(): Promise<number> {
  try {
    console.log(`🔄 Iniciando atualização de ranking para todos os filmes...`);

    // Buscar todos os movieIds únicos
    const movies = await prisma.movieSuggestionFlow.findMany({
      select: {
        movieId: true
      },
      distinct: ['movieId']
    });

    const movieIds = movies.map(m => m.movieId);
    console.log(`📋 Total de filmes encontrados: ${movieIds.length}`);

    return await updateRelevanceRankingForMovies(movieIds);

  } catch (error) {
    console.error(`❌ Erro ao atualizar ranking para todos os filmes:`, error);
    return 0;
  }
}


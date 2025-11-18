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
    console.log(`🔄 Atualizando ranking de relevance para filme: ${movieId}`);

    // Buscar todas as sugestões do filme ordenadas por relevanceScore DESC
    const suggestions = await prisma.movieSuggestionFlow.findMany({
      where: {
        movieId: movieId
      },
      orderBy: [
        { relevanceScore: 'desc' },
        { id: 'asc' } // Critério de desempate: menor ID primeiro
      ],
      select: {
        id: true,
        relevanceScore: true
      }
    });

    if (suggestions.length === 0) {
      console.log(`⚠️ Nenhuma sugestão encontrada para o filme: ${movieId}`);
      return false;
    }

    // Atualizar cada sugestão com o novo ranking
    const updatePromises = suggestions.map((suggestion, index) => {
      const newRelevance = index + 1; // relevance = 1, 2, 3...
      
      return prisma.movieSuggestionFlow.update({
        where: { id: suggestion.id },
        data: { 
          relevance: newRelevance,
          updatedAt: new Date()
        }
      });
    });

    await Promise.all(updatePromises);

    console.log(`✅ Ranking atualizado: ${suggestions.length} sugestões processadas`);
    console.log(`📊 Melhor jornada (relevance=1): ID ${suggestions[0].id}, Score: ${suggestions[0].relevanceScore || 'N/A'}`);

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


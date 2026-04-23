/**
 * 🎬 Serviço Movie Hero
 * 
 * Camada de lógica de negócio para detalhes de filmes
 */

import { movieHeroRepository } from '../repositories/movieHero.repository';
import {
  Movie,
  MovieHeroResponse,
  MovieHeroError,
  StreamingPlatform,
  OscarAwards
} from '../types/movieHero.types';

export class MovieHeroService {

  /**
   * Obtém dados completos do filme por slug
   */
  async getMovieHero(slug: string): Promise<MovieHeroResponse> {
    try {
      console.log(`🎬 Iniciando busca do filme hero: ${slug}`);

      // 1. Buscar filme por slug
      const movie = await movieHeroRepository.findMovieBySlug(slug);

      if (!movie) {
        throw this.createError('MOVIE_NOT_FOUND', `Filme com slug '${slug}' não encontrado`);
      }

      console.log(`✅ Filme encontrado: ${movie.title}`);

      // 2. Buscar todos os dados relacionados em paralelo
      const [movieData, primaryJourney] = await Promise.all([
        movieHeroRepository.getMovieData(movie.id),
        movieHeroRepository.getMoviePrimaryJourney(movie.id)
      ]);

      // 3. Processar e organizar dados
      const processedData = this.processMovieData(movieData);

      // 4. Montar resposta final
      const response = this.buildResponse(movie, processedData, primaryJourney);

      console.log(`🎉 Resposta montada com sucesso para: ${movie.title}`);
      return response;

    } catch (error) {
      console.error('❌ Erro no serviço Movie Hero:', error);

      if (error instanceof Error && 'code' in error) {
        throw error; // Re-throw erros customizados
      }

      throw this.createError('INTERNAL_ERROR', 'Erro interno do servidor', error);
    }
  }

  /**
   * Processa e organiza os dados do filme
   */
  private processMovieData(movieData: any) {
    console.log('🔄 Processando dados do filme...');

    // Organizar plataformas por tipo de acesso
    const subscriptionPlatforms = movieData.platforms.filter(
      (p: StreamingPlatform) => p.accessType === 'INCLUDED_WITH_SUBSCRIPTION' || p.accessType === 'FREE_WITH_ADS'
    );

    const rentalPurchasePlatforms = movieData.platforms.filter(
      (p: StreamingPlatform) => p.accessType === 'RENTAL' || p.accessType === 'PURCHASE'
    );

    // Processar premiações Oscar
    const oscarAwards = this.processOscarAwards(
      movieData.oscarWins,
      movieData.oscarNominations
    );

    console.log(`✅ Dados processados: ${subscriptionPlatforms.length} plataformas de assinatura/gratuito, ${rentalPurchasePlatforms.length} de aluguel/compra`);

    return {
      ...movieData,
      subscriptionPlatforms,
      rentalPurchasePlatforms,
      oscarAwards
    };
  }

  /**
   * Processa premiações Oscar
   */
  private processOscarAwards(wins: any[], nominations: any[]): OscarAwards | null {
    if (wins.length === 0 && nominations.length === 0) {
      return null;
    }

    return {
      wins,
      nominations,
      totalWins: wins.length,
      totalNominations: nominations.length
    };
  }

  /**
   * Monta a resposta final
   */
  private buildResponse(movie: Movie, processedData: any, primaryJourney: any): MovieHeroResponse {
    return {
      movie: {
        id: movie.id,
        title: movie.title,
        original_title: movie.original_title,
        year: movie.year,
        description: movie.description,
        director: movie.director,
        runtime: movie.runtime,
        certification: movie.certification,
        imdbRating: movie.imdbRating,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        rottenTomatoesRating: movie.rottenTomatoesRating,
        metacriticRating: movie.metacriticRating,
        thumbnail: movie.thumbnail,
        genres: movie.genres,
        landingPageHook: movie.landingPageHook,
        contentWarnings: movie.contentWarnings,
        targetAudienceForLP: movie.targetAudienceForLP,
        awardsSummary: movie.awardsSummary,
        emotionalTags: processedData.sentiments,
        mainCast: processedData.mainCast,
        fullCast: processedData.fullCast,
        mainTrailer: processedData.mainTrailer,
        oscarAwards: processedData.oscarAwards,
        primaryJourney: primaryJourney,
        movieSuggestionFlows: processedData.suggestionFlows,
        pillarArticles: processedData.pillarArticles
      },
      subscriptionPlatforms: processedData.subscriptionPlatforms,
      rentalPurchasePlatforms: processedData.rentalPurchasePlatforms,
      similarMovies: processedData.similarMovies
    };
  }

  /**
   * Cria erro customizado
   */
  private createError(
    code: MovieHeroError['code'],
    message: string,
    details?: any
  ): MovieHeroError {
    const error = new Error(message) as unknown as MovieHeroError;
    error.code = code;
    error.details = details;
    return error;
  }

  /**
   * Valida se o slug é válido
   */
  private validateSlug(slug: string): boolean {
    if (!slug || typeof slug !== 'string') {
      return false;
    }

    // Slug deve ter pelo menos 1 caractere e no máximo 100
    if (slug.length < 1 || slug.length > 100) {
      return false;
    }

    // Slug deve conter apenas letras, números, hífens e underscores
    const slugRegex = /^[a-zA-Z0-9_-]+$/;
    return slugRegex.test(slug);
  }

  /**
   * Sanitiza dados de entrada
   */
  private sanitizeInput(input: string): string {
    return input.trim().toLowerCase();
  }

  /**
   * Obtém estatísticas do serviço
   */
  async getServiceStats() {
    return {
      timestamp: new Date().toISOString(),
      service: 'MovieHeroService',
      version: '1.0.0',
      status: 'active'
    };
  }
}

// ===== EXPORT =====

export const movieHeroService = new MovieHeroService();
export default movieHeroService;

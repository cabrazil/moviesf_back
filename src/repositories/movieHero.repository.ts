/**
 * 🗄️ Repositório Movie Hero
 * 
 * Camada de acesso a dados otimizada com consultas paralelas
 */

import { dbConnection } from '../utils/database.connection';
import {
  Movie,
  StreamingPlatform,
  EmotionalTag,
  CastMember,
  Trailer,
  OscarAward,
  SimilarMovie,
  MovieQueryResult,
  SuggestionFlow
} from '../types/movieHero.types';

export class MovieHeroRepository {

  /**
   * Busca jornada principal do filme (otimizada)
   */
  async getMoviePrimaryJourney(movieId: string): Promise<{ journeyOptionFlowId: number; displayTitle: string | null } | null> {
    const query = `
      SELECT 
        msf."journeyOptionFlowId",
        jof."displayTitle"
      FROM "MovieSuggestionFlow" msf
      JOIN "JourneyOptionFlow" jof ON msf."journeyOptionFlowId" = jof.id
      WHERE msf."movieId" = $1
      ORDER BY msf."relevanceScore" DESC
      LIMIT 1
    `;

    const result = await dbConnection.query(query, [movieId]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      journeyOptionFlowId: result.rows[0].journeyOptionFlowId,
      displayTitle: result.rows[0].displayTitle
    };
  }

  /**
   * Busca filme por slug
   */
  async findMovieBySlug(slug: string): Promise<Movie | null> {
    const query = `
      SELECT 
        m.id,
        m.title,
        m."original_title",
        m.year,
        m.description,
        m.director,
        m.runtime,
        m.certification,
        m."imdbRating",
        m."vote_average",
        m."vote_count",
        m."rottenTomatoesRating",
        m."metacriticRating",
        m.thumbnail,
        m.genres,
        m."landingPageHook",
        m."contentWarnings",
        m."targetAudienceForLP",
        m."awardsSummary"
      FROM "Movie" m
      WHERE m.slug = $1
    `;

    const result = await dbConnection.query<Movie>(query, [slug]);
    return result.rows[0] || null;
  }

  /**
   * Busca todos os dados relacionados ao filme em paralelo
   */
  async getMovieData(movieId: string): Promise<MovieQueryResult> {
    console.log(`🎬 Buscando dados completos do filme: ${movieId}`);

    // Definir todas as consultas
    const queries = [
      {
        text: this.getPlatformsQuery(),
        params: [movieId]
      },
      {
        text: this.getReasonQuery(),
        params: [movieId]
      },
      {
        text: this.getSentimentsQuery(),
        params: [movieId]
      },
      {
        text: this.getMainCastQuery(),
        params: [movieId]
      },
      {
        text: this.getFullCastQuery(),
        params: [movieId]
      },
      {
        text: this.getMainTrailerQuery(),
        params: [movieId]
      },
      {
        text: this.getOscarWinsQuery(),
        params: [movieId]
      },
      {
        text: this.getOscarNominationsQuery(),
        params: [movieId]
      },
      {
        text: this.getSimilarMoviesQuery(),
        params: [movieId]
      },
      {
        text: this.getPillarArticlesQuery(),
        params: [movieId]
      }
    ];

    // Executar todas as consultas em paralelo
    const results = await dbConnection.queryParallel(queries);

    // Extrair resultados
    const [
      platformsResult,
      reasonResult,
      sentimentsResult,
      mainCastResult,
      fullCastResult,
      mainTrailerResult,
      oscarWinsResult,
      oscarNominationsResult,
      similarMoviesResult,
      pillarArticlesResult
    ] = results;

    console.log(`✅ Dados coletados: ${results.length} consultas executadas`);

    return {
      platforms: this.mapPlatforms(platformsResult.rows),
      suggestionFlows: this.mapSuggestionFlows(reasonResult.rows),
      sentiments: this.mapSentiments(sentimentsResult.rows),
      mainCast: this.mapCast(mainCastResult.rows),
      fullCast: this.mapCast(fullCastResult.rows),
      mainTrailer: this.mapTrailer(mainTrailerResult.rows),
      oscarWins: this.mapOscarAwards(oscarWinsResult.rows),
      oscarNominations: this.mapOscarAwards(oscarNominationsResult.rows),
      similarMovies: this.mapSimilarMovies(similarMoviesResult.rows),
      pillarArticles: this.mapPillarArticles(pillarArticlesResult.rows)
    };
  }

  // ===== QUERIES PRIVADAS =====

  private getPlatformsQuery(): string {
    return `
      SELECT 
        sp.id,
        sp.name,
        sp.category,
        sp."logoPath",
        sp."hasFreeTrial",
        sp."freeTrialDuration",
        sp."baseUrl",
        msp."accessType"
      FROM "MovieStreamingPlatform" msp
      JOIN "StreamingPlatform" sp ON msp."streamingPlatformId" = sp.id
      WHERE msp."movieId" = $1
      ORDER BY 
        CASE msp."accessType"
          WHEN 'INCLUDED_WITH_SUBSCRIPTION' THEN 1
          WHEN 'RENTAL' THEN 2
          WHEN 'PURCHASE' THEN 3
          ELSE 4
        END,
        sp.name
    `;
  }

  private getReasonQuery(): string {
    return `
      SELECT 
        msf.reason,
        msf."relevanceScore",
        ms_main.name as "mainSentimentName"
      FROM "MovieSuggestionFlow" msf
      LEFT JOIN "JourneyOptionFlow" jof ON msf."journeyOptionFlowId" = jof.id
      LEFT JOIN "JourneyStepFlow" jsf ON jof."journeyStepFlowId" = jsf.id
      LEFT JOIN "JourneyFlow" jf ON jsf."journeyFlowId" = jf.id
      LEFT JOIN "MainSentiment" ms_main ON jf."mainSentimentId" = ms_main.id
      WHERE msf."movieId" = $1
      ORDER BY msf."relevanceScore" DESC
    `;
  }

  private getSentimentsQuery(): string {
    return `
      SELECT 
        ms."mainSentimentId",
        ms."subSentimentId",
        ms.relevance,
        ms_main.name as "mainSentimentName",
        ss.name as "subSentimentName"
      FROM "MovieSentiment" ms
      JOIN "MainSentiment" ms_main ON ms."mainSentimentId" = ms_main.id
      JOIN "SubSentiment" ss ON ms."subSentimentId" = ss.id
      WHERE ms."movieId" = $1
      ORDER BY ms.relevance DESC
    `;
  }

  private getMainCastQuery(): string {
    return `
      SELECT 
        a.name as "actorName",
        mc."characterName",
        mc."order"
      FROM "MovieCast" mc
      JOIN "Actor" a ON mc."actorId" = a.id
      WHERE mc."movieId" = $1
      ORDER BY mc."order" ASC
    `;
  }

  private getFullCastQuery(): string {
    return `
      SELECT 
        a.name as "actorName",
        mc."characterName",
        mc."order"
      FROM "MovieCast" mc
      JOIN "Actor" a ON mc."actorId" = a.id
      WHERE mc."movieId" = $1
      ORDER BY mc."order" ASC
    `;
  }

  private getMainTrailerQuery(): string {
    return `
      SELECT 
        mt.key,
        mt.name,
        mt.site,
        mt.type,
        mt.language,
        mt."isMain"
      FROM "MovieTrailer" mt
      WHERE mt."movieId" = $1
        AND mt."isMain" = true
      LIMIT 1
    `;
  }

  private getOscarWinsQuery(): string {
    return `
      SELECT 
        ac.name as "categoryName",
        maw.year,
        a.name as "personName"
      FROM "MovieAwardWin" maw
      JOIN "Award" award ON maw."awardId" = award.id
      JOIN "AwardCategory" ac ON maw."awardCategoryId" = ac.id
      LEFT JOIN "PersonAwardWin" paw ON (
        paw."awardId" = maw."awardId" 
        AND paw."awardCategoryId" = maw."awardCategoryId" 
        AND paw.year = maw.year
        AND paw."forMovieId" = maw."movieId"
      )
      LEFT JOIN "Actor" a ON paw."personId" = a.id
      WHERE maw."movieId" = $1
        AND award.name = 'Oscar'
      ORDER BY maw.year DESC, ac.name ASC
    `;
  }

  private getOscarNominationsQuery(): string {
    return `
      SELECT 
        ac.name as "categoryName",
        man.year,
        a.name as "personName"
      FROM "MovieAwardNomination" man
      JOIN "Award" award ON man."awardId" = award.id
      JOIN "AwardCategory" ac ON man."awardCategoryId" = ac.id
      LEFT JOIN "PersonAwardNomination" pan ON (
        pan."awardId" = man."awardId" 
        AND pan."awardCategoryId" = man."awardCategoryId" 
        AND pan.year = man.year
        AND pan."forMovieId" = man."movieId"
      )
      LEFT JOIN "Actor" a ON pan."personId" = a.id
      WHERE man."movieId" = $1
        AND award.name = 'Oscar'
      ORDER BY man.year DESC, ac.name ASC
    `;
  }

  private getSimilarMoviesQuery(): string {
    return `
      WITH best_journey AS (
        SELECT msf."journeyOptionFlowId"
        FROM "MovieSuggestionFlow" msf
        WHERE msf."movieId" = $1
        ORDER BY msf."relevanceScore" DESC
        LIMIT 1
      )
      SELECT DISTINCT
        m.id,
        m.title,
        m.year,
        m.thumbnail,
        m.slug,
        msf."relevanceScore",
        msf."journeyOptionFlowId",
        jof."displayTitle"
      FROM "MovieSuggestionFlow" msf
      JOIN "Movie" m ON msf."movieId" = m.id
      JOIN "JourneyOptionFlow" jof ON msf."journeyOptionFlowId" = jof.id
      JOIN best_journey bj ON msf."journeyOptionFlowId" = bj."journeyOptionFlowId"
      WHERE msf."movieId" != $1
      ORDER BY msf."relevanceScore" DESC
      LIMIT 6
    `;
  }

  private getPillarArticlesQuery(): string {
    return `
      SELECT 
        mpa.id,
        mpa."blogArticleId",
        mpa.title,
        mpa.slug
      FROM "MoviePillarArticle" mpa
      WHERE mpa."movieId" = $1
      ORDER BY mpa."createdAt" DESC
    `;
  }

  // ===== MAPPERS =====

  private mapSuggestionFlows(rows: any[]): SuggestionFlow[] {
    return rows.map(row => ({
      reason: row.reason,
      relevance: parseFloat(row.relevanceScore) || 0,
      journeyOptionFlow: {
        journeyStepFlow: {
          journeyFlow: {
            mainSentiment: {
              name: row.mainSentimentName || 'A Reflexão'
            }
          }
        }
      }
    }));
  }

  private mapPlatforms(rows: any[]): StreamingPlatform[] {
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      logoPath: row.logoPath,
      hasFreeTrial: row.hasFreeTrial,
      freeTrialDuration: row.freeTrialDuration,
      baseUrl: row.baseUrl,
      accessType: row.accessType
    }));
  }

  private mapSentiments(rows: any[]): EmotionalTag[] {
    return rows.map(row => ({
      mainSentiment: row.mainSentimentName,
      subSentiment: row.subSentimentName,
      relevance: parseFloat(row.relevance) || 0
    }));
  }

  private mapCast(rows: any[]): CastMember[] {
    return rows.map(row => ({
      actorName: row.actorName,
      characterName: row.characterName,
      order: row.order
    }));
  }

  private mapTrailer(rows: any[]): Trailer | null {
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      key: row.key,
      name: row.name,
      site: row.site,
      type: row.type,
      language: row.language,
      isMain: row.isMain
    };
  }

  private mapOscarAwards(rows: any[]): OscarAward[] {
    return rows.map(row => ({
      categoryName: row.categoryName,
      year: row.year,
      personName: row.personName
    }));
  }

  private mapSimilarMovies(rows: any[]): SimilarMovie[] {
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      year: row.year,
      thumbnail: row.thumbnail,
      slug: row.slug,
      relevanceScore: row.relevanceScore,
      journeyOptionFlowId: row.journeyOptionFlowId,
      displayTitle: row.displayTitle
    }));
  }

  private mapPillarArticles(rows: any[]): Array<{
    id: number;
    blogArticleId: string;
    title: string;
    slug: string;
  }> {
    return rows.map(row => ({
      id: row.id,
      blogArticleId: row.blogArticleId,
      title: row.title,
      slug: row.slug
    }));
  }
}

// ===== EXPORT =====

export const movieHeroRepository = new MovieHeroRepository();
export default movieHeroRepository;

/**
 * 🎬 Tipos e Interfaces para Movie Hero
 * 
 * Este arquivo contém todas as interfaces e tipos utilizados
 * no sistema de detalhes de filmes (landing page)
 */

// ===== TIPOS BASE =====

export interface Movie {
  id: string;
  title: string;
  original_title: string;
  year: number;
  description: string;
  director: string;
  runtime: number;
  certification: string;
  imdbRating: number;
  vote_average: number;
  vote_count?: number;
  rottenTomatoesRating: number;
  metacriticRating: number;
  thumbnail: string;
  genres: string[];
  landingPageHook: string;
  contentWarnings: string[];
  targetAudienceForLP: string;
  awardsSummary: string;
  primaryJourney?: {
    journeyOptionFlowId: number;
    displayTitle: string | null;
  } | null;
}

export interface StreamingPlatform {
  id: string;
  name: string;
  category: string;
  logoPath: string;
  hasFreeTrial: boolean;
  freeTrialDuration: number;
  baseUrl: string;
  accessType: 'INCLUDED_WITH_SUBSCRIPTION' | 'RENTAL' | 'PURCHASE';
}

export interface EmotionalTag {
  mainSentiment: string;
  subSentiment: string;
  relevance: number;
}

export interface CastMember {
  actorName: string;
  characterName: string;
  order: number;
}

export interface Trailer {
  key: string;
  name: string;
  site: string;
  type: string;
  language: string;
  isMain: boolean;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  vehicle: string;
  url: string;
}

export interface OscarAward {
  categoryName: string;
  year: number;
  personName: string;
}

export interface OscarAwards {
  wins: OscarAward[];
  nominations: OscarAward[];
  totalWins: number;
  totalNominations: number;
}

export interface SimilarMovie {
  id: string;
  title: string;
  year: number;
  thumbnail: string;
  slug: string;
  relevanceScore: number;
  journeyOptionFlowId: number;
  displayTitle: string | null;
}

// ===== TIPOS DE RESPOSTA =====

export interface MovieHeroResponse {
  movie: {
    id: string;
    title: string;
    original_title: string;
    year: number;
    description: string;
    director: string;
    runtime: number;
    certification: string;
    imdbRating: number;
    vote_average: number;
    rottenTomatoesRating: number;
    metacriticRating: number;
    thumbnail: string;
    genres: string[];
    landingPageHook: string;
    contentWarnings: string[];
    targetAudienceForLP: string;
    awardsSummary: string;
    emotionalTags: EmotionalTag[];
    mainCast: CastMember[];
    fullCast: CastMember[];
    mainTrailer: Trailer | null;
    quotes: Quote[];
    oscarAwards: OscarAwards | null;
    primaryJourney?: {
      journeyOptionFlowId: number;
      displayTitle: string | null;
    } | null;
  };
  subscriptionPlatforms: StreamingPlatform[];
  rentalPurchasePlatforms: StreamingPlatform[];
  similarMovies: SimilarMovie[];
  reason: string | null;
}

// ===== TIPOS DE CONSULTA =====

export interface MovieQueryResult {
  platforms: StreamingPlatform[];
  reason: string | null;
  sentiments: EmotionalTag[];
  mainCast: CastMember[];
  fullCast: CastMember[];
  mainTrailer: Trailer | null;
  quotes: Quote[];
  oscarWins: OscarAward[];
  oscarNominations: OscarAward[];
  similarMovies: SimilarMovie[];
}

// ===== TIPOS DE ERRO =====

export interface MovieHeroError {
  code: 'MOVIE_NOT_FOUND' | 'DATABASE_ERROR' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';
  message: string;
  details?: any;
}

// ===== TIPOS DE CONFIGURAÇÃO =====

export interface DatabaseConfig {
  connectionString: string;
  ssl: {
    rejectUnauthorized: boolean;
  };
}

export interface QueryOptions {
  timeout?: number;
  retries?: number;
}

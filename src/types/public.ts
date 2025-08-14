// ===============================================
// TIPOS PARA APIS PÚBLICAS DA LANDING PAGE
// ===============================================

export interface PublicMovie {
  id: string;
  title: string;
  year?: number;
  director?: string;
  description?: string;
  thumbnail?: string;
  vote_average?: number;
  vote_count?: number;
  tmdbId?: number;
  platforms: PublicStreamingPlatform[];
  movieSentiments: PublicMovieSentiment[];
}

export interface PublicStreamingPlatform {
  movieId: string;
  streamingPlatformId: number;
  accessType: 'INCLUDED_WITH_SUBSCRIPTION' | 'RENTAL' | 'PURCHASE' | 'FREE_WITH_ADS' | 'HYBRID_OR_UNKNOWN' | 'OTHER';
  streamingPlatform: {
    id: number;
    name: string;
    category: 'SUBSCRIPTION_PRIMARY' | 'RENTAL_PURCHASE_PRIMARY' | 'FREE_PRIMARY' | 'HYBRID';
  };
}

export interface PublicMovieSentiment {
  movieId: string;
  mainSentimentId: number;
  subSentimentId: number;
  mainSentiment: {
    id: number;
    name: string;
    description?: string;
  };
  subSentiment: {
    id: number;
    name: string;
    description?: string;
  };
}

export interface PublicMainSentiment {
  id: number;
  name: string;
  description?: string;
  shortDescription?: string;
  keywords: string[];
  subSentiments: PublicSubSentiment[];
  emotionalIntentions: PublicEmotionalIntention[];
  _count?: {
    movieSentiment: number;
  };
}

export interface PublicSubSentiment {
  id: number;
  name: string;
  description?: string;
  keywords: string[];
  mainSentimentId: number;
}

export interface PublicEmotionalIntention {
  id: number;
  mainSentimentId: number;
  intentionType: 'PROCESS' | 'TRANSFORM' | 'MAINTAIN' | 'EXPLORE';
  description: string;
  preferredGenres: string[];
  avoidGenres: string[];
  emotionalTone: string;
  subSentimentWeights: any;
}

export interface PublicJourneyFlow {
  id: number;
  mainSentimentId: number;
  mainSentiment: PublicMainSentiment;
  steps: PublicJourneyStepFlow[];
  _count?: {
    steps: number;
  };
}

export interface PublicJourneyStepFlow {
  id: number;
  journeyFlowId: number;
  stepId: string;
  order: number;
  question: string;
  options: PublicJourneyOptionFlow[];
}

export interface PublicJourneyOptionFlow {
  id: number;
  journeyStepFlowId: number;
  optionId: string;
  text: string;
  nextStepId?: string;
  isEndState: boolean;
  movieSuggestions: PublicMovieSuggestionFlow[];
}

export interface PublicMovieSuggestionFlow {
  id: number;
  journeyOptionFlowId: number;
  movieId: string;
  reason: string;
  relevance: number;
  relevanceScore?: number;
  movie: PublicMovie;
}

// ===============================================
// TIPOS PARA RESPONSES DAS APIS
// ===============================================

export interface HomeResponse {
  featuredMovies: PublicMovie[];
  mainSentiments: PublicMainSentiment[];
  featuredJourneys: PublicJourneyFlow[];
}

export interface MovieDetailResponse {
  movie: PublicMovie & {
    movieSuggestionFlows: PublicMovieSuggestionFlow[];
  };
  similarMovies: PublicMovie[];
}

export interface SentimentResponse {
  sentiment: PublicMainSentiment;
  movies: PublicMovie[];
  journey: PublicJourneyFlow;
}

export interface JourneyResponse {
  journey: PublicJourneyFlow;
}

export interface SearchResponse {
  movies: PublicMovie[];
}

export interface PlatformsResponse {
  platforms: {
    id: number;
    name: string;
    category: string;
  }[];
}

// ===============================================
// TIPOS PARA FILTROS DE BUSCA
// ===============================================

export interface SearchFilters {
  q?: string; // query de busca
  sentiment?: number; // ID do sentimento
  platform?: number; // ID da plataforma
  genre?: string; // gênero do filme
  year?: number; // ano do filme
  rating?: number; // rating mínimo
}

// ===============================================
// TIPOS PARA SEO E METADADOS
// ===============================================

export interface MovieSEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl: string;
}

export interface SentimentSEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl: string;
}

export interface JourneySEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl: string;
}

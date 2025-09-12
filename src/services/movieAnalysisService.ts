import axios from 'axios';
import { PrismaClient, Movie, MovieSentiment, SubSentiment, MainSentiment } from '@prisma/client';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache por 1 hora

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBMovieSearchResponse {
  results: {
    id: number;
    title: string;
    release_date: string;
  }[];
}

interface TMDBReviewsResponse {
  id: number;
  page: number;
  results: {
    author: string;
    author_details: {
      rating: number;
      username: string;
    };
    content: string;
    created_at: string;
    id: string;
    updated_at: string;
    url: string;
  }[];
  total_pages: number;
  total_results: number;
}

interface Analysis {
  source: string;
  author: string;
  score: number;
  matchedKeywords: string[];
  date: string;
  url: string;
  content: string;
}

type MovieWithSentiments = Movie & {
  movieSentiment: (MovieSentiment & {
    mainSentiment: MainSentiment;
    subSentiment: SubSentiment;
  })[];
};

export class MovieAnalysisService {
  private async searchTMDBMovie(movieTitle: string, year?: number): Promise<number | null> {
    try {
      const searchUrl = `${TMDB_BASE_URL}/search/movie`;
      const response = await axios.get<TMDBMovieSearchResponse>(searchUrl, {
        params: {
          api_key: TMDB_API_KEY,
          query: movieTitle,
          year: year,
          language: 'pt-BR'
        }
      });

      if (response.data.results.length === 0) {
        console.log('Nenhum filme encontrado no TMDB');
        return null;
      }

      // Pegar o primeiro resultado que corresponde ao título exato
      const movie = response.data.results.find(
        m => m.title.toLowerCase() === movieTitle.toLowerCase()
      ) || response.data.results[0];

      console.log(`Filme encontrado no TMDB: ${movie.title} (ID: ${movie.id})`);
      return movie.id;
    } catch (error) {
      console.error('Erro ao buscar filme no TMDB:', error);
      return null;
    }
  }

  private async getTMDBReviews(movieId: number): Promise<Analysis[]> {
    try {
      const reviewsUrl = `${TMDB_BASE_URL}/movie/${movieId}/reviews`;
      const response = await axios.get<TMDBReviewsResponse>(reviewsUrl, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'en-US',
          page: 1
        }
      });

      console.log(`Reviews encontradas: ${response.data.total_results}`);

      return response.data.results.map(review => ({
        source: 'TMDB',
        author: review.author,
        score: review.author_details.rating || 0,
        matchedKeywords: [],
        date: new Date(review.created_at).toLocaleDateString(),
        url: review.url,
        content: review.content
      }));
    } catch (error) {
      console.error('Erro ao buscar reviews no TMDB:', error);
      return [];
    }
  }

  private calculateSentimentScore(content: string, keywords: string[]): number {
    const words = content.toLowerCase().split(/\W+/);
    const matchedKeywords = keywords.filter(keyword => 
      words.includes(keyword.toLowerCase())
    );
    return (matchedKeywords.length / keywords.length) * 100;
  }

  public async getMovieAnalyses(movieId: string): Promise<Analysis[]> {
    try {
      const movie = await prisma.movie.findUnique({
        where: { id: movieId },
        include: {
          movieSentiments: {
            include: {
              mainSentiment: true,
              subSentiment: true
            }
          }
        }
      }) as MovieWithSentiments | null;

      if (!movie) {
        throw new Error('Filme não encontrado');
      }

      // Coletar todas as keywords dos sentimentos
      const keywords = movie.movieSentiment.flatMap(sentiment => [
        ...sentiment.mainSentiment.keywords,
        ...sentiment.subSentiment.keywords
      ]);

      // Buscar o ID do filme no TMDB
      const tmdbId = await this.searchTMDBMovie(movie.title, movie.year || undefined);
      if (!tmdbId) {
        console.log('Filme não encontrado no TMDB');
        return [];
      }

      // Buscar reviews do TMDB
      const reviews = await this.getTMDBReviews(tmdbId);
      
      // Calcular scores de sentimento para cada análise
      return reviews.map(review => ({
        ...review,
        score: this.calculateSentimentScore(review.content, keywords),
        matchedKeywords: keywords.filter(keyword => 
          review.content.toLowerCase().includes(keyword.toLowerCase())
        )
      }));
    } catch (error) {
      console.error('Erro ao buscar análises do filme:', error);
      return [];
    }
  }
} 

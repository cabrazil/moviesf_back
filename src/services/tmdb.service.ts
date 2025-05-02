import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TMDBConfig {
  images: {
    base_url: string;
    secure_base_url: string;
    backdrop_sizes: string[];
    logo_sizes: string[];
    poster_sizes: string[];
    profile_sizes: string[];
    still_sizes: string[];
  };
  change_keys: string[];
}

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  relevanceScore?: number;
}

export class TMDBService {
  private readonly baseUrl = 'https://api.themoviedb.org/3';
  private readonly apiKey: string;
  private readonly accessToken: string;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || '';
    this.accessToken = process.env.TMDB_ACCESS_TOKEN || '';
    
    if (!this.apiKey && !this.accessToken) {
      throw new Error('TMDB API credentials not found. Please set TMDB_API_KEY or TMDB_ACCESS_TOKEN in .env file');
    }
  }

  private getHeaders() {
    return {
      accept: 'application/json',
      Authorization: this.accessToken ? `Bearer ${this.accessToken}` : `Bearer ${this.apiKey}`
    };
  }

  private async getSentimentKeywords(sentimentName: string): Promise<string[]> {
    try {
      const sentiment = await prisma.mainSentiment.findFirst({
        where: { name: sentimentName },
        include: { subSentiments: true }
      });

      if (!sentiment) {
        return [];
      }

      // Combina as palavras-chave do sentimento principal e seus sub-sentimentos
      const keywords = [...sentiment.keywords];
      
      if (sentiment.subSentiments) {
        sentiment.subSentiments.forEach(sub => {
          keywords.push(...sub.keywords);
        });
      }

      return keywords.map(k => k.toLowerCase());
    } catch (error) {
      console.error('Erro ao buscar palavras-chave do sentimento:', error);
      return [];
    }
  }

  private calculateRelevanceScore(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    return keywords.reduce((score, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = lowerText.match(regex);
      return score + (matches ? matches.length : 0);
    }, 0);
  }

  async searchMoviesBySentiment(mainSentiment: string, subSentiment?: string): Promise<TMDBMovie[]> {
    try {
      // 1. Buscar filmes populares
      const popularMovies = await this.getPopularMovies();
      
      // 2. Obter palavras-chave dos sentimentos
      const mainKeywords = await this.getSentimentKeywords(mainSentiment);
      const subKeywords = subSentiment ? await this.getSentimentKeywords(subSentiment) : [];
      
      if (mainKeywords.length === 0) {
        throw new Error(`Sentimento principal "${mainSentiment}" não encontrado`);
      }
      
      // 3. Analisar cada filme
      const scoredMovies = popularMovies.results.map(movie => {
        const textToAnalyze = `${movie.title} ${movie.overview}`;
        
        // Calcular relevância baseada nas palavras-chave
        const mainScore = this.calculateRelevanceScore(textToAnalyze, mainKeywords);
        const subScore = subKeywords.length > 0 
          ? this.calculateRelevanceScore(textToAnalyze, subKeywords)
          : 0;
        
        return {
          ...movie,
          relevanceScore: mainScore + subScore
        };
      });
      
      // 4. Filtrar e ordenar por relevância
      return scoredMovies
        .filter(movie => movie.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
        
    } catch (error) {
      console.error('Erro ao buscar filmes por sentimento:', error);
      throw new Error('Falha ao buscar filmes por sentimento');
    }
  }

  async getConfiguration(): Promise<TMDBConfig> {
    try {
      const response = await axios.get(`${this.baseUrl}/configuration`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar configuração do TMDB:', error);
      throw new Error('Falha ao buscar configuração do TMDB');
    }
  }

  async searchMovies(query: string, page: number = 1): Promise<{
    results: TMDBMovie[];
    total_pages: number;
    total_results: number;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/search/movie`, {
        headers: this.getHeaders(),
        params: {
          query,
          page,
          language: 'pt-BR',
          include_adult: false
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar filmes:', error);
      throw new Error('Falha ao buscar filmes');
    }
  }

  async getMovieDetails(movieId: number): Promise<TMDBMovie> {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/${movieId}`, {
        headers: this.getHeaders(),
        params: {
          language: 'pt-BR'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar detalhes do filme:', error);
      throw new Error('Falha ao buscar detalhes do filme');
    }
  }

  async getPopularMovies(page: number = 1): Promise<{
    results: TMDBMovie[];
    total_pages: number;
    total_results: number;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/movie/popular`, {
        headers: this.getHeaders(),
        params: {
          page,
          language: 'pt-BR'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar filmes populares:', error);
      throw new Error('Falha ao buscar filmes populares');
    }
  }
} 
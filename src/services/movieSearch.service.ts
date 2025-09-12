import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface MovieSearchResult {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  poster_path: string;
}

export class MovieSearchService {
  private sentimentKeywords: Map<string, string[]> = new Map();

  constructor() {
    this.initializeSentimentKeywords();
  }

  private async initializeSentimentKeywords() {
    const mainSentiments = await prisma.mainSentiment.findMany({
      include: {
        subSentiments: true
      }
    });

    for (const main of mainSentiments) {
      const keywords = this.generateKeywordsForSentiment(main.name);
      this.sentimentKeywords.set(main.name, keywords);

      for (const sub of main.subSentiments) {
        const subKeywords = this.generateKeywordsForSentiment(sub.name);
        this.sentimentKeywords.set(sub.name, subKeywords);
      }
    }
  }

  private generateKeywordsForSentiment(sentiment: string): string[] {
    // Aqui você pode expandir com mais palavras-chave
    const keywordMap: { [key: string]: string[] } = {
      'Relaxamento e distração': ['leve', 'despreocupado', 'calmo', 'tranquilo', 'relaxante'],
      'Diversão e alegria': ['engraçado', 'divertido', 'alegre', 'feliz', 'risada'],
      'Emoções intensas': ['intenso', 'dramático', 'emocionante', 'impactante', 'profundo'],
      'Reflexão e aprendizado': ['reflexivo', 'profundo', 'filosófico', 'aprendizado', 'lição'],
      'Identificação e empatia': ['humano', 'real', 'verdadeiro', 'emocional', 'conexão'],
      'Sentimento de comunidade': ['família', 'amigos', 'união', 'juntos', 'compartilhado']
    };

    return keywordMap[sentiment] || [];
  }

  private calculateSentimentScore(text: string, keywords: string[]): number {
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    for (const keyword of keywords) {
      if (words.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    return score;
  }

  async searchMoviesBySentiment(mainSentiment: string, subSentiment?: string): Promise<MovieSearchResult[]> {
    try {
      // Buscar filmes populares do TMDB
      const response = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'pt-BR',
          page: 1
        }
      });

      const movies = (response.data as any).results;
      const mainKeywords = this.sentimentKeywords.get(mainSentiment) || [];
      const subKeywords = subSentiment ? this.sentimentKeywords.get(subSentiment) || [] : [];

      // Classificar filmes baseado nos sentimentos
      const scoredMovies = movies.map((movie: MovieSearchResult) => {
        const textToAnalyze = `${movie.title} ${movie.overview}`;
        const mainScore = this.calculateSentimentScore(textToAnalyze, mainKeywords);
        const subScore = subSentiment ? this.calculateSentimentScore(textToAnalyze, subKeywords) : 0;
        
        return {
          ...movie,
          sentimentScore: mainScore + subScore
        };
      });

      // Filtrar e ordenar por relevância
      return scoredMovies
        .filter((movie: any) => movie.sentimentScore > 0)
        .sort((a: any, b: any) => b.sentimentScore - a.sentimentScore)
        .slice(0, 10); // Retornar os 10 mais relevantes
    } catch (error) {
      console.error('Erro ao buscar filmes:', error);
      throw new Error('Erro ao buscar filmes');
    }
  }
} 
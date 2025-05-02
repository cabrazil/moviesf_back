import { PrismaClient, MainSentiment, SubSentiment } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';

dotenv.config();

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Cache para resultados de busca (5 minutos de expiração)
const searchCache = new NodeCache({ stdTTL: 300 });

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  popularity: number;
}

interface TMDBResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

interface MovieSearchResult {
  id: string;
  title: string;
  year: number;
  overview: string;
  sentimentScore: number;
  matchedKeywords: string[];
  streamingPlatforms: string[];
  popularity: number;
}

interface KeywordMatch {
  keyword: string;
  count: number;
  positions: number[];
}

class MovieSearchService {
  private async searchTMDB(query: string, page: number = 1): Promise<TMDBMovie[]> {
    const cacheKey = `tmdb_search_${query}_${page}`;
    const cachedResults = searchCache.get<TMDBMovie[]>(cacheKey);
    
    if (cachedResults) {
      console.log(`Using cached results for query: "${query}"`);
      return cachedResults;
    }

    try {
      console.log(`Searching TMDB for: "${query}" (page ${page})`);
      const response = await axios.get<TMDBResponse>(`${TMDB_BASE_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          query: query,
          language: 'en-US',
          include_adult: false,
          page: page
        }
      });
      
      const results = response.data.results;
      console.log(`Found ${results.length} results for "${query}"`);
      
      // Cache dos resultados
      searchCache.set(cacheKey, results);
      
      return results;
    } catch (error) {
      console.error('Error searching TMDB:', error);
      return [];
    }
  }

  private calculateSentimentScore(
    overview: string,
    keywords: string[]
  ): { score: number; matchedKeywords: KeywordMatch[] } {
    const overviewLower = overview.toLowerCase();
    const matchedKeywords: KeywordMatch[] = [];
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(keywordLower, 'g');
      const matches = [...overviewLower.matchAll(regex)];
      
      if (matches.length > 0) {
        const positions = matches.map(match => match.index || 0);
        matchedKeywords.push({
          keyword,
          count: matches.length,
          positions
        });
        console.log(`Matched keyword: "${keyword}" ${matches.length} times`);
      }
    }
    
    // Calcular score baseado em:
    // 1. Número de palavras-chave encontradas (40%)
    // 2. Frequência das palavras-chave (30%)
    // 3. Proximidade entre palavras-chave relacionadas (30%)
    const keywordScore = (matchedKeywords.length / keywords.length) * 40;
    const frequencyScore = matchedKeywords.reduce((sum, match) => 
      sum + (match.count / keywords.length) * 30, 0);
    
    let proximityScore = 0;
    if (matchedKeywords.length > 1) {
      const positions = matchedKeywords.flatMap(match => match.positions);
      positions.sort((a, b) => a - b);
      
      let totalDistance = 0;
      for (let i = 1; i < positions.length; i++) {
        totalDistance += positions[i] - positions[i - 1];
      }
      
      const avgDistance = totalDistance / (positions.length - 1);
      proximityScore = Math.max(0, 30 - (avgDistance / 100));
    }
    
    const totalScore = keywordScore + frequencyScore + proximityScore;
    console.log(`Score: ${totalScore.toFixed(2)}% (${matchedKeywords.length}/${keywords.length} keywords matched)`);
    
    return { score: totalScore, matchedKeywords };
  }

  private async getSentimentKeywords(sentimentId: number): Promise<string[]> {
    const cacheKey = `sentiment_keywords_${sentimentId}`;
    const cachedKeywords = searchCache.get<string[]>(cacheKey);
    
    if (cachedKeywords) {
      return cachedKeywords;
    }

    console.log(`Getting keywords for sentiment ID: ${sentimentId}`);
    const sentiment = await prisma.mainSentiment.findUnique({
      where: { id: sentimentId },
      include: {
        subSentiments: true
      }
    });

    if (!sentiment) {
      console.log('Sentiment not found');
      return [];
    }

    const allKeywords = [
      ...sentiment.keywords,
      ...sentiment.subSentiments.flatMap(sub => sub.keywords)
    ];

    const uniqueKeywords = [...new Set(allKeywords)];
    console.log(`Found ${uniqueKeywords.length} unique keywords for sentiment: ${sentiment.name}`);
    
    // Cache das palavras-chave
    searchCache.set(cacheKey, uniqueKeywords);
    
    return uniqueKeywords;
  }

  public async searchMoviesBySentiment(
    sentimentId: number,
    limit: number = 10
  ): Promise<MovieSearchResult[]> {
    try {
      console.log(`\nStarting search for sentiment ID: ${sentimentId}`);
      
      const keywords = await this.getSentimentKeywords(sentimentId);
      
      if (keywords.length === 0) {
        throw new Error('No keywords found for the given sentiment');
      }

      const searchResults: MovieSearchResult[] = [];
      const processedMovieIds = new Set<string>();
      
      // Buscar filmes em paralelo para cada palavra-chave
      const searchPromises = keywords.map(keyword => this.searchTMDB(keyword));
      const searchResultsArrays = await Promise.all(searchPromises);
      
      for (const tmdbMovies of searchResultsArrays) {
        for (const movie of tmdbMovies) {
          if (processedMovieIds.has(movie.id.toString())) {
            continue;
          }
          processedMovieIds.add(movie.id.toString());

          const { score, matchedKeywords } = this.calculateSentimentScore(
            movie.overview,
            keywords
          );

          if (score > 5) { // Reduzindo o threshold para incluir mais resultados
            searchResults.push({
              id: movie.id.toString(),
              title: movie.title,
              year: new Date(movie.release_date).getFullYear(),
              overview: movie.overview,
              sentimentScore: score,
              matchedKeywords: matchedKeywords.map(match => match.keyword),
              streamingPlatforms: [], // TODO: Integrar com serviço de streaming
              popularity: movie.popularity
            });
          }
        }
      }

      // Ordenar por score e popularidade
      const sortedResults = searchResults
        .sort((a, b) => {
          if (b.sentimentScore !== a.sentimentScore) {
            return b.sentimentScore - a.sentimentScore;
          }
          return b.popularity - a.popularity;
        })
        .slice(0, limit);

      console.log(`\nFound ${sortedResults.length} movies for sentiment ID: ${sentimentId}`);
      return sortedResults;

    } catch (error) {
      console.error('Error searching movies by sentiment:', error);
      return [];
    }
  }
}

export const movieSearchService = new MovieSearchService(); 
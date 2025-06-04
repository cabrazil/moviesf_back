import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  runtime: number;
}

interface TMDBResponse {
  results: TMDBMovie[];
}

async function searchMovieInTMDB(title: string, year?: number): Promise<TMDBMovie | null> {
  try {
    console.log(`\n🔍 Buscando no TMDB: ${title}${year ? ` (${year})` : ''}`);
    
    // Remover o ano do título se existir
    const cleanTitle = title.replace(/\s*\d{4}$/, '').trim();
    
    // Tentar primeiro com o título em português
    let response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR',
        query: cleanTitle,
        year: year,
        page: 1
      }
    });

    if (response.data.results.length === 0) {
      console.log(`Nenhum resultado encontrado para: ${title}`);
      return null;
    }

    // Função para calcular similaridade entre strings
    function calculateSimilarity(str1: string, str2: string): number {
      const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
      const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (s1.includes(s2) || s2.includes(s1)) {
        return 0.8;
      }
      
      const words1 = s1.split(/\s+/);
      const words2 = s2.split(/\s+/);
      const commonWords = words1.filter(word => words2.includes(word));
      
      return commonWords.length / Math.max(words1.length, words2.length);
    }

    // Encontrar o filme mais similar
    const movie = response.data.results.find(m => {
      const releaseYear = m.release_date ? parseInt(m.release_date.split('-')[0]) : null;
      
      if (year && releaseYear !== year) {
        return false;
      }

      const titleSimilarity = calculateSimilarity(cleanTitle, m.title);
      const originalTitleSimilarity = calculateSimilarity(cleanTitle, m.original_title);
      
      return titleSimilarity > 0.6 || originalTitleSimilarity > 0.6;
    });

    if (!movie) {
      console.log(`Filme exato não encontrado para: ${title}`);
      return null;
    }

    // Buscar detalhes completos do filme para obter o runtime
    const details = await axios.get<TMDBMovie>(`${TMDB_API_URL}/movie/${movie.id}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR'
      }
    });

    return details.data;
  } catch (error) {
    console.error(`Erro ao buscar filme ${title}:`, error);
    return null;
  }
}

async function updateMovieRuntime() {
  try {
    // Buscar todos os filmes que não têm runtime
    const movies = await prisma.movie.findMany({
      where: {
        runtime: null
      }
    });

    console.log(`Encontrados ${movies.length} filmes sem runtime`);

    for (const movie of movies) {
      console.log(`\nProcessando: ${movie.title} (${movie.year})`);
      
      const tmdbMovie = await searchMovieInTMDB(movie.title, movie.year || undefined);
      
      if (tmdbMovie && tmdbMovie.runtime) {
        console.log(`Runtime encontrado: ${tmdbMovie.runtime} minutos`);
        
        await prisma.movie.update({
          where: { id: movie.id },
          data: { runtime: tmdbMovie.runtime }
        });
        
        console.log(`✅ Runtime atualizado para: ${movie.title}`);
      } else {
        console.log(`❌ Runtime não encontrado para: ${movie.title}`);
      }

      // Aguardar 1 segundo entre as requisições para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\nProcesso finalizado!');
  } catch (error) {
    console.error('Erro ao atualizar runtime dos filmes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
updateMovieRuntime(); 
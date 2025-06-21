import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { searchMovie } from './populateMovies';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

interface TMDBMovieDetails {
  id: number;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  release_dates: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{
        certification: string;
        type: number;
      }>;
    }>;
  };
}

interface TMDBKeywordsResponse {
  keywords: Array<{
    id: number;
    name: string;
  }>;
}

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  adult: boolean;
}

interface TMDBResponse {
  results: TMDBMovie[];
}

interface TMDBMovieCredits {
  crew: Array<{
    id: number;
    name: string;
    job: string;
  }>;
}

interface GoogleTranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
    }>;
  };
}

async function translateText(text: string): Promise<string> {
  try {
    const response = await axios.post<GoogleTranslateResponse>(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        q: text,
        source: 'en',
        target: 'pt',
        format: 'text'
      }
    );

    return response.data.data.translations[0].translatedText;
  } catch (error) {
    console.error(`Erro ao traduzir texto "${text}":`, error);
    return text; // Retorna o texto original em caso de erro
  }
}

async function getMovieKeywords(movieId: number): Promise<string[]> {
  try {
    const response = await axios.get<TMDBKeywordsResponse>(`${TMDB_API_URL}/movie/${movieId}/keywords`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });

    // Obter as palavras-chave em inglês
    const englishKeywords = response.data.keywords.map(keyword => keyword.name);

    // Traduzir cada palavra-chave para português
    const translatedKeywords = await Promise.all(
      englishKeywords.map(async (keyword) => {
        try {
          const translated = await translateText(keyword);
          console.log(`Traduzindo: "${keyword}" -> "${translated}"`);
          return translated;
        } catch (error) {
          console.error(`Erro ao traduzir palavra-chave "${keyword}":`, error);
          return keyword;
        }
      })
    );

    return translatedKeywords;
  } catch (error) {
    console.error(`Erro ao buscar palavras-chave para o filme ID ${movieId}:`, error);
    return [];
  }
}

async function findMovieInTMDB(title: string, year: number | null, director: string | null): Promise<TMDBMovie | null> {
  try {
    console.log(`\n🔍 Buscando no TMDB:`);
    console.log(`   - Título: ${title}`);
    console.log(`   - Ano: ${year}`);
    console.log(`   - Diretor: ${director}`);

    // Primeira busca com o título original
    const response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        query: title,
        year: year,
        language: 'pt-BR'
      }
    });

    console.log(`   - Total de resultados encontrados: ${response.data.results.length}`);

    if (response.data.results.length === 0) {
      console.log(`   ❌ Nenhum resultado encontrado para: ${title}`);
      return null;
    }

    // Filtrar resultados pelo ano e título
    const matchingMovies = response.data.results.filter(movie => {
      const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null;
      const matches = (!year || releaseYear === year) && 
             (movie.original_title.toLowerCase() === title.toLowerCase() || 
              movie.title.toLowerCase() === title.toLowerCase());
      
      if (matches) {
        console.log(`   ✅ Match encontrado: ${movie.title} (${releaseYear})`);
      }
      
      return matches;
    });

    console.log(`   - Filmes que correspondem ao título e ano: ${matchingMovies.length}`);

    if (matchingMovies.length === 0) {
      console.log(`   ❌ Nenhum filme exato encontrado para: ${title}`);
      return null;
    }

    // Se temos mais de um resultado e temos o diretor, tentar filtrar por ele
    if (matchingMovies.length > 1 && director) {
      console.log(`   🔍 Filtrando por diretor: ${director}`);
      
      for (const movie of matchingMovies) {
        // Buscar créditos do filme para verificar o diretor
        const creditsResponse = await axios.get<TMDBMovieCredits>(`${TMDB_API_URL}/movie/${movie.id}/credits`, {
          params: {
            api_key: TMDB_API_KEY,
            language: 'pt-BR'
          }
        });

        const directors = creditsResponse.data.crew
          .filter(person => person.job === 'Director')
          .map(person => person.name);

        console.log(`   - Diretores encontrados para ${movie.title}: ${directors.join(', ')}`);

        if (directors.some(d => d === director)) {
          console.log(`   ✅ Match encontrado com diretor: ${movie.title}`);
          return movie;
        }
      }
    }

    // Se não encontrou pelo diretor ou não temos diretor, retornar o primeiro resultado
    console.log(`   ℹ️ Retornando primeiro match: ${matchingMovies[0].title}`);
    return matchingMovies[0];
  } catch (error) {
    console.error(`   ❌ Erro ao buscar filme ${title}:`, error);
    return null;
  }
}

async function getBrazilianCertification(movieId: number): Promise<string | null> {
  try {
    const response = await axios.get<TMDBMovieDetails>(`${TMDB_API_URL}/movie/${movieId}`, {
      params: {
        api_key: TMDB_API_KEY,
        append_to_response: 'release_dates',
        language: 'pt-BR'
      }
    });

    const brazilRelease = response.data.release_dates.results.find(
      release => release.iso_3166_1 === 'BR'
    );

    if (!brazilRelease || !brazilRelease.release_dates.length) {
      return null;
    }

    // Priorizar certificação do cinema (type: 3)
    const cinemaRelease = brazilRelease.release_dates.find(
      release => release.type === 3
    );

    // Se não encontrar certificação do cinema, usar a primeira disponível
    const certification = cinemaRelease?.certification || brazilRelease.release_dates[0].certification;

    return certification || null;
  } catch (error) {
    console.error(`Erro ao buscar certificação para o filme ID ${movieId}:`, error);
    return null;
  }
}

async function updateMovieMetadata(movieId: string) {
  try {
    console.log(`\n=== Atualizando metadados do filme ${movieId} ===`);
    
    // Buscar o filme no banco
    const movie = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (!movie) {
      console.log(`❌ Filme não encontrado: ${movieId}`);
      return;
    }

    console.log(`📽️ Filme encontrado: ${movie.title} (${movie.year})`);
    console.log(`📊 Estado atual:`);
    console.log(`   - Director: ${movie.director || '❌ Faltando'}`);
    console.log(`   - Description: ${movie.description ? '✅ Preenchido' : '❌ Faltando'}`);
    console.log(`   - Thumbnail: ${movie.thumbnail ? '✅ Preenchido' : '❌ Faltando'}`);
    console.log(`   - Original Title: ${movie.original_title || '❌ Faltando'}`);
    console.log(`   - Certification: ${movie.certification || '❌ Faltando'}`);
    console.log(`   - Keywords: ${movie.keywords.length > 0 ? `✅ ${movie.keywords.length} keywords` : '❌ Faltando'}`);
    console.log(`   - Streaming Platforms: ${movie.streamingPlatforms.length > 0 ? `✅ ${movie.streamingPlatforms.length} plataformas` : '❌ Faltando'}`);
    console.log(`   - Genre IDs: ${movie.genreIds ? '✅ Preenchido' : '❌ Faltando'}`);

    // Buscar informações completas no TMDB
    console.log(`\n🔍 Buscando informações no TMDB...`);
    const tmdbData = await searchMovie(movie.title, movie.year || undefined);

    if (!tmdbData) {
      console.log(`❌ Filme não encontrado no TMDB: ${movie.title}`);
      return;
    }

    console.log(`✅ Dados do TMDB obtidos com sucesso!`);

    // Preparar dados para atualização
    const updateData: any = {};

    // Atualizar diretor se estiver faltando
    if (!movie.director && tmdbData.director) {
      updateData.director = tmdbData.director;
      console.log(`📝 Diretor: ${tmdbData.director}`);
    }

    // Atualizar descrição se estiver faltando
    if (!movie.description && tmdbData.movie.overview) {
      updateData.description = tmdbData.movie.overview;
      console.log(`📝 Descrição: ${tmdbData.movie.overview.substring(0, 100)}...`);
    }

    // Atualizar thumbnail se estiver faltando
    if (!movie.thumbnail && tmdbData.movie.poster_path) {
      updateData.thumbnail = `https://image.tmdb.org/t/p/w500${tmdbData.movie.poster_path}`;
      console.log(`📝 Thumbnail: ${updateData.thumbnail}`);
    }

    // Atualizar título original se estiver faltando
    if (!movie.original_title && tmdbData.movie.original_title) {
      updateData.original_title = tmdbData.movie.original_title;
      console.log(`📝 Título Original: ${tmdbData.movie.original_title}`);
    }

    // Atualizar certificação se estiver faltando
    if (!movie.certification && tmdbData.certification) {
      updateData.certification = tmdbData.certification;
      console.log(`📝 Certificação: ${tmdbData.certification}`);
    }

    // Atualizar keywords se estiverem faltando
    if (movie.keywords.length === 0 && tmdbData.keywords.length > 0) {
      updateData.keywords = tmdbData.keywords;
      console.log(`📝 Keywords: ${tmdbData.keywords.join(', ')}`);
    }

    // Atualizar plataformas de streaming se estiverem faltando
    if (movie.streamingPlatforms.length === 0 && tmdbData.platforms.length > 0) {
      updateData.streamingPlatforms = tmdbData.platforms;
      console.log(`📝 Plataformas: ${tmdbData.platforms.join(', ')}`);
    }

    // Atualizar genre IDs se estiverem faltando
    if (!movie.genreIds && tmdbData.movie.genres.length > 0) {
      updateData.genreIds = tmdbData.movie.genres.map(g => g.id);
      console.log(`📝 Genre IDs: ${updateData.genreIds.join(', ')}`);
    }

    // Verificar se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      console.log(`✅ Filme já está com todas as informações preenchidas!`);
      return;
    }

    // Atualizar o filme no banco
    console.log(`\n💾 Atualizando filme no banco de dados...`);
    const updatedMovie = await prisma.movie.update({
      where: { id: movieId },
      data: updateData
    });

    console.log(`✅ Filme atualizado com sucesso!`);
    console.log(`\n📊 Estado final:`);
    console.log(`   - Director: ${updatedMovie.director || '❌ Faltando'}`);
    console.log(`   - Description: ${updatedMovie.description ? '✅ Preenchido' : '❌ Faltando'}`);
    console.log(`   - Thumbnail: ${updatedMovie.thumbnail ? '✅ Preenchido' : '❌ Faltando'}`);
    console.log(`   - Original Title: ${updatedMovie.original_title || '❌ Faltando'}`);
    console.log(`   - Certification: ${updatedMovie.certification || '❌ Faltando'}`);
    console.log(`   - Keywords: ${updatedMovie.keywords.length > 0 ? `✅ ${updatedMovie.keywords.length} keywords` : '❌ Faltando'}`);
    console.log(`   - Streaming Platforms: ${updatedMovie.streamingPlatforms.length > 0 ? `✅ ${updatedMovie.streamingPlatforms.length} plataformas` : '❌ Faltando'}`);
    console.log(`   - Genre IDs: ${updatedMovie.genreIds ? '✅ Preenchido' : '❌ Faltando'}`);

  } catch (error) {
    console.error('Erro ao atualizar metadados do filme:', error);
  }
}

async function main() {
  // ID do filme Imperdoável
  const movieId = "231f993f-9fd4-4255-9d04-540b9a666145";
  
  await updateMovieMetadata(movieId);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
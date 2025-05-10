import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

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

async function updateMovieMetadata() {
  try {
    console.log('Iniciando atualização dos metadados dos filmes...');

    // Primeiro, vamos contar o total de filmes na tabela
    const totalMovies = await prisma.movie.count();
    console.log(`Total de filmes na tabela: ${totalMovies}`);

    // Buscar todos os filmes
    const movies = await prisma.movie.findMany();

    console.log(`Encontrados ${movies.length} filmes para processar`);

    let successCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    for (const movie of movies) {
      try {
        console.log(`\n=== Processando filme ${successCount + errorCount + notFoundCount + 1}/${movies.length} ===`);
        console.log(`Título: ${movie.title}`);
        console.log(`Título original: ${movie.original_title}`);
        console.log(`Ano: ${movie.year}`);
        console.log(`Diretor: ${movie.director}`);

        // Buscar filme no TMDB
        const tmdbMovie = await findMovieInTMDB(
          movie.original_title || movie.title,
          movie.year,
          movie.director
        );

        if (!tmdbMovie) {
          console.log(`❌ Filme não encontrado no TMDB: ${movie.title}`);
          notFoundCount++;
          continue;
        }

        // Buscar certificação brasileira
        const certification = await getBrazilianCertification(tmdbMovie.id);

        // Buscar palavras-chave
        const keywords = await getMovieKeywords(tmdbMovie.id);

        // Atualizar o filme no banco de dados
        await prisma.movie.update({
          where: { id: movie.id },
          data: {
            vote_average: tmdbMovie.vote_average,
            vote_count: tmdbMovie.vote_count,
            adult: tmdbMovie.adult,
            certification: certification,
            keywords: keywords
          }
        });

        console.log(`✅ Filme atualizado: ${movie.title}`);
        console.log(`   - Média de votos: ${tmdbMovie.vote_average}`);
        console.log(`   - Total de votos: ${tmdbMovie.vote_count}`);
        console.log(`   - Adulto: ${tmdbMovie.adult}`);
        console.log(`   - Certificação: ${certification || 'Não disponível'}`);
        console.log(`   - Palavras-chave: ${keywords.join(', ') || 'Nenhuma'}`);

        successCount++;
      } catch (error) {
        console.error(`❌ Erro ao atualizar filme ${movie.title}:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Resumo da Atualização ===');
    console.log(`Total de filmes processados: ${movies.length}`);
    console.log(`Sucessos: ${successCount}`);
    console.log(`Erros: ${errorCount}`);
    console.log(`Não encontrados: ${notFoundCount}`);

  } catch (error) {
    console.error('Erro durante a atualização:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
updateMovieMetadata();
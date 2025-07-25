import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Configurar o Prisma Client da forma mais simples possível
const prisma = new PrismaClient();

// --- OMDb Types ---
interface OmdbRating {
  Source: string;
  Value: string;
}

interface OmdbMovieResponse {
  Title: string;
  Year: string;
  Response: 'True' | 'False';
  Error?: string;
  Ratings?: OmdbRating[];
}

interface ExternalIdsResponse {
  imdb_id: string | null;
}

/**
 * Parses a rating string (e.g., "8.5/10", "95%") and returns a number.
 */
function parseRating(source: string, value: string): number | null {
  try {
    if (source === 'Internet Movie Database') return parseFloat(value.split('/')[0]);
    if (source === 'Rotten Tomatoes') return parseInt(value.replace('%', ''), 10);
    if (source === 'Metacritic') return parseInt(value.split('/')[0], 10);
    return null;
  } catch (error) {
    console.error(`Error parsing rating from ${source} with value "${value}":`, error);
    return null;
  }
}

/**
 * Fetches the IMDb ID for a given TMDB movie ID.
 */
async function getImdbId(tmdbId: number): Promise<string | null> {
  if (!TMDB_API_KEY) {
    console.error('TMDB API key is not configured.');
    return null;
  }
  try {
    const response = await axios.get<ExternalIdsResponse>(`${TMDB_API_URL}/movie/${tmdbId}/external_ids`, {
      params: { api_key: TMDB_API_KEY }
    });
    return response.data.imdb_id;
  } catch (error) {
    console.error(`Error fetching IMDb ID for TMDB ID ${tmdbId}:`, error);
    return null;
  }
}

/**
 * Fetches movie ratings from OMDb using the IMDb ID.
 */
async function getOmdbRatings(imdbId: string): Promise<Record<string, number>> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    console.error('OMDb API key is not set.');
    return {};
  }

  try {
    const response = await axios.get<OmdbMovieResponse>('http://www.omdbapi.com/', {
      params: { i: imdbId, apikey: apiKey }
    });

    if (response.data.Response === 'False' || !response.data.Ratings) {
      return {};
    }

    const ratings: Record<string, number> = {};
    for (const rating of response.data.Ratings) {
      const numericValue = parseRating(rating.Source, rating.Value);
      if (numericValue === null) continue;

      if (rating.Source === 'Internet Movie Database') ratings.imdbRating = numericValue;
      else if (rating.Source === 'Rotten Tomatoes') ratings.rottenTomatoesRating = numericValue;
      else if (rating.Source === 'Metacritic') ratings.metacriticRating = numericValue;
    }
    return ratings;
  } catch (error) {
    console.error(`Error fetching OMDb ratings for IMDb ID ${imdbId}:`, error);
    return {};
  }
}


const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

interface TMDBMovie {
  id: string;
  title: string;
  original_title: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  poster_path: string | null;
  overview: string;
  genres: { id: number; name: string }[];
  genre_ids?: number[];
  director?: string | null;
  runtime?: number;
  popularity?: number;
}

interface TMDBMovieDetails {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  poster_path: string | null;
  overview: string;
  genres: { id: number; name: string }[];
  keywords: { id: number; name: string }[];
  release_dates: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{
        certification: string;
        type: number;
        release_date: string;
      }>;
    }>;
  };
  runtime: number;
}

interface TMDBResponse {
  results: TMDBMovie[];
}

interface MovieInput {
  title: string;
  year?: number; // Ano opcional para ajudar na busca
}

interface TMDBWatchProvidersResponse {
  results: {
    BR?: {
      flatrate?: Array<{
        provider_name: string;
      }>;
      rent?: Array<{
        provider_name: string;
      }>;
      buy?: Array<{
        provider_name: string;
      }>;
    };
  };
}

interface TMDBKeywordsResponse {
  keywords: Array<{
    id: number;
    name: string;
  }>;
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

const titleMapping: { [key: string]: string } = {
  'Como Perder um Cara em Dez Dias': 'How to Lose a Guy in 10 Days',
  'De Volta para o Futuro': 'Back to the Future',
  'Curtindo a Vida Adoidado': 'Ferris Bueller\'s Day Off',
  'As Patricinhas de Beverly Hills': 'Clueless',
  'O Clube dos Cinco': 'The Breakfast Club',
  'Dirty Dancing: Ritmo Quente': 'Dirty Dancing',
  'Menina de Ouro': 'Million Dollar Baby',
  'Um Sonho Possível': 'The Blind Side',
  'Karatê Kid': 'The Karate Kid',
  'O Homem que Mudou o Jogo': 'Moneyball',
  'Soul': 'Soul 2020',
  'Fora de Rumo': 'Off the Map',
  'O Homem das Trevas': 'The Dark Man'
};

// Mapeamento de gêneros para reflexões
const genreReflections: { [key: string]: string } = {
  // ... remover todo o objeto ...
};

// Mapeamento de plataformas do TMDB para nosso padrão
const platformMapping: { [key: string]: string } = {
  'Netflix': 'Netflix',
  'Prime Video': 'Prime Video',
  'Amazon Prime Video': 'Prime Video',
  'Amazon Video': 'Prime Video',
  'Disney Plus': 'Disney+',
  'Disney+': 'Disney+',
  'HBO Max': 'Max',
  'Max': 'Max',
  'Max Amazon Channel': 'Max',
  'Apple TV Plus': 'Apple TV+',
  'Apple TV+': 'Apple TV+',
  'Paramount Plus': 'Paramount+',
  'Paramount+': 'Paramount+',
  'Peacock': 'Peacock',
  'Hulu': 'Hulu',
  'YouTube': 'YouTube',
  'Google Play Movies': 'Google Play',
  'Google Play': 'Google Play',
  'Apple iTunes': 'Apple iTunes',
  'Vudu': 'Vudu',
  'Microsoft Store': 'Microsoft Store'
};

// Adicionar mais keywords ao mapeamento
const commonKeywordsMapping: { [key: string]: string } = {
  'aftercreditsstinger': 'cena pós-créditos',
  'woman director': 'diretora',
  'loving': 'amoroso',
  'photographer': 'fotógrafo',
  'commercial': 'comercial',
  'karaoke': 'karaokê',
  'hotel room': 'quarto de hotel',
  'upper class': 'alta sociedade',
  'pop star': 'estrela pop',
  'homesickness': 'saudade de casa',
  'adultery': 'adultério',
  'unsociability': 'antissocial',
  'older man younger woman relationship': 'relacionamento com diferença de idade',
  'unlikely friendship': 'amizade improvável',
  'culture clash': 'choque cultural',
  'age difference': 'diferença de idade',
  'midlife crisis': 'crise dos 40',
  'jet lag': 'jet lag',
  'loneliness': 'solidão',
  'tokyo': 'tóquio',
  'japan': 'japão'
};

async function getMovieStreamingInfo(movieId: number): Promise<string[]> {
  try {
    const response = await axios.get<TMDBWatchProvidersResponse>(`${TMDB_API_URL}/movie/${movieId}/watch/providers`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });

    // Log para debug
    // console.log('Provedores TMDB:', JSON.stringify(response.data.results?.BR, null, 2));

    // Pegar todos os tipos de provedores (flatrate, rent, buy)
    const allProviders = [
      ...(response.data.results?.BR?.flatrate || []),
      ...(response.data.results?.BR?.rent || [])
    ];

    // Mapear e filtrar provedores únicos
    const mappedProviders = allProviders
      .map(provider => {
        // Log para debug
        console.log(`Mapeando provedor: ${provider.provider_name}`);
        return platformMapping[provider.provider_name];
      })
      .filter(Boolean);

    // Remover duplicatas
    return [...new Set(mappedProviders)];
  } catch (error) {
    console.error(`Erro ao buscar informações de streaming: ${error}`);
    return [];
  }
}

async function getMovieDirectors(movieId: number): Promise<string | null> {
  try {
    const response = await axios.get<TMDBMovieCredits>(`${TMDB_API_URL}/movie/${movieId}/credits`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR'
      }
    });

    // Pegar todos os diretores
    const directors = response.data.crew
      .filter(person => person.job === 'Director')
      .map(person => person.name);

    // Se não encontrar diretores, retorna null
    if (directors.length === 0) {
      return null;
    }

    // Retorna os diretores separados por vírgula
    return directors.join(', ');
  } catch (error) {
    console.error(`Erro ao buscar diretores do filme ID ${movieId}:`, error);
    return null;
  }
}

async function getBrazilianCertification(movieId: number): Promise<string | null> {
  try {
    console.log(`Buscando certificação para o filme ID ${movieId}...`);
    
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

    if (!brazilRelease) {
      console.log('Nenhuma certificação brasileira encontrada');
      return null;
    }

    if (!brazilRelease.release_dates.length) {
      console.log('Lista de datas de lançamento vazia para o Brasil');
      return null;
    }

    // Ordenar por data de lançamento (mais recente primeiro) e filtrar certificações vazias
    const validReleases = brazilRelease.release_dates
      .filter(release => release.certification && release.certification.trim() !== '')
      .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());

    if (validReleases.length === 0) {
      console.log('Nenhuma certificação válida encontrada');
      return null;
    }

    // Priorizar certificação do cinema (type: 3)
    const cinemaRelease = validReleases.find(release => release.type === 3);
    if (cinemaRelease) {
      console.log(`Certificação do cinema encontrada: ${cinemaRelease.certification}`);
      return cinemaRelease.certification;
    }

    // Se não encontrar certificação do cinema, usar a mais recente
    const mostRecentRelease = validReleases[0];
    console.log(`Usando certificação mais recente: ${mostRecentRelease.certification}`);
    return mostRecentRelease.certification;

  } catch (error: any) {
    console.error(`Erro ao buscar certificação para o filme ID ${movieId}:`, error);
    if (error.response) {
      console.error('Detalhes do erro:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    return null;
  }
}

async function translateText(text: string): Promise<string> {
  try {
    // Primeiro verificar se temos um mapeamento direto
    const lowerText = text.toLowerCase();
    if (commonKeywordsMapping[lowerText]) {
      return commonKeywordsMapping[lowerText];
    }

    // Se não tiver mapeamento, tentar a API com retry
    const maxRetries = 3;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.post<GoogleTranslateResponse>(
          `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
          {
            q: text,
            source: 'en',
            target: 'pt',
            format: 'text'
          },
          {
            timeout: 5000, // 5 segundos de timeout
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );

        return response.data.data.translations[0].translatedText;
      } catch (error: any) {
        lastError = error;
        console.error(`Tentativa ${i + 1} falhou:`, error.message);
        
        // Se não for o último retry, espera um pouco antes de tentar novamente
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Se todas as tentativas falharem, retorna o texto original
    console.error(`Todas as tentativas de tradução falharam para "${text}":`, lastError);
    return text;
  } catch (error) {
    console.error(`Erro ao traduzir texto "${text}":`, error);
    return text;
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

    // Primeiro tentar usar o mapeamento direto
    const translatedKeywords = englishKeywords.map(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      return commonKeywordsMapping[lowerKeyword] || keyword;
    });

    // Se houver keywords que não foram mapeadas, tentar traduzir via API
    const unmappedKeywords = translatedKeywords.filter(keyword => 
      !Object.values(commonKeywordsMapping).includes(keyword)
    );

    if (unmappedKeywords.length > 0) {
      try {
        const translatedUnmapped = await Promise.all(
          unmappedKeywords.map(async (keyword) => {
            try {
              const translated = await translateText(keyword);
              return translated;
            } catch (error) {
              console.error(`Erro ao traduzir palavra-chave "${keyword}":`, error);
              return keyword;
            }
          })
        );

        // Substituir as keywords não mapeadas pelas traduzidas
        return translatedKeywords.map(keyword => 
          unmappedKeywords.includes(keyword) 
            ? translatedUnmapped[unmappedKeywords.indexOf(keyword)]
            : keyword
        );
      } catch (error) {
        console.error('Erro na tradução via API, usando mapeamento direto:', error);
        return translatedKeywords;
      }
    }

    return translatedKeywords;
  } catch (error) {
    console.error(`Erro ao buscar palavras-chave para o filme ID ${movieId}:`, error);
    return [];
  }
}

export async function searchMovie(title?: string, year?: number, tmdbId?: number): Promise<{ movie: TMDBMovie; platforms: string[]; director: string | null; certification: string | null; keywords: string[] } | null> {
  try {
    if (tmdbId) {
      console.log(`Buscando filme no TMDB pelo ID: ${tmdbId}`);
      const detailsResponse = await axios.get<TMDBMovieDetails>(`${TMDB_API_URL}/movie/${tmdbId}`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'pt-BR'
        }
      });

      const movieDetails = detailsResponse.data;

      const directors = await getMovieDirectors(tmdbId);
      const keywords = await getMovieKeywords(tmdbId);
      const platforms = await getMovieStreamingInfo(tmdbId);
      const certification = await getBrazilianCertification(tmdbId);

      return {
        movie: {
          id: movieDetails.id.toString(),
          title: movieDetails.title,
          original_title: movieDetails.original_title,
          release_date: movieDetails.release_date,
          vote_average: movieDetails.vote_average,
          vote_count: movieDetails.vote_count,
          adult: movieDetails.adult,
          poster_path: movieDetails.poster_path,
          overview: movieDetails.overview,
          genres: movieDetails.genres,
          runtime: movieDetails.runtime,
        },
        platforms,
        director: directors || null,
        certification,
        keywords
      };
    }

    if (!title) {
      console.log('Título não fornecido para busca por título/ano.');
      return null;
    }

    console.log(`Buscando filme no TMDB: ${title}${year ? ` (${year})` : ''}`);
    
    // Remover o ano do título se existir, a menos que o próprio título seja o ano
    let cleanTitle = title.trim();
    if (!/^\d{4}$/.test(cleanTitle)) {
        cleanTitle = cleanTitle.replace(/\s*\d{4}$/, '').trim();
    }
    
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

    // Se não encontrar, traduzir para inglês e tentar novamente, a menos que o título seja numérico
    if (response.data.results.length === 0 && isNaN(Number(cleanTitle))) {
      console.log(`Traduzindo título para inglês...`);
      const translatedTitle = await translateText(cleanTitle);
      console.log(`Título traduzido: ${translatedTitle}`);

      if (translatedTitle && translatedTitle.toLowerCase() !== cleanTitle.toLowerCase()) {
        response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
          params: {
            api_key: TMDB_API_KEY,
            language: 'pt-BR',
            query: translatedTitle,
            year: year,
            page: 1
          },
        });
      }
    }

    // Se ainda não encontrar, tentar uma busca mais flexível
    if (response.data.results.length === 0) {
      console.log(`Tentando busca mais flexível para: ${cleanTitle}`);
      response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'pt-BR',
          query: cleanTitle,
          page: 1
        }
      });
    }

    if (response.data.results.length === 0) {
      console.log(`Nenhum resultado encontrado para: ${title}`);
      return null;
    }

    // Mostrar resultados encontrados
    console.log('\nResultados encontrados:');
    response.data.results.slice(0, 5).forEach((movie, index) => {
      const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 'N/A';
      console.log(`${index + 1}. ${movie.title} (${movie.original_title}) - ${releaseYear}`);
    });

    // Função para calcular similaridade entre strings
    function calculateSimilarity(str1: string, str2: string): number {
      const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
      const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Se uma string contém a outra, retorna alta similaridade
      if (s1.includes(s2) || s2.includes(s1)) {
        return 0.8;
      }
      
      // Contar palavras em comum
      const words1 = s1.split(/\s+/);
      const words2 = s2.split(/\s+/);
      const commonWords = words1.filter(word => words2.includes(word));
      
      return commonWords.length / Math.max(words1.length, words2.length);
    }

    // Verificar se encontramos o filme correto
    const movie = response.data.results.find(m => {
      const releaseYear = m.release_date ? parseInt(m.release_date.split('-')[0]) : null;
      
      // Verificar se o ano corresponde
      if (year && releaseYear !== year) {
        return false;
      }

      // Calcular similaridade entre os títulos
      const titleSimilarity = calculateSimilarity(cleanTitle, m.title);
      const originalTitleSimilarity = calculateSimilarity(cleanTitle, m.original_title);
      
      // Se a similaridade for alta o suficiente, considera como match
      const isMatch = titleSimilarity > 0.6 || originalTitleSimilarity > 0.6;
      
      if (isMatch) {
        console.log(`Match encontrado: ${m.title} (similaridade: ${Math.max(titleSimilarity, originalTitleSimilarity).toFixed(2)})`);
      }

      return isMatch;
    });

    if (!movie) {
      console.log(`Filme exato não encontrado para: ${title}`);
      return null;
    }

    // Verificar a média de votos
    if (movie.vote_average < 6.0) {
      console.log(`❌ Filme rejeitado: ${movie.title} - Média de votos muito baixa (${movie.vote_average})`);
      return null;
    }

    console.log(`Filme encontrado: ${movie.title} (ID: ${movie.id})`);
    
    // Buscar detalhes completos do filme
    const details = await axios.get<TMDBMovieDetails>(`${TMDB_API_URL}/movie/${movie.id}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR'
      }
    });

    if (!details.data) {
      console.log(`Detalhes do filme não encontrados para: ${movie.title}`);
      return null;
    }

    // Buscar os diretores
    const directors = await getMovieDirectors(parseInt(movie.id));
    if (directors) {
      console.log(`Diretores encontrados: ${directors}`);
    }

    // Buscar palavras-chave
    const keywords = await getMovieKeywords(parseInt(movie.id));
    console.log(`Palavras-chave encontradas: ${keywords.join(', ')}`);
    
    // Buscar informações de streaming
    const platforms = await getMovieStreamingInfo(parseInt(movie.id));
    
    // Buscar certificação brasileira
    const certification = await getBrazilianCertification(parseInt(movie.id));

    // Log da duração do filme
    console.log(`Duração: ${details.data.runtime} minutos`);

    return {
      movie: { ...movie, id: movie.id.toString(), genres: details.data.genres, runtime: details.data.runtime },
      platforms,
      director: directors || null,
      certification,
      keywords
    };
  } catch (error) {
    console.error(`Erro ao buscar filme ${title}:`, error);
    return null;
  }
}

async function processSingleMovie(title: string, year?: number) {
  console.log(`\n=== Processando filme: ${title}${year ? ` (${year})` : ''} ===`);

  try {
    const movieResult = await searchMovie(title, year);

    if (movieResult) {
      const { movie, platforms, director, certification, keywords } = movieResult;
      console.log(`Filme encontrado no TMDB: ${movie.title} (${movie.release_date})`);
      console.log(`Título original: ${movie.original_title}`);
      console.log(`Diretores: ${director || 'Não encontrado'}`);
      console.log(`Plataformas encontradas: ${platforms.join(', ')}`);
      console.log(`Certificação: ${certification || 'Não disponível'}`);
      console.log(`Palavras-chave: ${keywords.join(', ')}`);
      console.log(`Média de votos: ${movie.vote_average}`);
      console.log(`Total de votos: ${movie.vote_count}`);
      console.log(`Adulto: ${movie.adult}`);

      // Verificar se o filme já existe
      const existingMovie = await prisma.movie.findFirst({
        where: {
          title: movie.title,
          year: new Date(movie.release_date).getFullYear()
        }
      });

      if (existingMovie) {
        console.log(`⚠️ Filme já existe no banco: ${movie.title}`);
        console.log(`MOVIE_ID_FOUND: ${existingMovie.id}`);
        return { success: true, duplicate: true, movieId: existingMovie.id };
      } else {
        // Buscar ou criar os gêneros
        const genreIds: number[] = [];
        for (const tmdbGenre of movie.genres) {
          const existingGenre = await prisma.genre.findFirst({
            where: {
              name: {
                equals: tmdbGenre.name,
                mode: 'insensitive'
              }
            }
          });

          if (existingGenre) {
            genreIds.push(existingGenre.id);
          } else {
            console.warn(`⚠️ Gênero "${tmdbGenre.name}" retornado pelo TMDB não foi encontrado no banco de dados local. Pulando.`);
          }
        }

        // Obter ratings da OMDb
        let omdbRatings = {};
        const imdbId = await getImdbId(parseInt(movie.id));
        if (imdbId) {
          console.log(`IMDb ID encontrado: ${imdbId}. Buscando ratings...`);
          omdbRatings = await getOmdbRatings(imdbId);
          console.log('Ratings da OMDb encontrados:', omdbRatings);
        } else {
          console.log('IMDb ID não encontrado. Pulando busca de ratings.');
        }

        // Criar o filme com os gêneros
        const createdMovie = await prisma.movie.create({
          data: {
            title: movie.title,
            year: new Date(movie.release_date).getFullYear(),
            director: director || undefined,
            genres: movie.genres.map(g => g.name),
            streamingPlatforms: platforms,
            description: movie.overview,
            thumbnail: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
            original_title: movie.original_title,
            vote_average: movie.vote_average,
            vote_count: movie.vote_count,
            certification: certification || undefined,
            adult: movie.adult,
            keywords: keywords,
            genreIds: genreIds,
            runtime: movie.runtime || undefined,
            tmdbId: parseInt(movie.id),
            ...omdbRatings
          }
        });
        console.log(`✅ Filme criado: ${createdMovie.title}`);
        console.log(`Gêneros: ${movie.genres.map(g => g.name).join(', ')}`);
        console.log(`IDs dos gêneros: ${genreIds.join(', ')}`);
        console.log(`MOVIE_ID_FOUND: ${createdMovie.id}`);
        return { success: true, duplicate: false, movieId: createdMovie.id };
      }
    } else {
      console.log(`❌ Filme não encontrado no TMDB: ${title}`);
      return { success: false, duplicate: false };
    }
  } catch (error) {
    console.error(`❌ Erro ao processar filme ${title}:`, error);
    return { success: false, duplicate: false };
  }
}

async function processMoviesFromFile(filePath: string) {
  console.log('\n=== Iniciando processamento de filmes ===');
  console.log(`Arquivo de entrada: ${filePath}`);

  // Verificar se o arquivo existe
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  // Ler o arquivo linha por linha
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;
  const processedTitles = new Set<string>();

  for await (const line of rl) {
    lineNumber++;

    // Ignorar linhas em branco ou comentários
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    // Pular cabeçalho se existir
    if (lineNumber === 1 && line.toLowerCase().includes('título')) {
      continue;
    }

    const [title, year] = line.split(',').map(item => item.trim());

    if (!title) {
      console.error(`❌ Linha ${lineNumber}: Formato inválido - ${line}`);
      errorCount++;
      continue;
    }

    // Validar o ano se fornecido
    let parsedYear: number | undefined;
    if (year) {
      parsedYear = parseInt(year);
      if (isNaN(parsedYear) || parsedYear < 1888 || parsedYear > new Date().getFullYear() + 1) {
        console.error(`❌ Linha ${lineNumber}: Ano inválido - ${year}`);
        errorCount++;
        continue;
      }
    }

    // Verificar duplicata no arquivo
    if (processedTitles.has(title)) {
      console.log(`⚠️ Linha ${lineNumber}: Título duplicado no arquivo - ${title}`);
      duplicateCount++;
      continue;
    }
    processedTitles.add(title);

    const result = await processSingleMovie(title, parsedYear);
    if (result.success) {
      if (result.duplicate) {
        duplicateCount++;
      } else {
        successCount++;
      }
    } else {
      errorCount++;
    }
  }

  console.log('\n=== Resumo do Processamento ===');
  console.log(`Total de linhas processadas: ${lineNumber}`);
  console.log(`Sucessos: ${successCount}`);
  console.log(`Erros: ${errorCount}`);
  console.log(`Duplicatas: ${duplicateCount}`);
}

// Processar argumentos da linha de comando
if (require.main === module) {
  const args = process.argv.slice(2);
  let filePath: string | undefined;
  let movieTitle: string | undefined;
  let movieYear: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--file=')) {
      filePath = args[i].split('=')[1];
    } else if (args[i].startsWith('--title=')) {
      movieTitle = args[i].split('=')[1];
    } else if (args[i].startsWith('--year=')) {
      movieYear = parseInt(args[i].split('=')[1]);
    }
  }

  if (filePath) {
    processMoviesFromFile(filePath);
  } else if (movieTitle) {
    processSingleMovie(movieTitle, movieYear);
  } else {
    console.log(`\nUso:\n  npx ts-node src/scripts/populateMovies.ts --file=caminho/para/arquivo.csv\n  npx ts-node src/scripts/populateMovies.ts --title="Nome do Filme" [--year=Ano]\n`);
    process.exit(1);
  }

  // Certifique-se de desconectar o Prisma no final da execução
  prisma.$disconnect();
} 
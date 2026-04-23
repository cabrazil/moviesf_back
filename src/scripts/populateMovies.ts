/// <reference types="node" />
// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { generateUniqueSlug } from '../utils/slugGenerator';
import { uploadTmdbImageToSupabase } from '../utils/imageUpload';

// Importar função de trailers do script updateMovieTrailers
import { getMovieTrailers } from './updateMovieTrailers';

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
  Awards?: string;
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

/**
 * Formata as premiações para exibição na Landing Page em português
 */
function formatAwardsForLP(awardsText: string): string {
  if (!awardsText || awardsText === 'N/A') {
    return '';
  }

  let formatted = awardsText;

  // === OSCARS ===
  // "Won X Oscars" -> "Ganhou X Oscars"
  formatted = formatted.replace(/^Won\s+(\d+)\s+Oscars?/i, (match, num) => {
    return `Ganhou ${num} Oscar${parseInt(num) > 1 ? 's' : ''}`;
  });

  // "Nominated for X Oscars" -> "Indicado a X Oscars"
  formatted = formatted.replace(/Nominated for\s+(\d+)\s+Oscars?/i, (match, num) => {
    return `Indicado a ${num} Oscar${parseInt(num) > 1 ? 's' : ''}`;
  });

  // === GOLDEN GLOBES ===
  // "Won X Golden Globes" -> "Ganhou X Globos de Ouro"
  formatted = formatted.replace(/Won\s+(\d+)\s+Golden Globes?/i, (match, num) => {
    return `Ganhou ${num} Globo${parseInt(num) > 1 ? 's' : ''} de Ouro`;
  });

  // "Nominated for X Golden Globes" -> "Indicado a X Globos de Ouro"
  formatted = formatted.replace(/Nominated for\s+(\d+)\s+Golden Globes?/i, (match, num) => {
    return `Indicado a ${num} Globo${parseInt(num) > 1 ? 's' : ''} de Ouro`;
  });

  // === PADRÃO GERAL: "X wins & Y nominations total" ===
  formatted = formatted.replace(/(\d+)\s+wins?\s+&\s+(\d+)\s+nominations?\s+total/i, (match, wins, nominations) => {
    const winsText = `${wins} vitória${parseInt(wins) > 1 ? 's' : ''}`;
    const nominationsText = `${nominations} indicaç${parseInt(nominations) > 1 ? 'ões' : 'ão'}`;
    return `${winsText} e ${nominationsText} no total`;
  });

  // === APENAS VITÓRIAS: "X wins" ===
  formatted = formatted.replace(/(\d+)\s+wins?(?!\s+&)/i, (match, wins) => {
    return `${wins} vitória${parseInt(wins) > 1 ? 's' : ''}`;
  });

  // === APENAS INDICAÇÕES: "X nominations" ===
  formatted = formatted.replace(/(\d+)\s+nominations?(?!\s+total)/i, (match, nominations) => {
    return `${nominations} indicaç${parseInt(nominations) > 1 ? 'ões' : 'ão'}`;
  });

  // === INDICAÇÕES GENÉRICAS ===
  // "Nominated for X [something]" -> "Indicado a X [something]"
  formatted = formatted.replace(/Nominated for\s+(\d+)\s+([A-Za-z\s]+)/i, (match, num, award) => {
    return `Indicado a ${num} ${award}`;
  });

  // === OUTRAS PREMIAÇÕES COMUNS ===
  // BAFTA
  formatted = formatted.replace(/Won\s+(\d+)\s+BAFTA/i, (match, num) => {
    return `Ganhou ${num} BAFTA${parseInt(num) > 1 ? 's' : ''}`;
  });

  // Emmy
  formatted = formatted.replace(/Won\s+(\d+)\s+Emmys?/i, (match, num) => {
    return `Ganhou ${num} Emmy${parseInt(num) > 1 ? 's' : ''}`;
  });

  // Cannes
  formatted = formatted.replace(/Won.*?Palme d'Or/i, 'Ganhou a Palma de Ouro');
  formatted = formatted.replace(/Palme d'Or/gi, 'Palma de Ouro');

  // === SUBSTITUIÇÕES GERAIS ===
  // Termos que podem ter sobrado
  formatted = formatted.replace(/\bwins?\b/gi, 'vitórias');
  formatted = formatted.replace(/\bnominations?\b/gi, 'indicações');
  formatted = formatted.replace(/\btotal\b/gi, 'no total');

  // Outras premiações conhecidas
  formatted = formatted.replace(/Golden Globes?/gi, 'Globos de Ouro');
  formatted = formatted.replace(/Screen Actors Guild/gi, 'Sindicato dos Atores');
  formatted = formatted.replace(/Critics[']?\s*Choice/gi, 'Escolha da Crítica');

  // === LIMPEZA FINAL ===
  // Limpar pontuação dupla
  formatted = formatted.replace(/\.\s*\./g, '.');
  // Remover espaços extras
  formatted = formatted.replace(/\s+/g, ' ');
  // Capitalizar primeira letra
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  return formatted.trim();
}

/**
 * Fetches movie awards from OMDb using the IMDb ID and formats for Landing Page.
 */
async function getOmdbAwards(imdbId: string): Promise<string | null> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    console.error('OMDb API key is not set.');
    return null;
  }

  try {
    const response = await axios.get<OmdbMovieResponse>('http://www.omdbapi.com/', {
      params: { i: imdbId, apikey: apiKey }
    });

    if (response.data.Response === 'False' || !response.data.Awards) {
      return null;
    }

    const awards = response.data.Awards;
    if (awards === 'N/A') {
      return null;
    }

    return formatAwardsForLP(awards);
  } catch (error) {
    console.error(`Error fetching OMDb awards for IMDb ID ${imdbId}:`, error);
    return null;
  }
}


const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

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
      free?: Array<{
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
  cast: Array<{
    id: number;
    name: string;
    character: string;
    order: number;
    profile_path: string | null;
  }>;
}

interface TMDBActorResponse {
  id: number;
  name: string;
  profile_path: string | null;
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

// Mapeamento de plataformas do TMDB para nosso padrão (nova estrutura)
const TMDB_PROVIDER_MAPPING: Record<string, { name: string; accessType?: string }> = {
  'Netflix': { name: 'Netflix', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Netflix Standard with Ads': { name: 'Netflix', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Amazon Prime Video': { name: 'Prime Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Amazon Prime Video with Ads': { name: 'Prime Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Amazon Video': { name: 'Prime Video' }, // accessType removido - usar fallback
  'Disney Plus': { name: 'Disney+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'HBO Max': { name: 'HBO Max', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'HBO Max Amazon Channel': { name: 'HBO Max', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Paramount Plus': { name: 'Paramount+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Paramount+ Amazon Channel': { name: 'Paramount+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Paramount Plus Premium': { name: 'Paramount+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Apple TV Plus': { name: 'Apple TV+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Apple TV': { name: 'Apple TV (Loja)' }, // accessType removido - usar fallback
  'Apple TV Store': { name: 'Apple TV (Loja)' }, // Corrigido para mapear Apple TV Store (aluguel/compra)
  'Google Play Movies': { name: 'YouTube' }, // accessType removido - usar fallback
  'Google Play': { name: 'YouTube' }, // accessType removido - usar fallback
  'Microsoft Store': { name: 'Microsoft Store' }, // accessType removido - usar fallback
  'YouTube': { name: 'YouTube (Gratuito)', accessType: 'FREE_WITH_ADS' },
  'Pluto TV': { name: 'Pluto TV', accessType: 'FREE_WITH_ADS' },
  'Mercado Play': { name: 'Mercado Play' },
  'Globoplay': { name: 'Globoplay', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Telecine': { name: 'Telecine', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Telecine Amazon Channel': { name: 'Telecine', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Looke': { name: 'Looke', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Looke Amazon Channel': { name: 'Looke', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MUBI': { name: 'MUBI', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MUBI Amazon Channel': { name: 'MUBI', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Oldflix': { name: 'Oldflix', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Crunchyroll': { name: 'Crunchyroll', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Claro tv+': { name: 'Claro Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Claro video': { name: 'Claro Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Reserva Imovision Amazon Channel': { name: 'Reserva Imovision', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MGM+ Apple TV Channel': { name: 'MGM+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MGM Plus Amazon Channel': { name: 'MGM+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'FilmBox+': { name: 'FilmBox+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },

  // Novos providers encontrados
  'Sony One Amazon Channel': { name: 'Sony One', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Filmelier Plus Amazon Channel': { name: 'Filmelier+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Apple TV Plus Amazon Channel': { name: 'Apple TV+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Plex': { name: 'Plex', accessType: 'FREE_WITH_ADS' },
  'Plex Channel': { name: 'Plex', accessType: 'FREE_WITH_ADS' },
  'Univer Video': { name: 'Univer Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Belas Artes à La Carte': { name: 'Belas Artes à La Carte', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'GOSPEL PLAY': { name: 'GOSPEL PLAY', accessType: 'INCLUDED_WITH_SUBSCRIPTION' }
};

// Determinar AccessType baseado no tipo de provider do TMDB
function getAccessTypeFromTMDB(providerType: 'flatrate' | 'buy' | 'rent' | 'free', providerName: string): string {
  // Primeiro, verificar mapeamento específico
  const mapped = TMDB_PROVIDER_MAPPING[providerName];
  if (mapped && mapped.accessType) {
    return mapped.accessType; // Usar accessType explícito se definido
  }

  // Fallback baseado no tipo
  switch (providerType) {
    case 'flatrate': return 'INCLUDED_WITH_SUBSCRIPTION';
    case 'buy': return 'PURCHASE';
    case 'rent': return 'RENTAL';
    case 'free': return 'FREE_WITH_ADS';
    default: return 'HYBRID_OR_UNKNOWN';
  }
}

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

async function getMovieStreamingInfo(movieId: number, movieTitle?: string, movieYear?: number, skipYouTube: boolean = false): Promise<{ platforms: string[]; streamingData: Array<{ platform: string; accessType: string }> }> {
  try {
    const response = await axios.get<TMDBWatchProvidersResponse>(`${TMDB_API_URL}/movie/${movieId}/watch/providers`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });

    // Log para debug
    // console.log('Provedores TMDB:', JSON.stringify(response.data.results?.BR, null, 2));

    const streamingData: Array<{ platform: string; accessType: string }> = [];
    const platforms: string[] = [];

    // Processar todos os tipos de providers
    const providerTypes = [
      { type: 'flatrate', providers: response.data.results?.BR?.flatrate || [] },
      { type: 'buy', providers: response.data.results?.BR?.buy || [] },
      { type: 'rent', providers: response.data.results?.BR?.rent || [] },
      { type: 'free', providers: response.data.results?.BR?.free || [] }
    ];

    for (const { type, providers } of providerTypes) {
      for (const provider of providers) {
        const mapped = TMDB_PROVIDER_MAPPING[provider.provider_name];
        if (mapped) {
          const accessType = getAccessTypeFromTMDB(type as 'flatrate' | 'buy' | 'rent' | 'free', provider.provider_name);

          streamingData.push({
            platform: mapped.name,
            accessType
          });

          if (!platforms.includes(mapped.name)) {
            platforms.push(mapped.name);
          }

          // Log de provedor mapeado suprimido (muito verboso)
        } else {
          console.log(`⚠️ Provedor não mapeado: ${provider.provider_name}`);
        }
      }
    }

    /*
    // VERIFICAÇÃO DO YOUTUBE TEMPORARIAMENTE DESATIVADA (GERA MUITOS FALSOS POSITIVOS)
    // Verificar disponibilidade no YouTube se título e ano foram fornecidos e não foi solicitado pular
    if (!skipYouTube && movieTitle && movieYear) {
      const youtubeAvailability = await checkYouTubeAvailability(movieTitle, movieYear);
      if (youtubeAvailability.available) {
        // Determinar qual plataforma YouTube usar baseado no ano
        const isOldMovie = movieYear < 1970;
        const youtubePlatform = isOldMovie ? 'YouTube (Gratuito)' : 'YouTube';

        // Adicionar todos os tipos de acesso retornados pelo YouTube
        youtubeAvailability.accessTypes.forEach(accessType => {
          streamingData.push({
            platform: youtubePlatform,
            accessType
          });
        });

        if (!platforms.includes(youtubePlatform)) {
          platforms.push(youtubePlatform);
        }
      }
    }
    */

    return { platforms, streamingData };
  } catch (error) {
    console.error(`Erro ao buscar informações de streaming: ${error}`);
    return { platforms: [], streamingData: [] };
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

function getCharacterType(name: string): string {
  if (/[\u0590-\u05FF]/.test(name)) return 'hebraico';
  if (/[\u0600-\u06FF]/.test(name)) return 'árabe';
  if (/[\uAC00-\uD7AF]/.test(name)) return 'coreano';
  if (/[\u0750-\u077F]/.test(name)) return 'árabe estendido';
  if (/[\u08A0-\u08FF]/.test(name)) return 'árabe suplementar';
  if (/[\uFB50-\uFDFF]/.test(name)) return 'formas de apresentação árabe';
  if (/[\uFE70-\uFEFF]/.test(name)) return 'formas especiais árabes';
  return 'desconhecido';
}

async function getActorNameInEnglish(tmdbId: number): Promise<string | null> {
  try {
    const response = await axios.get<TMDBActorResponse>(`https://api.themoviedb.org/3/person/${tmdbId}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'en-US'
      }
    });
    return response.data.name;
  } catch (error) {
    console.error(`Erro ao buscar nome em inglês para ator ${tmdbId}:`, error);
    return null;
  }
}

async function getMovieCast(movieId: number): Promise<Array<{
  tmdbId: number;
  name: string;
  character: string;
  order: number;
  profilePath: string | null;
}>> {
  try {
    const response = await axios.get<TMDBMovieCredits>(`${TMDB_API_URL}/movie/${movieId}/credits`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR'
      }
    });

    // Filtrar apenas atores principais (order <= 8 + character não vazio)
    let mainCast = response.data.cast
      .filter(actor => actor.order <= 8 && actor.character && actor.character.trim() !== '')
      .map(actor => ({
        tmdbId: actor.id,
        name: actor.name,
        character: actor.character,
        order: actor.order,
        profilePath: actor.profile_path
      }))
      .sort((a, b) => a.order - b.order); // Ordenar por ordem de aparição

    // Debug: Mostrar dados brutos para atores com nomes em caracteres especiais
    const specialActors = response.data.cast.filter(actor =>
      /[\u0590-\u05FF\u0600-\u06FF\uAC00-\uD7AF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(actor.name) && actor.order <= 15
    );
    if (specialActors.length > 0) {
      console.log(`🔍 Debug - Atores com nomes especiais encontrados:`);
      specialActors.forEach(actor => {
        const charType = getCharacterType(actor.name);
        console.log(`  - Order ${actor.order}: "${actor.name}" (${charType}) como "${actor.character}"`);
      });
    }

    // Corrigir nomes em caracteres especiais para inglês
    for (let i = 0; i < mainCast.length; i++) {
      const actor = mainCast[i];
      if (/[\u0590-\u05FF\u0600-\u06FF\uAC00-\uD7AF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(actor.name)) {
        const charType = getCharacterType(actor.name);
        console.log(`🔄 Corrigindo nome ${charType}: "${actor.name}"`);
        const englishName = await getActorNameInEnglish(actor.tmdbId);
        if (englishName) {
          console.log(`✅ Nome corrigido: "${actor.name}" → "${englishName}"`);
          mainCast[i] = { ...actor, name: englishName };
        }
      }
    }

    console.log(`🎭 ${mainCast.length} atores principais encontrados para o filme ${movieId}`);
    return mainCast;
  } catch (error) {
    console.error(`Erro ao buscar elenco para o filme ${movieId}:`, error);
    return [];
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

/**
 * Verifica se um filme está disponível no YouTube
 */
async function checkYouTubeAvailability(movieTitle: string, year?: number): Promise<{ available: boolean; accessTypes: string[] }> {
  if (!YOUTUBE_API_KEY) {
    console.log('YouTube API key não configurada, pulando verificação do YouTube');
    return { available: false, accessTypes: [] };
  }

  try {
    // Buscar por filmes completos no YouTube
    const searchQuery = `${movieTitle} ${year || ''} full movie`;
    const searchUrl = `${YOUTUBE_BASE_URL}/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoDuration=long&maxResults=5&key=${YOUTUBE_API_KEY}`;

    const response = await axios.get(searchUrl);
    const data = response.data as any;

    if (data.items && data.items.length > 0) {
      // Verificar se há resultados do YouTube Movies ou canais oficiais
      const hasYouTubeMovies = data.items.some((item: any) =>
        item.snippet.channelTitle.includes('YouTube Movies') ||
        item.snippet.channelTitle.includes('Movies') ||
        item.snippet.title.toLowerCase().includes('full movie')
      );

      if (hasYouTubeMovies) {
        // Para filmes antigos, assumir FREE_WITH_ADS, para recentes PURCHASE + RENTAL
        const isOldMovie = year && year < 1970;
        const accessTypes = isOldMovie ? ['FREE_WITH_ADS'] : ['PURCHASE', 'RENTAL'];

        console.log(`✅ YouTube: ${movieTitle} disponível (${accessTypes.join(', ')})`);
        return { available: true, accessTypes };
      }
    }

    return { available: false, accessTypes: [] };
  } catch (error: any) {
    // Tratar erros HTTP de forma mais silenciosa
    if (error?.response?.status === 403) {
      console.log(`⚠️ YouTube API: Acesso negado (403) para "${movieTitle}". Pode ser quota excedida, restrição geográfica ou API key inválida. Continuando sem verificação do YouTube.`);
    } else if (error?.response?.status === 429) {
      console.log(`⚠️ YouTube API: Limite de requisições excedido (429) para "${movieTitle}". Continuando sem verificação do YouTube.`);
    } else if (error?.code === 'ERR_BAD_REQUEST' || error?.response?.status) {
      console.log(`⚠️ YouTube API: Erro ${error.response?.status || 'desconhecido'} ao verificar "${movieTitle}". Continuando sem verificação do YouTube.`);
    } else {
      // Apenas logar erros não-HTTP de forma mais detalhada
      console.log(`⚠️ Erro ao verificar YouTube para "${movieTitle}": ${error?.message || 'Erro desconhecido'}. Continuando sem verificação do YouTube.`);
    }
    return { available: false, accessTypes: [] };
  }
}

export async function searchMovie(title?: string, year?: number, tmdbId?: number, skipStreaming: boolean = false): Promise<{ movie: TMDBMovie; platforms: string[]; streamingData: Array<{ platform: string; accessType: string }>; director: string | null; certification: string | null; keywords: string[]; cast: Array<{ tmdbId: number; name: string; character: string; order: number; profilePath: string | null }> } | null> {
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

      // Buscar streaming apenas se não foi solicitado pular
      let platforms: string[] = [];
      let streamingData: Array<{ platform: string; accessType: string }> = [];

      if (!skipStreaming) {
        const streamingInfo = await getMovieStreamingInfo(tmdbId, movieDetails.title, parseInt(movieDetails.release_date.split('-')[0]));
        platforms = streamingInfo.platforms;
        streamingData = streamingInfo.streamingData;
      }

      const certification = await getBrazilianCertification(tmdbId);
      const cast = await getMovieCast(tmdbId);

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
        streamingData,
        director: directors || null,
        certification,
        keywords,
        cast
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

    // Mostrar primo resultado
    const firstResult = response.data.results[0];
    console.log(`🔍 Primeiro resultado: ${firstResult.title} (${firstResult.original_title}) - ${firstResult.release_date?.substring(0, 4) || 'N/A'}`);

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

    // Buscar informações de streaming apenas se não foi solicitado pular
    let platforms: string[] = [];
    let streamingData: Array<{ platform: string; accessType: string }> = [];

    if (!skipStreaming) {
      const streamingInfo = await getMovieStreamingInfo(parseInt(movie.id), movie.title, new Date(movie.release_date).getFullYear());
      platforms = streamingInfo.platforms;
      streamingData = streamingInfo.streamingData;
    }

    // Buscar certificação brasileira
    const certification = await getBrazilianCertification(parseInt(movie.id));

    // Buscar elenco do filme
    const cast = await getMovieCast(parseInt(movie.id));

    // Log da duração do filme
    console.log(`Duração: ${details.data.runtime} minutos`);

    return {
      movie: { ...movie, id: movie.id.toString(), genres: details.data.genres, runtime: details.data.runtime },
      platforms,
      streamingData,
      director: directors || null,
      certification,
      keywords,
      cast
    };
  } catch (error) {
    console.error(`Erro ao buscar filme ${title}:`, error);
    return null;
  }
}

async function processSingleMovie(title: string, year?: number, dryRun: boolean = false) {
  console.log(`\n=== Processando filme: ${title}${year ? ` (${year})` : ''} ===`);
  if (dryRun) {
    console.log(`🔍 MODO DRY-RUN: Apenas logs, sem salvar no banco`);
  }

  try {
    const movieResult = await searchMovie(title, year);

    if (movieResult) {
      const { movie, platforms, streamingData, director, certification, keywords, cast } = movieResult;
      console.log(`Filme encontrado no TMDB: ${movie.title} (${movie.release_date})`);
      console.log(`Título original: ${movie.original_title}`);
      console.log(`Diretores: ${director || 'Não encontrado'}`);
      console.log(`Plataformas encontradas: ${platforms.join(', ')}`);
      console.log(`Certificação: ${certification || 'Não disponível'}`);
      console.log(`Palavras-chave: ${keywords.join(', ')}`);
      console.log(`Média de votos: ${movie.vote_average}`);
      console.log(`Total de votos: ${movie.vote_count}`);
      console.log(`Adulto: ${movie.adult}`);
      console.log(`🎭 Elenco principal: ${cast.length} atores encontrados`);

      // Verificar se o filme já existe (pular em dry-run)
      let existingMovie: any = null;
      if (!dryRun) {
        existingMovie = await prisma.movie.findFirst({
          where: {
            title: movie.title,
            year: new Date(movie.release_date).getFullYear()
          }
        });
      }

      if (existingMovie) {
        console.log(`⚠️ Filme já existe no banco: ${movie.title}`);
        console.log(`TMDB_ID_FOUND: ${existingMovie.tmdbId}`);
        console.log(`🔄 Reprocessando plataformas de streaming...`);

        // Processar plataformas de streaming mesmo quando o filme já existe
        if (streamingData.length > 0) {
          if (!dryRun) {
            console.log(`📺 Atualizando ${streamingData.length} relações de streaming...`);

            for (const streamingItem of streamingData) {
              try {
                // Buscar a plataforma no banco
                const platform = await prisma.streamingPlatform.findFirst({
                  where: { name: streamingItem.platform }
                });

                if (platform) {
                  // Usar upsert para atualizar ou criar
                  await prisma.movieStreamingPlatform.upsert({
                    where: {
                      movieId_streamingPlatformId_accessType: {
                        movieId: existingMovie.id,
                        streamingPlatformId: platform.id,
                        accessType: streamingItem.accessType as any
                      }
                    },
                    update: {
                      updatedAt: new Date()
                    },
                    create: {
                      movieId: existingMovie.id,
                      streamingPlatformId: platform.id,
                      accessType: streamingItem.accessType as any
                    }
                  });
                  console.log(`✅ ${streamingItem.platform} (${streamingItem.accessType})`);
                } else {
                  console.log(`⚠️ Plataforma não encontrada: ${streamingItem.platform}`);
                }
              } catch (error) {
                console.log(`❌ Erro ao atualizar ${streamingItem.platform}: ${error}`);
              }
            }
          } else {
            console.log(`🔍 DRY-RUN: ${streamingData.length} relações de streaming seriam atualizadas`);
            streamingData.forEach(item => {
              console.log(`🔍 DRY-RUN: ${item.platform} (${item.accessType})`);
            });
          }
        } else {
          console.log(`📺 Nenhuma plataforma de streaming encontrada para atualizar`);
        }

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

        // Obter ratings e premiações da OMDb
        let omdbRatings = {};
        let awardsSummary: string | null = null;
        const imdbId = await getImdbId(parseInt(movie.id));
        if (imdbId) {
          console.log(`IMDb ID encontrado: ${imdbId}. Buscando ratings e premiações...`);
          omdbRatings = await getOmdbRatings(imdbId);
          console.log('Ratings da OMDb encontrados:', omdbRatings);

          awardsSummary = await getOmdbAwards(imdbId);
          if (awardsSummary) {
            console.log(`🏆 Premiações encontradas: "${awardsSummary}"`);
          } else {
            console.log('🏆 Nenhuma premiação encontrada');
          }
        } else {
          console.log('IMDb ID não encontrado. Pulando busca de ratings e premiações.');
        }

        // Gerar slug único para o filme
        const slug = await generateUniqueSlug(movie.title);
        console.log(`🔗 Slug gerado: ${slug}`);

        // Fazer upload da imagem para o Supabase (se houver poster_path)
        let thumbnailUrl: string | undefined;
        if (movie.poster_path) {
          console.log(`🖼️  Processando imagem do filme...`);
          const supabaseUrl = await uploadTmdbImageToSupabase(movie.poster_path, slug);
          if (supabaseUrl) {
            thumbnailUrl = supabaseUrl;
          } else {
            // Fallback para URL do TMDB se upload falhar
            console.log(`  ⚠️  Usando URL do TMDB como fallback`);
            thumbnailUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
          }
        }

        // Criar o filme com os gêneros (sem streamingPlatforms)
        let createdMovie: any = null;
        if (!dryRun) {
          createdMovie = await prisma.movie.create({
            data: {
              title: movie.title,
              slug: slug,
              year: new Date(movie.release_date).getFullYear(),
              director: director || undefined,
              genres: movie.genres.map(g => g.name),
              description: movie.overview,
              thumbnail: thumbnailUrl,
              original_title: movie.original_title,
              vote_average: movie.vote_average,
              vote_count: movie.vote_count,
              certification: certification || undefined,
              adult: movie.adult,
              keywords: keywords,
              genreIds: genreIds,
              runtime: movie.runtime || undefined,
              tmdbId: parseInt(movie.id),
              awardsSummary: awardsSummary || undefined,
              ...omdbRatings
            }
          });
        } else {
          console.log(`🔍 DRY-RUN: Filme seria criado com slug: ${slug}`);
        }

        // Inserir dados de streaming na nova estrutura
        if (streamingData.length > 0) {
          if (!dryRun) {
            console.log(`📺 Inserindo ${streamingData.length} relações de streaming...`);
          } else {
            console.log(`🔍 DRY-RUN: ${streamingData.length} relações de streaming seriam inseridas`);
          }

          for (const streamingItem of streamingData) {
            if (!dryRun) {
              try {
                // Buscar a plataforma no banco
                const platform = await prisma.streamingPlatform.findFirst({
                  where: { name: streamingItem.platform }
                });

                if (platform) {
                  // Usar upsert para evitar duplicatas
                  await prisma.movieStreamingPlatform.upsert({
                    where: {
                      movieId_streamingPlatformId_accessType: {
                        movieId: createdMovie.id,
                        streamingPlatformId: platform.id,
                        accessType: streamingItem.accessType as any
                      }
                    },
                    update: {
                      updatedAt: new Date()
                    },
                    create: {
                      movieId: createdMovie.id,
                      streamingPlatformId: platform.id,
                      accessType: streamingItem.accessType as any
                    }
                  });
                  console.log(`✅ ${streamingItem.platform} (${streamingItem.accessType})`);
                } else {
                  console.log(`⚠️ Plataforma não encontrada: ${streamingItem.platform}`);
                }
              } catch (error) {
                console.log(`❌ Erro ao inserir ${streamingItem.platform}: ${error}`);
              }
            } else {
              console.log(`🔍 DRY-RUN: ${streamingItem.platform} (${streamingItem.accessType})`);
            }
          }
        } else {
          console.log(`📺 Nenhuma plataforma de streaming encontrada`);
        }

        // Inserir elenco do filme
        if (cast.length > 0) {
          if (!dryRun) {
            console.log(`🎭 Inserindo ${cast.length} atores do elenco...`);
          } else {
            console.log(`🔍 DRY-RUN: ${cast.length} atores do elenco seriam inseridos`);
          }

          for (const actorData of cast) {
            if (!dryRun) {
              try {
                // Buscar ou criar o ator
                let actor = await prisma.actor.findUnique({
                  where: { tmdbId: actorData.tmdbId }
                });

                if (!actor) {
                  actor = await prisma.actor.create({
                    data: {
                      tmdbId: actorData.tmdbId,
                      name: actorData.name,
                      profilePath: actorData.profilePath
                    }
                  });
                  console.log(`👤 Novo ator criado: ${actorData.name}`);
                }

                // Criar relação MovieCast
                await prisma.movieCast.create({
                  data: {
                    movieId: createdMovie.id,
                    actorId: actor.id,
                    characterName: actorData.character,
                    order: actorData.order
                  }
                });
                console.log(`✅ ${actorData.name} como ${actorData.character}`);
              } catch (error) {
                console.log(`❌ Erro ao inserir ator ${actorData.name}: ${error}`);
              }
            } else {
              console.log(`🔍 DRY-RUN: ${actorData.name} como ${actorData.character}`);
            }
          }
        } else {
          console.log(`🎭 Nenhum ator encontrado para o elenco`);
        }

        // Buscar e inserir trailers do filme
        if (!dryRun) {
          console.log(`🎬 Buscando trailers para TMDB ID: ${movie.id}...`);
        } else {
          console.log(`🔍 DRY-RUN: Trailers seriam buscados para TMDB ID: ${movie.id}`);
        }

        try {
          const trailers = await getMovieTrailers(parseInt(movie.id));

          if (trailers.length > 0) {
            if (!dryRun) {
              console.log(`🎬 Inserindo ${trailers.length} trailers...`);
            } else {
              console.log(`🔍 DRY-RUN: ${trailers.length} trailers seriam inseridos`);
            }

            for (let i = 0; i < trailers.length; i++) {
              const trailer = trailers[i];
              const isMain = i === 0; // Primeiro trailer é o principal

              if (!dryRun) {
                try {
                  await prisma.movieTrailer.create({
                    data: {
                      movieId: createdMovie.id,
                      tmdbId: trailer.tmdbId,
                      key: trailer.key,
                      name: trailer.name,
                      site: trailer.site,
                      type: trailer.type,
                      language: trailer.language,
                      isMain: isMain
                    }
                  });
                  console.log(`✅ Trailer: ${trailer.name} (${trailer.language})${isMain ? ' - PRINCIPAL' : ''}`);
                } catch (error) {
                  console.log(`❌ Erro ao inserir trailer ${trailer.name}: ${error}`);
                }
              } else {
                console.log(`🔍 DRY-RUN: ${trailer.name} (${trailer.language})${isMain ? ' - PRINCIPAL' : ''}`);
              }
            }
          } else {
            console.log(`🎬 Nenhum trailer encontrado`);
          }
        } catch (error) {
          console.log(`❌ Erro ao buscar trailers: ${error}`);
        }

        if (!dryRun) {
          console.log(`✅ Filme criado: ${createdMovie.title}`);
          console.log(`Gêneros: ${movie.genres.map(g => g.name).join(', ')}`);
          console.log(`IDs dos gêneros: ${genreIds.join(', ')}`);
          console.log(`TMDB_ID_FOUND: ${createdMovie.tmdbId}`);
          return { success: true, duplicate: false, movieId: createdMovie.id };
        } else {
          console.log(`🔍 DRY-RUN: Filme seria criado: ${movie.title}`);
          console.log(`🔍 DRY-RUN: Gêneros: ${movie.genres.map(g => g.name).join(', ')}`);
          console.log(`🔍 DRY-RUN: TMDB_ID: ${movie.id}`);
          return { success: true, duplicate: false, movieId: 'dry-run' };
        }
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
  let dryRun: boolean = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--file=')) {
      filePath = args[i].split('=')[1];
    } else if (args[i].startsWith('--title=')) {
      movieTitle = args[i].split('=')[1];
    } else if (args[i].startsWith('--year=')) {
      movieYear = parseInt(args[i].split('=')[1]);
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  if (filePath) {
    processMoviesFromFile(filePath);
  } else if (movieTitle) {
    processSingleMovie(movieTitle, movieYear, dryRun);
  } else {
    console.log(`\nUso:\n  npx ts-node src/scripts/populateMovies.ts --file=caminho/para/arquivo.csv\n  npx ts-node src/scripts/populateMovies.ts --title="Nome do Filme" [--year=Ano] [--dry-run]\n`);
    process.exit(1);
  }

  // Certifique-se de desconectar o Prisma no final da execução
  prisma.$disconnect();
} 
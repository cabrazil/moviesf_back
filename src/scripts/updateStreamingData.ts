/// <reference types="node" />
// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import axios from 'axios';

const prisma = new PrismaClient();

// Configuração das APIs
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Interfaces
interface TMDBWatchProviders {
  results: {
    BR?: {
      flatrate?: Array<{ provider_name: string }>;
      rent?: Array<{ provider_name: string }>;
      buy?: Array<{ provider_name: string }>;
      free?: Array<{ provider_name: string }>;
    };
  };
}

interface MovieWithStreaming {
  id: string;
  title: string;
  year: number | null;
  tmdbId: number | null;
  vote_average: Decimal | null;
  vote_count: number | null;
  lastUpdate?: Date;
}

// Mapeamento de provedores (igual ao populateMovies.ts)
const TMDB_PROVIDER_MAPPING: Record<string, { name: string; accessType?: string }> = {
  'Netflix': { name: 'Netflix', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Netflix Standard with Ads': { name: 'Netflix', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Prime Video': { name: 'Prime Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Amazon Prime Video': { name: 'Prime Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Amazon Prime Video with Ads': { name: 'Prime Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Disney Plus': { name: 'Disney+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Disney+': { name: 'Disney+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'HBO Max': { name: 'HBO Max', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'HBO Max Amazon Channel': { name: 'HBO Max', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Max': { name: 'HBO Max', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Paramount Plus': { name: 'Paramount+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Paramount+': { name: 'Paramount+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Paramount+ Amazon Channel': { name: 'Paramount+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Paramount Plus Premium': { name: 'Paramount+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Apple TV+': { name: 'Apple TV+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Apple TV Plus Amazon Channel': { name: 'Apple TV+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Apple TV': { name: 'Apple TV (Loja)' }, // accessType removido - usar fallback baseado no tipo do provider
  'Google Play Movies': { name: 'Google Play' }, // accessType removido - usar fallback baseado no tipo do provider
  'Google Play': { name: 'Google Play' }, // accessType removido - usar fallback baseado no tipo do provider
  'Amazon Video': { name: 'Prime Video' }, // accessType removido - usar fallback baseado no tipo do provider
  'Globoplay': { name: 'Globoplay', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Claro video': { name: 'Claro Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Claro tv+': { name: 'Claro Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Telecine': { name: 'Telecine', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Telecine Amazon Channel': { name: 'Telecine', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Looke': { name: 'Looke', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Looke Amazon Channel': { name: 'Looke', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MUBI': { name: 'MUBI', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MUBI Amazon Channel': { name: 'MUBI', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Oldflix': { name: 'Oldflix', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Crunchyroll': { name: 'Crunchyroll', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Filmelier Plus Amazon Channel': { name: 'Filmelier+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MGM+': { name: 'MGM+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MGM Plus Amazon Channel': { name: 'MGM+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MGM+ Apple TV Channel': { name: 'MGM+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'YouTube Premium': { name: 'YouTube Premium', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'YouTube (Gratuito)': { name: 'YouTube (Gratuito)', accessType: 'FREE_WITH_ADS' }
};

function getAccessTypeFromTMDB(providerType: 'flatrate' | 'buy' | 'rent' | 'free', providerName: string): string {
  // Primeiro, verificar mapeamento específico
  const mapped = TMDB_PROVIDER_MAPPING[providerName];
  if (mapped && mapped.accessType) {
    return mapped.accessType; // Usar accessType explícito se definido
  }

  // Fallback baseado no tipo do provider (mais específico que HYBRID_OR_UNKNOWN)
  switch (providerType) {
    case 'flatrate':
      return 'INCLUDED_WITH_SUBSCRIPTION';
    case 'buy':
      return 'PURCHASE';
    case 'rent':
      return 'RENTAL';
    case 'free':
      return 'FREE_WITH_ADS';
    default:
      return 'HYBRID_OR_UNKNOWN';
  }
}

async function getTMDBStreamingData(tmdbId: number): Promise<Array<{ platform: string; accessType: string }>> {
  try {
    const response = await axios.get<TMDBWatchProviders>(`${TMDB_API_URL}/movie/${tmdbId}/watch/providers`, {
      params: { api_key: TMDB_API_KEY }
    });

    const streamingData: Array<{ platform: string; accessType: string }> = [];
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
        }
      }
    }

    return streamingData;
  } catch (error) {
    console.error(`Erro ao buscar dados TMDB para ${tmdbId}:`, error);
    return [];
  }
}

async function checkYouTubeAvailability(movieTitle: string, year?: number): Promise<{ available: boolean; accessTypes: string[] }> {
  if (!YOUTUBE_API_KEY) {
    return { available: false, accessTypes: [] };
  }

  try {
    const searchQuery = `${movieTitle} ${year || ''} full movie`;
    const searchUrl = `${YOUTUBE_BASE_URL}/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoDuration=long&maxResults=5&key=${YOUTUBE_API_KEY}`;
    
    const response = await axios.get(searchUrl);
    const data = response.data as any;

    if (data.items && data.items.length > 0) {
      const hasYouTubeMovies = data.items.some((item: any) => 
        item.snippet.channelTitle.includes('YouTube Movies') ||
        item.snippet.channelTitle.includes('Movies') ||
        item.snippet.title.toLowerCase().includes('full movie')
      );

      if (hasYouTubeMovies) {
        const isOldMovie = year && year < 1970;
        const accessTypes = isOldMovie ? ['FREE_WITH_ADS'] : ['PURCHASE', 'RENTAL'];
        return { available: true, accessTypes };
      }
    }

    return { available: false, accessTypes: [] };
  } catch (error) {
    console.error(`Erro ao verificar YouTube para ${movieTitle}:`, error);
    return { available: false, accessTypes: [] };
  }
}

async function updateMovieStreamingData(movie: MovieWithStreaming): Promise<void> {
  try {
    console.log(`🔄 Atualizando: ${movie.title} (${movie.year})`);

    // Buscar dados TMDB
    if (!movie.tmdbId) {
      console.warn(`⚠️ TMDB ID ausente, pulando: ${movie.title}`);
      return;
    }
    const tmdbData = await getTMDBStreamingData(movie.tmdbId);
    
    // Buscar dados YouTube
    const youtubeData = await checkYouTubeAvailability(movie.title, movie.year ?? undefined);
    
    // Combinar dados
    const allStreamingData = [...tmdbData];
    
    if (youtubeData.available) {
      const isOldMovie = (movie.year ?? 0) < 1970;
      const youtubePlatform = isOldMovie ? 'YouTube (Gratuito)' : 'YouTube Premium';
      
      youtubeData.accessTypes.forEach(accessType => {
        allStreamingData.push({
          platform: youtubePlatform,
          accessType
        });
      });
    }

    // Remover dados antigos
    await prisma.movieStreamingPlatform.deleteMany({
      where: { movieId: movie.id }
    });

    // Inserir dados novos
    for (const data of allStreamingData) {
      const platform = await prisma.streamingPlatform.findFirst({
        where: { name: data.platform }
      });

      if (platform) {
        await prisma.movieStreamingPlatform.upsert({
          where: {
            movieId_streamingPlatformId_accessType: {
              movieId: movie.id,
              streamingPlatformId: platform.id,
              accessType: data.accessType as any
            }
          },
          update: {},
          create: {
            movieId: movie.id,
            streamingPlatformId: platform.id,
            accessType: data.accessType as any
          }
        });
      }
    }

    console.log(`✅ Atualizado: ${movie.title} - ${allStreamingData.length} relações`);
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${movie.title}:`, error);
  }
}

async function getHighPriorityMovies(startsWith?: string): Promise<MovieWithStreaming[]> {
  // Filmes recentes (últimos 6 meses) ou muito populares
  const baseWhere: any = {
    OR: [
      { year: { gte: 2024 } },
      { 
        AND: [
          { vote_average: { gte: 7.5 } },
          { vote_count: { gte: 1000 } }
        ]
      }
    ]
  };

  const where = startsWith
    ? { AND: [baseWhere, { title: { startsWith, mode: 'insensitive' as const } }] }
    : baseWhere;

  return await prisma.movie.findMany({
    where,
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      vote_average: true,
      vote_count: true
    }
  });
}

async function getMediumPriorityMovies(startsWith?: string): Promise<MovieWithStreaming[]> {
  // Filmes de 2020-2023 ou com rating moderado
  const baseWhere: any = {
    OR: [
      { year: { gte: 2020, lt: 2024 } },
      { 
        AND: [
          { vote_average: { gte: 6.5, lt: 7.5 } },
          { vote_count: { gte: 500 } }
        ]
      }
    ]
  };

  const where = startsWith
    ? { AND: [baseWhere, { title: { startsWith, mode: 'insensitive' as const } }] }
    : baseWhere;

  return await prisma.movie.findMany({
    where,
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      vote_average: true,
      vote_count: true
    }
  });
}

async function getLowPriorityMovies(startsWith?: string): Promise<MovieWithStreaming[]> {
  // Filmes antigos ou pouco populares
  const baseWhere: any = {
    OR: [
      { year: { lt: 2020 } },
      { 
        AND: [
          { vote_average: { lt: 6.5 } },
          { vote_count: { lt: 500 } }
        ]
      }
    ]
  };

  const where = startsWith
    ? { AND: [baseWhere, { title: { startsWith, mode: 'insensitive' as const } }] }
    : baseWhere;

  return await prisma.movie.findMany({
    where,
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      vote_average: true,
      vote_count: true
    }
  });
}

async function updateStreamingData(priority: 'high' | 'medium' | 'low' = 'high', startsWith?: string): Promise<void> {
  console.log(`🚀 === ATUALIZAÇÃO DE DADOS DE STREAMING ===`);
  console.log(`📊 Prioridade: ${priority.toUpperCase()}`);
  if (startsWith) {
    console.log(`🔤 Filtro por título iniciando com: "${startsWith}" (case-insensitive)`);
  }

  let movies: MovieWithStreaming[] = [];

  switch (priority) {
    case 'high':
      movies = await getHighPriorityMovies(startsWith);
      console.log(`🎯 Filmes de alta prioridade: ${movies.length}`);
      break;
    case 'medium':
      movies = await getMediumPriorityMovies(startsWith);
      console.log(`🎯 Filmes de média prioridade: ${movies.length}`);
      break;
    case 'low':
      movies = await getLowPriorityMovies(startsWith);
      console.log(`🎯 Filmes de baixa prioridade: ${movies.length}`);
      break;
  }

  if (movies.length === 0) {
    console.log('❌ Nenhum filme encontrado para atualização');
    return;
  }

  console.log(`\n🔄 Iniciando atualização de ${movies.length} filmes...`);

  let successCount = 0;
  let errorCount = 0;

  for (const movie of movies) {
    try {
      await updateMovieStreamingData(movie);
      successCount++;
      
      // Rate limiting - pausa entre requisições
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Erro ao processar ${movie.title}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 === RELATÓRIO FINAL ===`);
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📈 Taxa de sucesso: ${((successCount / movies.length) * 100).toFixed(1)}%`);
}

// Função principal
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const priorityArg = args.find(a => a === 'high' || a === 'medium' || a === 'low');
    const priority = (priorityArg as 'high' | 'medium' | 'low') || 'high';
    const startsWithArg = args.find(a => a.startsWith('--startsWith='));
    const startsWith = startsWithArg ? startsWithArg.split('=')[1]?.slice(0, 1) : undefined;
    await updateStreamingData(priority, startsWith);
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export { updateStreamingData, getHighPriorityMovies, getMediumPriorityMovies, getLowPriorityMovies };

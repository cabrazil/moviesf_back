import 'dotenv/config';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

const MIN_RATING = 7.0;
const MIN_VOTES = 200;
const DEFAULT_DAYS = 365;

// Mapeamento de provedores suportados no Brasil
const PROVIDER_IDS: Record<string, number> = {
  'Netflix': 8,
  'Prime Video': 119,
  'Amazon': 119,
  'Disney+': 337,
  'Disney Plus': 337,
  'Disney': 337,
  'HBO Max': 1899,
  'HBO': 1899,
  'Max': 1899,
  'Globoplay': 307,
  'Apple TV+': 350,
  'Apple TV Plus': 350,
  'Paramount+': 531,
  'Paramount Plus': 531,
  'Telecine': 2156,
  'MUBI': 11,
  'MGM+': 1759,
  'MGM Plus': 1759,
  'MGM': 1759,
  'Claro Video': 167,
  'Oldflix': 499,
  'Looke': 47,
  'Google Play': 3,
  'Apple TV': 2
};

// Normaliza string: minúsculas + remove acentos (ex: 'Vídeo' -> 'video')
function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseArgs() {
  const args: Record<string, string | boolean> = {};
  const argv = process.argv.slice(2);

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;

    const option = arg.substring(2);
    const separatorIndex = option.indexOf('=');

    if (separatorIndex >= 0) {
      const key = option.substring(0, separatorIndex);
      const value = option.substring(separatorIndex + 1);
      args[key] = value;
      continue;
    }

    const nextArg = argv[index + 1];
    if (nextArg && !nextArg.startsWith('--')) {
      args[option] = nextArg;
      index++;
      continue;
    }

    args[option] = true;
  }

  return args;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

async function main() {
  const args = parseArgs();
  const jsonOutput = args.json === true || args.json === 'true';
  const minRating = args.min_rating ? parseFloat(args.min_rating) : MIN_RATING;
  const minVotes = args.min_votes ? parseInt(args.min_votes) : MIN_VOTES;

  if (!TMDB_API_KEY) {
    const errMsg = 'TMDB_API_KEY nao configurada no ambiente.';
    if (jsonOutput) console.log(JSON.stringify({ error: errMsg }));
    else console.error(errMsg);
    return;
  }

  // Filtro de data: padrão 365 dias atrás para limitar o volume
  // Pode ser sobrescrito com --days=X
  let startDate: string | undefined;
  const daysToSearch = args.days ? parseInt(args.days) : DEFAULT_DAYS;
  startDate = formatDate(subDays(new Date(), daysToSearch));
  if (!jsonOutput) console.log(`📅 Filtrando a partir de: ${startDate} (últimos ${daysToSearch} dias)`);

  // --- Resolução do Provedor ---
  let providerIds: number[] = [];
  let selectedProviders: string[] = [];

  if (args.providers) {
    const providerInput = String(args.providers).trim();
    // Busca exata primeiro, depois por substring (normalizado — ignora acentos)
    const exactKey = Object.keys(PROVIDER_IDS).find(
      k => normalize(k) === normalize(providerInput)
    );
    const partialKey = !exactKey
      ? Object.keys(PROVIDER_IDS).find(k =>
        normalize(k).includes(normalize(providerInput)) ||
        normalize(providerInput).includes(normalize(k))
      )
      : undefined;

    const resolvedKey = exactKey || partialKey;
    if (resolvedKey) {
      providerIds.push(PROVIDER_IDS[resolvedKey]);
      selectedProviders.push(resolvedKey);
    } else {
      const errMsg = `⚠️ Provedor não reconhecido: "${providerInput}". Use um dos: ${Object.keys(PROVIDER_IDS).join(', ')}`;
      if (jsonOutput) console.log(JSON.stringify({ error: errMsg }));
      else console.error(errMsg);
      return;
    }
  } else {
    providerIds = [...new Set(Object.values(PROVIDER_IDS))];
    selectedProviders = Object.keys(PROVIDER_IDS);
  }

  let page = 1;
  let totalPages = 1;
  const providerFilter = providerIds.join('|');
  const allMovies: any[] = [];

  if (!jsonOutput) {
    console.log(`🎬 Buscando filmes disponíveis em: ${selectedProviders.join(', ')}`);
    console.log(`⭐️ Rating mínimo: ${minRating} | Votos mínimos: ${minVotes}`);
  }

  do {
    try {
      const params: any = {
        api_key: TMDB_API_KEY,
        language: 'pt-BR',
        sort_by: 'vote_average.desc',
        include_adult: false,
        include_video: false,
        page,
        watch_region: 'BR',
        with_watch_providers: providerFilter,
        'vote_count.gte': minVotes,
        'vote_average.gte': minRating
      };

      // Filtro de data opcional
      if (startDate) {
        params['primary_release_date.gte'] = startDate;
      }

      const response = await axios.get(`${TMDB_API_URL}/discover/movie`, { params });
      const data = response.data as any;
      const results = data.results;
      totalPages = data.total_pages;

      if (!jsonOutput) console.log(`   Página ${page}/${Math.min(totalPages, 5)} — ${results.length} filmes`);

      for (const movie of results) {
        const processed = await processMovie(movie, selectedProviders, minRating);
        if (processed) allMovies.push(processed);
      }

      page++;
    } catch (e) {
      if (!jsonOutput) console.error(`Erro na página ${page}:`, e);
      break;
    }
  } while (page <= totalPages && page <= 5);

  if (jsonOutput) {
    console.log(JSON.stringify(allMovies, null, 2));
  } else {
    console.log(`\n✅ ${allMovies.length} filmes encontrados (novos, fora da base).`);
    allMovies.forEach(m => {
      console.log(`  🍿 ${m.title} (${m.year}) ⭐️${m.voteAverage} | ${m.providers.join(', ')}`);
    });
  }
}

async function processMovie(tmdbMovie: any, targetProviders: string[], minRating: number) {
  if (!tmdbMovie.release_date) return null;

  // 1. Filtro de rating antecipado (TMDB já filtra, mas garantir consistência)
  if (tmdbMovie.vote_average < minRating) return null;

  // 2. Verificar se o filme JÁ EXISTE na base de dados pelo tmdbId → IGNORAR
  const existing = await prisma.movie.findFirst({
    where: { tmdbId: tmdbMovie.id },
    select: { id: true }
  });

  if (existing) return null; // Já temos → ignora

  // 3. Confirmar provedores específicos via endpoint de watch providers
  let availableProviders: string[] = [];
  try {
    const providerRes = await axios.get(
      `${TMDB_API_URL}/movie/${tmdbMovie.id}/watch/providers`,
      { params: { api_key: TMDB_API_KEY } }
    );
    const data = providerRes.data as any;
    const brProviders = data.results?.BR;
    if (brProviders) {
      const flatrateIds = (brProviders.flatrate || []).map((p: any) => p.provider_id);
      availableProviders = Object.keys(PROVIDER_IDS).filter(key =>
        flatrateIds.includes(PROVIDER_IDS[key]) &&
        (targetProviders.length === 0 || targetProviders.includes(key))
      );
    }
  } catch (e) {
    // Ignora erro de provider — usa os providers do discover como fallback
    availableProviders = targetProviders;
  }

  return {
    tmdbId: tmdbMovie.id,
    title: tmdbMovie.title,
    originalTitle: tmdbMovie.original_title,
    year: parseInt(tmdbMovie.release_date.split('-')[0]),
    releaseDate: tmdbMovie.release_date,
    overview: tmdbMovie.overview,
    posterPath: tmdbMovie.poster_path
      ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
      : null,
    voteAverage: tmdbMovie.vote_average,
    voteCount: tmdbMovie.vote_count,
    popularity: tmdbMovie.popularity,
    providers: availableProviders
  };
}

main().catch(e => {
  console.error(e);
}).finally(() => prisma.$disconnect());

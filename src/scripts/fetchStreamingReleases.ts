import 'dotenv/config';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

const MIN_RATING = 7.0;
const MIN_VOTES = 200;
const DEFAULT_DAYS = 365;

type ParsedArgs = Record<string, string | boolean>;

type ExistingMovieRef = {
  id: string;
  title: string;
  slug: string | null;
};

type ReleaseMovie = {
  tmdbId: number;
  title: string;
  originalTitle: string;
  year: number;
  releaseDate: string;
  overview: string;
  posterPath: string | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  providers: string[];
  existsInDb?: boolean;
  movieId?: string | null;
  movieSlug?: string | null;
  existingMovieTitle?: string | null;
};

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

// Normaliza string: minusculas + remove acentos (ex: 'Video' -> 'video')
function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseArgs(): ParsedArgs {
  const args: ParsedArgs = {};
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

function parseBooleanArg(value: string | boolean | undefined, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'sim', 's'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'nao', 'n?o'].includes(normalized)) return false;

  return defaultValue;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function parseNumberArg(value: string | boolean | undefined, fallback: number): number {
  if (typeof value !== 'string') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getExistingMovieMap(rows: Array<{ id: string; tmdbId: number | null; title: string; slug: string | null }>) {
  const map = new Map<number, ExistingMovieRef>();
  for (const row of rows) {
    if (row.tmdbId == null) continue;
    map.set(row.tmdbId, {
      id: row.id,
      title: row.title,
      slug: row.slug
    });
  }
  return map;
}

async function fetchUpcoming(jsonOutput: boolean, minRating: number, pages: number): Promise<void> {
  if (!TMDB_API_KEY) {
    const errMsg = 'TMDB_API_KEY nao configurada no ambiente.';
    if (jsonOutput) console.log(JSON.stringify({ error: errMsg }));
    else console.error(errMsg);
    return;
  }

  if (!jsonOutput) {
    console.log('🎬 Modo: UPCOMING (Pré-estreias no cinema)');
    console.log(`📊 Rating mínimo: ${minRating} | Páginas: ${pages}`);
    console.log('⚠️  Atenção: Data de chegada no streaming não é conhecida antecipadamente.\n');
  }

  type UpcomingMovie = {
    tmdbId: number;
    title: string;
    originalTitle: string;
    releaseDate: string;
    overview: string;
    posterPath: string | null;
    voteAverage: number;
    voteCount: number;
    popularity: number;
    genres: string[];
  };

  const GENRE_MAP: Record<number, string> = {
    28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime',
    99: 'Documentário', 18: 'Drama', 10751: 'Família', 14: 'Fantasia',
    36: 'História', 27: 'Terror', 10402: 'Música', 9648: 'Mistério',
    10749: 'Romance', 878: 'Ficção Científica', 10770: 'Telefilme',
    53: 'Thriller', 10752: 'Guerra', 37: 'Faroeste'
  };

  const allMovies: UpcomingMovie[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    try {
      const response = await axios.get(`${TMDB_API_URL}/movie/upcoming`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'pt-BR',
          region: 'BR',
          page
        }
      });

      const data = response.data as any;
      totalPages = data.total_pages || 1;

      if (!jsonOutput) console.log(`Página ${page}/${Math.min(totalPages, pages)} - ${(data.results || []).length} filmes encontrados`);

      for (const movie of (data.results || [])) {
        if ((movie.vote_count || 0) > 0 && movie.vote_average < minRating) continue;

        allMovies.push({
          tmdbId: movie.id,
          title: movie.title,
          originalTitle: movie.original_title,
          releaseDate: movie.release_date || 'A confirmar',
          overview: movie.overview || '',
          posterPath: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : null,
          voteAverage: movie.vote_average || 0,
          voteCount: movie.vote_count || 0,
          popularity: movie.popularity || 0,
          genres: (movie.genre_ids || []).map((id: number) => GENRE_MAP[id] || `Gênero ${id}`)
        });
      }

      page++;
    } catch (e) {
      if (!jsonOutput) console.error(`Erro na página ${page}:`, e);
      break;
    }
  } while (page <= totalPages && page <= pages);

  // Ordena por data de lançamento (mais próxima primeiro)
  allMovies.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

  if (jsonOutput) {
    console.log(JSON.stringify(allMovies, null, 2));
    return;
  }

  console.log(`\n🎯 ${allMovies.length} pré-estreia(s) no radar:\n`);
  console.log('━'.repeat(70));

  for (const movie of allMovies) {
    const rating = movie.voteAverage > 0 ? `⭐ ${movie.voteAverage.toFixed(1)}` : '⭐ Sem avaliação';
    const genres = movie.genres.length > 0 ? movie.genres.join(', ') : 'Gênero desconhecido';
    console.log(`🎬 ${movie.title} (${movie.releaseDate})`);
    console.log(`   ${rating} | 🎭 ${genres}`);
    if (movie.overview) console.log(`   📖 ${movie.overview.substring(0, 120)}...`);
    console.log(`   🔗 https://www.themoviedb.org/movie/${movie.tmdbId}`);
    console.log('━'.repeat(70));
  }

  console.log(`\n💡 Dica: Esses filmes chegarão no streaming entre 45 e 90 dias após a estreia no cinema.`);
}

async function main() {
  const args = parseArgs();
  const jsonOutput = parseBooleanArg(args.json, false);
  const mode = typeof args.mode === 'string' ? args.mode.toLowerCase() : 'streaming';

  const minRating = parseNumberArg(args.min_rating, MIN_RATING);
  const minVotes = parseNumberArg(args.min_votes, MIN_VOTES);
  const daysToSearch = parseNumberArg(args.days, DEFAULT_DAYS);
  const upcomingPages = parseNumberArg(args.pages, 3);

  // Modo upcoming: busca pré-estreias no cinema
  if (mode === 'upcoming') {
    await fetchUpcoming(jsonOutput, minRating, upcomingPages);
    return;
  }

  const includeExistingArg = args['include-existing'] ?? args.include_existing;
  const onlyNewArg = args['only-new'] ?? args.only_new;

  let onlyNew = parseBooleanArg(onlyNewArg, true);
  const includeExisting = parseBooleanArg(includeExistingArg, false);
  if (includeExisting && onlyNewArg === undefined) {
    onlyNew = false;
  }

  if (!TMDB_API_KEY) {
    const errMsg = 'TMDB_API_KEY nao configurada no ambiente.';
    if (jsonOutput) console.log(JSON.stringify({ error: errMsg }));
    else console.error(errMsg);
    return;
  }

  const startDate = formatDate(subDays(new Date(), daysToSearch));
  if (!jsonOutput) console.log(`Filtrando a partir de: ${startDate} (ultimos ${daysToSearch} dias)`);

  // --- Resolucao do Provedor ---
  let providerIds: number[] = [];
  let selectedProviders: string[] = [];

  if (args.providers) {
    const providerInput = String(args.providers).trim();
    // Busca exata primeiro, depois por substring (normalizado)
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
      const errMsg = `Provedor nao reconhecido: "${providerInput}". Use um dos: ${Object.keys(PROVIDER_IDS).join(', ')}`;
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
  const candidateMovies: ReleaseMovie[] = [];

  if (!jsonOutput) {
    console.log(`Buscando filmes em: ${selectedProviders.join(', ')}`);
    console.log(`Rating minimo: ${minRating} | Votos minimos: ${minVotes}`);
  }

  do {
    try {
      const params: Record<string, string | number | boolean> = {
        api_key: TMDB_API_KEY,
        language: 'pt-BR',
        sort_by: 'vote_average.desc',
        include_adult: false,
        include_video: false,
        page,
        watch_region: 'BR',
        with_watch_providers: providerFilter,
        'vote_count.gte': minVotes,
        'vote_average.gte': minRating,
        'primary_release_date.gte': startDate
      };

      const response = await axios.get(`${TMDB_API_URL}/discover/movie`, { params });
      const data = response.data as any;
      const results = data.results || [];
      totalPages = data.total_pages || 1;

      if (!jsonOutput) console.log(`Pagina ${page}/${Math.min(totalPages, 5)} - ${results.length} filmes`);

      for (const movie of results) {
        const processed = await processMovie(movie, selectedProviders, minRating);
        if (processed) candidateMovies.push(processed);
      }

      page++;
    } catch (e) {
      if (!jsonOutput) console.error(`Erro na pagina ${page}:`, e);
      break;
    }
  } while (page <= totalPages && page <= 5);

  const uniqueTmdbIds = [...new Set(candidateMovies.map(movie => movie.tmdbId))];
  const existingRows = uniqueTmdbIds.length > 0
    ? await prisma.movie.findMany({
      where: { tmdbId: { in: uniqueTmdbIds } },
      select: {
        id: true,
        tmdbId: true,
        title: true,
        slug: true
      }
    })
    : [];

  const existingMovieMap = getExistingMovieMap(existingRows);

  const validatedMovies = candidateMovies.map(movie => {
    const existing = existingMovieMap.get(movie.tmdbId);

    return {
      ...movie,
      existsInDb: !!existing,
      movieId: existing?.id ?? null,
      movieSlug: existing?.slug ?? null,
      existingMovieTitle: existing?.title ?? null
    };
  });

  const finalMovies = onlyNew
    ? validatedMovies.filter(movie => !movie.existsInDb)
    : validatedMovies;

  if (jsonOutput) {
    console.log(JSON.stringify(finalMovies, null, 2));
    return;
  }

  const existingCount = validatedMovies.filter(movie => movie.existsInDb).length;
  const newCount = validatedMovies.length - existingCount;

  console.log(`Validacao DB: ${validatedMovies.length} candidatos | ${newCount} novos | ${existingCount} existentes`);
  console.log(`Resultado final: ${finalMovies.length} filmes (onlyNew=${onlyNew})`);

  finalMovies.forEach(movie => {
    const status = movie.existsInDb
      ? `[EXISTE id=${movie.movieId ?? '-'} tmdb=${movie.tmdbId}]`
      : `[NOVO tmdb=${movie.tmdbId}]`;

    console.log(`  ${status} ${movie.title} (${movie.year}) rating=${movie.voteAverage} providers=${movie.providers.join(', ')}`);
  });
}

async function processMovie(tmdbMovie: any, targetProviders: string[], minRating: number): Promise<ReleaseMovie | null> {
  if (!tmdbMovie.release_date) return null;

  // Filtro de rating antecipado (TMDB ja filtra, mas mantemos consistencia)
  if (tmdbMovie.vote_average < minRating) return null;

  // Confirmar provedores via endpoint de watch providers
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
  } catch (_e) {
    // Fallback: assume provedores do filtro inicial
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

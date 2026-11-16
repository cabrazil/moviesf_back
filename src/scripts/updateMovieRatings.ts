/// <reference types="node" />
/**
 * updateMovieRatings.ts
 *
 * Atualiza as avaliações (TMDB vote_average/vote_count, IMDb, Rotten Tomatoes e Metacritic)
 * de filmes no banco de dados usando as APIs do TMDB e OMDb.
 *
 * Uso:
 *   # Modo padrão (Ideal para cron semanal):
 *   # Busca filmes recentes (ano >= ano_atual - 2) OU filmes sem imdbRating / rottenTomatoesRating
 *   npx ts-node src/scripts/updateMovieRatings.ts
 *
 *   # Atualizar um filme específico:
 *   npx ts-node src/scripts/updateMovieRatings.ts --title="O Amor de Sua Vida" --year=2026
 *
 *   # Simular sem gravar no banco:
 *   npx ts-node src/scripts/updateMovieRatings.ts --dry-run
 *
 *   # Paginação manual sobre todos os filmes do banco:
 *   npx ts-node src/scripts/updateMovieRatings.ts --all --limit=100 --skip=0
 */

import './scripts-helper';
import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';
const OMDB_API_KEY = process.env.OMDB_API_KEY;

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
  imdbRating?: string;
  Metascore?: string;
}

interface TmdbMovieBasicResponse {
  id: number;
  imdb_id: string | null;
  vote_average: number;
  vote_count: number;
}

function parseRating(source: string, value: string): number | null {
  try {
    if (!value || value === 'N/A') return null;
    if (source === 'Internet Movie Database') return parseFloat(value.split('/')[0]);
    if (source === 'Rotten Tomatoes') return parseInt(value.replace('%', ''), 10);
    if (source === 'Metacritic') return parseInt(value.split('/')[0], 10);
    return null;
  } catch {
    return null;
  }
}

async function fetchTmdbData(tmdbId: number): Promise<TmdbMovieBasicResponse | null> {
  if (!TMDB_API_KEY) return null;
  try {
    const response = await axios.get<TmdbMovieBasicResponse>(`${TMDB_API_URL}/movie/${tmdbId}`, {
      params: { api_key: TMDB_API_KEY },
      timeout: 8000
    });
    return response.data;
  } catch (error: any) {
    console.warn(`   ⚠️ Erro ao buscar TMDB ID ${tmdbId}: ${error?.message || error}`);
    return null;
  }
}

async function fetchOmdbRatings(imdbId: string): Promise<{
  imdbRating?: number;
  rottenTomatoesRating?: number;
  metacriticRating?: number;
}> {
  if (!OMDB_API_KEY || !imdbId) return {};
  try {
    const response = await axios.get<OmdbMovieResponse>('http://www.omdbapi.com/', {
      params: { i: imdbId, apikey: OMDB_API_KEY },
      timeout: 8000
    });

    if (response.data.Response === 'False') {
      return {};
    }

    const ratings: {
      imdbRating?: number;
      rottenTomatoesRating?: number;
      metacriticRating?: number;
    } = {};

    if (Array.isArray(response.data.Ratings)) {
      for (const r of response.data.Ratings) {
        const val = parseRating(r.Source, r.Value);
        if (val === null || isNaN(val)) continue;
        if (r.Source === 'Internet Movie Database') ratings.imdbRating = val;
        else if (r.Source === 'Rotten Tomatoes') ratings.rottenTomatoesRating = val;
        else if (r.Source === 'Metacritic') ratings.metacriticRating = val;
      }
    }

    // Fallback para campos diretos da resposta do OMDb
    if (ratings.imdbRating === undefined && response.data.imdbRating && response.data.imdbRating !== 'N/A') {
      const parsed = parseFloat(response.data.imdbRating);
      if (!isNaN(parsed)) ratings.imdbRating = parsed;
    }
    if (ratings.metacriticRating === undefined && response.data.Metascore && response.data.Metascore !== 'N/A') {
      const parsed = parseInt(response.data.Metascore, 10);
      if (!isNaN(parsed)) ratings.metacriticRating = parsed;
    }

    return ratings;
  } catch (error: any) {
    console.warn(`   ⚠️ Erro ao buscar OMDb (${imdbId}): ${error?.message || error}`);
    return {};
  }
}

async function main() {
  const args = process.argv.slice(2);
  let searchTitle: string | undefined;
  let searchYear: number | undefined;
  let dryRun = false;
  let runAll = false;
  let limit: number | undefined;
  let skip: number | undefined;

  for (const arg of args) {
    if (arg.startsWith('--title=')) {
      searchTitle = arg.split('=')[1].replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--year=') || arg.startsWith('-y=')) {
      searchYear = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--dry-run' || arg === '--preview') {
      dryRun = true;
    } else if (arg === '--all' || arg === 'all') {
      runAll = true;
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--skip=')) {
      skip = parseInt(arg.split('=')[1], 10);
    }
  }

  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY não configurada no ambiente.');
    process.exit(1);
  }
  if (!OMDB_API_KEY) {
    console.error('❌ OMDB_API_KEY não configurada no ambiente.');
    process.exit(1);
  }

  const currentYear = new Date().getFullYear();
  const minRecentYear = currentYear - 2;

  let whereClause: Prisma.MovieWhereInput = {};

  if (searchTitle) {
    whereClause = {
      title: { contains: searchTitle, mode: 'insensitive' },
      ...(searchYear ? { year: searchYear } : {})
    };
  } else if (runAll) {
    whereClause = { tmdbId: { not: null } };
  } else {
    // Modo padrão inteligente:
    // 1. Filmes lançados nos últimos 2 anos (notas mudam com frequência ou saem depois)
    // 2. Qualquer filme que ainda esteja sem imdbRating ou sem rottenTomatoesRating
    whereClause = {
      tmdbId: { not: null },
      OR: [
        { year: { gte: minRecentYear } },
        { imdbRating: null },
        { rottenTomatoesRating: null }
      ]
    };
  }

  const movies = await prisma.movie.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      vote_average: true,
      vote_count: true,
      imdbRating: true,
      rottenTomatoesRating: true,
      metacriticRating: true
    },
    orderBy: [{ year: 'desc' }, { title: 'asc' }],
    ...(limit ? { take: limit } : {}),
    ...(skip ? { skip } : {})
  });

  console.log(`🎬 === ATUALIZAÇÃO DE RATINGS (TMDB + OMDb) ===`);
  console.log(`📊 Filmes selecionados para verificação: ${movies.length}${dryRun ? ' [MODO DRY-RUN]' : ''}\n`);

  let updatedCount = 0;
  let unchangedCount = 0;
  let skippedNoImdb = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    if (!movie.tmdbId) continue;

    const tmdbData = await fetchTmdbData(movie.tmdbId);
    if (!tmdbData) continue;

    const omdbRatings = tmdbData.imdb_id ? await fetchOmdbRatings(tmdbData.imdb_id) : {};
    if (!tmdbData.imdb_id) {
      skippedNoImdb++;
    }

    const updateData: Prisma.MovieUpdateInput = {};
    const changes: string[] = [];

    // 1. TMDB vote_average (arredondado para 1 casa decimal)
    if (typeof tmdbData.vote_average === 'number' && tmdbData.vote_average > 0) {
      const newTmdbVote = Number(tmdbData.vote_average.toFixed(1));
      const oldTmdbVote = movie.vote_average != null ? Number(movie.vote_average) : null;
      if (oldTmdbVote !== newTmdbVote) {
        updateData.vote_average = new Prisma.Decimal(newTmdbVote);
        changes.push(`TMDB: ${oldTmdbVote ?? 'null'} -> ${newTmdbVote}`);
      }
    }

    // 2. TMDB vote_count
    if (typeof tmdbData.vote_count === 'number' && tmdbData.vote_count > 0) {
      if (movie.vote_count !== tmdbData.vote_count) {
        updateData.vote_count = tmdbData.vote_count;
      }
    }

    // 3. IMDb Rating
    if (omdbRatings.imdbRating !== undefined) {
      const newImdb = Number(omdbRatings.imdbRating.toFixed(1));
      const oldImdb = movie.imdbRating != null ? Number(movie.imdbRating) : null;
      if (oldImdb !== newImdb) {
        updateData.imdbRating = new Prisma.Decimal(newImdb);
        changes.push(`IMDb: ${oldImdb ?? 'null'} -> ${newImdb}`);
      }
    }

    // 4. Rotten Tomatoes Rating
    if (omdbRatings.rottenTomatoesRating !== undefined) {
      const newRt = omdbRatings.rottenTomatoesRating;
      if (movie.rottenTomatoesRating !== newRt) {
        updateData.rottenTomatoesRating = newRt;
        changes.push(`RT: ${movie.rottenTomatoesRating ?? 'null'}% -> ${newRt}%`);
      }
    }

    // 5. Metacritic Rating
    if (omdbRatings.metacriticRating !== undefined) {
      const newMeta = omdbRatings.metacriticRating;
      if (movie.metacriticRating !== newMeta) {
        updateData.metacriticRating = newMeta;
        changes.push(`Metacritic: ${movie.metacriticRating ?? 'null'} -> ${newMeta}`);
      }
    }

    if (Object.keys(updateData).length > 0) {
      if (!dryRun) {
        await prisma.movie.update({
          where: { id: movie.id },
          data: updateData
        });
      }
      if (changes.length > 0) {
        updatedCount++;
        console.log(`✅ [${i + 1}/${movies.length}] "${movie.title}" (${movie.year}): ${changes.join(' | ')}`);
      } else {
        unchangedCount++;
      }
    } else {
      unchangedCount++;
    }

    // Pausa leve de 150ms para respeitar rate-limits
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n==================================================`);
  console.log(`📊 RESUMO DA ATUALIZAÇÃO DE RATINGS:`);
  console.log(`   🔍 Total verificado: ${movies.length}`);
  console.log(`   ✅ Com alterações de nota: ${updatedCount}`);
  console.log(`   ➖ Sem alteração nas notas: ${unchangedCount}`);
  if (skippedNoImdb > 0) {
    console.log(`   ⚠️ Sem IMDb ID no TMDB: ${skippedNoImdb}`);
  }
  console.log(`==================================================`);
}

main()
  .catch(err => {
    console.error('❌ Erro fatal em updateMovieRatings:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


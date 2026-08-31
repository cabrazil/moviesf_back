/// <reference types="node" />
import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { formatAwardsForLP } from './populateMovies';

const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, params: Record<string, any>, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get<any>(url, { params });
    } catch (error: any) {
      if (error.response && error.response.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '2', 10);
        console.warn(`⚠️ HTTP 429 (Rate Limit). Aguardando ${retryAfter}s para tentar novamente (tentativa ${attempt}/${maxRetries})...`);
        await delay(retryAfter * 1000);
      } else {
        throw error;
      }
    }
  }
}

async function getImdbId(tmdbId: number): Promise<string | null> {
  if (!TMDB_API_KEY) return null;
  try {
    const response = await fetchWithRetry(`https://api.themoviedb.org/3/movie/${tmdbId}/external_ids`, { api_key: TMDB_API_KEY });
    return response.data?.imdb_id || null;
  } catch (error) {
    return null;
  }
}

async function getOmdbAwardsRaw(imdbId: string): Promise<string | null> {
  if (!OMDB_API_KEY) return null;
  try {
    const response = await fetchWithRetry('http://www.omdbapi.com/', { i: imdbId, apikey: OMDB_API_KEY });
    if (response.data && response.data.Response === 'False' && response.data.Error?.includes('limit')) {
      console.error('❌ Limite diário da chave OMDb atingido!');
    }
    if (response.data && response.data.Response !== 'False' && response.data.Awards) {
      return response.data.Awards;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function main() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const minYear = currentYear - 1;

  console.log(`[${now.toISOString()}] 🤖 INICIANDO CRON: ATUALIZAÇÃO ANUAL DE PREMIAÇÕES DO OSCAR`);
  console.log(`[${now.toISOString()}] 📅 Filtrando filmes lançados entre ${minYear} e ${currentYear}...`);

  if (!OMDB_API_KEY || !TMDB_API_KEY) {
    console.error(`[${now.toISOString()}] ❌ OMDB_API_KEY ou TMDB_API_KEY não configuradas.`);
    process.exit(1);
  }

  // Buscar filmes recentes
  const recentMovies = await prisma.movie.findMany({
    where: {
      year: {
        gte: minYear
      }
    },
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      awardsSummary: true
    },
    orderBy: { year: 'desc' }
  });

  console.log(`[${now.toISOString()}] 📊 Total de filmes recentes a processar: ${recentMovies.length}`);

  let oscarCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < recentMovies.length; i++) {
    const movie = recentMovies[i];

    if (!movie.tmdbId) continue;

    const imdbId = await getImdbId(movie.tmdbId);
    if (!imdbId) continue;

    const rawAwards = await getOmdbAwardsRaw(imdbId);
    const newOscarSummary = rawAwards ? formatAwardsForLP(rawAwards) : null;

    if (newOscarSummary !== movie.awardsSummary) {
      await prisma.movie.update({
        where: { id: movie.id },
        data: { awardsSummary: newOscarSummary }
      });
      updatedCount++;
      if (newOscarSummary) {
        oscarCount++;
        console.log(`[${now.toISOString()}] 🏆 "${movie.title}" (${movie.year}) -> "${newOscarSummary}"`);
      } else {
        console.log(`[${now.toISOString()}] ⚪ "${movie.title}" (${movie.year}) -> Limpo (sem Oscar)`);
      }
    }

    await delay(200);
  }

  console.log(`[${now.toISOString()}] ✅ CRON FINALIZADO COM SUCESSO!`);
  console.log(`[${now.toISOString()}] 📊 Filmes analisados: ${recentMovies.length} | Filmes com Oscar: ${oscarCount} | Atualizados no DB: ${updatedCount}`);
}

main()
  .catch(err => {
    console.error(`[${new Date().toISOString()}] ❌ Erro fatal no cron de Oscars:`, err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

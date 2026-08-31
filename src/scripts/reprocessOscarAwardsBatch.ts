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
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  console.log('🎬 INICIANDO REPROCESSAMENTO DE PREMIAÇÕES DO OSCAR PARA BASE DE FILMES');
  console.log('='.repeat(75));
  if (isDryRun) {
    console.log('🔍 MODO DRY-RUN ATIVADO (Nenhum dado será alterado no banco de dados)');
  }
  if (limit) {
    console.log(`⏱️ Limite de filmes configurado para: ${limit}`);
  }

  if (!OMDB_API_KEY) {
    console.error('❌ OMDB_API_KEY não configurada no ambiente.');
    process.exit(1);
  }
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY não configurada no ambiente.');
    process.exit(1);
  }

  // Buscar todos os filmes da base
  let movies = await prisma.movie.findMany({
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      awardsSummary: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (limit) {
    movies = movies.slice(0, limit);
  }

  console.log(`📊 Total de filmes a reprocessar: ${movies.length}`);
  console.log('='.repeat(75));

  let oscarCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    const indexStr = `[${i + 1}/${movies.length}]`;

    try {
      if (!movie.tmdbId) {
        console.log(`${indexStr} ⚠️ "${movie.title}" - Sem TMDB ID. Pulando.`);
        continue;
      }

      // 1. Obter IMDb ID
      const imdbId = await getImdbId(movie.tmdbId);
      if (!imdbId) {
        console.log(`${indexStr} ⚠️ "${movie.title}" (${movie.year}) - IMDb ID não encontrado.`);
        continue;
      }

      // 2. Obter premiação bruta OMDb
      const rawAwards = await getOmdbAwardsRaw(imdbId);

      // 3. Formatar exclusivamente para Oscar
      const newOscarSummary = rawAwards ? formatAwardsForLP(rawAwards) : null;

      if (newOscarSummary) {
        oscarCount++;
        console.log(`${indexStr} 🏆 "${movie.title}" (${movie.year}) -> "${newOscarSummary}"`);
      } else {
        console.log(`${indexStr} ⚪ "${movie.title}" (${movie.year}) -> Sem Oscar (limpo)`);
      }

      // 4. Salvar no banco
      if (!isDryRun) {
        await prisma.movie.update({
          where: { id: movie.id },
          data: { awardsSummary: newOscarSummary }
        });
        updatedCount++;
      }

    } catch (err: any) {
      errorCount++;
      console.error(`${indexStr} ❌ Erro ao processar "${movie.title}":`, err.message);
    }

    // Rate limiting delay (200ms entre requisições)
    await delay(200);
  }

  console.log('\n' + '='.repeat(75));
  console.log('🎉 REPROCESSAMENTO CONCLUÍDO!');
  console.log(`📽️ Filmes analisados: ${movies.length}`);
  console.log(`🏆 Filmes com reconhecimentos do Oscar: ${oscarCount}`);
  console.log(`💾 Registros atualizados no banco: ${isDryRun ? 0 : updatedCount}`);
  if (errorCount > 0) {
    console.log(`⚠️ Erros encontrados: ${errorCount}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

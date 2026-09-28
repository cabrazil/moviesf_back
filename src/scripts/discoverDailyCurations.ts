import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DEFAULT_OBSIDIAN_PATH = '/mnt/d/Obsidian/CarlosB/Projetos/Vibesfilm';
const OBSIDIAN_PATH = process.env.OBSIDIAN_VIBESFILM_PATH || DEFAULT_OBSIDIAN_PATH;

interface JofSummary {
  id: number;
  fileName: string;
  stepId?: string;
  mainSentiment: string;
  intentions: string[];
  journey: string;
  essence: string;
  strongMoviesRaw: string[];
  readyMovies: {
    title: string;
    year: number | null;
    tmdbId: number | null;
    platforms: string[];
  }[];
  missingMovies: string[];
  isFullyReady: boolean; // >= 3 filmes com streaming no banco
  alreadyUsedInDaily: boolean;
}

/**
 * Lê o Frontmatter e seções de uma JOF
 */
function parseJof(filePath: string): {
  id: number;
  stepId?: string;
  mainSentiment: string;
  intentions: string[];
  journey: string;
  essence: string;
  movies: string[];
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const baseName = path.basename(filePath);
  const idMatch = baseName.match(/\d+/);
  const id = idMatch ? parseInt(idMatch[0], 10) : 0;

  let mainSentiment = 'Geral';
  let stepId: string | undefined;
  let intentions: string[] = [];

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const sMatch = fm.match(/main_sentiment:\s*["']?([^"'\r\n]+)["']?/i);
    if (sMatch) mainSentiment = sMatch[1].trim();

    const stMatch = fm.match(/step_id:\s*["']?([^"'\r\n]+)["']?/i);
    if (stMatch) stepId = stMatch[1].trim();

    const intMatch = fm.match(/intentions:\s*\[(.*?)\]/i);
    if (intMatch) {
      intentions = intMatch[1].split(',').map(i => i.replace(/["'\s]/g, '')).filter(Boolean);
    }
  }

  const journeyMatch = content.match(/## Jornada emocional\s*\r?\n(?:>\s*)?["']?([^"\r\n]+)["']?/i);
  const journey = journeyMatch ? journeyMatch[1].trim() : '';

  const essenceMatch = content.match(/## Essência da jornada\s*\r?\n([\s\S]*?)(?:\r?\n---|\r?\n##|$)/i);
  const essence = essenceMatch ? essenceMatch[1].replace(/\r?\n/g, ' ').trim() : '';

  const movies: string[] = [];
  const moviesMatch = content.match(/## Filmes com encaixe forte\s*\r?\n([\s\S]*?)(?:\r?\n---|\r?\n##|$)/i);
  if (moviesMatch) {
    const lines = moviesMatch[1].split(/\r?\n/);
    for (const l of lines) {
      const m = l.match(/^\s*-\s*\[\[([^\]|]+)/);
      if (m) movies.push(m[1].trim());
    }
  }

  return { id, stepId, mainSentiment, intentions, journey, essence, movies };
}

/**
 * Lê nota de filme no Obsidian para achar tmdb_id
 */
function getMovieTmdb(movieName: string): number | null {
  const filmesDir = path.join(OBSIDIAN_PATH, 'Filmes');
  const possibleNames = [
    `${movieName}.md`,
    `${movieName.replace(/:/g, '-')}.md`,
    `${movieName.replace(/-/g, ':')}.md`,
  ];

  for (const name of possibleNames) {
    const p = path.join(filmesDir, name);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      const m = content.match(/tmdb_id:\s*(\d+)/i);
      if (m) return parseInt(m[1], 10);
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  let filterSentiment: string | undefined;
  let filterIntention: string | undefined;
  let recommendMode = false;
  let topN = 10;

  for (const arg of args) {
    if (arg.startsWith('--sentiment=')) {
      filterSentiment = arg.split('=')[1].toLowerCase();
    } else if (arg.startsWith('--intention=')) {
      filterIntention = arg.split('=')[1].toUpperCase();
    } else if (arg === '--recommend' || arg === '-r') {
      recommendMode = true;
    } else if (arg.startsWith('--limit=')) {
      topN = parseInt(arg.split('=')[1], 10);
    }
  }

  console.log(`\n===========================================================`);
  console.log(`🧭 Radar Jev: Descoberta Inteligente de Curadorias`);
  console.log(`📁 Vault Obsidian: ${OBSIDIAN_PATH}`);
  console.log(`===========================================================\n`);

  const jofsDir = path.join(OBSIDIAN_PATH, 'JOFs');
  if (!fs.existsSync(jofsDir)) {
    console.error(`❌ Diretório de JOFs não encontrado: ${jofsDir}`);
    process.exit(1);
  }

  // 1. Carregar todas as DailyCurations existentes para evitar repetição
  const existingCurations = await prisma.dailyCuration.findMany({
    select: {
      id: true,
      movieIds: true,
      headerPhrase: true,
    },
  });

  const usedMovieIds = new Set<string>();
  existingCurations.forEach(c => c.movieIds.forEach(id => usedMovieIds.add(id)));

  // 2. Pré-carregar filmes do banco em memória para busca ultrarrápida
  const allDbMovies = await prisma.movie.findMany({
    select: {
      id: true,
      title: true,
      year: true,
      tmdbId: true,
      platforms: {
        select: {
          streamingPlatform: {
            select: { name: true },
          },
        },
      },
    },
  });

  const movieByTmdb = new Map<number, typeof allDbMovies[0]>();
  const movieByTitle = new Map<string, typeof allDbMovies[0]>();

  for (const m of allDbMovies) {
    if (m.tmdbId) movieByTmdb.set(m.tmdbId, m);
    movieByTitle.set(m.title.toLowerCase(), m);
  }

  // 3. Varrer todas as JOFs do Obsidian
  const jofFiles = fs.readdirSync(jofsDir).filter(f => f.endsWith('.md'));
  const summaries: JofSummary[] = [];

  for (const file of jofFiles) {
    const parsed = parseJof(path.join(jofsDir, file));
    if (parsed.id === 0) continue;

    // Resolver filmes
    const readyMovies: JofSummary['readyMovies'] = [];
    const missingMovies: string[] = [];

    for (const movieTarget of parsed.movies) {
      const tmdbId = getMovieTmdb(movieTarget);
      let dbMovie = tmdbId ? movieByTmdb.get(tmdbId) : undefined;
      if (!dbMovie) {
        dbMovie = movieByTitle.get(movieTarget.toLowerCase());
      }

      if (dbMovie) {
        const platforms = dbMovie.platforms.map(p => p.streamingPlatform?.name).filter(Boolean) as string[];
        if (platforms.length > 0) {
          readyMovies.push({
            title: dbMovie.title,
            year: dbMovie.year,
            tmdbId: dbMovie.tmdbId,
            platforms,
          });
        } else {
          missingMovies.push(`${movieTarget} (Sem streaming)`);
        }
      } else {
        missingMovies.push(`${movieTarget} (Fora do banco)`);
      }
    }

    // Verificar se já foi usada
    const hasOverlap = readyMovies.some(rm => {
      const found = allDbMovies.find(m => m.tmdbId === rm.tmdbId);
      return found && usedMovieIds.has(found.id);
    });

    summaries.push({
      id: parsed.id,
      fileName: file,
      stepId: parsed.stepId,
      mainSentiment: parsed.mainSentiment,
      intentions: parsed.intentions,
      journey: parsed.journey,
      essence: parsed.essence,
      strongMoviesRaw: parsed.movies,
      readyMovies,
      missingMovies,
      isFullyReady: readyMovies.length >= 3,
      alreadyUsedInDaily: hasOverlap,
    });
  }

  // Estatísticas gerais
  const totalJofs = summaries.length;
  const readyJofs = summaries.filter(s => s.isFullyReady);
  const unusedReadyJofs = readyJofs.filter(s => !s.alreadyUsedInDaily);

  console.log(`📊 Panorama do Acervo Editorial:`);
  console.log(`   - Total de JOFs no Obsidian: ${totalJofs}`);
  console.log(`   - JOFs com 3+ filmes prontos com streaming: ${readyJofs.length}`);
  console.log(`   - JOFs 100% PRONTAS e NUNCA USADAS em curadorias: ${unusedReadyJofs.length} 🚀\n`);

  // Filtros
  let candidates = unusedReadyJofs;

  if (filterSentiment) {
    candidates = candidates.filter(c => c.mainSentiment.toLowerCase().includes(filterSentiment!));
  }

  if (filterIntention) {
    candidates = candidates.filter(c => c.intentions.includes(filterIntention!));
  }

  // Agrupar por sentimento para exibição
  const sentimentCounts: Record<string, number> = {};
  unusedReadyJofs.forEach(c => {
    sentimentCounts[c.mainSentiment] = (sentimentCounts[c.mainSentiment] || 0) + 1;
  });

  console.log(`🌈 Sentimentos disponíveis no acervo inédito:`);
  Object.entries(sentimentCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sent, count]) => {
      console.log(`   • ${sent}: ${count} JOF(s) prontas`);
    });
  console.log(`-----------------------------------------------------------\n`);

  if (candidates.length === 0) {
    console.log(`⚠️ Nenhuma JOF encontrada com os filtros informados.`);
    process.exit(0);
  }

  // Modo Recomendação ou Lista
  console.log(`💡 Sugestões de Curadorias Prontas para Entrar no Ar (Top ${Math.min(topN, candidates.length)}):`);
  console.log(`===========================================================`);

  const displayList = candidates.slice(0, topN);

  displayList.forEach((jof, idx) => {
    const top3 = jof.readyMovies.slice(0, 3);
    const movieText = top3.map(m => `"${m.title}" (${m.year}) [${m.platforms.slice(0, 2).join(', ')}]`).join(', ');

    console.log(`\n${idx + 1}. 🎯 JOF ${jof.id} — Sentimento: ${jof.mainSentiment} [${jof.intentions.join(', ')}]`);
    console.log(`   💬 Jornada: "${jof.journey || jof.essence || 'Sem descrição'}"`);
    console.log(`   🎬 Filmes Prontos (${jof.readyMovies.length} disponíveis): ${movieText}`);
    console.log(`   ⚡ Comando para gerar:`);
    console.log(`      npx ts-node src/scripts/generateDailyCurationFromJof.ts ${jof.id} --renew-expired --apply`);
  });

  console.log(`\n===========================================================`);
  console.log(`✨ Dica: Você pode filtrar por sentimento ou intenção:`);
  console.log(`   npx ts-node src/scripts/discoverDailyCurations.ts --sentiment="Cansado"`);
  console.log(`   npx ts-node src/scripts/discoverDailyCurations.ts --sentiment="Ansioso" --intention="MAINTAIN"`);
  console.log(`===========================================================\n`);
}

main()
  .catch(err => {
    console.error('💥 Erro fatal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

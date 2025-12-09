/// <reference types="node" />
// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';


import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY;

// Interfaces
interface TMDBExternalIds {
  imdb_id: string | null;
}

interface OMDBMovieResponse {
  Title: string;
  Year: string;
  Awards: string;
  Response: 'True' | 'False';
  Error?: string;
}

interface UpdateResult {
  movieId: string;
  title: string;
  tmdbId: number | null;
  imdbId: string | null;
  success: boolean;
  awardsSummary: string | null;
  error?: string;
}

/**
 * Busca IMDb ID usando TMDB ID
 */
async function getImdbId(tmdbId: number): Promise<string | null> {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB API key não configurada');
    return null;
  }

  try {
    const response = await axios.get<TMDBExternalIds>(
      `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids`,
      {
        params: { api_key: TMDB_API_KEY }
      }
    );

    return response.data.imdb_id;
  } catch (error) {
    console.error(`❌ Erro ao buscar IMDb ID para TMDB ${tmdbId}:`, error);
    return null;
  }
}

/**
 * Busca premiações do OMDB usando IMDb ID
 */
async function getOMDBAwards(imdbId: string): Promise<string | null> {
  if (!OMDB_API_KEY) {
    console.error('❌ OMDB API key não configurada');
    return null;
  }

  try {
    const response = await axios.get<OMDBMovieResponse>('http://www.omdbapi.com/', {
      params: {
        i: imdbId,
        apikey: OMDB_API_KEY,
        plot: 'short'
      }
    });

    if (response.data.Response === 'False') {
      return null;
    }

    const awards = response.data.Awards;
    if (!awards || awards === 'N/A') {
      return null;
    }

    return formatAwardsForLP(awards);
  } catch (error) {
    console.error(`❌ Erro ao buscar OMDB para IMDb ${imdbId}:`, error);
    return null;
  }
}

/**
 * Formata as premiações para exibição na Landing Page
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
 * Processa um único filme para buscar e atualizar premiações
 */
async function processMovieAwards(movieId: string, title: string, tmdbId: number | null, dryRun: boolean = false): Promise<UpdateResult> {
  const result: UpdateResult = {
    movieId,
    title,
    tmdbId,
    imdbId: null,
    success: false,
    awardsSummary: null
  };

  console.log(`🎬 Processando: ${title} (TMDB: ${tmdbId || 'N/A'})`);

  // Verificar se já tem awardsSummary
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { awardsSummary: true }
  });

  if (movie?.awardsSummary) {
    console.log(`   ⏭️  Já possui premiações: "${movie.awardsSummary}"`);
    result.success = true;
    result.awardsSummary = movie.awardsSummary;
    return result;
  }

  if (!tmdbId) {
    console.log(`   ❌ Sem TMDB ID`);
    result.error = 'Sem TMDB ID';
    return result;
  }

  try {
    // 1. Buscar IMDb ID
    console.log(`   📋 Buscando IMDb ID...`);
    const imdbId = await getImdbId(tmdbId);
    result.imdbId = imdbId;

    if (!imdbId) {
      console.log(`   ❌ IMDb ID não encontrado`);
      result.error = 'IMDb ID não encontrado';
      return result;
    }

    console.log(`   ✅ IMDb ID: ${imdbId}`);

    // 2. Buscar premiações
    console.log(`   🏆 Buscando premiações...`);
    const awardsSummary = await getOMDBAwards(imdbId);

    if (!awardsSummary) {
      console.log(`   ❌ Nenhuma premiação encontrada`);
      result.error = 'Nenhuma premiação encontrada';
      return result;
    }

    console.log(`   ✅ Premiações: "${awardsSummary}"`);
    result.awardsSummary = awardsSummary;

    // 3. Atualizar banco (se não for dry-run)
    if (!dryRun) {
      await prisma.movie.update({
        where: { id: movieId },
        data: { awardsSummary }
      });
      console.log(`   💾 Salvo no banco de dados`);
    } else {
      console.log(`   🧪 DRY-RUN: Seria salvo no banco`);
    }

    result.success = true;
    return result;

  } catch (error) {
    console.error(`   ❌ Erro inesperado:`, error);
    result.error = `Erro inesperado: ${error}`;
    return result;
  }
}

/**
 * Atualiza premiações para todos os filmes
 */
async function updateAllMovieAwards(dryRun: boolean = false, limit?: number): Promise<void> {
  console.log('🎬 INICIANDO ATUALIZAÇÃO DE PREMIAÇÕES');
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('🧪 MODO DRY-RUN: Nenhuma alteração será salva no banco');
  }
  
  if (limit) {
    console.log(`📊 Limitado a ${limit} filmes`);
  }
  
  console.log('');

  try {
    // Buscar filmes que não possuem awardsSummary ou que possuem tmdbId
    const movies = await prisma.movie.findMany({
      where: {
        AND: [
          { tmdbId: { not: null } },
          {
            OR: [
              { awardsSummary: null },
              { awardsSummary: '' }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        tmdbId: true,
        awardsSummary: true
      },
      orderBy: { title: 'asc' },
      ...(limit && { take: limit })
    });

    console.log(`📊 Encontrados ${movies.length} filmes para processar\n`);

    const results: UpdateResult[] = [];
    let processedCount = 0;

    for (const movie of movies) {
      try {
        const result = await processMovieAwards(movie.id, movie.title, movie.tmdbId, dryRun);
        results.push(result);
        processedCount++;

        // Delay para não sobrecarregar as APIs
        if (processedCount % 5 === 0) {
          console.log(`   ⏸️  Pausa de 2s para evitar rate limit...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('');
      } catch (error) {
        console.error(`❌ Erro ao processar filme ${movie.title}:`, error);
        results.push({
          movieId: movie.id,
          title: movie.title,
          tmdbId: movie.tmdbId,
          imdbId: null,
          success: false,
          awardsSummary: null,
          error: `Erro: ${error}`
        });
      }
    }

    // Relatório final
    console.log('='.repeat(60));
    console.log('📊 RELATÓRIO FINAL');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const withAwards = results.filter(r => r.success && r.awardsSummary);
    const errors = results.filter(r => !r.success);

    console.log(`📈 Total processado: ${results.length}`);
    console.log(`✅ Sucessos: ${successful.length}`);
    console.log(`🏆 Com premiações: ${withAwards.length}`);
    console.log(`❌ Erros: ${errors.length}`);

    if (withAwards.length > 0) {
      console.log('\n🏆 FILMES COM PREMIAÇÕES ENCONTRADAS:');
      withAwards.forEach(movie => {
        console.log(`   • ${movie.title}: "${movie.awardsSummary}"`);
      });
    }

    if (errors.length > 0) {
      console.log('\n❌ ERROS ENCONTRADOS:');
      errors.slice(0, 10).forEach(movie => {
        console.log(`   • ${movie.title}: ${movie.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... e mais ${errors.length - 10} erros`);
      }
    }

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Função principal
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  let dryRun = false;
  let limit: number | undefined;

  // Processar argumentos
  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
      if (isNaN(limit)) {
        console.error('❌ Limite deve ser um número válido');
        process.exit(1);
      }
    } else if (arg === '--help') {
      console.log('🎬 Script de Atualização de Premiações');
      console.log('');
      console.log('Uso: npx ts-node src/scripts/updateMovieAwards.ts [opções]');
      console.log('');
      console.log('Opções:');
      console.log('  --dry-run        Executa sem salvar no banco (modo teste)');
      console.log('  --limit=N        Limita o processamento a N filmes');
      console.log('  --help           Mostra esta ajuda');
      console.log('');
      console.log('Exemplos:');
      console.log('  npx ts-node src/scripts/updateMovieAwards.ts --dry-run');
      console.log('  npx ts-node src/scripts/updateMovieAwards.ts --limit=10');
      console.log('  npx ts-node src/scripts/updateMovieAwards.ts --dry-run --limit=5');
      process.exit(0);
    }
  }

  if (!TMDB_API_KEY || !OMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY e OMDB_API_KEY devem estar configuradas no .env');
    process.exit(1);
  }

  try {
    await updateAllMovieAwards(dryRun, limit);
  } catch (error) {
    console.error('❌ Erro na execução:', error);
    process.exit(1);
  }
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
  main();
}

export { updateAllMovieAwards, processMovieAwards, formatAwardsForLP };

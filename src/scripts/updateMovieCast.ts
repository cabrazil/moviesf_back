/// <reference types="node" />
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

interface TMDBActorResponse {
  id: number;
  name: string;
  profile_path: string | null;
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
    const response = await axios.get<TMDBActorResponse>(`${TMDB_API_URL}/person/${tmdbId}`, {
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
      .sort((a, b) => a.order - b.order);

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

    console.log(`🎭 Encontrados ${mainCast.length} atores principais para o filme ${movieId}`);
    return mainCast;
  } catch (error) {
    console.error(`Erro ao buscar elenco para o filme ${movieId}:`, error);
    return [];
  }
}

async function updateMovieCast(movieId: string, tmdbId: number, movieTitle: string): Promise<boolean> {
  try {
    console.log(`\n=== Atualizando elenco: ${movieTitle} (TMDB: ${tmdbId}) ===`);

    // Verificar se já tem elenco
    const existingCast = await prisma.movieCast.findFirst({
      where: { movieId }
    });

    if (existingCast) {
      console.log(`⚠️ Filme já possui elenco. Pulando...`);
      return false;
    }

    // Buscar elenco do TMDB
    const cast = await getMovieCast(tmdbId);

    if (cast.length === 0) {
      console.log(`⚠️ Nenhum ator encontrado para o filme`);
      return false;
    }

    // Inserir elenco
    console.log(`🎭 Inserindo ${cast.length} atores do elenco...`);
    
    for (const actorData of cast) {
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
            movieId: movieId,
            actorId: actor.id,
            characterName: actorData.character,
            order: actorData.order
          }
        });
        console.log(`✅ ${actorData.name} como ${actorData.character}`);
      } catch (error) {
        console.log(`❌ Erro ao inserir ator ${actorData.name}: ${error}`);
      }
    }

    console.log(`✅ Elenco atualizado com sucesso: ${movieTitle}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao atualizar elenco de ${movieTitle}:`, error);
    return false;
  }
}

async function updateMoviesCast(batchSize: number = 10, dryRun: boolean = false) {
  console.log(`\n=== Atualizando Elenco dos Filmes ===`);
  console.log(`📊 Tamanho do batch: ${batchSize}`);
  if (dryRun) {
    console.log(`🔍 MODO DRY-RUN: Apenas logs, sem modificar banco`);
  }

  try {
    // Buscar filmes sem elenco
    const moviesWithoutCast = await prisma.movie.findMany({
      where: {
        tmdbId: { not: null },
        cast: { none: {} }
      },
      select: {
        id: true,
        title: true,
        tmdbId: true
      },
      take: batchSize
    });

    console.log(`📋 Encontrados ${moviesWithoutCast.length} filmes sem elenco`);

    if (moviesWithoutCast.length === 0) {
      console.log(`✅ Todos os filmes já possuem elenco!`);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const movie of moviesWithoutCast) {
      if (!movie.tmdbId) {
        console.log(`⚠️ Filme ${movie.title} não possui TMDB ID. Pulando...`);
        continue;
      }

      if (dryRun) {
        console.log(`🔍 DRY-RUN: Processaria ${movie.title} (TMDB: ${movie.tmdbId})`);
        successCount++;
      } else {
        const success = await updateMovieCast(movie.id, movie.tmdbId, movie.title);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      // Pausa entre requisições para não sobrecarregar a API
      if (!dryRun) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo de pausa
      }
    }

    console.log(`\n=== Resumo da Atualização ===`);
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📊 Total processado: ${moviesWithoutCast.length}`);

  } catch (error) {
    console.error(`❌ Erro geral:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

// Processar argumentos da linha de comando
if (require.main === module) {
  const args = process.argv.slice(2);
  let batchSize = 10;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--batch=')) {
      batchSize = parseInt(args[i].split('=')[1]) || 10;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  console.log(`\nUso: npx ts-node src/scripts/updateMovieCast.ts [--batch=10] [--dry-run]`);
  console.log(`  --batch=10: Processar 10 filmes por vez (padrão)`);
  console.log(`  --dry-run: Apenas simular, sem modificar banco`);

  updateMoviesCast(batchSize, dryRun);
}

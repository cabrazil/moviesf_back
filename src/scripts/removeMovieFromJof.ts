// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import { updateRelevanceRankingForMovie } from '../utils/relevanceRanking';

const prisma = new PrismaClient();

interface ScriptOptions {
  title?: string;
  year?: number;
  movieId?: string;
  tmdbId?: number;
  jofIds: number[];
  preview: boolean;
  removeAll: boolean;
}

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    jofIds: [],
    preview: false,
    removeAll: false
  };

  for (const arg of args) {
    if (arg.startsWith('--title=')) {
      options.title = arg.split('=')[1].replace(/^["']|["']$/g, '').trim();
    } else if (arg.startsWith('--year=') || arg.startsWith('-y=')) {
      options.year = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--movieId=') || arg.startsWith('--id=')) {
      options.movieId = arg.split('=')[1].replace(/^["']|["']$/g, '').trim();
    } else if (arg.startsWith('--tmdb=') || arg.startsWith('--tmdbId=')) {
      options.tmdbId = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--jof=') || arg.startsWith('--jofId=')) {
      const val = arg.split('=')[1].replace(/^["']|["']$/g, '').trim();
      options.jofIds = val.split(',').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n));
    } else if (arg === '--preview' || arg === '--dry-run') {
      options.preview = true;
    } else if (arg === '--all') {
      options.removeAll = true;
    } else if (!arg.startsWith('--') && !options.title) {
      options.title = arg.replace(/^["']|["']$/g, '').trim();
    }
  }

  return options;
}

function printHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║               🎬 REMOVE MOVIE FROM JOF - GERENCIADOR DE INTRUSOS             ║
╚══════════════════════════════════════════════════════════════════════════════╝

Permite inspecionar e remover associações de filmes na tabela MovieSuggestionFlow.

USO RECOMENDADO:

1. Inspecionar as jornadas onde um filme está cadastrado:
   npx ts-node src/scripts/removeMovieFromJof.ts --title="Viva: A Vida é uma Festa" --year=2017

2. Remover um filme de uma JOF específica (intruso):
   npx ts-node src/scripts/removeMovieFromJof.ts --title="Viva: A Vida é uma Festa" --year=2017 --jof=82

3. Testar a remoção sem apagar nada no banco (Dry-Run / Preview):
   npx ts-node src/scripts/removeMovieFromJof.ts --title="Viva: A Vida é uma Festa" --jof=82 --preview

4. Inspecionar todos os filmes cadastrados em uma JOF para achar intrusos:
   npx ts-node src/scripts/removeMovieFromJof.ts --jof=82

5. Remover múltiplos filmes ou de múltiplas JOFs:
   npx ts-node src/scripts/removeMovieFromJof.ts --title="Nome do Filme" --jof=82,134

OPÇÕES:
  --title="Nome"        Título do filme (busca case-insensitive)
  --year=AAAA           Ano de lançamento (opcional para desambiguar)
  --jof=ID              ID da JourneyOptionFlow a ser removida (ou lista: --jof=82,134)
  --movieId=UUID        UUID do filme diretamente no banco
  --tmdbId=12345        TMDB ID do filme
  --preview, --dry-run  Apenas simula a operação, sem deletar nada
  --all                 Remove todas as JOFs do filme especificado
`);
}

async function findTargetMovie(options: ScriptOptions) {
  if (options.movieId) {
    return await prisma.movie.findUnique({
      where: { id: options.movieId }
    });
  }

  if (options.tmdbId) {
    return await prisma.movie.findUnique({
      where: { tmdbId: options.tmdbId }
    });
  }

  if (!options.title) {
    return null;
  }

  const movies = await prisma.movie.findMany({
    where: {
      ...(options.year ? { year: options.year } : {}),
      OR: [
        { title: { equals: options.title, mode: 'insensitive' } },
        { title: { contains: options.title, mode: 'insensitive' } },
        { original_title: { contains: options.title, mode: 'insensitive' } }
      ]
    }
  });

  if (movies.length === 0) {
    console.error(`❌ Nenhum filme encontrado com o título "${options.title}"${options.year ? ` (${options.year})` : ''}.`);
    return null;
  }

  if (movies.length > 1) {
    // Tentar match exato primeiro
    const exactMatch = movies.find(
      m => m.title.toLowerCase() === options.title!.toLowerCase() && (!options.year || m.year === options.year)
    );
    if (exactMatch) {
      return exactMatch;
    }

    console.warn(`⚠️ Encontrado mais de um filme para "${options.title}". Refine usando --year=XXXX:`);
    movies.forEach(m => console.log(`   - ${m.title} (${m.year || 'N/A'}) [ID: ${m.id}] [TMDB: ${m.tmdbId}]`));
    return null;
  }

  return movies[0];
}

async function listMoviesInJof(jofId: number) {
  const jof = await prisma.journeyOptionFlow.findUnique({
    where: { id: jofId },
    include: {
      journeyStepFlow: {
        include: {
          journeyFlow: {
            include: { mainSentiment: true }
          },
          emotionalIntentionJourneySteps: {
            include: {
              emotionalIntention: {
                include: { mainSentiment: true }
              }
            }
          }
        }
      }
    }
  });

  if (!jof) {
    console.error(`❌ JourneyOptionFlow ID ${jofId} não encontrada.`);
    return;
  }

  const eij = jof.journeyStepFlow?.emotionalIntentionJourneySteps?.[0]?.emotionalIntention;
  const mainSent = eij?.mainSentiment || jof.journeyStepFlow?.journeyFlow?.mainSentiment;

  console.log(`\n══════════════════════════════════════════════════════════════════════════════`);
  console.log(`🎯 JOF ID: ${jof.id} | ${mainSent?.name || 'Geral'} ➔ ${eij?.intentionType || 'GERAL'}`);
  console.log(`Título de Exibição: "${jof.displayTitle || jof.text}"`);
  console.log(`Opção da Jornada:   "${jof.text}"`);
  if (jof.summary) console.log(`Resumo:             "${jof.summary}"`);
  console.log(`══════════════════════════════════════════════════════════════════════════════\n`);

  const suggestions = await prisma.movieSuggestionFlow.findMany({
    where: { journeyOptionFlowId: jofId },
    include: {
      movie: {
        select: {
          id: true,
          title: true,
          year: true,
          imdbRating: true,
          tmdbId: true
        }
      }
    },
    orderBy: {
      relevanceScore: 'desc'
    }
  });

  if (suggestions.length === 0) {
    console.log(`ℹ️ Nenhum filme cadastrado nesta JOF.`);
    return;
  }

  console.log(`📊 Total de filmes nesta JOF: ${suggestions.length}\n`);

  const rows = suggestions.map((s, idx) => {
    const scoreNum = s.relevanceScore ? Number(s.relevanceScore) : 0;
    const tier = scoreNum >= 7.5 ? 'Ouro' : scoreNum >= 6.5 ? 'Prata' : scoreNum >= 5.0 ? 'Bronze' : 'Sem Bônus';
    return {
      '#': `${idx + 1}º`,
      'Filme': s.movie.title,
      'Ano': s.movie.year || 'N/A',
      'Score': scoreNum.toFixed(3),
      'Patamar': tier,
      'Rank': s.relevance,
      'ID Sugestão': s.id,
      'UUID Filme': s.movie.id
    };
  });

  console.table(rows);

  console.log(`\n💡 Para remover um filme intruso desta JOF:`);
  console.log(`   npx ts-node src/scripts/removeMovieFromJof.ts --jof=${jofId} --title="Nome do Filme"`);
  console.log(`   (Adicione --preview para simular antes de apagar)`);
}

async function listJofsForMovie(movie: any) {
  console.log(`\n🎬 Filme: "${movie.title}" (${movie.year || 'N/A'}) [ID: ${movie.id}]`);

  const suggestions = await prisma.movieSuggestionFlow.findMany({
    where: { movieId: movie.id },
    include: {
      journeyOptionFlow: {
        include: {
          journeyStepFlow: {
            include: {
              journeyFlow: {
                include: { mainSentiment: true }
              },
              emotionalIntentionJourneySteps: {
                include: {
                  emotionalIntention: {
                    include: { mainSentiment: true }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      relevanceScore: 'desc'
    }
  });

  if (suggestions.length === 0) {
    console.log(`ℹ️ Este filme não está associado a nenhuma JOF na MovieSuggestionFlow.`);
    return;
  }

  console.log(`📊 Atualmente associado a ${suggestions.length} jornada(s):\n`);

  const rows = suggestions.map(s => {
    const j = s.journeyOptionFlow;
    const eij = j.journeyStepFlow?.emotionalIntentionJourneySteps?.[0]?.emotionalIntention;
    const mainSent = eij?.mainSentiment || j.journeyStepFlow?.journeyFlow?.mainSentiment;
    const scoreNum = s.relevanceScore ? Number(s.relevanceScore) : 0;
    const tier = scoreNum >= 7.5 ? 'Ouro' : scoreNum >= 6.5 ? 'Prata' : scoreNum >= 5.0 ? 'Bronze' : 'Sem Bônus';

    return {
      'JOF ID': j.id,
      'Sentimento': mainSent?.name || 'Geral',
      'Intenção': eij?.intentionType || 'GERAL',
      'Score': scoreNum.toFixed(3),
      'Patamar': tier,
      'Relevance': s.relevance,
      'Jornada': (j.displayTitle || j.text).substring(0, 40) + '...'
    };
  });

  console.table(rows);

  console.log(`\n💡 Para remover este filme de uma jornada específica:`);
  console.log(`   npx ts-node src/scripts/removeMovieFromJof.ts --title="${movie.title}" --year=${movie.year} --jof=<ID>`);
  console.log(`   (Adicione --preview para simular antes de apagar)`);
}

async function removeMovieFromJofs(movie: any, jofIds: number[], preview: boolean) {
  console.log(`\n🎬 Filme selecionado: "${movie.title}" (${movie.year || 'N/A'}) [ID: ${movie.id}]`);
  console.log(`🎯 JOFs a remover: ${jofIds.join(', ')}`);
  if (preview) {
    console.log(`🔍 [MODO PREVIEW / DRY-RUN ATIVADO - NENHUM DADO SERÁ APAGADO]\n`);
  }

  // Buscar as sugestões correspondentes
  const suggestionsToDelete = await prisma.movieSuggestionFlow.findMany({
    where: {
      movieId: movie.id,
      journeyOptionFlowId: { in: jofIds }
    },
    include: {
      journeyOptionFlow: true
    }
  });

  if (suggestionsToDelete.length === 0) {
    console.log(`⚠️ Nenhuma sugestão encontrada para o filme "${movie.title}" nas JOFs informadas (${jofIds.join(', ')}).`);
    return;
  }

  console.log(`\n📋 Entradas encontradas para remoção (${suggestionsToDelete.length}):`);
  for (const s of suggestionsToDelete) {
    const scoreStr = s.relevanceScore ? Number(s.relevanceScore).toFixed(3) : 'N/A';
    console.log(`   ❌ [ID Sugestão: ${s.id}] JOF ${s.journeyOptionFlowId} | Score: ${scoreStr} | Rank: ${s.relevance}`);
    console.log(`      Texto: "${s.journeyOptionFlow.displayTitle || s.journeyOptionFlow.text}"`);
    console.log(`      Razão: "${s.reason.substring(0, 90)}..."\n`);
  }

  if (preview) {
    console.log(`✅ [PREVIEW CONCLUÍDO] ${suggestionsToDelete.length} entrada(s) seriam deletadas.`);
    console.log(`   Para deletar de verdade, execute o mesmo comando SEM a flag --preview.`);
    return;
  }

  // Executar deleção real
  const deleteIds = suggestionsToDelete.map(s => s.id);
  const deleteResult = await prisma.movieSuggestionFlow.deleteMany({
    where: {
      id: { in: deleteIds }
    }
  });

  console.log(`🗑️ ${deleteResult.count} entrada(s) deletada(s) com sucesso da MovieSuggestionFlow!`);

  // Recalcular rankings de relevância restantes para o filme
  console.log(`🔄 Recalculando ranking de relevância para as jornadas restantes...`);
  try {
    await updateRelevanceRankingForMovie(movie.id);
    console.log(`✅ Ranking atualizado com sucesso!`);
  } catch (err) {
    console.warn(`⚠️ Não foi possível recalcular ranking:`, err);
  }

  // Exibir jornadas remanescentes
  const remaining = await prisma.movieSuggestionFlow.findMany({
    where: { movieId: movie.id },
    include: { journeyOptionFlow: true },
    orderBy: { relevanceScore: 'desc' }
  });

  console.log(`\n📌 O filme "${movie.title}" agora permanece em ${remaining.length} jornada(s):`);
  if (remaining.length === 0) {
    console.log(`   (Nenhuma jornada ativa restante para este filme)`);
  } else {
    remaining.forEach((s, idx) => {
      const score = s.relevanceScore ? Number(s.relevanceScore).toFixed(3) : 'N/A';
      console.log(`   ${idx + 1}º. JOF ${s.journeyOptionFlowId} (Score: ${score}, Rank: ${s.relevance}): "${s.journeyOptionFlow.displayTitle || s.journeyOptionFlow.text}"`);
    });
  }
}

async function main() {
  const options = parseArgs();

  // Caso 1: Usuário não passou nenhum argumento
  if (!options.title && !options.movieId && !options.tmdbId && options.jofIds.length === 0) {
    printHelp();
    return;
  }

  // Caso 2: Passou apenas a JOF (ex: --jof=82) -> Inspecionar filmes da JOF
  if (!options.title && !options.movieId && !options.tmdbId && options.jofIds.length > 0) {
    for (const jofId of options.jofIds) {
      await listMoviesInJof(jofId);
    }
    return;
  }

  // Encontrar o filme
  const movie = await findTargetMovie(options);
  if (!movie) {
    return;
  }

  // Caso 3: Passou apenas o filme (ex: --title="Viva") -> Listar JOFs do filme
  if (options.jofIds.length === 0 && !options.removeAll) {
    await listJofsForMovie(movie);
    return;
  }

  // Caso 4: Remover de todas as JOFs (--all)
  if (options.removeAll) {
    const allSuggestions = await prisma.movieSuggestionFlow.findMany({
      where: { movieId: movie.id },
      select: { journeyOptionFlowId: true }
    });
    const allJofIds = allSuggestions.map(s => s.journeyOptionFlowId);
    if (allJofIds.length === 0) {
      console.log(`ℹ️ O filme "${movie.title}" não tem nenhuma JOF para remover.`);
      return;
    }
    await removeMovieFromJofs(movie, allJofIds, options.preview);
    return;
  }

  // Caso 5: Passou filme e JOF(s) específica(s) -> Remover das JOFs indicadas
  await removeMovieFromJofs(movie, options.jofIds, options.preview);
}

main()
  .catch(err => {
    console.error('❌ Erro inesperado durante a execução:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

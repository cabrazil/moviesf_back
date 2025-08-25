/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findCompatibleJourneys(movieTitle: string, movieYear: number) {
  try {
    console.log('🔍 === ENCONTRANDO JORNADAS COMPATÍVEIS ===');
    console.log(`🎬 Filme: ${movieTitle} (${movieYear})`);

    // 1. Buscar o filme
    const movie = await prisma.movie.findFirst({
      where: {
        title: movieTitle,
        year: movieYear
      }
    });

    if (!movie) {
      console.log('❌ Filme não encontrado');
      return;
    }

    console.log(`✅ Filme encontrado: ${movie.title} (ID: ${movie.id})`);

    // 2. Buscar subsentimentos do filme
    const movieSubSentiments = await prisma.movieSentiment.findMany({
      where: { movieId: movie.id },
      include: {
        subSentiment: true
      }
    });

    console.log(`\n📊 SUBSENTIMENTS DO FILME (${movieSubSentiments.length}):`);
    const movieSubSentimentIds = movieSubSentiments.map(ms => ms.subSentimentId);
    movieSubSentiments.forEach((ms, index) => {
      console.log(`   ${index + 1}. ${ms.subSentiment.name} (ID: ${ms.subSentimentId})`);
    });

    // 3. Buscar todas as jornadas que têm pelo menos um subsentimento em comum
    console.log('\n🎯 BUSCANDO JORNADAS COMPATÍVEIS...');
    
    const compatibleJourneys = await prisma.journeyOptionFlowSubSentiment.findMany({
      where: {
        subSentimentId: { in: movieSubSentimentIds }
      },
      include: {
        journeyOptionFlow: {
          include: {
            journeyStepFlow: {
              include: {
                journeyFlow: {
                  include: {
                    mainSentiment: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // 4. Agrupar por jornada e calcular scores
    const journeyScores = new Map<number, { 
      journeyOptionFlow: any, 
      matches: string[], 
      score: number,
      matchCount: number 
    }>();

    for (const js of compatibleJourneys) {
      const journeyId = js.journeyOptionFlowId;
      const subSentiment = movieSubSentiments.find(ms => ms.subSentimentId === js.subSentimentId);
      
      if (!journeyScores.has(journeyId)) {
        journeyScores.set(journeyId, {
          journeyOptionFlow: js.journeyOptionFlow,
          matches: [],
          score: 0,
          matchCount: 0
        });
      }
      
      const journey = journeyScores.get(journeyId)!;
      journey.matches.push(subSentiment!.subSentiment.name);
      journey.score += js.weight.toNumber();
      journey.matchCount++;
    }

    // 5. Ordenar por score e exibir
    const sortedJourneys = Array.from(journeyScores.entries())
      .sort((a, b) => b[1].score - a[1].score);

    console.log(`\n📈 JORNADAS COMPATÍVEIS ENCONTRADAS (${sortedJourneys.length}):`);
    
    sortedJourneys.forEach(([journeyId, data], index) => {
      const journey = data.journeyOptionFlow;
      const mainSentiment = journey.journeyStepFlow.journeyFlow.mainSentiment.name;
      
      console.log(`\n${index + 1}. 🎯 JourneyOptionFlow ID: ${journeyId}`);
      console.log(`   📝 Texto: "${journey.text}"`);
      console.log(`   🎭 Sentimento: ${mainSentiment}`);
      console.log(`   🎯 Matches: ${data.matchCount} (Score: ${data.score.toFixed(3)})`);
      console.log(`   📊 Subsentimentos: ${data.matches.join(', ')}`);
    });

    if (sortedJourneys.length === 0) {
      console.log('\n❌ Nenhuma jornada compatível encontrada!');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Função para processar argumentos da linha de comando
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: any = {};

  args.forEach(arg => {
    if (arg.startsWith('--title=')) {
      parsed.title = arg.split('=')[1];
    } else if (arg.startsWith('--year=')) {
      parsed.year = parseInt(arg.split('=')[1]);
    }
  });

  if (!parsed.title || !parsed.year) {
    console.log('❌ Uso: npx ts-node src/scripts/find-compatible-journeys.ts --title="Nome do Filme" --year=2023');
    process.exit(1);
  }

  return parsed;
}

// Execução do script
async function main() {
  const args = parseArgs();
  await findCompatibleJourneys(args.title, args.year);
}

if (require.main === module) {
  main();
}

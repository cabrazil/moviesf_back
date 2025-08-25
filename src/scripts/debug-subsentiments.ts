/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSubSentiments(movieTitle: string, movieYear: number, journeyOptionFlowId: number) {
  try {
    console.log('🔍 === DEBUG SUBSENTIMENTS ===');
    console.log(`🎬 Filme: ${movieTitle} (${movieYear})`);
    console.log(`🎯 JourneyOptionFlowId: ${journeyOptionFlowId}`);

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
    console.log('\n📊 === SUBSENTIMENTS DO FILME ===');
    const movieSubSentiments = await prisma.movieSentiment.findMany({
      where: { movieId: movie.id },
      include: {
        subSentiment: true
      }
    });

    console.log(`📈 Total de subsentimentos do filme: ${movieSubSentiments.length}`);
    movieSubSentiments.forEach((ms, index) => {
      console.log(`   ${index + 1}. ${ms.subSentiment.name} (ID: ${ms.subSentimentId})`);
    });

    // 3. Buscar subsentimentos da jornada
    console.log('\n🎯 === SUBSENTIMENTS DA JORNADA ===');
    const journeySubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
      where: { journeyOptionFlowId: journeyOptionFlowId }
    });

    console.log(`📈 Total de subsentimentos da jornada: ${journeySubSentiments.length}`);
    
    // Buscar detalhes dos subsentimentos separadamente
    const subSentimentIds = journeySubSentiments.map(js => js.subSentimentId);
    const subSentiments = await prisma.subSentiment.findMany({
      where: { id: { in: subSentimentIds } }
    });

    journeySubSentiments.forEach((js, index) => {
      const subSentiment = subSentiments.find(ss => ss.id === js.subSentimentId);
      console.log(`   ${index + 1}. ${subSentiment?.name || `ID ${js.subSentimentId}`} (ID: ${js.subSentimentId}, Weight: ${js.weight})`);
    });

    // 4. Verificar matches
    console.log('\n🔍 === VERIFICANDO MATCHES ===');
    let matchCount = 0;
    let totalScore = 0;

    for (const journeySub of journeySubSentiments) {
      const movieMatch = movieSubSentiments.find(movieSub => 
        movieSub.subSentimentId === journeySub.subSentimentId
      );

      const subSentiment = subSentiments.find(ss => ss.id === journeySub.subSentimentId);
      const subSentimentName = subSentiment?.name || `ID ${journeySub.subSentimentId}`;

      if (movieMatch) {
        matchCount++;
        totalScore += journeySub.weight.toNumber();
        console.log(`✅ MATCH: ${subSentimentName} (Score: ${journeySub.weight})`);
      } else {
        console.log(`❌ NO MATCH: ${subSentimentName}`);
      }
    }

    console.log(`\n📊 === RESULTADO ===`);
    console.log(`🎯 Matches encontrados: ${matchCount}/${journeySubSentiments.length}`);
    console.log(`📈 Score total: ${totalScore.toFixed(3)}`);
    
    if (matchCount > 0) {
      console.log(`✅ RelevanceScore seria: ${totalScore.toFixed(3)}`);
    } else {
      console.log(`❌ Nenhum match - RelevanceScore seria: null`);
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
    } else if (arg.startsWith('--journeyOptionFlowId=')) {
      parsed.journeyOptionFlowId = parseInt(arg.split('=')[1]);
    }
  });

  if (!parsed.title || !parsed.year || !parsed.journeyOptionFlowId) {
    console.log('❌ Uso: npx ts-node src/scripts/debug-subsentiments.ts --title="Nome do Filme" --year=2023 --journeyOptionFlowId=25');
    process.exit(1);
  }

  return parsed;
}

// Execução do script
async function main() {
  const args = parseArgs();
  await debugSubSentiments(args.title, args.year, args.journeyOptionFlowId);
}

if (require.main === module) {
  main();
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMovieSentiments() {
  try {
    // Buscar o filme "Robô Selvagem"
    const movie = await prisma.movie.findFirst({
      where: {
        title: { contains: "Robô Selvagem", mode: 'insensitive' }
      },
      include: {
        movieSentiments: {
          include: {
            subSentiment: true,
            mainSentiment: true
          }
        }
      }
    });

    if (!movie) {
      console.log('❌ Filme não encontrado');
      return;
    }

    console.log(`\n🎬 Filme: ${movie.title} (${movie.year})`);
    console.log(`📊 Total de sentimentos associados: ${movie.movieSentiments.length}`);

    if (movie.movieSentiments.length === 0) {
      console.log('❌ Nenhum sentimento associado ao filme');
      return;
    }

    console.log('\n📋 Sentimentos atuais do filme:');
    movie.movieSentiments.forEach(ms => {
      console.log(`\n- MainSentiment: ${ms.mainSentiment.name} (ID: ${ms.mainSentiment.id})`);
      console.log(`  SubSentiment: ${ms.subSentiment.name} (ID: ${ms.subSentiment.id})`);
      console.log(`  Keywords: ${ms.subSentiment.keywords.join(', ')}`);
    });

    // Verificar se os subsentimentos específicos existem no banco
    console.log('\n🔍 Verificando subsentimentos específicos:');
    
    const confortoSubSentiment = await prisma.subSentiment.findFirst({
      where: { name: "Conforto / Aconchego Emocional" }
    });
    
    const superacaoSubSentiment = await prisma.subSentiment.findFirst({
      where: { name: "Superação e Crescimento" }
    });

    console.log(`\nConforto / Aconchego Emocional: ${confortoSubSentiment ? `✅ Encontrado (ID: ${confortoSubSentiment.id})` : '❌ Não encontrado'}`);
    console.log(`Superação e Crescimento: ${superacaoSubSentiment ? `✅ Encontrado (ID: ${superacaoSubSentiment.id})` : '❌ Não encontrado'}`);

    // Verificar se estão associados ao filme
    const confortoAssociado = movie.movieSentiments.find(ms => ms.subSentiment.name === "Conforto / Aconchego Emocional");
    const superacaoAssociado = movie.movieSentiments.find(ms => ms.subSentiment.name === "Superação e Crescimento");

    console.log(`\n📊 Associação ao filme:`);
    console.log(`Conforto / Aconchego Emocional: ${confortoAssociado ? '✅ Associado' : '❌ Não associado'}`);
    console.log(`Superação e Crescimento: ${superacaoAssociado ? '✅ Associado' : '❌ Não associado'}`);

    // Verificar todos os subsentimentos disponíveis para o sentimento principal
    const mainSentimentId = movie.movieSentiments[0]?.mainSentimentId;
    if (mainSentimentId) {
      console.log(`\n📋 Todos os subsentimentos disponíveis para ${movie.movieSentiments[0].mainSentiment.name}:`);
      const allSubSentiments = await prisma.subSentiment.findMany({
        where: { mainSentimentId }
      });
      
      allSubSentiments.forEach(ss => {
        const isAssociated = movie.movieSentiments.some(ms => ms.subSentimentId === ss.id);
        console.log(`${isAssociated ? '✅' : '❌'} ${ss.name} (ID: ${ss.id})`);
      });
    }

  } catch (error) {
    console.error('Erro:', error);
  }
}

checkMovieSentiments()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 
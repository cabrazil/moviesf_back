import { PrismaClient, SubSentiment } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleMovies() {
  try {
    console.log('Starting to add sample movies...');

    // Buscar todos os sentimentos necessários
    const sentiments = {
      dramaSuffering: await prisma.subSentiment.findFirst({ where: { name: 'Drama and Suffering' } }),
      complexRelationships: await prisma.subSentiment.findFirst({ where: { name: 'Complex Human Relationships' } }),
      laughterSlapstick: await prisma.subSentiment.findFirst({ where: { name: 'Laughter and Slapstick' } }),
      shareWithFriends: await prisma.subSentiment.findFirst({ where: { name: 'Movies to Share with Friends' } }),
      immersionEscapism: await prisma.subSentiment.findFirst({ where: { name: 'Immersion and Escapism' } }),
      calmingComforting: await prisma.subSentiment.findFirst({ where: { name: 'Calming and Comforting' } }),
      personalGrowth: await prisma.subSentiment.findFirst({ where: { name: 'Personal Growth and Self-Knowledge' } }),
      differentCultures: await prisma.subSentiment.findFirst({ where: { name: 'Different Cultures and Perspectives' } }),
      socialPolitical: await prisma.subSentiment.findFirst({ where: { name: 'Social and Political Issues' } }),
      familyMovies: await prisma.subSentiment.findFirst({ where: { name: 'Family Movies' } }),
      suspenseTension: await prisma.subSentiment.findFirst({ where: { name: 'Suspense and Tension' } }),
      actionAdrenaline: await prisma.subSentiment.findFirst({ where: { name: 'Action and Adrenaline' } })
    };

    // Verificar se todos os sentimentos foram encontrados
    const missingSentiments = Object.entries(sentiments)
      .filter(([_, sentiment]) => !sentiment)
      .map(([name]) => name);

    if (missingSentiments.length > 0) {
      throw new Error(`Required sentiments not found in database: ${missingSentiments.join(', ')}`);
    }

    // Garantir que todos os sentimentos são não-nulos
    const validSentiments = sentiments as Record<string, SubSentiment>;

    const movies = [
      {
        title: 'The Godfather',
        year: 1972,
        director: 'Francis Ford Coppola',
        genres: ['Crime', 'Drama'],
        streamingPlatforms: ['Netflix', 'Amazon Prime'],
        sentiments: [
          { mainId: validSentiments.dramaSuffering.mainSentimentId, subId: validSentiments.dramaSuffering.id },
          { mainId: validSentiments.complexRelationships.mainSentimentId, subId: validSentiments.complexRelationships.id }
        ]
      },
      {
        title: 'The Hangover',
        year: 2009,
        director: 'Todd Phillips',
        genres: ['Comedy'],
        streamingPlatforms: ['HBO Max', 'Netflix'],
        sentiments: [
          { mainId: validSentiments.laughterSlapstick.mainSentimentId, subId: validSentiments.laughterSlapstick.id },
          { mainId: validSentiments.shareWithFriends.mainSentimentId, subId: validSentiments.shareWithFriends.id }
        ]
      },
      {
        title: 'The Lord of the Rings: The Fellowship of the Ring',
        year: 2001,
        director: 'Peter Jackson',
        genres: ['Adventure', 'Fantasy'],
        streamingPlatforms: ['HBO Max', 'Amazon Prime'],
        sentiments: [
          { mainId: validSentiments.immersionEscapism.mainSentimentId, subId: validSentiments.immersionEscapism.id },
          { mainId: validSentiments.actionAdrenaline.mainSentimentId, subId: validSentiments.actionAdrenaline.id }
        ]
      },
      {
        title: 'Spirited Away',
        year: 2001,
        director: 'Hayao Miyazaki',
        genres: ['Animation', 'Adventure', 'Family'],
        streamingPlatforms: ['Netflix', 'HBO Max'],
        sentiments: [
          { mainId: validSentiments.calmingComforting.mainSentimentId, subId: validSentiments.calmingComforting.id },
          { mainId: validSentiments.differentCultures.mainSentimentId, subId: validSentiments.differentCultures.id }
        ]
      },
      {
        title: 'The Pursuit of Happyness',
        year: 2006,
        director: 'Gabriele Muccino',
        genres: ['Drama', 'Biography'],
        streamingPlatforms: ['Netflix', 'Amazon Prime'],
        sentiments: [
          { mainId: validSentiments.personalGrowth.mainSentimentId, subId: validSentiments.personalGrowth.id },
          { mainId: validSentiments.socialPolitical.mainSentimentId, subId: validSentiments.socialPolitical.id }
        ]
      },
      {
        title: 'Toy Story',
        year: 1995,
        director: 'John Lasseter',
        genres: ['Animation', 'Adventure', 'Comedy'],
        streamingPlatforms: ['Disney+', 'Amazon Prime'],
        sentiments: [
          { mainId: validSentiments.familyMovies.mainSentimentId, subId: validSentiments.familyMovies.id },
          { mainId: validSentiments.shareWithFriends.mainSentimentId, subId: validSentiments.shareWithFriends.id }
        ]
      },
      {
        title: 'Inception',
        year: 2010,
        director: 'Christopher Nolan',
        genres: ['Action', 'Adventure', 'Sci-Fi'],
        streamingPlatforms: ['Netflix', 'HBO Max'],
        sentiments: [
          { mainId: validSentiments.suspenseTension.mainSentimentId, subId: validSentiments.suspenseTension.id },
          { mainId: validSentiments.immersionEscapism.mainSentimentId, subId: validSentiments.immersionEscapism.id }
        ]
      }
    ];

    // Adicionar todos os filmes
    for (const movie of movies) {
      const createdMovie = await prisma.movie.create({
        data: {
          title: movie.title,
          year: movie.year,
          director: movie.director,
          genres: movie.genres,
          streamingPlatforms: movie.streamingPlatforms,
          movieSentiment: {
            create: movie.sentiments.map(sentiment => ({
              mainSentimentId: sentiment.mainId,
              subSentimentId: sentiment.subId
            }))
          }
        }
      });

      console.log('Created movie:', createdMovie.title);
    }

    console.log('All sample movies added successfully!');

  } catch (error) {
    console.error('Error adding sample movies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleMovies(); 
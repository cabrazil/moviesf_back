import { movieSearchService } from '../services/movieSearchService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMovieSearch() {
  try {
    // Buscar todos os sentimentos principais
    const sentiments = await prisma.mainSentiment.findMany({
      include: {
        subSentiments: true
      }
    });

    console.log('Available sentiments:');
    sentiments.forEach(sentiment => {
      console.log(`\n${sentiment.name} (ID: ${sentiment.id})`);
      console.log('Sub-sentiments:', sentiment.subSentiments.map(sub => sub.name).join(', '));
    });

    // Testar busca para cada sentimento
    for (const sentiment of sentiments) {
      console.log(`\nSearching movies for sentiment: ${sentiment.name}`);
      const results = await movieSearchService.searchMoviesBySentiment(sentiment.id, 5);

      if (results.length > 0) {
        console.log(`\nTop 5 movies for ${sentiment.name}:`);
        results.forEach((movie, index) => {
          console.log(`\n${index + 1}. ${movie.title} (${movie.year})`);
          console.log(`Score: ${movie.sentimentScore.toFixed(2)}%`);
          console.log('Matched keywords:', movie.matchedKeywords.join(', '));
          console.log('Overview:', movie.overview);
        });
      } else {
        console.log('No movies found for this sentiment');
      }
    }

  } catch (error) {
    console.error('Error testing movie search:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMovieSearch(); 
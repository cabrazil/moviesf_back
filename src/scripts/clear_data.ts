import { PrismaClient } from '@prisma/client';

async function clearMovieAndJourneyData() {
  const prisma = new PrismaClient();
  const movieId = 'd061bb12-47f5-4ace-ae36-38e1f0fef6f8';
  const journeyOptionFlowId = 25;

  try {
    console.log(`Deleting records from MovieSuggestionFlow for movie ${movieId} and option ${journeyOptionFlowId}...`);
    const deletedSuggestions = await prisma.movieSuggestionFlow.deleteMany({
      where: {
        movieId: movieId,
        journeyOptionFlowId: journeyOptionFlowId,
      },
    });
    console.log(`Deleted ${deletedSuggestions.count} MovieSuggestionFlow records.`);

    console.log(`Deleting records from JourneyOptionFlowSubSentiment for option ${journeyOptionFlowId}...`);
    const deletedJourneyOptionSubSentiments = await prisma.journeyOptionFlowSubSentiment.deleteMany({
      where: {
        journeyOptionFlowId: journeyOptionFlowId,
      },
    });
    console.log(`Deleted ${deletedJourneyOptionSubSentiments.count} JourneyOptionFlowSubSentiment records.`);

    console.log(`Deleting records from MovieSentiment for movie ${movieId}...`);
    const deletedMovieSentiments = await prisma.movieSentiment.deleteMany({
      where: {
        movieId: movieId,
      },
    });
    console.log(`Deleted ${deletedMovieSentiments.count} MovieSentiment records.`);

    console.log('Data cleanup complete.');
  } catch (error) {
    console.error('Error during data cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearMovieAndJourneyData();
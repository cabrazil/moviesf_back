

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// --- Type Definitions for API Response ---
interface OmdbRating {
  Source: string;
  Value: string;
}

interface OmdbMovieResponse {
  Title: string;
  Year: string;
  Response: 'True' | 'False';
  Error?: string;
  Ratings?: OmdbRating[];
}

/**
 * Creates a delay for a specified amount of time.
 * @param ms - The number of milliseconds to delay.
 */
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Parses a rating string and returns a number.
 */
function parseRating(source: string, value: string): number | null {
  try {
    if (source === 'Internet Movie Database') return parseFloat(value.split('/')[0]);
    if (source === 'Rotten Tomatoes') return parseInt(value.replace('%', ''), 10);
    if (source === 'Metacritic') return parseInt(value.split('/')[0], 10);
    return null;
  } catch (error) {
    console.error(`Error parsing rating from ${source} with value "${value}":`, error);
    return null;
  }
}

async function main() {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    console.error('OMDb API key is not set. Please set the OMDB_API_KEY environment variable.');
    return;
  }

  // 1. Fetch all movies from the database
  const allMovies = await prisma.movie.findMany({
    select: { id: true, title: true, original_title: true, year: true }
  });

  console.log(`Found ${allMovies.length} movies to process.`);

  let updatedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  // 2. Iterate over each movie
  for (const [index, movie] of allMovies.entries()) {
    const titleForApi = movie.original_title || movie.title;
    console.log(`\n[${index + 1}/${allMovies.length}] Processing: "${titleForApi}" (${movie.year})`);

    try {
      // 3. Fetch data from OMDb API
      const params = new URLSearchParams({ t: titleForApi, apikey: apiKey });
      if (movie.year) {
        params.append('y', movie.year.toString());
      }

      const response = await fetch(`http://www.omdbapi.com/?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const omdbData = (await response.json()) as OmdbMovieResponse;

      if (omdbData.Response === 'False') {
        console.warn(`  -> OMDb API could not find "${titleForApi}". Skipping.`);
        notFoundCount++;
        continue;
      }

      if (!omdbData.Ratings || omdbData.Ratings.length === 0) {
        console.log(`  -> No ratings found on OMDb for "${titleForApi}". Skipping.`);
        continue;
      }

      // 4. Parse and prepare ratings
      const ratingsToUpdate: Prisma.MovieUpdateInput = {};
      for (const rating of omdbData.Ratings) {
        const numericValue = parseRating(rating.Source, rating.Value);
        if (numericValue === null) continue;

        if (rating.Source === 'Internet Movie Database') ratingsToUpdate.imdbRating = numericValue;
        else if (rating.Source === 'Rotten Tomatoes') ratingsToUpdate.rottenTomatoesRating = numericValue;
        else if (rating.Source === 'Metacritic') ratingsToUpdate.metacriticRating = numericValue;
      }

      if (Object.keys(ratingsToUpdate).length === 0) {
        console.log('  -> Could not parse any ratings. Skipping.');
        continue;
      }

      // 5. Update movie in DB
      await prisma.movie.update({
        where: { id: movie.id },
        data: ratingsToUpdate,
      });

      console.log(`  -> Success! Updated ratings for "${movie.title}".`);
      updatedCount++;

    } catch (error) {
      console.error(`  -> An error occurred while processing "${titleForApi}":`, error);
      errorCount++;
    }

    // Add a delay to be respectful to the API
    await delay(200); // 200ms delay between requests
  }

  console.log('\n--- Processing Complete ---');
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Not found on OMDb:   ${notFoundCount}`);
  console.log(`Errors:              ${errorCount}`);
  console.log(`Total movies:        ${allMovies.length}`);
}

main().finally(() => {
  prisma.$disconnect();
});

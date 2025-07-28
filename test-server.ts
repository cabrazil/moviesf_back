import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const port = 3000;

// Pool de conexão direta
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test server OK!' });
});

// Test personalized journey
app.get('/api/personalized-journey/:sentimentId/:intentionId', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.sentimentId);
    const intentionId = parseInt(req.params.intentionId);
    
    console.log(`Buscando journey para sentimentId: ${sentimentId}, intentionId: ${intentionId}`);
    
    // Buscar journey flow
    const flowResult = await pool.query(`
      SELECT 
        jf.id,
        jf."mainSentimentId" as main_sentiment_id
      FROM "JourneyFlow" jf
      WHERE jf."mainSentimentId" = $1
      LIMIT 1
    `, [sentimentId]);

    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Journey flow não encontrado' });
    }

    const flow = flowResult.rows[0];
    console.log('Flow encontrado:', flow);

    // Buscar steps
    const stepsResult = await pool.query(`
      SELECT 
        jsf.id,
        jsf."stepId" as step_id,
        jsf."order",
        jsf.question
      FROM "JourneyStepFlow" jsf
      WHERE jsf."journeyFlowId" = $1
      ORDER BY jsf."order" ASC, jsf."stepId" ASC
    `, [flow.id]);

    console.log('Steps encontrados:', stepsResult.rows.length);

    const steps = [];
    for (const step of stepsResult.rows) {
      // Buscar opções
      const optionsResult = await pool.query(`
        SELECT 
          jof.id,
          jof."optionId" as option_id,
          jof.text,
          jof."nextStepId" as next_step_id,
          jof."isEndState" as is_end_state
        FROM "JourneyOptionFlow" jof
        WHERE jof."journeyStepFlowId" = $1
        ORDER BY jof.id ASC
      `, [step.id]);

      console.log(`Step ${step.step_id}: ${optionsResult.rows.length} opções`);

      // Processar opções
      const processedOptions = await Promise.all(optionsResult.rows.map(async (option: any) => {
        let movieSuggestions = undefined;
        
        if (option.is_end_state) {
          // Buscar sugestões de filmes
          const suggestionsResult = await pool.query(`
            SELECT 
              msf.id,
              msf."journeyOptionFlowId" as journey_option_flow_id,
              msf."movieId" as movie_id,
              msf.reason,
              msf.relevance,
              m.id as movie_id,
              m.title,
              m.year,
              m.director,
              m.genres,
              m."streamingPlatforms" as streaming_platforms,
              m.description,
              m.thumbnail,
              m."original_title" as original_title,
              m."vote_average" as vote_average,
              m."vote_count" as vote_count,
              m.certification,
              m.adult,
              m.keywords,
              m."genreIds" as genre_ids,
              m.runtime,
              m."tmdbId" as tmdb_id,
              m."imdbRating" as imdb_rating,
              m."rottenTomatoesRating" as rotten_tomatoes_rating,
              m."metacriticRating" as metacritic_rating
            FROM "MovieSuggestionFlow" msf
            INNER JOIN "Movie" m ON msf."movieId" = m.id
            WHERE msf."journeyOptionFlowId" = $1
            ORDER BY msf.relevance DESC, msf."createdAt" DESC
          `, [option.id]);

          movieSuggestions = suggestionsResult.rows.map((row: any) => ({
            id: row.id,
            reason: row.reason,
            relevance: row.relevance,
            movie: {
              id: row.movie_id,
              title: row.title,
              year: row.year,
              director: row.director,
              genres: row.genres || [],
              streamingPlatforms: row.streaming_platforms || [],
              description: row.description,
              thumbnail: row.thumbnail,
              original_title: row.original_title,
              vote_average: row.vote_average,
              vote_count: row.vote_count,
              certification: row.certification,
              adult: row.adult,
              keywords: row.keywords || [],
              genreIds: row.genre_ids || [],
              runtime: row.runtime,
              tmdbId: row.tmdb_id,
              imdbRating: row.imdb_rating,
              rottenTomatoesRating: row.rotten_tomatoes_rating,
              metacriticRating: row.metacritic_rating
            }
          }));

          console.log(`Opção ${option.id} (final): ${movieSuggestions.length} sugestões`);
        }
        
        return {
          id: option.id,
          text: option.text,
          nextStepId: option.next_step_id,
          isEndState: option.is_end_state,
          movieSuggestions: movieSuggestions
        };
      }));

      steps.push({
        id: step.id,
        stepId: step.step_id,
        order: step.order,
        question: step.question,
        options: processedOptions
      });
    }

    res.json({
      id: flow.id,
      mainSentimentId: sentimentId,
      emotionalIntentionId: intentionId,
      steps: steps
    });

  } catch (error: any) {
    console.error('Erro ao buscar jornada personalizada:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar jornada personalizada',
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Test server rodando em http://localhost:${port}`);
}); 
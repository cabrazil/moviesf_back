import { Pool } from 'pg';

// Criar pool de conexões otimizado para Supabase
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Configurações otimizadas para Supabase
  max: 10,           // Máximo 10 conexões simultâneas
  min: 2,            // Mínimo 2 conexões
  idleTimeoutMillis: 30000,  // 30 segundos
  connectionTimeoutMillis: 2000,  // 2 segundos
  acquireTimeoutMillis: 60000,   // 60 segundos
});

export class DirectDatabase {
  
  async getMainSentiments() {
    let client;
    try {
      client = await pool.connect();
      const result = await client.query(`
        SELECT 
          id, 
          name, 
          description, 
          "shortDescription" as short_description,
          keywords,
          "createdAt" as created_at,
          "updatedAt" as updated_at
        FROM "MainSentiment" 
        ORDER BY id ASC
      `);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar sentimentos principais:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getEmotionalIntentions(sentimentId: number) {
    let client;
    try {
      // Log do status do pool
      console.log(`🔗 Pool status: total=${pool.totalCount}, idle=${pool.idleCount}, waiting=${pool.waitingCount}`);
      
      client = await pool.connect();
      const result = await client.query(`
        SELECT 
          ei.id,
          ei."intentionType" as type,
          ei.description,
          ei."preferredGenres" as preferred_genres,
          ei."avoidGenres" as avoid_genres,
          ei."emotionalTone" as emotional_tone
        FROM "EmotionalIntention" ei
        WHERE ei."mainSentimentId" = $1
        ORDER BY ei.id ASC
      `, [sentimentId]);
      
      return {
        sentimentId: sentimentId,
        sentimentName: await this.getSentimentName(sentimentId),
        intentions: result.rows.map((row: any) => ({
          id: row.id,
          type: row.type,
          description: row.description,
          preferredGenres: row.preferred_genres || [],
          avoidGenres: row.avoid_genres || [],
          emotionalTone: row.emotional_tone
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar intenções emocionais:', error);
      throw error;
    } finally {
      // Liberar conexão de volta para o pool
      if (client) {
        client.release();
      }
    }
  }

  async getSentimentName(sentimentId: number): Promise<string> {
    try {
      const result = await pool.query(`
        SELECT name 
        FROM "MainSentiment" 
        WHERE id = $1
      `, [sentimentId]);
      
      return result.rows[0]?.name || 'Sentimento não encontrado';
    } catch (error) {
      console.error('Erro ao buscar nome do sentimento:', error);
      return 'Sentimento não encontrado';
    }
  }

  async getJourneyFlow(sentimentId: number) {
    try {
      const flowResult = await pool.query(`
        SELECT 
          jf.id,
          jf."mainSentimentId" as main_sentiment_id
        FROM "JourneyFlow" jf
        WHERE jf."mainSentimentId" = $1
        LIMIT 1
      `, [sentimentId]);

      if (flowResult.rows.length === 0) {
        return null;
      }

      const flow = flowResult.rows[0];

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

      const steps = [];
      for (const step of stepsResult.rows as any[]) {
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

        // Processar opções com sugestões de filmes
        const processedOptions = await Promise.all(optionsResult.rows.map(async (option: any) => {
          let movieSuggestions = undefined;
          
          if (option.is_end_state) {
            // Buscar sugestões reais de filmes para opções finais
            movieSuggestions = await this.getMovieSuggestions(option.id);
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
          ...step,
          options: processedOptions
        });
      }

      return {
        id: flow.id,
        mainSentimentId: flow.main_sentiment_id,
        steps: steps,
        isComplete: true
      };
    } catch (error) {
      console.error('Erro ao buscar journey flow:', error);
      throw error;
    }
  }

  async getMovieSuggestions(journeyOptionFlowId: number) {
    try {
      const result = await pool.query(`
        SELECT 
          msf.id,
          msf."journeyOptionFlowId" as journey_option_flow_id,
          msf."movieId" as movie_id,
          msf.reason,
          msf.relevance,
          msf."createdAt" as created_at,
          msf."updatedAt" as updated_at,
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
      `, [journeyOptionFlowId]);

      return result.rows.map((row: any) => ({
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
    } catch (error) {
      console.error('Erro ao buscar sugestões de filmes:', error);
      return [];
    }
  }

  async close() {
    await pool.end();
  }
}

export default new DirectDatabase(); 
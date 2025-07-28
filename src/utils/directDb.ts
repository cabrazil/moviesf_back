import { Pool } from 'pg';

// Criar pool de conexões
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export class DirectDatabase {
  
  async getMainSentiments() {
    try {
      const result = await pool.query(`
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
    }
  }

  async getEmotionalIntentions(sentimentId: number) {
    try {
      const result = await pool.query(`
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

        steps.push({
          ...step,
          options: optionsResult.rows as any[]
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

  async close() {
    await pool.end();
  }
}

export default new DirectDatabase(); 
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import directDb from '../src/utils/directDb';
import movieDetailsRoutes from '../src/routes/movie-details.routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

// Configuração CORS
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  next();
});



// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'direct-postgresql'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API funcionando com dados reais!',
    timestamp: new Date().toISOString()
  });
});

// Main sentiments (DADOS REAIS)
app.get('/main-sentiments', async (req, res) => {
  try {
    const sentiments = await directDb.getMainSentiments();
    const formattedSentiments = sentiments.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      shortDescription: s.short_description,
      keywords: s.keywords || []
    }));
    res.json(formattedSentiments);
  } catch (error: any) {
    console.error('Erro ao buscar sentimentos principais:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar sentimentos principais',
      details: error.message 
    });
  }
});

// Summary (DADOS REAIS)
app.get('/main-sentiments/summary', async (req, res) => {
  try {
    const sentiments = await directDb.getMainSentiments();
    const formattedSentiments = sentiments.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      shortDescription: s.short_description
    }));
    res.json(formattedSentiments);
  } catch (error: any) {
    console.error('Erro ao buscar summary:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar summary',
      details: error.message 
    });
  }
});

// Emotional intentions (DADOS REAIS)
app.get('/api/emotional-intentions/:sentimentId', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.sentimentId);
    const intentions = await directDb.getEmotionalIntentions(sentimentId);
    res.json(intentions);
  } catch (error: any) {
    console.error('Erro ao buscar intenções emocionais:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar intenções emocionais',
      details: error.message 
    });
  }
});

// Journey flow (DADOS REAIS)
app.get('/main-sentiments/:id/journey-flow', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.id);
    const journeyFlow = await directDb.getJourneyFlow(sentimentId);
    
    if (!journeyFlow) {
      return res.status(404).json({ error: 'Journey flow não encontrado' });
    }
    
    res.json(journeyFlow);
  } catch (error: any) {
    console.error('Erro ao buscar journey flow:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar journey flow',
      details: error.message 
    });
  }
});

// Personalized journey (DADOS REAIS) - VERSION 2.0 - CACHED
app.get('/api/personalized-journey/:sentimentId/:intentionId', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.sentimentId);
    const intentionId = parseInt(req.params.intentionId);
    
    console.log(`🔍 Debug: Buscando jornada para sentimentId: ${sentimentId}, intentionId: ${intentionId}`);
    
    // Buscar journey flow do sentimento
    const journeyFlow = await directDb.getJourneyFlow(sentimentId);
    
    if (!journeyFlow) {
      return res.status(404).json({ error: 'Journey flow não encontrado' });
    }
    
    console.log(`✅ Journey flow encontrado: ${journeyFlow.steps.length} steps`);
    
    // Buscar informações da intenção
    const intentions = await directDb.getEmotionalIntentions(sentimentId);
    const selectedIntention = intentions.intentions.find((intention: any) => intention.id === intentionId);
    
    if (!selectedIntention) {
      return res.status(404).json({ error: 'Intenção emocional não encontrada' });
    }
    
    console.log(`✅ Intenção encontrada: ${selectedIntention.type}`);
    
    // Retornar jornada personalizada no formato esperado pelo frontend
    const response = {
      id: journeyFlow.id,
      mainSentimentId: sentimentId,
      emotionalIntentionId: intentionId,
      steps: await Promise.all(journeyFlow.steps.map(async (step: any) => {
        console.log(`🔍 Processando step: ${step.stepId} com ${step.options?.length || 0} opções`);
        
        return {
          id: step.id,
          stepId: step.step_id,
          order: step.order,
          question: step.question,
          options: await Promise.all(step.options.map(async (option: any) => {
            console.log(`🔍 Processando opção ${option.id}: is_end_state=${option.is_end_state}, next_step_id=${option.next_step_id}`);
            
            let movieSuggestions = undefined;
            
            if (option.is_end_state) {
              console.log(`🎬 Buscando sugestões para opção ${option.id}`);
              movieSuggestions = await directDb.getMovieSuggestions(option.id);
              console.log(`✅ Encontradas ${movieSuggestions.length} sugestões para opção ${option.id}`);
            }
            
            return {
              id: option.id,
              text: option.text,
              nextStepId: option.next_step_id,
              isEndState: option.is_end_state,
              movieSuggestions: movieSuggestions
            };
          }))
        };
      }))
    };
    
    console.log(`✅ Resposta final: ${response.steps.length} steps processados`);
    
    // Log detalhado da primeira opção para debug
    if (response.steps.length > 0 && response.steps[0].options.length > 0) {
      const firstOption = response.steps[0].options[0];
      console.log(`🔍 DEBUG - Primeira opção:`, {
        id: firstOption.id,
        text: firstOption.text,
        nextStepId: firstOption.nextStepId,
        isEndState: firstOption.isEndState,
        movieSuggestionsCount: firstOption.movieSuggestions?.length || 0
      });
    }
    
    res.json(response);
  } catch (error: any) {
    console.error('Erro ao buscar jornada personalizada:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar jornada personalizada',
      details: error.message 
    });
  }
});

// Test database connection
app.get('/main-sentiments/db-test', async (req, res) => {
  try {
    const sentiments = await directDb.getMainSentiments();
    res.json({ 
      message: 'Conexão com banco OK!',
      count: sentiments.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro na conexão com banco:', error);
    res.status(500).json({ 
      error: 'Erro na conexão com banco',
      details: error.message
    });
  }
});

// Debug endpoint para testar sugestões de filmes
app.get('/debug/movie-suggestions/:journeyOptionFlowId', async (req, res) => {
  try {
    const journeyOptionFlowId = parseInt(req.params.journeyOptionFlowId);
    console.log(`🔍 Debug: Buscando sugestões para journeyOptionFlowId: ${journeyOptionFlowId}`);
    
    const suggestions = await directDb.getMovieSuggestions(journeyOptionFlowId);
    
    res.json({
      journeyOptionFlowId,
      suggestionsCount: suggestions.length,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro ao buscar sugestões de filmes:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar sugestões de filmes',
      details: error.message
    });
  }
});

// Debug endpoint para testar journey flow
app.get('/debug/journey-flow/:sentimentId', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.sentimentId);
    console.log(`🔍 Debug: Buscando journey flow para sentimentId: ${sentimentId}`);
    
    const journeyFlow = await directDb.getJourneyFlow(sentimentId);
    
    if (!journeyFlow) {
      return res.status(404).json({ error: 'Journey flow não encontrado' });
    }
    
    // Testar uma opção específica
    const testOptionId = 25;
    const movieSuggestions = await directDb.getMovieSuggestions(testOptionId);
    
    res.json({
      sentimentId,
      journeyFlow: {
        id: journeyFlow.id,
        stepsCount: journeyFlow.steps.length,
        steps: journeyFlow.steps.map((step: any) => ({
          id: step.id,
          stepId: step.step_id,
          optionsCount: step.options?.length || 0,
          options: step.options?.map((option: any) => ({
            id: option.id,
            text: option.text,
            isEndState: option.isEndState,
            nextStepId: option.nextStepId
          })) || []
        }))
      },
      testOption: {
        id: testOptionId,
        movieSuggestionsCount: movieSuggestions.length,
        movieSuggestions: movieSuggestions
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro ao buscar journey flow:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar journey flow',
      details: error.message
    });
  }
});

// NOVO ENDPOINT FUNCIONANDO - BYPASSA CACHE VERCEL - CORRIGIDO
app.get('/api/personalized-flow/:sentimentId/:intentionId', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const sentimentId = parseInt(req.params.sentimentId);
    const intentionId = parseInt(req.params.intentionId);
    
    console.log(`🔍 Prisma: Buscando jornada para sentimentId: ${sentimentId}, intentionId: ${intentionId}`);
    
    // BUSCAR O JOURNEY STEP FLOW CORRETO PARA A COMBINAÇÃO SENTIMENTO + INTENÇÃO
    const emotionalIntentionJourneyStep = await prisma.emotionalIntentionJourneyStep.findFirst({
      where: { emotionalIntentionId: intentionId },
      include: {
        journeyStepFlow: {
          include: {
            options: {
              include: {
                movieSuggestions: {
                  include: {
                    movie: {
                      include: {
                        platforms: {
                          include: {
                            streamingPlatform: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!emotionalIntentionJourneyStep) {
      return res.status(404).json({ error: 'Jornada não encontrada para essa combinação de sentimento e intenção' });
    }
    
    const journeyStepFlow = emotionalIntentionJourneyStep.journeyStepFlow;
    
    console.log(`✅ Journey step flow encontrado: ${journeyStepFlow.options?.length || 0} options`);
    
    // Buscar informações da intenção
    const intentions = await prisma.emotionalIntention.findMany({
      where: { mainSentimentId: sentimentId }
    });
    
    const selectedIntention = intentions.find((intention: any) => intention.id === intentionId);
    
    if (!selectedIntention) {
      return res.status(404).json({ error: 'Intenção emocional não encontrada' });
    }
    
    console.log(`✅ Intenção encontrada: ${selectedIntention.intentionType}`);
    
    // Retornar jornada personalizada no formato esperado pelo frontend
    const response = {
      id: journeyStepFlow.id,
      mainSentimentId: sentimentId,
      emotionalIntentionId: intentionId,
      steps: [{
        id: journeyStepFlow.id,
        stepId: journeyStepFlow.stepId,
        order: journeyStepFlow.order,
        question: journeyStepFlow.question,
        options: journeyStepFlow.options.map((option: any) => ({
          id: option.id,
          text: option.text,
          nextStepId: option.nextStepId,
          isEndState: option.isEndState,
          movieSuggestions: option.isEndState ? option.movieSuggestions.map((suggestion: any) => ({
            id: suggestion.id,
            reason: suggestion.reason,
            relevance: suggestion.relevance,
            movie: suggestion.movie
          })) : undefined
        }))
      }]
    };
    
    console.log(`✅ Resposta final: ${response.steps.length} steps processados`);
    
    await prisma.$disconnect();
    res.json(response);
  } catch (error: any) {
    console.error('Erro ao buscar jornada personalizada:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar jornada personalizada',
      details: error.message 
    });
  }
});

// ENDPOINT ANTIGO V2 - REMOVIDO
app.get('/api/personalized-journey-v2/:sentimentId/:intentionId', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.sentimentId);
    const intentionId = parseInt(req.params.intentionId);
    
    console.log(`🆕 NOVO ENDPOINT: Buscando jornada para sentimentId: ${sentimentId}, intentionId: ${intentionId}`);
    
    // Buscar journey flow do sentimento
    const journeyFlow = await directDb.getJourneyFlow(sentimentId);
    
    if (!journeyFlow) {
      return res.status(404).json({ error: 'Journey flow não encontrado' });
    }
    
    console.log(`✅ Journey flow encontrado: ${journeyFlow.steps.length} steps`);
    
    // Buscar informações da intenção
    const intentions = await directDb.getEmotionalIntentions(sentimentId);
    const selectedIntention = intentions.intentions.find((intention: any) => intention.id === intentionId);
    
    if (!selectedIntention) {
      return res.status(404).json({ error: 'Intenção emocional não encontrada' });
    }
    
    console.log(`✅ Intenção encontrada: ${selectedIntention.type}`);
    
    // Retornar jornada personalizada no formato esperado pelo frontend
    const response = {
      id: journeyFlow.id,
      mainSentimentId: sentimentId,
      emotionalIntentionId: intentionId,
      steps: await Promise.all(journeyFlow.steps.map(async (step: any) => {
        console.log(`🔍 Processando step: ${step.stepId} com ${step.options?.length || 0} opções`);
        
        return {
          id: step.id,
          stepId: step.step_id,
          order: step.order,
          question: step.question,
          options: await Promise.all(step.options.map(async (option: any) => {
            console.log(`🔍 Processando opção ${option.id}: isEndState=${option.isEndState}, nextStepId=${option.nextStepId}`);
            
            let movieSuggestions = undefined;
            
            if (option.isEndState) {
              console.log(`🎬 Buscando sugestões para opção ${option.id}`);
              movieSuggestions = await directDb.getMovieSuggestions(option.id);
              console.log(`✅ Encontradas ${movieSuggestions.length} sugestões para opção ${option.id}`);
            }
            
            return {
              id: option.id,
              text: option.text,
              nextStepId: option.nextStepId,
              isEndState: option.isEndState,
              movieSuggestions: movieSuggestions
            };
          }))
        };
      }))
    };
    
    console.log(`✅ Resposta final: ${response.steps.length} steps processados`);
    
    // Log detalhado da primeira opção para debug
    if (response.steps.length > 0 && response.steps[0].options.length > 0) {
      const firstOption = response.steps[0].options[0];
      console.log(`🔍 DEBUG - Primeira opção:`, {
        id: firstOption.id,
        text: firstOption.text,
        nextStepId: firstOption.nextStepId,
        isEndState: firstOption.isEndState,
        movieSuggestionsCount: firstOption.movieSuggestions?.length || 0
      });
    }
    
    res.json(response);
  } catch (error: any) {
    console.error('Erro ao buscar jornada personalizada:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar jornada personalizada',
      details: error.message 
    });
  }
});

// Debug endpoint para verificar estrutura da tabela
app.get('/debug/table-structure/:optionId', async (req, res) => {
  try {
    const optionId = parseInt(req.params.optionId);
    console.log(`🔍 Debug: Verificando estrutura da tabela para optionId: ${optionId}`);
    
    // Usar directDb para fazer a query
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    const result = await pool.query(`
      SELECT 
        jof.id,
        jof."optionId" as option_id,
        jof.text,
        jof."nextStepId" as next_step_id,
        jof."isEndState" as is_end_state
      FROM "JourneyOptionFlow" jof
      WHERE jof.id = $1
    `, [optionId]);
    
    await pool.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Opção não encontrada' });
    }
    
    const option = result.rows[0];
    
    res.json({
      optionId,
      rawData: option,
      parsedData: {
        id: option.id,
        text: option.text,
        nextStepId: option.next_step_id,
        isEndState: option.is_end_state
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro ao verificar estrutura da tabela:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar estrutura da tabela',
      details: error.message
    });
  }
});

// Movie details routes
app.use('/api/movie', movieDetailsRoutes);

// Test route to verify movie details
app.get('/api/movie/test', (req, res) => {
  res.json({ message: 'Movie details route is working!' });
});

// Movie details endpoint
app.get('/api/movie/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Usar directDb para buscar o filme
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Buscar filme com plataformas
    const movieResult = await pool.query(`
      SELECT 
        m.id,
        m.title,
        m.year,
        m.description,
        m.director,
        m.runtime,
        m.certification,
        m."imdbRating",
        m."vote_average",
        m.thumbnail,
        m.genres
      FROM "Movie" m
      WHERE m.id = $1
    `, [id]);

    if (movieResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    const movie = movieResult.rows[0];

    // Buscar plataformas de streaming
    const platformsResult = await pool.query(`
      SELECT 
        sp.id,
        sp.name,
        sp.category,
        msp."accessType"
      FROM "MovieStreamingPlatform" msp
      JOIN "StreamingPlatform" sp ON msp."streamingPlatformId" = sp.id
      WHERE msp."movieId" = $1
      AND (sp.category = 'SUBSCRIPTION_PRIMARY' OR sp.category = 'HYBRID')
    `, [id]);

    await pool.end();

    const subscriptionPlatforms = platformsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      accessType: row.accessType
    }));

    res.json({
      movie: {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        description: movie.description,
        director: movie.director,
        runtime: movie.runtime,
        certification: movie.certification,
        imdbRating: movie.imdbRating,
        vote_average: movie.vote_average,
        thumbnail: movie.thumbnail,
        genres: movie.genres
      },
      subscriptionPlatforms
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes do filme:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Error Handling Middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Erro interno do servidor',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// Inicialização do servidor
if (require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${port}`);
  });
}

export default app; // Force new deploy
// Force new deploy - Mon Jul 28 02:13:24 -03 2025

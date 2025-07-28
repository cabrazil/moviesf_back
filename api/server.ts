import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import directDb from '../src/utils/directDb';

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

// Personalized journey (DADOS REAIS)
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
            isEndState: option.is_end_state,
            nextStepId: option.next_step_id
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

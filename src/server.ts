import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import directDb from './utils/directDb';
import routes from './routes';
import mainSentimentsRoutes from './routes/main-sentiments.routes';
import moviesRoutes from './routes/movies.routes';
import personalizedJourneyRoutes from './routes/personalized-journey.routes';
import publicRoutes from './routes/public';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const prisma = new PrismaClient();

// Configuração CORS mais permissiva para desenvolvimento
app.use(cors({
  origin: '*', // Permite todas as origens em desenvolvimento
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  credentials: true,
  maxAge: 86400 // 24 horas
}));

app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// Health check endpoint simples
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/', routes);
app.use('/main-sentiments', mainSentimentsRoutes);
app.use('/movies', moviesRoutes);
app.use('/api/personalized-journey', personalizedJourneyRoutes);
app.use('/api/public', publicRoutes);

// Movie hero endpoint (por slug - landing page) - DEVE VIR ANTES DA ROTA DE DETALHES
app.get('/api/movie/:slug/hero', async (req, res) => {
  try {
    const { slug } = req.params;
    
    console.log(`🎬 Buscando filme hero por slug: ${slug}`);
    
    // Usar directDb para buscar o filme por slug
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Buscar filme por slug
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
        m."rottenTomatoesRating",
        m."metacriticRating",
        m.thumbnail,
        m.genres
      FROM "Movie" m
      WHERE m.slug = $1
    `, [slug]);

    if (movieResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    const movie = movieResult.rows[0];
    console.log(`✅ Filme hero encontrado: ${movie.title}`);

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
    `, [movie.id]);

    // Buscar motivo para assistir (MovieSuggestionFlow.reason)
    const reasonResult = await pool.query(`
      SELECT msf.reason
      FROM "MovieSuggestionFlow" msf
      WHERE msf."movieId" = $1
      LIMIT 1
    `, [movie.id]);

    await pool.end();

    const subscriptionPlatforms = platformsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      accessType: row.accessType
    }));

    const reason = reasonResult.rows.length > 0 ? reasonResult.rows[0].reason : null;

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
        rottenTomatoesRating: movie.rottenTomatoesRating,
        metacriticRating: movie.metacriticRating,
        thumbnail: movie.thumbnail,
        genres: movie.genres
      },
      subscriptionPlatforms,
      reason
    });

  } catch (error) {
    console.error('Erro ao buscar filme hero:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Emotional intentions usando Prisma
app.get('/api/emotional-intentions/:sentimentId', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.sentimentId);
    const intentions = await prisma.emotionalIntention.findMany({
      where: { mainSentimentId: sentimentId },
      select: {
        id: true,
        intentionType: true,
        description: true,
        mainSentimentId: true
      }
    });

    // Buscar o nome do sentimento para compatibilidade com frontend
    const sentiment = await prisma.mainSentiment.findUnique({
      where: { id: sentimentId },
      select: { name: true }
    });

    // Retornar no formato esperado pelo frontend
    const response = {
      sentimentId: sentimentId,
      sentimentName: sentiment?.name || 'Desconhecido',
      intentions: intentions.map(intention => ({
        id: intention.id,
        type: intention.intentionType,
        description: intention.description
      }))
    };

    res.json(response);
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

// Movie details endpoint (por UUID - aplicação principal)
app.get('/api/movie/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    console.log(`🔍 Buscando filme por UUID: ${id}`);
    
    // Usar directDb para buscar o filme
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Buscar filme por UUID
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
    console.log(`✅ Filme encontrado: ${movie.title}`);

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
    `, [movie.id]);

    await pool.end();

    const subscriptionPlatforms = platformsResult.rows.map((row: any) => ({
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

// Inicialização do servidor apenas se este arquivo for executado diretamente
if (require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${port}`);
  });
}

export default app; 
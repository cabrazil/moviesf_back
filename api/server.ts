import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import directDb from '../src/utils/directDb';
import routes from '../src/routes';
import mainSentimentsRoutes from '../src/routes/main-sentiments.routes';
import moviesRoutes from '../src/routes/movies.routes';
import personalizedJourneyRoutes from '../src/routes/personalized-journey.routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

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
        m."original_title",
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

    // Buscar todas as plataformas de streaming
    const platformsResult = await pool.query(`
      SELECT 
        sp.id,
        sp.name,
        sp.category,
        msp."accessType"
      FROM "MovieStreamingPlatform" msp
      JOIN "StreamingPlatform" sp ON msp."streamingPlatformId" = sp.id
      WHERE msp."movieId" = $1
      ORDER BY 
        CASE msp."accessType"
          WHEN 'INCLUDED_WITH_SUBSCRIPTION' THEN 1
          WHEN 'RENTAL' THEN 2
          WHEN 'PURCHASE' THEN 3
          ELSE 4
        END,
        sp.name
    `, [movie.id]);

    // Buscar motivo para assistir (MovieSuggestionFlow.reason)
    const reasonResult = await pool.query(`
      SELECT msf.reason
      FROM "MovieSuggestionFlow" msf
      WHERE msf."movieId" = $1
      LIMIT 1
    `, [movie.id]);

    await pool.end();

    // Organizar plataformas por tipo de acesso
    const allPlatforms = platformsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      logoUrl: row.logoUrl,
      accessType: row.accessType
    }));

    const subscriptionPlatforms = allPlatforms.filter((p: any) => p.accessType === 'INCLUDED_WITH_SUBSCRIPTION');
    const rentalPurchasePlatforms = allPlatforms.filter((p: any) => p.accessType === 'RENTAL' || p.accessType === 'PURCHASE');

    const reason = reasonResult.rows.length > 0 ? reasonResult.rows[0].reason : null;

    res.json({
      movie: {
        id: movie.id,
        title: movie.title,
        original_title: movie.original_title,
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
      rentalPurchasePlatforms,
      reason
    });

  } catch (error) {
    console.error('Erro ao buscar filme hero:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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

// Movie details endpoint
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

    // Buscar filme com campos adicionais
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
        m.genres,
        m."targetAudienceForLP",
        m."landingPageHook",
        m."contentWarnings"
      FROM "Movie" m
      WHERE m.id = $1
    `, [id]);

    if (movieResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    const movie = movieResult.rows[0];
    console.log(`✅ Filme encontrado: ${movie.title}`);

    // Buscar plataformas de streaming com informações completas
    const platformsResult = await pool.query(`
      SELECT 
        sp.id,
        sp.name,
        sp.category,
        sp."logoPath",
        sp."hasFreeTrial",
        sp."freeTrialDuration",
        sp."baseUrl",
        msp."accessType"
      FROM "MovieStreamingPlatform" msp
      JOIN "StreamingPlatform" sp ON msp."streamingPlatformId" = sp.id
      WHERE msp."movieId" = $1
      AND (sp.category = 'SUBSCRIPTION_PRIMARY' OR sp.category = 'HYBRID')
      ORDER BY 
        CASE msp."accessType"
          WHEN 'INCLUDED_WITH_SUBSCRIPTION' THEN 1
          WHEN 'RENTAL' THEN 2
          WHEN 'PURCHASE' THEN 3
          ELSE 4
        END,
        sp.name
    `, [id]);

    // Buscar subsentimentos do filme para as tags emocionais
    let sentimentsResult;
    try {
      sentimentsResult = await pool.query(`
        SELECT 
          ms."subSentimentId",
          ss.name as "subSentimentName"
        FROM "MovieSentiment" ms
        JOIN "SubSentiment" ss ON ms."subSentimentId" = ss.id
        WHERE ms."movieId" = $1
        ORDER BY ms.relevance DESC
      `, [movie.id]);
      console.log(`✅ Subsentimentos encontrados: ${sentimentsResult.rows.length}`);
    } catch (sentimentsError) {
      console.error('❌ Erro ao buscar subsentimentos:', sentimentsError);
      sentimentsResult = { rows: [] };
    }

    // Buscar elenco principal (5 atores com order <= 5)
    let castResult;
    try {
      castResult = await pool.query(`
        SELECT 
          a.name as "actorName",
          mc."characterName",
          mc."order"
        FROM "MovieCast" mc
        JOIN "Actor" a ON mc."actorId" = a.id
        WHERE mc."movieId" = $1
          AND mc."order" <= 5
        ORDER BY mc."order" ASC
        LIMIT 5
      `, [movie.id]);
      console.log(`✅ Elenco principal encontrado: ${castResult.rows.length} atores`);
    } catch (castError) {
      console.error('❌ Erro ao buscar elenco:', castError);
      castResult = { rows: [] };
    }

    await pool.end();

    // Extrair nomes dos subsentimentos para as tags emocionais
    const emotionalTags = sentimentsResult.rows.map((row: any) => row.subSentimentName);

    // Extrair dados do elenco principal
    const mainCast = castResult.rows.map((row: any) => ({
      actorName: row.actorName,
      characterName: row.characterName,
      order: row.order
    }));

    const subscriptionPlatforms = platformsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      logoPath: row.logoPath,
      hasFreeTrial: row.hasFreeTrial,
      freeTrialDuration: row.freeTrialDuration,
      baseUrl: row.baseUrl,
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
        genres: movie.genres,
        targetAudienceForLP: movie.targetAudienceForLP,
        landingPageHook: movie.landingPageHook,
        contentWarnings: movie.contentWarnings,
        emotionalTags: emotionalTags,
        mainCast: mainCast
      },
      subscriptionPlatforms
    });

  } catch (error) {
    console.error('Erro ao buscar detalhes do filme:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar todas as plataformas de streaming
app.get('/api/streaming-platforms', async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const platformsResult = await pool.query(`
      SELECT 
        id,
        name,
        category,
        "logoPath",
        "baseUrl",
        "hasFreeTrial",
        "freeTrialDuration"
      FROM "StreamingPlatform"
      ORDER BY 
        CASE category
          WHEN 'SUBSCRIPTION_PRIMARY' THEN 1
          WHEN 'HYBRID' THEN 2
          WHEN 'RENTAL_PURCHASE_PRIMARY' THEN 3
          WHEN 'FREE_PRIMARY' THEN 4
          ELSE 5
        END,
        name
    `);

    await pool.end();

    const platforms = platformsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      logoPath: row.logoPath,
      baseUrl: row.baseUrl,
      hasFreeTrial: row.hasFreeTrial,
      freeTrialDuration: row.freeTrialDuration
    }));

    res.json(platforms);

  } catch (error) {
    console.error('Erro ao buscar plataformas de streaming:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Error Handling Middleware and logging
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
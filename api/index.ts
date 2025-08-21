import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import directDb from '../src/utils/directDb';
import routes from '../src/routes';
import mainSentimentsRoutes from '../src/routes/main-sentiments.routes';
import moviesRoutes from '../src/routes/movies.routes';
import personalizedJourneyRoutes from '../src/routes/personalized-journey.routes';
import publicRoutes from '../src/routes/public';

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

// Buscar todas as plataformas de streaming
app.get('/api/streaming-platforms', async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
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
        m.genres,
        m."landingPageHook",
        m."contentWarnings",
        m."targetAudienceForLP"
      FROM "Movie" m
      WHERE m.slug = $1
    `, [slug]);

    if (movieResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    const movie = movieResult.rows[0];
    console.log(`✅ Filme hero encontrado: ${movie.title}`);

    // Buscar plataformas de streaming com informações de teste grátis
    let platformsResult;
    try {
      platformsResult = await pool.query(`
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
        ORDER BY 
          CASE msp."accessType"
            WHEN 'INCLUDED_WITH_SUBSCRIPTION' THEN 1
            WHEN 'RENTAL' THEN 2
            WHEN 'PURCHASE' THEN 3
            ELSE 4
          END,
          sp.name
      `, [movie.id]);
      console.log(`✅ Plataformas encontradas: ${platformsResult.rows.length}`);
    } catch (platformsError) {
      console.error('❌ Erro ao buscar plataformas:', platformsError);
      platformsResult = { rows: [] };
    }

    // Buscar motivo para assistir (MovieSuggestionFlow.reason)
    let reasonResult;
    try {
      reasonResult = await pool.query(`
        SELECT msf.reason
        FROM "MovieSuggestionFlow" msf
        WHERE msf."movieId" = $1
        LIMIT 1
      `, [movie.id]);
      console.log(`✅ Reason encontrado: ${reasonResult.rows.length > 0 ? 'Sim' : 'Não'}`);
    } catch (reasonError) {
      console.error('❌ Erro ao buscar reason:', reasonError);
      reasonResult = { rows: [] };
    }

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

    // Buscar elenco completo para a aba "Mais do Elenco"
    let fullCastResult;
    try {
      fullCastResult = await pool.query(`
        SELECT 
          a.name as "actorName",
          mc."characterName",
          mc."order"
        FROM "MovieCast" mc
        JOIN "Actor" a ON mc."actorId" = a.id
        WHERE mc."movieId" = $1
        ORDER BY mc."order" ASC
      `, [movie.id]);
      console.log(`✅ Elenco completo encontrado: ${fullCastResult.rows.length} atores`);
    } catch (fullCastError) {
      console.error('❌ Erro ao buscar elenco completo:', fullCastError);
      fullCastResult = { rows: [] };
    }

    // Buscar trailer principal para a aba "Trailer"
    let mainTrailerResult;
    try {
      mainTrailerResult = await pool.query(`
        SELECT 
          mt.key,
          mt.name,
          mt.site,
          mt.type,
          mt.language,
          mt."isMain"
        FROM "MovieTrailer" mt
        WHERE mt."movieId" = $1
          AND mt."isMain" = true
        LIMIT 1
      `, [movie.id]);
      console.log(`✅ Trailer principal encontrado: ${mainTrailerResult.rows.length > 0 ? 'Sim' : 'Não'}`);
    } catch (trailerError) {
      console.error('❌ Erro ao buscar trailer principal:', trailerError);
      mainTrailerResult = { rows: [] };
    }

    // Organizar plataformas por tipo de acesso
    const allPlatforms = platformsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      logoPath: row.logoPath,
      hasFreeTrial: row.hasFreeTrial,
      freeTrialDuration: row.freeTrialDuration,
      baseUrl: row.baseUrl,
      accessType: row.accessType
    }));

    const subscriptionPlatforms = allPlatforms.filter((p: any) => p.accessType === 'INCLUDED_WITH_SUBSCRIPTION');
    const rentalPurchasePlatforms = allPlatforms.filter((p: any) => p.accessType === 'RENTAL' || p.accessType === 'PURCHASE');

    const reason = reasonResult.rows.length > 0 ? reasonResult.rows[0].reason : null;

    // Extrair nomes dos subsentimentos para as tags emocionais
    const emotionalTags = sentimentsResult.rows.map((row: any) => row.subSentimentName);

    // Extrair elenco principal
    const mainCast = castResult.rows.map((row: any) => ({
      actorName: row.actorName,
      characterName: row.characterName,
      order: row.order
    }));

    // Extrair elenco completo
    const fullCast = fullCastResult.rows.map((row: any) => ({
      actorName: row.actorName,
      characterName: row.characterName,
      order: row.order
    }));

    // Extrair trailer principal
    const mainTrailer = mainTrailerResult.rows.length > 0 ? {
      key: mainTrailerResult.rows[0].key,
      name: mainTrailerResult.rows[0].name,
      site: mainTrailerResult.rows[0].site,
      type: mainTrailerResult.rows[0].type,
      language: mainTrailerResult.rows[0].language,
      isMain: mainTrailerResult.rows[0].isMain
    } : null;

    // Buscar filmes similares baseado no journeyOptionFlowId
    let similarMoviesResult;
    try {
      similarMoviesResult = await pool.query(`
        WITH current_movie_flow AS (
          SELECT msf."journeyOptionFlowId"
          FROM "MovieSuggestionFlow" msf
          WHERE msf."movieId" = $1
          LIMIT 1
        )
        SELECT DISTINCT
          m.id,
          m.title,
          m.year,
          m.thumbnail,
          m.slug,
          RANDOM() as random_order
        FROM "MovieSuggestionFlow" msf
        JOIN "Movie" m ON msf."movieId" = m.id
        CROSS JOIN current_movie_flow cmf
        WHERE msf."journeyOptionFlowId" = cmf."journeyOptionFlowId"
          AND msf."movieId" != $1
        ORDER BY random_order
        LIMIT 6
      `, [movie.id]);
      console.log(`✅ Filmes similares encontrados: ${similarMoviesResult.rows.length}`);
    } catch (similarError) {
      console.error('❌ Erro ao buscar filmes similares:', similarError);
      // Se falhar, usar array vazio
      similarMoviesResult = { rows: [] };
    }

    await pool.end();

    // Extrair filmes similares
    const similarMovies = similarMoviesResult.rows.map((row: any) => {
      const originalThumbnail = row.thumbnail;
      const newThumbnail = row.thumbnail ? row.thumbnail.replace('/w500/', '/w185/') : null;
      
      if (originalThumbnail && newThumbnail !== originalThumbnail) {
        console.log(`🖼️ Thumbnail convertido: ${originalThumbnail} → ${newThumbnail}`);
      }
      
      return {
        id: row.id,
        title: row.title,
        year: row.year,
        thumbnail: newThumbnail,
        slug: row.slug
      };
    });

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
        genres: movie.genres,
        landingPageHook: movie.landingPageHook,
        contentWarnings: movie.contentWarnings,
        targetAudienceForLP: movie.targetAudienceForLP,
        emotionalTags: emotionalTags,
        mainCast: mainCast,
        fullCast: fullCast,
        mainTrailer: mainTrailer
      },
      subscriptionPlatforms,
      rentalPurchasePlatforms,
      similarMovies,
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

// Error Handling Middleware and logging
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// Iniciar servidor apenas se não estiver na Vercel
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
  });
}

// Export para Vercel
export default app;

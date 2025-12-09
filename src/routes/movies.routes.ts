import { Router } from 'express';
import { prismaApp as prisma } from '../prisma';

const router = Router();

// Buscar filme por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Buscando filme com ID:', id);

    // Verificar se o ID é um UUID válido
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      console.log('ID inválido:', id);
      return res.status(400).json({ error: 'ID do filme inválido' });
    }

    const movie = await prisma.movie.findUnique({
      where: { 
        id: id
      },
      select: {
        id: true,
        title: true,
        original_title: true,
        thumbnail: true,
        year: true,
        director: true,
        vote_average: true,
        certification: true,
        genres: true,
        runtime: true,
        description: true,
        landingPageHook: true,
        targetAudienceForLP: true,
        contentWarnings: true,
        // streamingPlatforms: true,
        movieSentiments: {
          select: {
            mainSentiment: {
              select: {
                name: true
              }
            },
            subSentiment: {
              select: {
                name: true
              }
            }
          }
        },
        movieSuggestionFlows: {
          select: {
            reason: true,
            relevance: true
          }
        },
        platforms: {
          select: {
            accessType: true,
            streamingPlatform: {
              select: {
                id: true,
                name: true,
                logoPath: true,
                category: true,
                hasFreeTrial: true,
                freeTrialDuration: true,
                baseUrl: true
              }
            }
          }
        }
      }
    });

    console.log('Filme encontrado:', movie);

    if (!movie) {
      console.log('Filme não encontrado');
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    res.json(movie);
  } catch (error) {
    console.error('Erro detalhado ao buscar filme:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar filme',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Buscar filmes similares por ID (baseado na lógica da Landing Page)
router.get('/:id/similar', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Buscando filmes similares para ID:', id);

    // Verificar se o ID é um UUID válido
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      console.log('ID inválido:', id);
      return res.status(400).json({ error: 'ID do filme inválido' });
    }

    // Usar a mesma query da Landing Page (baseada em RelevanceScore + JourneyOptionFlow)
    const { Pool } = require('pg');
    const { getSSLConfig } = require('../utils/ssl-config');
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString: connectionString,
      ssl: getSSLConfig(connectionString)
    });

    const similarMoviesResult = await pool.query(`
      WITH best_journey AS (
        SELECT msf."journeyOptionFlowId"
        FROM "MovieSuggestionFlow" msf
        WHERE msf."movieId" = $1
          AND msf.relevance = 1
        LIMIT 1
      )
      SELECT DISTINCT
        m.id,
        m.title,
        m.year,
        m.thumbnail,
        m.slug,
        msf."relevanceScore",
        msf."journeyOptionFlowId",
        jof."displayTitle",
        RANDOM() as random_order
      FROM "MovieSuggestionFlow" msf
      JOIN "Movie" m ON msf."movieId" = m.id
      JOIN "JourneyOptionFlow" jof ON msf."journeyOptionFlowId" = jof.id
      JOIN best_journey bj ON msf."journeyOptionFlowId" = bj."journeyOptionFlowId"
      WHERE msf."movieId" != $1
      ORDER BY msf."relevanceScore" DESC, random_order
      LIMIT 6
    `, [id]);

    await pool.end();

    const similarMovies = similarMoviesResult.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      year: row.year,
      thumbnail: row.thumbnail,
      slug: row.slug,
      relevanceScore: row.relevanceScore,
      journeyOptionFlowId: row.journeyOptionFlowId,
      displayTitle: row.displayTitle
    }));

    console.log(`✅ Filmes similares encontrados: ${similarMovies.length}`);
    res.json(similarMovies);

  } catch (error) {
    console.error('Erro ao buscar filmes similares:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar filmes similares',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router; 
import { Router } from 'express';
import { Pool } from 'pg';
import { getSSLConfig } from '../utils/ssl-config';

const router = Router();

// Pool de conexão global para reutilização
let globalPool: Pool | null = null;

const getPool = (): Pool => {
  if (!globalPool) {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    globalPool = new Pool({
      connectionString: connectionString,
      ssl: getSSLConfig(connectionString),
      // Configurações de pool para melhor performance
      max: 20, // máximo de conexões
      idleTimeoutMillis: 30000, // tempo para fechar conexões idle
      connectionTimeoutMillis: 2000, // timeout de conexão
    });
  }
  return globalPool;
};

router.get('/:id/details', async (req, res) => {
  const startTime = Date.now();
  console.log(`🚀 [${new Date().toISOString()}] Iniciando busca de filme: ${req.params.id}`);
  
  try {
    const { id } = req.params;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const pool = getPool();
    
    // Query otimizada: buscar dados básicos do filme
    const movieQueryStart = Date.now();
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
        m."targetAudienceForLP",
        m."landingPageHook",
        m."contentWarnings",
        m."awardsSummary"
      FROM "Movie" m
      WHERE m.id = $1
    `, [id]);
    
    console.log(`⏱️ Query filme: ${Date.now() - movieQueryStart}ms`);

    if (movieResult.rows.length === 0) {
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    const movie = movieResult.rows[0];
    console.log(`✅ Filme encontrado: ${movie.title}`);
    
    // Executar queries em paralelo para melhor performance
    const parallelQueriesStart = Date.now();
    
    const [
      platformsResult,
      sentimentsResult,
      castResult,
      mainTrailerResult
    ] = await Promise.all([
      // Plataformas de streaming
      pool.query(`
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
      `, [id]).catch(err => {
        console.error('❌ Erro ao buscar plataformas:', err);
        return { rows: [] };
      }),
      
      // Sentimentos (simplificado)
      pool.query(`
        SELECT 
          ms."mainSentimentId",
          ms."subSentimentId",
          ms.relevance,
          ms_main.name as "mainSentimentName",
          ss.name as "subSentimentName"
        FROM "MovieSentiment" ms
        JOIN "MainSentiment" ms_main ON ms."mainSentimentId" = ms_main.id
        JOIN "SubSentiment" ss ON ms."subSentimentId" = ss.id
        WHERE ms."movieId" = $1
        ORDER BY ms.relevance DESC
        LIMIT 10
      `, [id]).catch(err => {
        console.error('❌ Erro ao buscar sentimentos:', err);
        return { rows: [] };
      }),
      
      // Elenco principal (limitado)
      pool.query(`
        SELECT 
          a.name as "actorName",
          mc."characterName",
          mc."order"
        FROM "MovieCast" mc
        JOIN "Actor" a ON mc."actorId" = a.id
        WHERE mc."movieId" = $1
        ORDER BY mc."order" ASC
        LIMIT 10
      `, [id]).catch(err => {
        console.error('❌ Erro ao buscar elenco:', err);
        return { rows: [] };
      }),
      
      // Trailer principal
      pool.query(`
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
      `, [id]).catch(err => {
        console.error('❌ Erro ao buscar trailer:', err);
        return { rows: [] };
      })
    ]);
    
    console.log(`⏱️ Queries paralelas: ${Date.now() - parallelQueriesStart}ms`);
    
    // Query de prêmios Oscar (opcional - só se necessário)
    let oscarAwards = null;
    if (movie.awardsSummary) {
      const oscarQueryStart = Date.now();
      try {
        const oscarAwardsResult = await pool.query(`
          SELECT DISTINCT
            ac.name as category_name,
            COALESCE(maw.year, man.year, paw.year, pan.year) as year,
            CASE 
              WHEN maw.id IS NOT NULL OR paw.id IS NOT NULL THEN 'win'
              ELSE 'nomination'
            END as type,
            act.name as person_name
          FROM "AwardCategory" ac
          JOIN "Award" a ON ac."awardId" = a.id
          LEFT JOIN "MovieAwardWin" maw ON (ac.id = maw."awardCategoryId" AND maw."movieId" = $1)
          LEFT JOIN "MovieAwardNomination" man ON (ac.id = man."awardCategoryId" AND man."movieId" = $1)
          LEFT JOIN "PersonAwardWin" paw ON (ac.id = paw."awardCategoryId" AND paw."forMovieId" = $1)
          LEFT JOIN "PersonAwardNomination" pan ON (ac.id = pan."awardCategoryId" AND pan."forMovieId" = $1)
          LEFT JOIN "Actor" act ON (paw."personId" = act.id OR pan."personId" = act.id)
          WHERE a.name = 'Oscar'
            AND (maw.id IS NOT NULL OR man.id IS NOT NULL OR paw.id IS NOT NULL OR pan.id IS NOT NULL)
          ORDER BY year DESC, type DESC, category_name
          LIMIT 20
        `, [id]);
        
        console.log(`⏱️ Query Oscar: ${Date.now() - oscarQueryStart}ms`);
        
        if (oscarAwardsResult.rows.length > 0) {
          const wins: any[] = [];
          const nominations: any[] = [];
          
          oscarAwardsResult.rows.forEach((row: any) => {
            if (row.type === 'win') {
              wins.push({
                category: row.category_name,
                year: row.year,
                personName: row.person_name
              });
            } else {
              nominations.push({
                category: row.category_name,
                year: row.year,
                personName: row.person_name
              });
            }
          });
          
          oscarAwards = {
            wins,
            nominations,
            totalWins: wins.length,
            totalNominations: nominations.length
          };
        }
      } catch (oscarError) {
        console.error('❌ Erro ao buscar prêmios Oscar:', oscarError);
      }
    }
    
    // Processar resultados
    const processingStart = Date.now();
    
    const emotionalTags = sentimentsResult.rows.map((row: any) => ({
      mainSentiment: row.mainSentimentName,
      subSentiment: row.subSentimentName,
      relevance: parseFloat(row.relevance) || 0
    }));
    
    const mainCast = castResult.rows.map((row: any) => ({
      actorName: row.actorName,
      characterName: row.characterName,
      order: row.order
    }));
    
    const mainTrailer = mainTrailerResult.rows.length > 0 ? {
      key: mainTrailerResult.rows[0].key,
      name: mainTrailerResult.rows[0].name,
      site: mainTrailerResult.rows[0].site,
      type: mainTrailerResult.rows[0].type,
      language: mainTrailerResult.rows[0].language,
      isMain: mainTrailerResult.rows[0].isMain
    } : null;

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

    console.log(`⏱️ Processamento: ${Date.now() - processingStart}ms`);
    
    const totalTime = Date.now() - startTime;
    console.log(`🎯 Total da requisição: ${totalTime}ms`);
    
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
        targetAudienceForLP: movie.targetAudienceForLP,
        landingPageHook: movie.landingPageHook,
        contentWarnings: movie.contentWarnings,
        awardsSummary: movie.awardsSummary,
        oscarAwards: oscarAwards,
        emotionalTags: emotionalTags,
        mainCast: mainCast,
        mainTrailer: mainTrailer
      },
      subscriptionPlatforms,
      performance: {
        totalTime: totalTime,
        movieQuery: movieQueryStart - startTime,
        parallelQueries: parallelQueriesStart - movieQueryStart,
        oscarQuery: oscarAwards ? Date.now() - parallelQueriesStart : 0,
        processing: Date.now() - processingStart
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar detalhes do filme:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;

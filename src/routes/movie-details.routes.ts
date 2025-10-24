import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    console.log(`🔍 Buscando filme por UUID: ${id}`);
    
    const pool = new Pool({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
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
        m.genres,
        m."targetAudienceForLP",
        m."landingPageHook",
        m."contentWarnings",
        m."awardsSummary"
      FROM "Movie" m
      WHERE m.id = $1
    `, [id]);

    if (movieResult.rows.length === 0) {
      await pool.end();
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    const movie = movieResult.rows[0];
    console.log(`✅ Filme encontrado: ${movie.title}`);
    console.log(`🏆 Awards Summary: ${movie.awardsSummary}`);
    
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
    `, [id]);
    
    let oscarAwards = null;
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
      
      console.log(`🏆 Dados de Oscar encontrados: ${wins.length} vitórias, ${nominations.length} indicações`);
    }
    
    // CORRIGIDO: Removido filtro que excluía RENTAL_PURCHASE_PRIMARY
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
      ORDER BY 
        CASE msp."accessType"
          WHEN 'INCLUDED_WITH_SUBSCRIPTION' THEN 1
          WHEN 'RENTAL' THEN 2
          WHEN 'PURCHASE' THEN 3
          ELSE 4
        END,
        sp.name
    `, [id]);
    
    let sentimentsResult;
    try {
      sentimentsResult = await pool.query(`
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
      `, [id]);
      console.log(`✅ Sentimentos encontrados: ${sentimentsResult.rows.length}`);
    } catch (sentimentsError) {
      console.error('❌ Erro ao buscar subsentimentos:', sentimentsError);
      sentimentsResult = { rows: [] };
    }
    
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
        ORDER BY mc."order" ASC
      `, [id]);
      console.log(`✅ Elenco principal encontrado: ${castResult.rows.length} atores`);
    } catch (castError) {
      console.error('❌ Erro ao buscar elenco:', castError);
      castResult = { rows: [] };
    }
    
    let quotesResult;
    try {
      quotesResult = await pool.query(`
        SELECT 
          q.id,
          q.text,
          q.author,
          q.vehicle,
          q.url
        FROM "Quote" q
        WHERE q."movieId" = $1
        ORDER BY q.id ASC
      `, [id]);
      console.log(`✅ Quotes encontrados: ${quotesResult.rows.length}`);
    } catch (quotesError) {
      console.error('❌ Erro ao buscar quotes:', quotesError);
      quotesResult = { rows: [] };
    }
    
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
      `, [id]);
      console.log(`✅ Trailer principal encontrado: ${mainTrailerResult.rows.length > 0 ? 'Sim' : 'Não'}`);
    } catch (trailerError) {
      console.error('❌ Erro ao buscar trailer principal:', trailerError);
      mainTrailerResult = { rows: [] };
    }

    await pool.end();
    
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
        genres: movie.genres,
        targetAudienceForLP: movie.targetAudienceForLP,
        landingPageHook: movie.landingPageHook,
        contentWarnings: movie.contentWarnings,
        awardsSummary: movie.awardsSummary,
        oscarAwards: oscarAwards,
        emotionalTags: emotionalTags,
        mainCast: mainCast,
        mainTrailer: mainTrailer,
        quotes: quotesResult.rows.map((row: any) => ({
          id: row.id,
          text: row.text,
          author: row.author,
          vehicle: row.vehicle,
          url: row.url
        }))
      },
      subscriptionPlatforms
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do filme:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
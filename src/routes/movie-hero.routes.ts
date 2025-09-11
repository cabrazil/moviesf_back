import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

// Movie hero endpoint (por slug - landing page)
router.get('/:slug/hero', async (req, res) => {
  try {
    const { slug } = req.params;
    
    console.log(`🎬 Buscando filme hero por slug: ${slug}`);
    
    // Usar directDb para buscar o filme por slug
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
        m."targetAudienceForLP",
        m."awardsSummary"
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
      `, [movie.id]);
      console.log(`✅ Sentimentos encontrados: ${sentimentsResult.rows.length}`);
    } catch (sentimentsError) {
      console.error('❌ Erro ao buscar subsentimentos:', sentimentsError);
      sentimentsResult = { rows: [] };
    }

    // Buscar elenco principal (primeiros 5 atores por ordem)
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

    // Buscar críticas/quotes do filme
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
      `, [movie.id]);
      console.log(`✅ Quotes encontrados: ${quotesResult.rows.length}`);
    } catch (quotesError) {
      console.error('❌ Erro ao buscar quotes:', quotesError);
      quotesResult = { rows: [] };
    }

    // Buscar premiações Oscar
    let oscarWinsResult;
    let oscarNominationsResult;
    try {
      // Buscar vitórias do Oscar
      oscarWinsResult = await pool.query(`
        SELECT 
          ac.name as "categoryName",
          maw.year,
          a.name as "personName"
        FROM "MovieAwardWin" maw
        JOIN "Award" award ON maw."awardId" = award.id
        JOIN "AwardCategory" ac ON maw."awardCategoryId" = ac.id
        LEFT JOIN "PersonAwardWin" paw ON (
          paw."awardId" = maw."awardId" 
          AND paw."awardCategoryId" = maw."awardCategoryId" 
          AND paw.year = maw.year
          AND paw."forMovieId" = maw."movieId"
        )
        LEFT JOIN "Actor" a ON paw."personId" = a.id
        WHERE maw."movieId" = $1
          AND award.name = 'Oscar'
        ORDER BY maw.year DESC, ac.name ASC
      `, [movie.id]);

      // Buscar indicações do Oscar
      oscarNominationsResult = await pool.query(`
        SELECT 
          ac.name as "categoryName",
          man.year,
          a.name as "personName"
        FROM "MovieAwardNomination" man
        JOIN "Award" award ON man."awardId" = award.id
        JOIN "AwardCategory" ac ON man."awardCategoryId" = ac.id
        LEFT JOIN "PersonAwardNomination" pan ON (
          pan."awardId" = man."awardId" 
          AND pan."awardCategoryId" = man."awardCategoryId" 
          AND pan.year = man.year
          AND pan."forMovieId" = man."movieId"
        )
        LEFT JOIN "Actor" a ON pan."personId" = a.id
        WHERE man."movieId" = $1
          AND award.name = 'Oscar'
        ORDER BY man.year DESC, ac.name ASC
      `, [movie.id]);

      console.log(`✅ Premiações Oscar encontradas: ${oscarWinsResult.rows.length} vitórias, ${oscarNominationsResult.rows.length} indicações`);
    } catch (oscarError) {
      console.error('❌ Erro ao buscar premiações Oscar:', oscarError);
      oscarWinsResult = { rows: [] };
      oscarNominationsResult = { rows: [] };
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

    // Extrair sentimentos com relevância para as tags emocionais
    const emotionalTags = sentimentsResult.rows.map((row: any) => ({
      mainSentiment: row.mainSentimentName,
      subSentiment: row.subSentimentName,
      relevance: parseFloat(row.relevance) || 0
    }));

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

    // Extrair críticas/quotes do filme
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
      `, [movie.id]);
      console.log(`✅ Quotes encontrados: ${quotesResult.rows.length}`);
    } catch (quotesError) {
      console.error('❌ Erro ao buscar quotes:', quotesError);
      quotesResult = { rows: [] };
    }

    // Buscar premiações Oscar
    let oscarWinsResult;
    let oscarNominationsResult;
    try {
      // Buscar vitórias do Oscar
      oscarWinsResult = await pool.query(`
        SELECT 
          ac.name as "categoryName",
          maw.year,
          a.name as "personName"
        FROM "MovieAwardWin" maw
        JOIN "Award" award ON maw."awardId" = award.id
        JOIN "AwardCategory" ac ON maw."awardCategoryId" = ac.id
        LEFT JOIN "PersonAwardWin" paw ON (
          paw."awardId" = maw."awardId" 
          AND paw."awardCategoryId" = maw."awardCategoryId" 
          AND paw.year = maw.year
          AND paw."forMovieId" = maw."movieId"
        )
        LEFT JOIN "Actor" a ON paw."personId" = a.id
        WHERE maw."movieId" = $1
          AND award.name = 'Oscar'
        ORDER BY maw.year DESC, ac.name ASC
      `, [movie.id]);

      // Buscar indicações do Oscar
      oscarNominationsResult = await pool.query(`
        SELECT 
          ac.name as "categoryName",
          man.year,
          a.name as "personName"
        FROM "MovieAwardNomination" man
        JOIN "Award" award ON man."awardId" = award.id
        JOIN "AwardCategory" ac ON man."awardCategoryId" = ac.id
        LEFT JOIN "PersonAwardNomination" pan ON (
          pan."awardId" = man."awardId" 
          AND pan."awardCategoryId" = man."awardCategoryId" 
          AND pan.year = man.year
          AND pan."forMovieId" = man."movieId"
        )
        LEFT JOIN "Actor" a ON pan."personId" = a.id
        WHERE man."movieId" = $1
          AND award.name = 'Oscar'
        ORDER BY man.year DESC, ac.name ASC
      `, [movie.id]);

      console.log(`✅ Premiações Oscar encontradas: ${oscarWinsResult.rows.length} vitórias, ${oscarNominationsResult.rows.length} indicações`);
    } catch (oscarError) {
      console.error('❌ Erro ao buscar premiações Oscar:', oscarError);
      oscarWinsResult = { rows: [] };
      oscarNominationsResult = { rows: [] };
    }

    // Extrair filmes similares baseado no journeyOptionFlowId
    let similarMoviesResult;
    try {
      similarMoviesResult = await pool.query(`
        WITH best_journey AS (
          SELECT msf."journeyOptionFlowId"
          FROM "MovieSuggestionFlow" msf
          WHERE msf."movieId" = $1
          ORDER BY msf."relevanceScore" DESC
          LIMIT 1
        )
        SELECT DISTINCT
          m.id,
          m.title,
          m.year,
          m.thumbnail,
          m.slug,
          msf."relevanceScore",
          RANDOM() as random_order
        FROM "MovieSuggestionFlow" msf
        JOIN "Movie" m ON msf."movieId" = m.id
        JOIN best_journey bj ON msf."journeyOptionFlowId" = bj."journeyOptionFlowId"
        WHERE msf."movieId" != $1
        ORDER BY msf."relevanceScore" DESC, random_order
        LIMIT 6
      `, [movie.id]);
      console.log(`✅ Filmes similares encontrados: ${similarMoviesResult.rows.length}`);
    } catch (similarError) {
      console.error('❌ Erro ao buscar filmes similares:', similarError);
      // Se falhar, usar array vazio
      similarMoviesResult = { rows: [] };
    }

    await pool.end();

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

    // Extrair sentimentos com relevância para as tags emocionais
    const emotionalTags = sentimentsResult.rows.map((row: any) => ({
      mainSentiment: row.mainSentimentName,
      subSentiment: row.subSentimentName,
      relevance: parseFloat(row.relevance) || 0
    }));

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
        awardsSummary: movie.awardsSummary,
        emotionalTags: emotionalTags,
        mainCast: mainCast,
        fullCast: fullCast,
        mainTrailer: mainTrailer,
        quotes: quotesResult.rows.map((row: any) => ({
          id: row.id,
          text: row.text,
          author: row.author,
          vehicle: row.vehicle,
          url: row.url
        })),
        oscarAwards: hasOscarAwards ? {
          wins: oscarWins,
          nominations: oscarNominations,
          totalWins: oscarWins.length,
          totalNominations: oscarNominations.length
        } : null
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

export default router;

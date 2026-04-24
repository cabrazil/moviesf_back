import { Router } from 'express';
import { movieHeroRepository } from '../repositories/movieHero.repository';

const router = Router();

router.get('/:id/details', async (req, res) => {
  const startTime = Date.now();
  const { id } = req.params;
  
  console.log(`🚀 [${new Date().toISOString()}] Iniciando busca de detalhes otimizados: ${id}`);

  try {
    // 1. Buscar filme por ID (UUID)
    // Nota: O repositório já tem os métodos necessários
    
    // Buscar todos os dados relacionados em paralelo usando o repositório existente
    const movieQueryResult = await movieHeroRepository.getMovieData(id);
    
    // Buscar o filme para ter os dados básicos (o repository.getMovieData não retorna os dados básicos do filme, apenas relacionados)
    const { dbConnection } = await import('../utils/database.connection');
    const movieBaseResult = await dbConnection.query(`
      SELECT 
        id, title, "original_title", year, description, director, runtime, 
        certification, "imdbRating", "vote_average", "rottenTomatoesRating", 
        "metacriticRating", thumbnail, genres, "landingPageHook", 
        "contentWarnings", "targetAudienceForLP", "awardsSummary"
      FROM "Movie"
      WHERE id = $1
    `, [id]);

    if (movieBaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    const movie = movieBaseResult.rows[0];

    // 2. Processar plataformas (usando a mesma lógica do MovieHeroService)
    const subscriptionPlatforms = movieQueryResult.platforms.filter(
      (p: any) => p.accessType === 'INCLUDED_WITH_SUBSCRIPTION' || p.accessType === 'FREE_WITH_ADS'
    );

    const rentalPurchasePlatforms = movieQueryResult.platforms.filter(
      (p: any) => p.accessType === 'RENTAL' || p.accessType === 'PURCHASE'
    );

    // 3. Organizar Oscar Awards
    const oscarAwards = {
      wins: movieQueryResult.oscarWins,
      nominations: movieQueryResult.oscarNominations,
      totalWins: movieQueryResult.oscarWins.length,
      totalNominations: movieQueryResult.oscarNominations.length
    };

    const totalTime = Date.now() - startTime;
    console.log(`🎯 Total da requisição otimizada: ${totalTime}ms`);

    res.json({
      movie: {
        ...movie,
        oscarAwards,
        emotionalTags: movieQueryResult.sentiments,
        mainCast: movieQueryResult.mainCast,
        mainTrailer: movieQueryResult.mainTrailer
      },
      subscriptionPlatforms,
      rentalPurchasePlatforms,
      performance: {
        totalTime
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar detalhes otimizados do filme:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;

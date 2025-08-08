import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/movie/:id/details
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    const movie = await prisma.movie.findUnique({
      where: { id },
      include: {
        platforms: {
          include: {
            streamingPlatform: true
          }
        }
      }
    });

    if (!movie) {
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    // Filtrar apenas plataformas de assinatura (SUBSCRIPTION_PRIMARY ou HYBRID)
    const subscriptionPlatforms = movie.platforms
      .filter(platform => 
        platform.streamingPlatform.category === 'SUBSCRIPTION_PRIMARY' || 
        platform.streamingPlatform.category === 'HYBRID'
      )
      .map(platform => ({
        id: platform.streamingPlatform.id,
        name: platform.streamingPlatform.name,
        category: platform.streamingPlatform.category,
        accessType: platform.accessType
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

export default router;

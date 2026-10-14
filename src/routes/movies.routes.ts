import { Router } from 'express';
import { prismaApp as prisma } from '../prisma';
import { shouldHideLogosForIos } from '../utils/appleReview';
import { movieHeroRepository } from '../repositories/movieHero.repository';

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

    if (!movie) {
      console.log('Filme não encontrado');
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    if (shouldHideLogosForIos(req) && movie.platforms) {
      movie.platforms = movie.platforms.map((p: any) => ({
        ...p,
        streamingPlatform: p.streamingPlatform ? {
          ...p.streamingPlatform,
          logoPath: null
        } : p.streamingPlatform
      }));
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

    const similarMovies = await movieHeroRepository.getSimilarMovies(id);
    console.log(`✅ Filmes similares com afinidade de vibe encontrados: ${similarMovies.length}`);
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
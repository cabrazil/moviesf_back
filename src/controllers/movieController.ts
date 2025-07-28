import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';
import memoryCache from '../utils/memoryCache';

const prisma = new PrismaClient();

// @desc    Buscar sugestões de filmes
// @route   GET /api/suggestions
// @access  Public
export const getMovieSuggestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { sentimentId, intentionId } = req.query;
  
  // Chave de cache baseada nos parâmetros
  const cacheKey = `suggestions:${sentimentId}:${intentionId}`;
  
  try {
    // Tentar buscar do cache primeiro
    const cachedData = await memoryCache.get(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache hit: ${cacheKey}`);
      res.json(cachedData);
      return;
    }

    console.log(`🔄 Cache miss: ${cacheKey}`);

    let whereClause: any = {};

    if (sentimentId) {
      whereClause.journeyOptionFlow = {
        journeyStepFlow: {
          journeyFlow: {
            mainSentimentId: Number(sentimentId)
          }
        }
      };
    }

    if (intentionId) {
      whereClause.journeyOptionFlow = {
        ...whereClause.journeyOptionFlow,
        journeyStepFlow: {
          ...whereClause.journeyOptionFlow?.journeyStepFlow,
          emotionalIntentionJourneySteps: {
            some: {
              emotionalIntentionId: Number(intentionId)
            }
          }
        }
      };
    }

    const suggestions = await prisma.movieSuggestionFlow.findMany({
      where: whereClause,
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            year: true,
            director: true,
            description: true,
            thumbnail: true,
            genres: true,
            streamingPlatforms: true,
            vote_average: true,
            imdbRating: true,
            rottenTomatoesRating: true,
            metacriticRating: true,
            runtime: true,
            certification: true
          }
        },
        journeyOptionFlow: {
          include: {
            journeyStepFlow: {
              include: {
                journeyFlow: {
                  include: {
                    mainSentiment: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        movie: {
          imdbRating: 'desc'
        }
      }
    });

    // Salvar no cache por 5 minutos
    await memoryCache.set(cacheKey, suggestions, 5 * 60 * 1000);
    console.log(`💾 Cache saved: ${cacheKey}`);
    
    res.json(suggestions);
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    res.status(500).json({ error: 'Erro ao buscar sugestões' });
  }
});

// @desc    Buscar filmes por sentimento
// @route   GET /api/by-sentiment
// @access  Public
export const getMoviesBySentiment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { mainSentiment, subSentiment } = req.query;

  if (!mainSentiment) {
    res.status(400);
    throw new Error('Sentimento principal é obrigatório');
  }

  const movies = await prisma.movie.findMany({
    where: {
      movieSentiments: {
        some: {
          mainSentiment: {
            name: mainSentiment as string
          },
          ...(subSentiment && {
            subSentiment: {
              name: subSentiment as string
            }
          })
        }
      }
    },
    include: {
      movieSentiments: {
        include: {
          mainSentiment: true,
          subSentiment: true
        }
      }
    }
  });

  res.json(movies);
}); 
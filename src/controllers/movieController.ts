import { Request, Response } from 'express';

import asyncHandler from 'express-async-handler';

import { prismaApp as prisma } from '../prisma';
import { calcFinalScore, IntentionType, EmotionalEntryType } from '../utils/emotionalEntryType';

// @desc    Buscar sugestões de filmes
// @route   GET /api/suggestions
// @access  Public
export const getMovieSuggestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { sentimentId, intentionId } = req.query;
  
  try {
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

    // Buscar o tipo de intenção para passar para o cálculo do score
    let userIntentionType: IntentionType | null = null;
    if (intentionId) {
      const intention = await prisma.emotionalIntention.findUnique({
        where: { id: Number(intentionId) }
      });
      if (intention) {
        userIntentionType = intention.intentionType as IntentionType;
      }
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
            // streamingPlatforms: true,
            vote_average: true,
            imdbRating: true,
            rottenTomatoesRating: true,
            metacriticRating: true,
            runtime: true,
            certification: true,
            emotionalEntryType: true
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
      }
    });

    // Mapear, aplicar ajuste emocional e reordenar
    const finalSuggestions = suggestions.map(sug => {
      const relevanceScore = sug.relevanceScore ? Number(sug.relevanceScore) : 0;
      const entryType = sug.movie?.emotionalEntryType as EmotionalEntryType | null;

      const finalScore = calcFinalScore(relevanceScore, entryType, userIntentionType);

      return {
        ...sug,
        relevanceScore: finalScore, // Sobrescreve pelo novo score calibrado (pode ser retornado como originalScore também, se o front preferir)
        originalRelevanceScore: relevanceScore
      };
    });

    // Reordenar pelo novo score, caindo para imdbRating caso empatem
    finalSuggestions.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      const imdbA = a.movie?.imdbRating ? Number(a.movie.imdbRating) : 0;
      const imdbB = b.movie?.imdbRating ? Number(b.movie.imdbRating) : 0;
      return imdbB - imdbA;
    });
    
    res.json(finalSuggestions);
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
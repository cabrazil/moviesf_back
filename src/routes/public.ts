import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ===============================================
// ROTAS PÚBLICAS PARA LANDING PAGE
// ===============================================

/**
 * GET /api/public/home
 * Dados para a página inicial
 */
router.get('/home', async (req, res) => {
  try {
    // Filmes em destaque (baseado em relevância)
    const featuredMovies = await prisma.movie.findMany({
      take: 6,
      include: {
        platforms: {
          include: {
            streamingPlatform: true
          }
        },
        movieSentiments: {
          include: {
            mainSentiment: true,
            subSentiment: true
          }
        }
      },
      orderBy: {
        vote_average: 'desc'
      }
    });

    // Sentimentos principais para seção de recomendações
    const mainSentiments = await prisma.mainSentiment.findMany({
      take: 4,
      include: {
        _count: {
          select: {
            movieSentiment: true
          }
        }
      }
    });

    // Jornadas emocionais em destaque
    const featuredJourneys = await prisma.journeyFlow.findMany({
      take: 3,
      include: {
        mainSentiment: true,
        _count: {
          select: {
            steps: true
          }
        }
      }
    });

    res.json({
      featuredMovies,
      mainSentiments,
      featuredJourneys
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar dados da home' });
  }
});

/**
 * GET /api/public/filme/:slug
 * Página detalhada de um filme específico (estrutura JustWatch)
 */
router.get('/filme/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Buscar filme por slug usando Prisma (sem o campo slug por enquanto)
    const movie = await prisma.movie.findFirst({
      where: { 
        title: {
          contains: slug.replace(/-/g, ' '),
          mode: 'insensitive'
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

    if (!movie) {
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    // Filmes similares baseados em sentimentos
    const similarMovies = await prisma.movie.findMany({
      where: {
        movieSentiments: {
          some: {
            mainSentimentId: {
              in: movie.movieSentiments.map((ms: any) => ms.mainSentimentId)
            }
          }
        },
        id: { not: movie.id }
      },
      take: 6,
      include: {
        movieSentiments: {
          include: {
            mainSentiment: true
          }
        }
      }
    });

    res.json({
      movie,
      similarMovies
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar dados do filme' });
  }
});

/**
 * GET /api/public/sentimentos/:slug
 * Página de recomendações por sentimento
 */
router.get('/sentimentos/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Converter slug para nome do sentimento
    const sentimentName = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const sentiment = await prisma.mainSentiment.findFirst({
      where: {
        name: { contains: sentimentName, mode: 'insensitive' }
      },
      include: {
        subSentiments: true,
        emotionalIntentions: true
      }
    });

    if (!sentiment) {
      return res.status(404).json({ error: 'Sentimento não encontrado' });
    }

    // Filmes para este sentimento
    const movies = await prisma.movie.findMany({
      where: {
        movieSentiments: {
          some: {
            mainSentimentId: sentiment.id
          }
        }
      },
      take: 20,
      include: {
        platforms: {
          include: {
            streamingPlatform: true
          }
        },
        movieSentiments: {
          include: {
            mainSentiment: true,
            subSentiment: true
          }
        }
      },
      orderBy: {
        vote_average: 'desc'
      }
    });

    // Jornada emocional para este sentimento
    const journey = await prisma.journeyFlow.findUnique({
      where: { mainSentimentId: sentiment.id },
      include: {
        mainSentiment: true,
        steps: {
          include: {
            options: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    res.json({
      sentiment,
      movies,
      journey
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar dados do sentimento' });
  }
});

/**
 * GET /api/public/jornadas/:slug
 * Página de jornada emocional
 */
router.get('/jornadas/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Buscar jornada por tipo (processar, transformar, etc.)
    const journey = await prisma.journeyFlow.findFirst({
      where: {
        mainSentiment: {
          emotionalIntentions: {
            some: {
              intentionType: slug.toUpperCase() as any
            }
          }
        }
      },
      include: {
        mainSentiment: true,
        steps: {
          include: {
            options: {
              include: {
                movieSuggestions: {
                  include: {
                    movie: {
                      include: {
                        platforms: {
                          include: {
                            streamingPlatform: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!journey) {
      return res.status(404).json({ error: 'Jornada não encontrada' });
    }

    res.json(journey);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar dados da jornada' });
  }
});

/**
 * GET /api/public/search
 * Busca de filmes para a landing page
 */
router.get('/search', async (req, res) => {
  try {
    const { q, sentiment, platform } = req.query;

    let whereClause: any = {};

    // Busca por título
    if (q) {
      whereClause.OR = [
        { title: { contains: q as string, mode: 'insensitive' } },
        { original_title: { contains: q as string, mode: 'insensitive' } }
      ];
    }

    // Filtro por sentimento
    if (sentiment) {
      whereClause.movieSentiments = {
        some: {
          mainSentimentId: parseInt(sentiment as string)
        }
      };
    }

    // Filtro por plataforma
    if (platform) {
      whereClause.platforms = {
        some: {
          streamingPlatformId: parseInt(platform as string)
        }
      };
    }

    const movies = await prisma.movie.findMany({
      where: whereClause,
      take: 20,
      include: {
        platforms: {
          include: {
            streamingPlatform: true
          }
        },
        movieSentiments: {
          include: {
            mainSentiment: true
          }
        }
      },
      orderBy: {
        vote_average: 'desc'
      }
    });

    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Erro na busca' });
  }
});

/**
 * GET /api/public/platforms
 * Lista de plataformas de streaming
 */
router.get('/platforms', async (req, res) => {
  try {
    const platforms = await prisma.streamingPlatform.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    res.json(platforms);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar plataformas' });
  }
});

export default router;

import { Router } from 'express';
import prisma from '../prisma';
import memoryCache from '../utils/memoryCache';

const router = Router();

// Middleware de cache em memória
const cacheMiddleware = (ttl: number = 5 * 60 * 1000) => {
  return async (req: any, res: any, next: any) => {
    const key = `api:${req.originalUrl}`;

    try {
      const cachedData = await memoryCache.get(key);
      if (cachedData) {
        console.log(`📦 Cache hit: ${key}`);
        return res.json(cachedData);
      }

      console.log(`🔄 Cache miss: ${key}`);

      // Interceptar resposta para cachear
      const originalJson = res.json;
      res.json = function(data: any) {
        memoryCache.set(key, data, ttl);
        console.log(`💾 Cache saved: ${key}`);
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.warn('Cache middleware error:', error);
      next();
    }
  };
};

// ROTA DE SUMMARY PRIMEIRO!
router.get('/summary', cacheMiddleware(10 * 60 * 1000), async (req, res) => {
  try {
    const sentiments = await prisma.mainSentiment.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        shortDescription: true,
      },
      orderBy: { id: 'asc' },
    });
    res.json(sentiments);
  } catch (error) {
    console.error('Erro ao buscar sentimentos principais:', error);
    res.status(500).json({ error: 'Erro ao buscar sentimentos principais' });
  }
});

// Listar todos os sentimentos principais
router.get('/', cacheMiddleware(5 * 60 * 1000), async (req, res) => {
  try {
    const mainSentiments = await prisma.mainSentiment.findMany({
      include: {
        journeyFlow: {
          include: {
            steps: {
              include: {
                options: {
                  include: {
                    movieSuggestions: {
                      include: {
                        movie: true
                      }
                    }
                  },
                  orderBy: {
                    id: 'asc'
                  }
                }
              },
              orderBy: [
                { order: 'asc' },
                { stepId: 'asc' }
              ]
            }
          }
        }
      }
    });
    console.log('MainSentiments encontrados:', JSON.stringify(mainSentiments, null, 2));
    res.json(mainSentiments);
  } catch (error) {
    console.error('Erro ao buscar sentimentos principais:', error);
    res.status(500).json({ error: 'Erro ao buscar sentimentos principais' });
  }
});

// Buscar fluxo da jornada de um sentimento principal
router.get('/:id/journey-flow', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Buscando fluxo para o sentimento:', id);

    const mainSentiment = await prisma.mainSentiment.findUnique({
      where: { id: Number(id) },
      include: {
        journeyFlow: {
          include: {
            steps: {
              include: {
                options: {
                  include: {
                    movieSuggestions: {
                      include: {
                        movie: {
                          select: {
                            id: true,
                            title: true,
                            description: true,
                            year: true,
                            director: true,
                            genres: true,
                            streamingPlatforms: true,
                            thumbnail: true,
                            original_title: true
                          }
                        }
                      }
                    }
                  },
                  orderBy: {
                    id: 'asc'
                  }
                }
              },
              orderBy: [
                { order: 'asc' },
                { stepId: 'asc' }
              ]
            }
          }
        }
      }
    });

    console.log('MainSentiment encontrado:', JSON.stringify(mainSentiment, null, 2));

    if (!mainSentiment) {
      console.log('Sentimento não encontrado');
      return res.status(404).json({ error: 'Sentimento principal não encontrado' });
    }

    if (!mainSentiment.journeyFlow) {
      console.log('Fluxo de jornada não encontrado');
      return res.status(404).json({ error: 'Fluxo de jornada não encontrado' });
    }

    console.log('Fluxo da jornada:', JSON.stringify(mainSentiment.journeyFlow, null, 2));
    res.json(mainSentiment.journeyFlow);
  } catch (error) {
    console.error('Erro ao buscar fluxo da jornada:', error);
    res.status(500).json({ error: 'Erro ao buscar fluxo da jornada' });
  }
});

// Buscar sentimento principal por ID, incluindo o fluxo da jornada
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Recebido id:', id);
    const mainSentiment = await prisma.mainSentiment.findUnique({
      where: { id: Number(id) },
      include: {
        journeyFlow: {
          include: {
            steps: {
              include: {
                options: {
                  include: {
                    movieSuggestions: {
                      include: {
                        movie: {
                          select: {
                            id: true,
                            title: true,
                            thumbnail: true,
                            year: true,
                            director: true,
                            vote_average: true,
                            certification: true,
                            genres: true,
                            runtime: true
                          }
                        }
                      }
                    }
                  }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!mainSentiment) {
      return res.status(404).json({ error: 'Sentimento principal não encontrado' });
    }

    res.json(mainSentiment);
  } catch (error) {
    console.error('Erro ao buscar sentimento principal:', error);
    res.status(500).json({ error: 'Erro ao buscar sentimento principal' });
  }
});

export default router; 
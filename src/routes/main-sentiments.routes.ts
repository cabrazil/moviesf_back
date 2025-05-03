import { Router } from 'express';
import prisma from '../prisma';
import { MainSentiment } from '@prisma/client';

const router = Router();

// Listar todos os sentimentos principais
router.get('/', async (req, res) => {
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

export default router; 
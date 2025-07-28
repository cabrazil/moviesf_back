import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// ROTA SIMPLES PARA TESTE
router.get('/test', async (req, res) => {
  try {
    res.json({ 
      message: 'Main-sentiments route funcionando!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro na rota de teste:', error);
    res.status(500).json({ error: 'Erro na rota de teste' });
  }
});

// ROTA PARA TESTAR CONEXÃO COM BANCO
router.get('/db-test', async (req, res) => {
  try {
    // Testar conexão simples
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    res.json({ 
      message: 'Conexão com banco OK!',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro na conexão com banco:', error);
    res.status(500).json({ 
      error: 'Erro na conexão com banco',
      details: error.message
    });
  }
});

// ROTA DE SUMMARY PRIMEIRO!
router.get('/summary', async (req, res) => {
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
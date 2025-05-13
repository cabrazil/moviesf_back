import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Listar todos os sentimentos principais com seus sub-sentimentos
router.get('/sentiments', async (req, res) => {
  try {
    const mainSentiments = await prisma.mainSentiment.findMany({
      include: {
        subSentiments: true,
      },
    });
    res.json(mainSentiments);
  } catch (error) {
    console.error('Erro ao buscar sentimentos:', error);
    res.status(500).json({ error: 'Erro ao buscar sentimentos' });
  }
});

// Criar novo sentimento principal
router.post('/sentiments', async (req, res) => {
  const { name, description, keywords } = req.body;
  try {
    const sentiment = await prisma.mainSentiment.create({
      data: {
        name,
        description,
        keywords,
      },
    });
    res.status(201).json(sentiment);
  } catch (error) {
    console.error('Erro ao criar sentimento:', error);
    res.status(500).json({ error: 'Erro ao criar sentimento' });
  }
});

// Atualizar sentimento principal
router.put('/sentiments/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, keywords } = req.body;
  try {
    const sentiment = await prisma.mainSentiment.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        keywords,
      },
    });
    res.json(sentiment);
  } catch (error) {
    console.error('Erro ao atualizar sentimento:', error);
    res.status(500).json({ error: 'Erro ao atualizar sentimento' });
  }
});

// Excluir sentimento principal
router.delete('/sentiments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.mainSentiment.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir sentimento:', error);
    res.status(500).json({ error: 'Erro ao excluir sentimento' });
  }
});

// Sub-sentimentos

// Criar sub-sentimento
router.post('/sub-sentiments', async (req, res) => {
  const { name, description, keywords, mainSentimentId } = req.body;
  try {
    const subSentiment = await prisma.subSentiment.create({
      data: {
        name,
        description,
        keywords,
        mainSentimentId: Number(mainSentimentId),
      },
    });
    res.status(201).json(subSentiment);
  } catch (error) {
    console.error('Erro ao criar sub-sentimento:', error);
    res.status(500).json({ error: 'Erro ao criar sub-sentimento' });
  }
});

// Atualizar sub-sentimento
router.put('/sub-sentiments/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, keywords, mainSentimentId } = req.body;
  try {
    const subSentiment = await prisma.subSentiment.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        keywords,
        mainSentimentId: Number(mainSentimentId),
      },
    });
    res.json(subSentiment);
  } catch (error) {
    console.error('Erro ao atualizar sub-sentimento:', error);
    res.status(500).json({ error: 'Erro ao atualizar sub-sentimento' });
  }
});

// Excluir sub-sentimento
router.delete('/sub-sentiments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.subSentiment.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir sub-sentimento:', error);
    res.status(500).json({ error: 'Erro ao excluir sub-sentimento' });
  }
});

router.get('/data', async (req, res) => {
  try {
    const [movies, mainSentiments, journeyFlows, journeyStepFlows, journeyOptionFlows, movieSuggestionFlows] = await Promise.all([
      prisma.movie.findMany(),
      prisma.mainSentiment.findMany({
        include: {
          journeyFlow: {
            include: {
              steps: {
                include: {
                  options: {
                    include: {
                      movieSuggestions: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.journeyFlow.findMany({
        include: {
          steps: true
        }
      }),
      prisma.journeyStepFlow.findMany({
        include: {
          options: true
        }
      }),
      prisma.journeyOptionFlow.findMany({
        include: {
          movieSuggestions: true
        }
      }),
      prisma.movieSuggestionFlow.findMany()
    ]);

    res.json({
      movies,
      mainSentiments,
      journeyFlows,
      journeyStepFlows,
      journeyOptionFlows,
      movieSuggestionFlows
    });
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do banco' });
  }
});

// Listar todos os fluxos de opção
router.get('/journey-options', async (req, res) => {
  try {
    const journeyOptionFlows = await prisma.journeyOptionFlow.findMany({
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
    });
    res.json(journeyOptionFlows);
  } catch (error) {
    console.error('Erro ao buscar fluxos de opção:', error);
    res.status(500).json({ error: 'Erro ao buscar fluxos de opção' });
  }
});

// Buscar detalhes de um fluxo de opção específico
router.get('/journey-option-flows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const journeyOptionFlow = await prisma.journeyOptionFlow.findUnique({
      where: { id: Number(id) },
      include: {
        journeyStepFlow: {
          include: {
            journeyFlow: {
              include: {
                mainSentiment: {
                  select: {
                    id: true,
                    name: true,
                    description: true
                  }
                }
              }
            }
          }
        },
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
                thumbnail: true
              }
            }
          }
        }
      }
    });

    if (!journeyOptionFlow) {
      return res.status(404).json({ error: 'Fluxo de opção não encontrado' });
    }

    res.json(journeyOptionFlow);
  } catch (error) {
    console.error('Erro ao buscar detalhes do fluxo de opção:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes do fluxo de opção' });
  }
});

export default router; 
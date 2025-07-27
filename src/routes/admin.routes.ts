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

// Interface para tipos locais
interface JourneyPath {
  step: {
    id: number;
    stepId: string;
    order: number;
    question: string;
  };
  option: {
    id: number;
    optionId: string;
    text: string;
    nextStepId: string | null;
    isEndState: boolean;
  };
  suggestion: {
    id: number;
    reason: string;
    relevance: number;
  };
}

interface JourneyFullPathOption {
  id: number;
  optionId: string;
  text: string;
  nextStepId: string | null;
  isEndState: boolean;
  hasMovieSuggestion: boolean;
}

interface JourneyFullPathStep {
  id: number;
  stepId: string;
  order: number;
  question: string;
  options: JourneyFullPathOption[];
  emotionalIntentions: any[]; // Simplificado para este contexto
  isVirtual?: boolean;
  contextualHint?: string;
  isRequired?: boolean;
  priority?: number;
}

interface MovieSuggestionFlowWithMovie {
  id: number;
  reason: string;
  relevance: number;
  movieId: string;
  movie: {
    id: string;
    title: string;
    year?: number;
    director?: string;
    description?: string;
    thumbnail?: string;
    genres: string[];
    streamingPlatforms: string[];
  };
}

interface JourneyOptionFlowWithSuggestions {
  id: number;
  optionId: string;
  text: string;
  nextStepId: string | null;
  isEndState: boolean;
  movieSuggestions: MovieSuggestionFlowWithMovie[];
}

interface JourneyStepFlowWithRelations {
  id: number;
  stepId: string;
  order: number;
  question: string;
  options: JourneyOptionFlowWithSuggestions[];
  journeyFlow: {
    id: number;
    mainSentimentId: number;
    mainSentiment: {
      id: number;
      name: string;
      description: string;
    };
  };
  emotionalIntentionJourneySteps: any[]; // Simplificado para este contexto
}

interface EmotionalIntentionJourneyStepAdmin {
  journeyStepFlow: JourneyStepFlowWithRelations;
  customQuestion?: string;
  priority: number;
  contextualHint?: string;
  isRequired: boolean;
}

interface EmotionalIntentionAdmin {
  id: number;
  mainSentimentId: number;
  intentionType: string;
  description: string;
  preferredGenres: string[];
  avoidGenres: string[];
  emotionalTone: string;
  emotionalIntentionJourneySteps: EmotionalIntentionJourneyStepAdmin[];
  mainSentiment: {
    id: number;
    name: string;
    description: string;
  };
}

// Buscar todas as jornadas que levam a um filme específico
router.get('/movie-journeys/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;

    // Buscar o filme
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: {
        id: true,
        title: true,
        year: true,
        director: true,
        description: true,
        thumbnail: true,
        genres: true,
        streamingPlatforms: true
      }
    });

    if (!movie) {
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    // Buscar todas as sugestões deste filme
    const movieSuggestions = await prisma.movieSuggestionFlow.findMany({
      where: { movieId },
      include: {
        journeyOptionFlow: {
          include: {
            journeyStepFlow: {
              include: {
                journeyFlow: {
                  include: {
                    mainSentiment: {
                      include: {
                        emotionalIntentions: true
                      }
                    }
                  }
                },
                emotionalIntentionJourneySteps: {
                  include: {
                    emotionalIntention: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Buscar todas as intenções emocionais disponíveis para os sentimentos encontrados
    const sentimentIds = [...new Set(movieSuggestions.map((s: any) => s.journeyOptionFlow.journeyStepFlow.journeyFlow.mainSentimentId))];
    
    const emotionalIntentions = await prisma.emotionalIntention.findMany({
      where: {
        mainSentimentId: { in: sentimentIds }
      },
      include: {
        mainSentiment: true,
        emotionalIntentionJourneySteps: {
          include: {
            journeyStepFlow: {
              include: {
                options: {
                  include: {
                    movieSuggestions: {
                      where: { movieId }
                    }
                  }
                }
              }
            }
          },
          orderBy: { priority: 'asc' }
        }
      }
    });

    // Estruturar a resposta agrupando por sentimento + intenção emocional
    const journeys = new Map();

    // Para cada intenção emocional, verificar se ela leva ao filme
    for (const intention of emotionalIntentions) {
      const intentionSteps = intention.emotionalIntentionJourneySteps;
      
      // Verificar se algum step dessa intenção leva ao filme
      let hasMovieInJourney = false;
      const journeyPaths = [];

      for (const intentionStep of intentionSteps) {
        const step = intentionStep.journeyStepFlow;
        
        for (const option of step.options as any[]) {
          if (option.movieSuggestions.length > 0) {
            hasMovieInJourney = true;
            
            // Encontrar a sugestão específica do filme
            const movieSuggestion = option.movieSuggestions[0];
            
            journeyPaths.push({
              step: {
                id: step.id,
                stepId: step.stepId,
                order: step.order,
                question: intentionStep.customQuestion || step.question
              },
              option: {
                id: option.id,
                optionId: option.optionId,
                text: option.text,
                nextStepId: option.nextStepId,
                isEndState: option.isEndState
              },
              suggestion: {
                id: movieSuggestion.id,
                reason: movieSuggestion.reason,
                relevance: movieSuggestion.relevance
              },
              intentionStep: {
                priority: intentionStep.priority,
                isRequired: intentionStep.isRequired,
                customQuestion: intentionStep.customQuestion,
                contextualHint: intentionStep.contextualHint
              }
            });
          }
        }
      }

      // Se essa intenção tem o filme, criar a jornada
      if (hasMovieInJourney) {
        const journeyKey = `${intention.mainSentimentId}-${intention.id}`;
        
        journeys.set(journeyKey, {
          mainSentiment: {
            id: intention.mainSentiment.id,
            name: intention.mainSentiment.name,
            description: intention.mainSentiment.description
          },
          emotionalIntention: {
            id: intention.id,
            type: intention.intentionType,
            description: intention.description,
            preferredGenres: intention.preferredGenres,
            avoidGenres: intention.avoidGenres,
            emotionalTone: intention.emotionalTone
          },
          journeyType: 'emotional_intention',
          paths: journeyPaths
        });
      }
    }

    // Também buscar jornadas tradicionais (sem intenção emocional específica)
    const traditionalJourneys = new Map();
    for (const suggestion of movieSuggestions) {
      const { journeyOptionFlow } = suggestion;
      const { journeyStepFlow } = journeyOptionFlow;
      const { journeyFlow } = journeyStepFlow;
      const { mainSentiment } = journeyFlow;

      // Verificar se esse step NÃO está associado a nenhuma intenção emocional
      const hasEmotionalIntention = journeyStepFlow.emotionalIntentionJourneySteps.length > 0;
      
      if (!hasEmotionalIntention) {
        const journeyKey = `${mainSentiment.id}-traditional`;
        
        if (!traditionalJourneys.has(journeyKey)) {
          traditionalJourneys.set(journeyKey, {
            mainSentiment: {
              id: mainSentiment.id,
              name: mainSentiment.name,
              description: mainSentiment.description
            },
            journeyFlow: {
              id: journeyFlow.id,
              mainSentimentId: journeyFlow.mainSentimentId
            },
            journeyType: 'traditional',
            paths: []
          });
        }

        traditionalJourneys.get(journeyKey).paths.push({
          step: {
            id: journeyStepFlow.id,
            stepId: journeyStepFlow.stepId,
            order: journeyStepFlow.order,
            question: journeyStepFlow.question
          },
          option: {
            id: journeyOptionFlow.id,
            optionId: journeyOptionFlow.optionId,
            text: journeyOptionFlow.text,
            nextStepId: journeyOptionFlow.nextStepId,
            isEndState: journeyOptionFlow.isEndState
          },
          suggestion: {
            id: suggestion.id,
            reason: suggestion.reason,
            relevance: suggestion.relevance
          }
        });
      }
    }

    // Combinar jornadas com intenção emocional e tradicionais
    const allJourneys = new Map([...journeys, ...traditionalJourneys]);

    // Converter Map para Array e construir o caminho completo de cada jornada
    const journeysArray = Array.from(allJourneys.values());

    // Para cada jornada, construir o caminho completo
    for (const journey of journeysArray) {
      if (journey.journeyType === 'emotional_intention') {
        // Jornada com intenção emocional - construir caminho baseado na intenção
        const intention = journey.emotionalIntention;
        
        // Buscar todos os steps específicos dessa intenção emocional
        const intentionSteps = await prisma.emotionalIntentionJourneyStep.findMany({
          where: { emotionalIntentionId: intention.id },
          include: {
            journeyStepFlow: {
              include: {
                options: {
                  include: {
                    movieSuggestions: {
                      where: { movieId }
                    }
                  }
                }
              }
            }
          },
          orderBy: { priority: 'asc' }
        });

        // Construir o caminho completo da jornada emocional
        journey.fullPath = [];
        
        // Step 1: Pergunta inicial (sentimento) - Virtual
        journey.fullPath.push({
          id: -1,
          stepId: 'sentiment-selection',
          order: 0,
          question: 'Como você está se sentindo hoje?',
          options: [{
            id: -1,
            optionId: `sentiment-${journey.mainSentiment.id}`,
            text: journey.mainSentiment.name,
            nextStepId: 'intention-selection',
            isEndState: false,
            hasMovieSuggestion: false
          }],
          emotionalIntentions: [],
          isVirtual: true
        });

        // Step 2: Seleção de intenção emocional - Virtual
        journey.fullPath.push({
          id: -2,
          stepId: 'intention-selection',
          order: 1,
          question: 'O que você gostaria de fazer com esse sentimento?',
          options: [{
            id: -2,
            optionId: `intention-${intention.id}`,
            text: intention.description,
            nextStepId: intentionSteps.length > 0 ? intentionSteps[0].journeyStepFlow.stepId : null,
            isEndState: false,
            hasMovieSuggestion: false
          }],
          emotionalIntentions: [intention],
          isVirtual: true
        });

        // Steps 3+: Steps específicos da intenção emocional
        intentionSteps.forEach((intentionStep: any, index: number) => {
          const step = intentionStep.journeyStepFlow;
          
          journey.fullPath.push({
            id: step.id,
            stepId: step.stepId,
            order: index + 2,
            question: intentionStep.customQuestion || step.question,
            options: step.options.map((option: any) => ({
              id: option.id,
              optionId: option.optionId,
              text: option.text,
              nextStepId: option.nextStepId,
              isEndState: option.isEndState,
              hasMovieSuggestion: option.movieSuggestions.length > 0
            })),
            emotionalIntentions: [intention],
            contextualHint: intentionStep.contextualHint,
            isRequired: intentionStep.isRequired || false,
            priority: intentionStep.priority
          });
        });

      } else {
        // Jornada tradicional - buscar todos os steps do fluxo principal
        const allSteps = await prisma.journeyStepFlow.findMany({
          where: { journeyFlowId: journey.journeyFlow.id },
          include: {
            options: {
              include: {
                movieSuggestions: {
                  where: { movieId }
                }
              }
            }
          },
          orderBy: { order: 'asc' }
        });

        journey.fullPath = allSteps.map((step: any) => ({
          id: step.id,
          stepId: step.stepId,
          order: step.order,
          question: step.question,
          options: step.options.map((option: any) => ({
            id: option.id,
            optionId: option.optionId,
            text: option.text,
            nextStepId: option.nextStepId,
            isEndState: option.isEndState,
            hasMovieSuggestion: option.movieSuggestions.length > 0
          })),
          emotionalIntentions: []
        }));
      }
    }

    // Log para debug
    console.log(`🎬 Rastreamento de jornadas para: ${movie.title}`);
    console.log(`📊 Total de jornadas encontradas: ${journeysArray.length}`);
    
    journeysArray.forEach((journey, index) => {
      console.log(`\n🎭 Jornada ${index + 1}:`);
      console.log(`  Sentimento: ${journey.mainSentiment.name}`);
      if (journey.emotionalIntention) {
        console.log(`  Intenção: ${journey.emotionalIntention.type} - ${journey.emotionalIntention.description}`);
      }
      console.log(`  Tipo: ${journey.journeyType}`);
      console.log(`  Steps no caminho: ${journey.fullPath.length}`);
      
      journey.fullPath.forEach((step: JourneyFullPathStep, stepIndex: number) => {
        const movieOptions = step.options.filter((opt: JourneyFullPathOption) => opt.hasMovieSuggestion);
        if (movieOptions.length > 0) {
          console.log(`    📍 Step ${step.order + 1}: ${step.question}`);
          movieOptions.forEach((opt: JourneyFullPathOption) => {
            console.log(`      ⭐ Opção: "${opt.text}" → LEVA AO FILME`);
          });
        }
      });
    });

    res.json({
      movie,
      totalJourneys: journeysArray.length,
      journeys: journeysArray
    });

  } catch (error) {
    console.error('Erro ao buscar jornadas do filme:', error);
    res.status(500).json({ error: 'Erro ao buscar jornadas do filme' });
  }
});

export default router; 
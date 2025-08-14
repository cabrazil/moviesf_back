import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Personalized journey usando EmotionalIntentionJourneyStep - CORRETO
router.get('/:sentimentId/:intentionId', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.sentimentId);
    const intentionId = parseInt(req.params.intentionId);
    
    console.log(`🔍 Buscando jornada para sentimentId: ${sentimentId}, intentionId: ${intentionId}`);
    
    // Buscar a intenção emocional para validar
    const emotionalIntention = await prisma.emotionalIntention.findUnique({
      where: { id: intentionId },
      include: { mainSentiment: true }
    });

    if (!emotionalIntention) {
      return res.status(404).json({
        error: 'Intenção emocional não encontrada'
      });
    }

    if (emotionalIntention.mainSentimentId !== sentimentId) {
      return res.status(400).json({
        error: 'Intenção emocional não pertence ao sentimento especificado'
      });
    }

    // Buscar o JourneyFlow do sentimento
    const journeyFlow = await prisma.journeyFlow.findFirst({
      where: { mainSentimentId: sentimentId }
    });

    if (!journeyFlow) {
      return res.status(404).json({
        error: 'Fluxo de jornada não encontrado para este sentimento'
      });
    }
    
    // Buscar steps da jornada usando EmotionalIntentionJourneyStep
    const journeySteps = await prisma.emotionalIntentionJourneyStep.findMany({
      where: { emotionalIntentionId: intentionId },
      include: {
        journeyStepFlow: {
          include: {
            options: {
              include: {
                movieSuggestions: {
                  include: {
                    movie: {
                      select: {
                        id: true,
                        title: true,
                        year: true,
                        description: true,
                        director: true,
                        runtime: true,
                        certification: true,
                        imdbRating: true,
                        vote_average: true,
                        thumbnail: true,
                        genres: true,
                        platforms: {
                          select: {
                            accessType: true,
                            streamingPlatform: {
                              select: {
                                name: true,
                                category: true
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (journeySteps.length === 0) {
      return res.status(404).json({ error: 'Nenhum passo da jornada encontrado' });
    }
    
    console.log(`✅ Encontrados ${journeySteps.length} passos da jornada`);
    
    // Preparar steps personalizados
    const customizedSteps = journeySteps.map((step: any) => ({
      id: step.journeyStepFlow.id,
      stepId: step.journeyStepFlow.stepId,
      order: step.journeyStepFlow.order,
      question: step.customQuestion || step.journeyStepFlow.question,
      priority: step.priority,
      contextualHint: step.contextualHint,
      isRequired: step.isRequired,
      options: step.journeyStepFlow.options.map((option: any) => ({
        id: option.id,
        text: option.text,
        nextStepId: option.nextStepId,
        isEndState: option.isEndState,
        movieSuggestions: option.isEndState ? option.movieSuggestions.map((suggestion: any) => ({
          id: suggestion.id,
          reason: suggestion.reason,
          relevance: suggestion.relevance,
          relevanceScore: suggestion.relevanceScore,
          movie: suggestion.movie
        })) : undefined
      }))
    }));

    // FUNÇÃO PARA INCLUIR STEPS REFERENCIADOS
    async function includeReferencedSteps(steps: any[], journeyFlowId: number): Promise<any[]> {
      const allSteps = [...steps];
      const processedStepIds = new Set<string>();
      let hasNewSteps = true;

      while (hasNewSteps) {
        hasNewSteps = false;
        const referencedStepIds = new Set<string>();
        
        // Coletar todos os nextStepId referenciados
        allSteps.forEach((step: any) => {
          step.options.forEach((option: any) => {
            if (option.nextStepId && !option.isEndState && !processedStepIds.has(option.nextStepId)) {
              referencedStepIds.add(option.nextStepId);
            }
          });
        });

        // Filtrar apenas os que ainda não existem
        const existingStepIds = new Set(allSteps.map((s: any) => s.stepId));
        const missingStepIds = Array.from(referencedStepIds).filter(stepId => !existingStepIds.has(stepId));

        if (missingStepIds.length > 0) {
          console.log(`🔍 Buscando steps referenciados ausentes: ${missingStepIds.join(', ')}`);
          
          const missingSteps = await prisma.journeyStepFlow.findMany({
            where: {
              journeyFlowId: journeyFlowId,
              stepId: { in: missingStepIds }
            },
            include: {
              options: {
                include: {
                  movieSuggestions: {
                    include: {
                      movie: {
                        select: {
                          id: true,
                          title: true,
                          year: true,
                          description: true,
                          director: true,
                          runtime: true,
                          certification: true,
                          imdbRating: true,
                          vote_average: true,
                          thumbnail: true,
                          genres: true,
                          platforms: {
                            select: {
                              accessType: true,
                              streamingPlatform: {
                                select: {
                                  name: true,
                                  category: true
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          });

          if (missingSteps.length > 0) {
            const additionalSteps = missingSteps.map((step: any) => ({
              id: step.id,
              stepId: step.stepId,
              order: step.order,
              question: step.question,
              priority: 999, // Priority baixa para steps não personalizados
              contextualHint: null,
              isRequired: false,
              options: step.options.map((option: any) => ({
                id: option.id,
                text: option.text,
                nextStepId: option.nextStepId,
                isEndState: option.isEndState,
                movieSuggestions: option.isEndState ? option.movieSuggestions.map((suggestion: any) => ({
                  id: suggestion.id,
                  reason: suggestion.reason,
                  relevance: suggestion.relevance,
                  relevanceScore: suggestion.relevanceScore,
                  movie: suggestion.movie
                })) : undefined
              }))
            }));

            allSteps.push(...additionalSteps);
            console.log(`✅ Adicionados ${additionalSteps.length} steps referenciados à jornada personalizada`);
            hasNewSteps = true;
          }
        }

        // Marcar todos os stepIds como processados
        referencedStepIds.forEach(stepId => processedStepIds.add(stepId));
      }

      return allSteps;
    }

    // Incluir steps referenciados
    const completeSteps = await includeReferencedSteps(customizedSteps, journeyFlow.id);
    
    // Retornar jornada personalizada no formato esperado pelo frontend
    const response = {
      id: `${sentimentId}-${intentionId}`,
      mainSentimentId: sentimentId,
      emotionalIntentionId: intentionId,
      steps: completeSteps
    };
    
    console.log(`✅ Resposta final: ${response.steps.length} steps processados`);
    console.log(`📋 Steps incluídos: ${response.steps.map((s: any) => s.stepId).join(', ')}`);
    
    res.json(response);
  } catch (error: any) {
    console.error('Erro ao buscar jornada personalizada:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar jornada personalizada',
      details: error.message 
    });
  }
});

export default router; 
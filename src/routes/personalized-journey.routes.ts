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
    
    // Retornar jornada personalizada no formato esperado pelo frontend
    const response = {
      id: `${sentimentId}-${intentionId}`,
      mainSentimentId: sentimentId,
      emotionalIntentionId: intentionId,
      steps: journeySteps.map((step: any) => ({
        id: step.journeyStepFlow.id,
        stepId: step.journeyStepFlow.stepId,
        question: step.journeyStepFlow.question,
        options: step.journeyStepFlow.options.map((option: any) => ({
          id: option.id,
          text: option.text,
          nextStepId: option.nextStepId,
          isEndState: option.isEndState,
          movieSuggestions: option.isEndState ? option.movieSuggestions.map((suggestion: any) => ({
            id: suggestion.id,
            reason: suggestion.reason,
            relevance: suggestion.relevance,
            movie: suggestion.movie
          })) : undefined
        }))
      }))
    };
    
    console.log(`✅ Resposta final: ${response.steps.length} steps processados`);
    
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
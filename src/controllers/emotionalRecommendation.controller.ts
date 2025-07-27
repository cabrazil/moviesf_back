import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import EmotionalRecommendationService, { EmotionalRecommendationRequest } from '../services/emotionalRecommendationService';

const prisma = new PrismaClient();
const emotionalService = new EmotionalRecommendationService();

interface Movie {
  id: string;
  title: string;
  year?: number;
}

interface MovieSuggestionFlow {
  id: number;
  movie: Movie;
  reason: string;
}

interface JourneyOptionFlow {
  id: number;
  text: string;
  nextStepId?: string;
  isEndState: boolean;
  movieSuggestions?: MovieSuggestionFlow[];
}

interface JourneyStepFlow {
  id: number;
  stepId: string;
  order: number;
  question: string;
  options: JourneyOptionFlow[];
}

interface JourneyStepFlowWithRelations extends JourneyStepFlow {
  options: (JourneyOptionFlow & { movieSuggestions?: MovieSuggestionFlow[] })[];
}

interface EmotionalIntentionJourneyStep {
  journeyStepFlow: JourneyStepFlowWithRelations;
  customQuestion?: string;
  priority: number;
  contextualHint?: string;
  isRequired: boolean;
}

interface EmotionalSuggestion {
  movieId: string;
  movie: Movie;
  personalizedReason: string;
  relevanceScore: number;
  intentionAlignment: number;
  wasViewed: boolean;
  wasAccepted: boolean;
  userFeedback?: string;
}

interface MainSentiment {
  name: string;
}

interface EmotionalIntention {
  intentionType: string;
  description: string;
}

interface RecommendationSession {
  id: string;
  mainSentiment: MainSentiment;
  emotionalIntention?: EmotionalIntention;
  startedAt: Date;
  completedAt?: Date;
  isActive: boolean;
  emotionalSuggestions: EmotionalSuggestion[];
}

interface RecommendationSessionGroupByResult {
  emotionalIntentionId: number;
  _count: number;
}

export class EmotionalRecommendationController {

  /**
   * GET /api/emotional-intentions/:sentimentId
   * Obtém as intenções emocionais disponíveis para um sentimento
   */
  async getEmotionalIntentions(req: Request, res: Response) {
    try {
      const { sentimentId } = req.params;

      const intentions = await prisma.emotionalIntention.findMany({
        where: { mainSentimentId: parseInt(sentimentId) },
        include: {
          mainSentiment: true
        }
      });

      if (intentions.length === 0) {
        return res.status(404).json({
          error: 'Nenhuma intenção emocional encontrada para este sentimento'
        });
      }

      const response = intentions.map((intention: any) => ({
        id: intention.id,
        type: intention.intentionType,
        description: intention.description,
        preferredGenres: intention.preferredGenres,
        avoidGenres: intention.avoidGenres,
        emotionalTone: intention.emotionalTone
      }));

      res.json({
        sentimentId: parseInt(sentimentId),
        sentimentName: intentions[0].mainSentiment.name,
        intentions: response
      });

    } catch (error) {
      console.error('Erro ao buscar intenções emocionais:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * GET /api/personalized-journey/:sentimentId/:intentionId
   * Obtém a jornada personalizada baseada na intenção emocional
   */
  async getPersonalizedJourney(req: Request, res: Response) {
    try {
      const { sentimentId, intentionId } = req.params;

      // Buscar a intenção emocional
      const emotionalIntention = await prisma.emotionalIntention.findUnique({
        where: { id: parseInt(intentionId) },
        include: { mainSentiment: true }
      });

      if (!emotionalIntention) {
        return res.status(404).json({
          error: 'Intenção emocional não encontrada'
        });
      }

      // Buscar o JourneyFlow do sentimento
      const journeyFlow = await prisma.journeyFlow.findFirst({
        where: { mainSentimentId: parseInt(sentimentId) }
      });

      if (!journeyFlow) {
        return res.status(404).json({
          error: 'Fluxo de jornada não encontrado para este sentimento'
        });
      }

      // Buscar steps personalizados para esta intenção
      const personalizedSteps = await prisma.emotionalIntentionJourneyStep.findMany({
        where: { emotionalIntentionId: parseInt(intentionId) },
        include: {
          journeyStepFlow: {
            include: {
              options: {
                include: {
                  movieSuggestions: {
                    include: {
                      movie: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { priority: 'asc' },
          { journeyStepFlow: { order: 'asc' } }
        ]
      });

      // Se não há steps personalizados, usar a jornada padrão
      if (personalizedSteps.length === 0) {
        const defaultSteps = await prisma.journeyStepFlow.findMany({
          where: { journeyFlowId: journeyFlow.id },
          include: {
            options: {
              include: {
                movieSuggestions: {
                  include: {
                    movie: true
                  }
                }
              }
            }
          },
          orderBy: { order: 'asc' }
        });

        const customizedSteps = defaultSteps.map((step: any) => ({
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
            movieSuggestions: option.movieSuggestions?.map((ms: any) => ({
              id: ms.id,
              movie: ms.movie,
              reason: ms.reason
            }))
          }))
        }));

        return res.json({
          id: journeyFlow.id,
          mainSentimentId: parseInt(sentimentId),
          emotionalIntentionId: parseInt(intentionId),
          steps: customizedSteps
        });
      }

      // Usar steps personalizados + incluir steps referenciados por nextStepId
      const customizedSteps = personalizedSteps.map((personalizedStep: any) => ({
        id: personalizedStep.journeyStepFlow.id,
        stepId: personalizedStep.journeyStepFlow.stepId,
        order: personalizedStep.journeyStepFlow.order,
        question: personalizedStep.customQuestion || personalizedStep.journeyStepFlow.question,
        priority: personalizedStep.priority,
        contextualHint: personalizedStep.contextualHint,
        isRequired: personalizedStep.isRequired,
        options: personalizedStep.journeyStepFlow.options.map((option: any) => ({
          id: option.id,
          text: option.text,
          nextStepId: option.nextStepId,
          isEndState: option.isEndState,
          movieSuggestions: option.movieSuggestions?.map((ms: any) => ({
            id: ms.id,
            movie: ms.movie,
            reason: ms.reason
          }))
        }))
      }));

      // CORREÇÃO: Incluir TODOS os steps referenciados por nextStepId (recursivamente)
      async function includeReferencedSteps(steps: JourneyStepFlowWithRelations[], journeyFlowId: number): Promise<JourneyStepFlowWithRelations[]> {
        const allSteps = [...steps];
        const processedStepIds = new Set<string>();
        let hasNewSteps = true;

        while (hasNewSteps) {
          hasNewSteps = false;
          const referencedStepIds = new Set<string>();
          
          // Coletar todos os nextStepId referenciados
          allSteps.forEach((step: JourneyStepFlowWithRelations) => {
            step.options.forEach((option: JourneyOptionFlow) => {
              if (option.nextStepId && !option.isEndState && !processedStepIds.has(option.nextStepId)) {
                referencedStepIds.add(option.nextStepId);
              }
            });
          });

          // Filtrar apenas os que ainda não existem
          const existingStepIds = new Set(allSteps.map((s: JourneyStepFlowWithRelations) => s.stepId));
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
                        movie: true
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
                  movieSuggestions: option.movieSuggestions?.map((ms: any) => ({
                    id: ms.id,
                    movie: ms.movie,
                    reason: ms.reason
                  }))
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

      const completeSteps = await includeReferencedSteps(customizedSteps, journeyFlow.id);

      res.json({
        id: journeyFlow.id,
        mainSentimentId: parseInt(sentimentId),
        emotionalIntentionId: parseInt(intentionId),
        steps: completeSteps
      });

    } catch (error) {
      console.error('Erro ao buscar jornada personalizada:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * POST /api/emotional-recommendations
   * Inicia uma nova sessão de recomendação baseada em intenção emocional
   */
  async startEmotionalRecommendation(req: Request, res: Response) {
    try {
      const { mainSentimentId, intentionType, userId, contextData } = req.body;

      // Validar parâmetros obrigatórios
      if (!mainSentimentId || !intentionType) {
        return res.status(400).json({
          error: 'mainSentimentId e intentionType são obrigatórios'
        });
      }

      // Validar tipo de intenção
      const validIntentionTypes = ['PROCESS', 'TRANSFORM', 'MAINTAIN', 'EXPLORE'];
      if (!validIntentionTypes.includes(intentionType)) {
        return res.status(400).json({
          error: 'intentionType deve ser um dos: ' + validIntentionTypes.join(', ')
        });
      }

      const request: EmotionalRecommendationRequest = {
        mainSentimentId: parseInt(mainSentimentId),
        intentionType,
        userId,
        contextData
      };

      const recommendations = await emotionalService.startRecommendationSession(request);

      res.json({
        success: true,
        data: recommendations
      });

    } catch (error) {
      console.error('Erro ao iniciar recomendação emocional:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * POST /api/emotional-recommendations/:sessionId/feedback
   * Registra feedback do usuário sobre uma recomendação
   */
  async recordFeedback(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { movieId, wasViewed, wasAccepted, feedback } = req.body;

      if (!movieId || typeof wasViewed !== 'boolean' || typeof wasAccepted !== 'boolean') {
        return res.status(400).json({
          error: 'movieId, wasViewed e wasAccepted são obrigatórios'
        });
      }

      await emotionalService.recordUserFeedback(
        sessionId,
        movieId,
        wasViewed,
        wasAccepted,
        feedback
      );

      res.json({
        success: true,
        message: 'Feedback registrado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao registrar feedback:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * POST /api/emotional-recommendations/:sessionId/complete
   * Finaliza uma sessão de recomendação
   */
  async completeSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      await emotionalService.completeSession(sessionId);

      res.json({
        success: true,
        message: 'Sessão finalizada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * GET /api/emotional-recommendations/history/:userId
   * Obtém histórico de recomendações de um usuário
   */
  async getUserHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const history = await emotionalService.getUserRecommendationHistory(userId);

      const formattedHistory = history.map(session => ({
        sessionId: session.id,
        sentiment: session.mainSentiment.name,
        intention: session.emotionalIntention?.intentionType,
        intentionDescription: session.emotionalIntention?.description,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        isActive: session.isActive,
        recommendationsCount: session.emotionalSuggestions.length,
        viewedCount: session.emotionalSuggestions.filter((s: EmotionalSuggestion) => s.wasViewed).length,
        acceptedCount: session.emotionalSuggestions.filter((s: EmotionalSuggestion) => s.wasAccepted).length,
        movies: session.emotionalSuggestions.map((suggestion: EmotionalSuggestion) => ({
          movieId: suggestion.movieId,
          title: suggestion.movie.title,
          year: suggestion.movie.year,
          personalizedReason: suggestion.personalizedReason,
          relevanceScore: suggestion.relevanceScore,
          intentionAlignment: suggestion.intentionAlignment,
          wasViewed: suggestion.wasViewed,
          wasAccepted: suggestion.wasAccepted,
          userFeedback: suggestion.userFeedback
        }))
      }));

      res.json({
        success: true,
        data: formattedHistory
      });

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * GET /api/emotional-recommendations/analytics
   * Obtém estatísticas das recomendações emocionais
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      // Estatísticas básicas
      const totalMovies = await prisma.movie.count();
      const totalMainSentiments = await prisma.mainSentiment.count();
      const totalSubSentiments = await prisma.subSentiment.count();
      const totalEmotionalIntentions = await prisma.emotionalIntention.count();

      // Estatísticas de sugestões
      const totalSuggestions = await prisma.movieSuggestionFlow.count();

      res.json({
        success: true,
        data: {
          movies: {
            total: totalMovies
          },
          sentiments: {
            main: totalMainSentiments,
            sub: totalSubSentiments
          },
          intentions: {
            total: totalEmotionalIntentions
          },
          suggestions: {
            total: totalSuggestions
          }
        }
      });

    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

export default EmotionalRecommendationController; 
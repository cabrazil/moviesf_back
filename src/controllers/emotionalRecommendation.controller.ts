import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import EmotionalRecommendationService, { EmotionalRecommendationRequest } from '../services/emotionalRecommendationService';

const prisma = new PrismaClient();
const emotionalService = new EmotionalRecommendationService();

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

      const response = intentions.map(intention => ({
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

        return res.json({
          id: journeyFlow.id,
          mainSentimentId: parseInt(sentimentId),
          emotionalIntentionId: parseInt(intentionId),
          steps: defaultSteps.map(step => ({
            id: step.id,
            stepId: step.stepId,
            order: step.order,
            question: step.question,
            options: step.options.map(option => ({
              id: option.id,
              text: option.text,
              nextStepId: option.nextStepId,
              isEndState: option.isEndState,
              movieSuggestions: option.movieSuggestions?.map(ms => ({
                id: ms.id,
                movie: ms.movie,
                reason: ms.reason
              }))
            }))
          }))
        });
      }

      // Usar steps personalizados
      const customizedSteps = personalizedSteps.map(personalizedStep => {
        const step = personalizedStep.journeyStepFlow;
        return {
          id: step.id,
          stepId: step.stepId,
          order: step.order,
          question: personalizedStep.customQuestion || step.question,
          priority: personalizedStep.priority,
          contextualHint: personalizedStep.contextualHint,
          isRequired: personalizedStep.isRequired,
          options: step.options.map(option => ({
            id: option.id,
            text: option.text,
            nextStepId: option.nextStepId,
            isEndState: option.isEndState,
            movieSuggestions: option.movieSuggestions?.map(ms => ({
              id: ms.id,
              movie: ms.movie,
              reason: ms.reason
            }))
          }))
        };
      });

      res.json({
        id: journeyFlow.id,
        mainSentimentId: parseInt(sentimentId),
        emotionalIntentionId: parseInt(intentionId),
        steps: customizedSteps
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
        viewedCount: session.emotionalSuggestions.filter(s => s.wasViewed).length,
        acceptedCount: session.emotionalSuggestions.filter(s => s.wasAccepted).length,
        movies: session.emotionalSuggestions.map(suggestion => ({
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
   * Obtém analytics das recomendações emocionais
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const totalSessions = await prisma.recommendationSession.count();
      const activeSessions = await prisma.recommendationSession.count({
        where: { isActive: true }
      });
      const completedSessions = await prisma.recommendationSession.count({
        where: { isActive: false }
      });

      // Estatísticas por intenção
      const intentionStats = await prisma.recommendationSession.groupBy({
        by: ['emotionalIntentionId'],
        _count: true,
        where: { emotionalIntentionId: { not: null } }
      });

      const intentionDetails = await Promise.all(
        intentionStats.map(async (stat) => {
          const intention = await prisma.emotionalIntention.findUnique({
            where: { id: stat.emotionalIntentionId! },
            include: { mainSentiment: true }
          });
          return {
            intention: intention?.intentionType,
            sentiment: intention?.mainSentiment.name,
            count: stat._count
          };
        })
      );

      // Taxa de aceitação
      const totalSuggestions = await prisma.emotionalSuggestion.count();
      const acceptedSuggestions = await prisma.emotionalSuggestion.count({
        where: { wasAccepted: true }
      });

      const acceptanceRate = totalSuggestions > 0 ? 
        (acceptedSuggestions / totalSuggestions * 100).toFixed(2) : '0';

      res.json({
        success: true,
        data: {
          totalSessions,
          activeSessions,
          completedSessions,
          intentionStats: intentionDetails,
          totalSuggestions,
          acceptedSuggestions,
          acceptanceRate: `${acceptanceRate}%`
        }
      });

    } catch (error) {
      console.error('Erro ao buscar analytics:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export default EmotionalRecommendationController; 
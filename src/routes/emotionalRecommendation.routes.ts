import { Router } from 'express';
import { EmotionalRecommendationController } from '../controllers/emotionalRecommendation.controller';

const router = Router();
const controller = new EmotionalRecommendationController();

// Obter intenções emocionais disponíveis para um sentimento
router.get('/emotional-intentions/:sentimentId', controller.getEmotionalIntentions.bind(controller));

// Obter jornada personalizada baseada na intenção emocional
router.get('/personalized-journey/:sentimentId/:intentionId', controller.getPersonalizedJourney.bind(controller));

// Iniciar nova sessão de recomendação emocional
router.post('/emotional-recommendations', controller.startEmotionalRecommendation.bind(controller));

// Registrar feedback do usuário
router.post('/emotional-recommendations/:sessionId/feedback', controller.recordFeedback.bind(controller));

// Finalizar sessão
router.post('/emotional-recommendations/:sessionId/complete', controller.completeSession.bind(controller));

// Obter histórico do usuário
router.get('/emotional-recommendations/history/:userId', controller.getUserHistory.bind(controller));

// Obter analytics
router.get('/emotional-recommendations/analytics', controller.getAnalytics.bind(controller));

export default router; 
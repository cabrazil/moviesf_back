import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Personalized journey com Prisma
router.get('/:sentimentId/:intentionId', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.sentimentId);
    const intentionId = parseInt(req.params.intentionId);
    
    console.log(`🔍 Prisma: Buscando jornada para sentimentId: ${sentimentId}, intentionId: ${intentionId}`);
    
    // Buscar journey flow do sentimento
    const journeyFlow = await prisma.journeyFlow.findFirst({
      where: { mainSentimentId: sentimentId },
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
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });
    
    if (!journeyFlow) {
      return res.status(404).json({ error: 'Journey flow não encontrado' });
    }
    
    console.log(`✅ Journey flow encontrado: ${journeyFlow.steps.length} steps`);
    
    // Buscar informações da intenção
    const intentions = await prisma.emotionalIntention.findMany({
      where: { mainSentimentId: sentimentId }
    });
    
    const selectedIntention = intentions.find((intention: any) => intention.id === intentionId);
    
    if (!selectedIntention) {
      return res.status(404).json({ error: 'Intenção emocional não encontrada' });
    }
    
    console.log(`✅ Intenção encontrada: ${selectedIntention.type}`);
    
    // Retornar jornada personalizada no formato esperado pelo frontend
    const response = {
      id: journeyFlow.id,
      mainSentimentId: sentimentId,
      emotionalIntentionId: intentionId,
      steps: journeyFlow.steps.map((step: any) => ({
        id: step.id,
        stepId: step.stepId,
        order: step.order,
        question: step.question,
        options: step.options.map((option: any) => ({
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
    
    // Log detalhado da primeira opção para debug
    if (response.steps.length > 0 && response.steps[0].options.length > 0) {
      const firstOption = response.steps[0].options[0];
      console.log(`🔍 DEBUG - Primeira opção:`, {
        id: firstOption.id,
        text: firstOption.text,
        nextStepId: firstOption.nextStepId,
        isEndState: firstOption.isEndState,
        movieSuggestionsCount: firstOption.movieSuggestions?.length || 0
      });
    }
    
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
import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Buscar todos os sentimentos principais
router.get('/', async (req, res) => {
  try {
    const mainSentiments = await prisma.mainSentiment.findMany({
      include: {
        subSentiments: true
      }
    });

    return res.json(mainSentiments);
  } catch (error) {
    console.error('Erro ao buscar sentimentos principais:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar sub-sentimentos de um sentimento principal
router.get('/:id/sub-sentiments', async (req, res) => {
  try {
    const { id } = req.params;
    const subSentiments = await prisma.subSentiment.findMany({
      where: {
        mainSentimentId: Number(id)
      }
    });

    return res.json(subSentiments);
  } catch (error) {
    console.error('Erro ao buscar sub-sentimentos:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 
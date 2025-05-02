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

export default router; 
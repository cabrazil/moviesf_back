import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /main-sentiments/summary
router.get('/summary', async (req, res) => {
  try {
    const sentiments = await prisma.mainSentiment.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        shortDescription: true,
      },
      orderBy: { id: 'asc' },
    });
    res.json(sentiments);
  } catch (error) {
    console.error('Erro ao buscar sentimentos principais:', error);
    res.status(500).json({ error: 'Erro ao buscar sentimentos principais' });
  }
});

export default router; 
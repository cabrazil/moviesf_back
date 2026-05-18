import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Rota: GET /api/daily-curation/today
router.get('/today', async (req, res) => {
  try {
    const now = new Date();

    // Busca a curadoria ativa cuja data atual esteja entre startDate e endDate
    // Ordena pela maior prioridade, e em caso de empate, a que começou mais recentemente
    const dailyCuration = await prisma.dailyCuration.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: [
        { priority: 'desc' },
        { startDate: 'desc' }
      ]
    });

    if (!dailyCuration) {
      return res.status(404).json({ error: 'Nenhuma curadoria diária ativa encontrada.' });
    }

    res.json(dailyCuration);
  } catch (error) {
    console.error('Erro ao buscar curadoria diária:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar curadoria.' });
  }
});

export default router;

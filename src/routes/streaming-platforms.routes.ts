import { Router } from 'express';
import { prismaApp as prisma } from '../prisma';
import NodeCache from 'node-cache';

const router = Router();
const cache = new NodeCache({ stdTTL: 600 }); // Cache de 10 minutos

router.get('/', async (req, res) => {
  try {
    const cacheKey = 'streaming_platforms';
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`⚡ Usando cache em memória para StreamingPlatforms (${(cached as any).length} itens)`);
      return res.json(cached);
    }

    const platforms = await prisma.streamingPlatform.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        showFilter: true,
        logoPath: true,
        baseUrl: true,
        hasFreeTrial: true,
        freeTrialDuration: true
      }
    });

    // Ordenação manual em memória para evitar sintaxe complexa no Prisma
    platforms.sort((a, b) => {
      // 1. Sort by showFilter
      const showFilterOrder: any = { 'PRIORITY': 1, 'SECONDARY': 2, 'HIDDEN': 3 };
      const rankA = showFilterOrder[a.showFilter] || 4;
      const rankB = showFilterOrder[b.showFilter] || 4;
      if (rankA !== rankB) return rankA - rankB;

      // 2. Sort by category
      const categoryOrder: any = {
        'SUBSCRIPTION_PRIMARY': 1,
        'HYBRID': 2,
        'RENTAL_PURCHASE_PRIMARY': 3,
        'FREE_PRIMARY': 4
      };
      const catA = categoryOrder[a.category] || 5;
      const catB = categoryOrder[b.category] || 5;
      if (catA !== catB) return catA - catB;

      // 3. Sort by name
      return a.name.localeCompare(b.name);
    });

    cache.set(cacheKey, platforms);
    res.json(platforms);

  } catch (error) {
    console.error('Erro ao buscar plataformas de streaming:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;


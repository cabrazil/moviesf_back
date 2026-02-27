import { Router } from 'express';
import directDb from '../utils/directDb';
import NodeCache from 'node-cache';

const router = Router();
const cache = new NodeCache({ stdTTL: 600 }); // Cache de 10 minutos

router.get('/:sentimentId', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.sentimentId);
    if (isNaN(sentimentId)) {
      return res.status(400).json({ error: 'Invalid sentiment ID' });
    }

    const cacheKey = `intentions_${sentimentId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`⚡ Usando cache em memória para EmotionalIntentions (Sentiment ${sentimentId})`);
      return res.json(cached);
    }

    const intentions = await directDb.getEmotionalIntentions(sentimentId);

    cache.set(cacheKey, intentions);

    res.json(intentions);
  } catch (error: any) {
    console.error('Erro ao buscar intenções emocionais:', error);
    res.status(500).json({
      error: 'Erro ao buscar intenções emocionais',
      details: error.message
    });
  }
});

export default router;

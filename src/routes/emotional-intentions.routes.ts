import { Router } from 'express';
import directDb from '../utils/directDb';

const router = Router();

router.get('/:sentimentId', async (req, res) => {
  try {
    const sentimentId = parseInt(req.params.sentimentId);
    if (isNaN(sentimentId)) {
      return res.status(400).json({ error: 'Invalid sentiment ID' });
    }
    const intentions = await directDb.getEmotionalIntentions(sentimentId);
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

import { Router, Request, Response } from 'express';
import { vibeLandingService } from '../services/vibeLanding.service';

const router = Router();

/**
 * GET /api/vibe
 * Lista todas as vibes/jornadas ativas com filmes cadastrados
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const vibes = await vibeLandingService.getAllVibes();
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.json({
      success: true,
      total: vibes.length,
      vibes
    });
  } catch (error) {
    console.error('❌ Erro ao listar vibes:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao listar vibes disponíveis.'
    });
  }
});

/**
 * GET /api/vibe/:identifier
 * Retorna os dados completos da landing page de uma vibe (por slug ou ID)
 * Query params: ?limit=12
 */
router.get('/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 12;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: 'Identificador da vibe é obrigatório.'
      });
    }

    const data = await vibeLandingService.getVibeByIdentifier(identifier, limit);

    if (!data) {
      return res.status(404).json({
        success: false,
        error: `Vibe "${identifier}" não encontrada ou sem filmes curados.`
      });
    }

    // Cache HTTP de 5 minutos (300s) para alta performance
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error(`❌ Erro ao carregar dados da vibe "${req.params.identifier}":`, error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao carregar dados da vibe.'
    });
  }
});

export default router;

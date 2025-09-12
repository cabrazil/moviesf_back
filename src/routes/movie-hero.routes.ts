/**
 * 🎬 Rotas Movie Hero - Refatoradas
 * 
 * Endpoint otimizado para detalhes de filmes (landing page)
 * Utiliza arquitetura em camadas para melhor performance e manutenibilidade
 */

import { Router, Request, Response } from 'express';
import { movieHeroService } from '../services/movieHero.service';
import { MovieHeroError } from '../types/movieHero.types';

const router = Router();

/**
 * GET /:slug/hero
 * Obtém dados completos do filme para landing page
 */
router.get('/:slug/hero', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    // Validar parâmetros
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ 
        error: 'Slug do filme é obrigatório',
        code: 'VALIDATION_ERROR'
      });
    }

    console.log(`🎬 [${new Date().toISOString()}] Buscando filme hero: ${slug}`);

    // Buscar dados do filme usando o serviço
    const movieData = await movieHeroService.getMovieHero(slug);

    console.log(`✅ [${new Date().toISOString()}] Filme encontrado: ${movieData.movie.title}`);

    // Retornar resposta com sucesso
    res.json(movieData);

  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Erro ao buscar filme hero:`, error);

    // Tratar erros customizados
    if (error instanceof Error && 'code' in error) {
      const customError = error as MovieHeroError;
      
      switch (customError.code) {
        case 'MOVIE_NOT_FOUND':
          return res.status(404).json({
            error: customError.message,
            code: customError.code
          });
        
        case 'VALIDATION_ERROR':
          return res.status(400).json({
            error: customError.message,
            code: customError.code
          });
        
        case 'DATABASE_ERROR':
          return res.status(503).json({
            error: 'Serviço temporariamente indisponível',
            code: customError.code
          });
        
        default:
          return res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
          });
      }
    }

    // Erro genérico
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /health
 * Health check do endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const stats = await movieHeroService.getServiceStats();
    res.json({
      ...stats,
      service: 'MovieHeroRoutes'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

export default router;

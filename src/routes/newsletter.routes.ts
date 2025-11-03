import { Router, Request, Response } from 'express';
import NewsletterService from '../services/newsletterService';

const router = Router();
const newsletterService = new NewsletterService();

/**
 * POST /api/newsletter/subscribe
 * Inscrever email na newsletter
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { email, source } = req.body;

    // Extrair IP e User-Agent da requisição
    const ipAddress = req.ip || 
      req.headers['x-forwarded-for'] as string || 
      req.socket.remoteAddress || 
      undefined;
    
    const userAgent = req.headers['user-agent'] || undefined;

    // Chamar serviço
    const result = await newsletterService.subscribe({
      email,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
      source: source || 'blog_home'
    });

    // Retornar resposta apropriada
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error: any) {
    console.error('Erro na rota de newsletter:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_ERROR'
    });
  }
});

export default router;


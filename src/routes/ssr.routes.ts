/**
 * 🎨 Rotas SSR - Server-Side Rendering para SEO
 * 
 * Renderiza HTML completo com meta tags para bots do Google
 * Usuários normais são redirecionados para frontend SPA
 */

import { Router, Request, Response } from 'express';
import { movieHeroService } from '../services/movieHero.service';
import { BlogPrismaService } from '../services/blogPrismaService';
import { renderMovieHTML, renderArticleHTML, isBot } from '../utils/ssrRenderer';

const router = Router();
const blogService = new BlogPrismaService();

/**
 * GET /onde-assistir/:slug
 * SSR para landing pages de filmes
 */
router.get('/onde-assistir/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userAgent = req.headers['user-agent'];
    
    console.log(`🎬 SSR - Requisição para filme: ${slug}`);
    console.log(`🤖 User-Agent: ${userAgent}`);
    
    // Detectar se é bot do Google ou usuário normal
    const bot = isBot(userAgent);
    
    if (bot) {
      console.log(`✅ Bot detectado, gerando HTML SSR para: ${slug}`);
      
      try {
        // 1. Buscar dados do filme
        const movieData = await movieHeroService.getMovieHero(slug);
        
        // 2. Gerar HTML completo com meta tags
        const html = renderMovieHTML(movieData, slug);
        
        // 3. Retornar HTML completo
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
        
      } catch (error: any) {
        console.error(`❌ Erro ao gerar HTML SSR para filme ${slug}:`, error);
        
        // Se filme não encontrado, retornar 404 HTML
        if (error.code === 'MOVIE_NOT_FOUND') {
          return res.status(404).send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <title>Filme não encontrado | vibesfilm</title>
            </head>
            <body>
              <h1>Filme não encontrado</h1>
              <p>O filme solicitado não foi encontrado.</p>
            </body>
            </html>
          `);
        }
        
        // Outros erros: redirecionar para frontend
        throw error;
      }
    }
    
    // Para usuários normais: redirecionar para frontend SPA
    console.log(`👤 Usuário normal, redirecionando para frontend SPA`);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/onde-assistir/${slug}`);
    
  } catch (error) {
    console.error('❌ Erro no SSR de filme:', error);
    
    // Fallback: redirecionar para frontend
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/onde-assistir/${req.params.slug}`);
  }
});

/**
 * GET /analise/:slug
 * SSR para artigos de análise
 */
router.get('/analise/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userAgent = req.headers['user-agent'];
    
    console.log(`📝 SSR - Requisição para artigo (análise): ${slug}`);
    console.log(`🤖 User-Agent: ${userAgent}`);
    
    const bot = isBot(userAgent);
    
    if (bot) {
      console.log(`✅ Bot detectado, gerando HTML SSR para artigo: ${slug}`);
      
      try {
        // 1. Buscar artigo
        const result = await blogService.getPostBySlug(slug);
        
        if (!result.success || !result.data) {
          return res.status(404).send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <title>Artigo não encontrado | VibesFilm Blog</title>
            </head>
            <body>
              <h1>Artigo não encontrado</h1>
              <p>O artigo solicitado não foi encontrado.</p>
            </body>
            </html>
          `);
        }
        
        // 2. Gerar HTML completo com meta tags
        const html = renderArticleHTML(result.data, slug, 'analise');
        
        // 3. Retornar HTML completo
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
        
      } catch (error) {
        console.error(`❌ Erro ao gerar HTML SSR para artigo ${slug}:`, error);
        throw error;
      }
    }
    
    // Para usuários normais: redirecionar para frontend SPA
    console.log(`👤 Usuário normal, redirecionando para frontend SPA`);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/analise/${slug}`);
    
  } catch (error) {
    console.error('❌ Erro no SSR de artigo:', error);
    
    // Fallback: redirecionar para frontend
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/analise/${req.params.slug}`);
  }
});

/**
 * GET /lista/:slug
 * SSR para artigos de lista
 */
router.get('/lista/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userAgent = req.headers['user-agent'];
    
    console.log(`📝 SSR - Requisição para artigo (lista): ${slug}`);
    console.log(`🤖 User-Agent: ${userAgent}`);
    
    const bot = isBot(userAgent);
    
    if (bot) {
      console.log(`✅ Bot detectado, gerando HTML SSR para lista: ${slug}`);
      
      try {
        // 1. Buscar artigo
        const result = await blogService.getPostBySlug(slug);
        
        if (!result.success || !result.data) {
          return res.status(404).send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <title>Artigo não encontrado | VibesFilm Blog</title>
            </head>
            <body>
              <h1>Artigo não encontrado</h1>
              <p>O artigo solicitado não foi encontrado.</p>
            </body>
            </html>
          `);
        }
        
        // 2. Gerar HTML completo com meta tags
        const html = renderArticleHTML(result.data, slug, 'lista');
        
        // 3. Retornar HTML completo
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
        
      } catch (error) {
        console.error(`❌ Erro ao gerar HTML SSR para lista ${slug}:`, error);
        throw error;
      }
    }
    
    // Para usuários normais: redirecionar para frontend SPA
    console.log(`👤 Usuário normal, redirecionando para frontend SPA`);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/lista/${slug}`);
    
  } catch (error) {
    console.error('❌ Erro no SSR de lista:', error);
    
    // Fallback: redirecionar para frontend
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/lista/${req.params.slug}`);
  }
});

export default router;


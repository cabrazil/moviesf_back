/**
 * 🎨 Rotas SSR - Server-Side Rendering para SEO
 * 
 * Renderiza HTML completo com meta tags para bots do Google
 * Usuários normais são redirecionados para frontend SPA
 */

import { Router, Request, Response } from 'express';
import { movieHeroService } from '../services/movieHero.service';
import { BlogPrismaService } from '../services/blogPrismaService';
import { renderMovieHTML, renderArticleHTML, renderHomeHTML, renderStaticPageHTML, renderArchiveHTML, isBot } from '../utils/ssrRenderer';

const router = Router();
const blogService = new BlogPrismaService();

/**
 * GET /ssr-home
 * SSR para a página inicial (Home) do blog - exclusivo para Bots
 */
router.get('/ssr-home', async (req: Request, res: Response) => {
  try {
    const userAgent = req.headers['user-agent'];
    const bot = isBot(userAgent);
    
    console.log(`🏠 SSR - Requisição para home do blog (ssr-home)`);
    console.log(`🤖 User-Agent: ${userAgent}`);
    
    if (bot) {
      console.log(`✅ Bot detectado na home, buscando posts recentes...`);
      
      const postsResult = await blogService.getPosts({ page: 1, limit: 12 });
      
      if (!postsResult.success || !postsResult.data) {
        throw new Error('Falha ao buscar posts para a home do blog');
      }
      
      const posts = (postsResult.data as any).articles || [];
      const html = renderHomeHTML(posts);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
    
    // Para humanos: redirecionar para a home do frontend SPA
    console.log(`👤 Usuário normal, redirecionando para a home do frontend SPA`);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, frontendUrl);
  } catch (error) {
    console.error('❌ Erro no SSR da home:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, frontendUrl);
  }
});

/**
 * GET /
 * Alias da home SSR — recebe requisições de bots via nginx (proxy_pass sem URI)
 * proxy_pass http://backend:3333 → backend recebe GET / → serve SSR home para bots
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userAgent = req.headers['user-agent'];
    const bot = isBot(userAgent);

    console.log(`🏠 SSR - Requisição raiz (/)`);
    console.log(`🤖 User-Agent: ${userAgent}`);

    if (bot) {
      console.log(`✅ Bot detectado na raiz (/), buscando posts recentes...`);

      const postsResult = await blogService.getPosts({ page: 1, limit: 12 });

      if (!postsResult.success || !postsResult.data) {
        throw new Error('Falha ao buscar posts para a home');
      }

      const posts = (postsResult.data as any).articles || [];
      const html = renderHomeHTML(posts);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    // Humanos vêm via SPA pelo nginx — mas se chegarem direto ao backend, redireciona
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, frontendUrl);
  } catch (error) {
    console.error('❌ Erro no SSR da raiz (/):', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, frontendUrl);
  }
});

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
      if (process.env.HIDE_MOVIE_HUB_LINKS === 'true') {
        console.log(`🚫 SSR - Acesso a onde-assistir ocultado para bots (HIDE_MOVIE_HUB_LINKS=true): ${slug}`);
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <title>Página não encontrada | VibesFilm</title>
            <meta name="robots" content="noindex, nofollow">
          </head>
          <body>
            <h1>Página não encontrada</h1>
          </body>
          </html>
        `);
      }
      
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
 * GET /filme/:slug
 * SSR para página editorial do filme
 */
router.get('/filme/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userAgent = req.headers['user-agent'];

    console.log(`🎬 SSR - Requisição para página editorial do filme: ${slug}`);
    console.log(`🤖 User-Agent: ${userAgent}`);

    const bot = isBot(userAgent);

    if (bot) {
      if (process.env.HIDE_MOVIE_HUB_LINKS === 'true') {
        console.log(`🚫 SSR - Acesso a filme ocultado para bots (HIDE_MOVIE_HUB_LINKS=true): ${slug}`);
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <title>Página não encontrada | VibesFilm</title>
            <meta name="robots" content="noindex, nofollow">
          </head>
          <body>
            <h1>Página não encontrada</h1>
          </body>
          </html>
        `);
      }
      
      console.log(`✅ Bot detectado, gerando HTML SSR editorial para: ${slug}`);

      try {
        const movieData = await movieHeroService.getMovieHero(slug);
        const html = renderMovieHTML(movieData, slug, 'editorial');

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      } catch (error: any) {
        console.error(`❌ Erro ao gerar HTML SSR editorial para filme ${slug}:`, error);

        if (error.code === 'MOVIE_NOT_FOUND') {
          return res.status(404).send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <title>Filme não encontrado | Vibesfilm</title>
            </head>
            <body>
              <h1>Filme não encontrado</h1>
              <p>O filme solicitado não foi encontrado.</p>
            </body>
            </html>
          `);
        }

        throw error;
      }
    }

    console.log(`👤 Usuário normal, redirecionando para frontend SPA`);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/filme/${slug}`);

  } catch (error) {
    console.error('❌ Erro no SSR editorial de filme:', error);

    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/filme/${req.params.slug}`);
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

/**
 * GET /artigo/:slug
 * GET /blog/artigo/:slug
 * SSR para artigos (redireciona para o tipo correto após buscar dados)
 */
const articleBotHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userAgent = req.headers['user-agent'];
    
    console.log(`📝 SSR - Requisição para artigo (genérico): ${slug}`);
    
    const bot = isBot(userAgent);
    
    if (bot) {
      console.log(`✅ Bot detectado, buscando tipo do artigo para SSR: ${slug}`);
      
      try {
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
        
        const article = result.data;
        const type = article.type || 'analise'; // default para analise
        
        const html = renderArticleHTML(article, slug, type as any);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
        
      } catch (error) {
        console.error(`❌ Erro ao gerar HTML SSR para artigo genérico ${slug}:`, error);
        throw error;
      }
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/artigo/${slug}`);
  } catch (error) {
    console.error('❌ Erro no SSR genérico de artigo:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/artigo/${req.params.slug}`);
  }
};

router.get('/artigo/:slug', articleBotHandler);
router.get('/blog/artigo/:slug', articleBotHandler);
router.get('/blog/analise/:slug', async (req, res) => res.redirect(302, `/analise/${req.params.slug}`));
router.get('/blog/lista/:slug', async (req, res) => res.redirect(302, `/lista/${req.params.slug}`));
router.get('/blog/sobre', async (req, res) => res.redirect(302, '/sobre'));
router.get('/blog/contato', async (req, res) => res.redirect(302, '/contato'));
router.get('/blog/privacidade', async (req, res) => res.redirect(302, '/privacidade'));
router.get('/blog/termos', async (req, res) => res.redirect(302, '/termos'));
router.get('/blog/cookies', async (req, res) => res.redirect(302, '/cookies'));
router.get('/blog/categorias', async (req, res) => res.redirect(302, '/categorias'));
router.get('/blog/categoria/:categorySlug', async (req, res) => res.redirect(302, `/categoria/${req.params.categorySlug}`));
router.get('/blog/tag/:tagSlug', async (req, res) => res.redirect(302, `/tag/${req.params.tagSlug}`));

/**
 * GET /sobre, /contato, /privacidade, /termos, /cookies
 * SSR para páginas institucionais - exclusivo para Bots
 */
const staticPagesHandler = async (req: Request, res: Response) => {
  try {
    const userAgent = req.headers['user-agent'];
    const bot = isBot(userAgent);
    
    // Obter o nome da página a partir do caminho
    const path = req.path;
    const pageType = path.replace(/^\//, '') || 'sobre';
    
    console.log(`📄 SSR - Requisição para página institucional: ${pageType}`);
    console.log(`🤖 User-Agent: ${userAgent}`);
    
    if (bot) {
      console.log(`✅ Bot detectado, gerando HTML SSR para página: ${pageType}`);
      const html = renderStaticPageHTML(pageType);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
    
    // Para humanos: redirecionar para o frontend SPA
    console.log(`👤 Usuário normal, redirecionando para a página institucional no frontend SPA`);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/${pageType}`);
  } catch (error) {
    console.error('❌ Erro no SSR da página institucional:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, frontendUrl);
  }
};

router.get('/sobre', staticPagesHandler);
router.get('/contato', staticPagesHandler);
router.get('/privacidade', staticPagesHandler);
router.get('/termos', staticPagesHandler);
router.get('/cookies', staticPagesHandler);

/**
 * GET /categorias
 * SSR para página de categorias
 */
router.get('/categorias', async (req: Request, res: Response) => {
  try {
    const userAgent = req.headers['user-agent'];
    const bot = isBot(userAgent);
    
    console.log(`📂 SSR - Requisição para lista de categorias`);
    
    if (bot) {
      console.log(`✅ Bot detectado, buscando categorias...`);
      const categoriesResult = await blogService.getCategories();
      
      if (!categoriesResult.success || !categoriesResult.data) {
        throw new Error('Falha ao buscar categorias');
      }
      
      const categories = categoriesResult.data as any[];
      // Construir um HTML simples de listagem de categorias
      let listContent = '<h2>Categorias de Filmes e Análises</h2><ul>';
      categories.forEach((cat: any) => {
        listContent += `<li><a href="/categoria/${cat.slug}">${cat.title}</a> (${cat.article_count} artigos)</li>`;
      });
      listContent += '</ul>';
      
      // Renderizar usando o esqueleto estático
      const baseHtml = renderStaticPageHTML('sobre'); // Reutilizar esqueleto de cabeçalho/rodapé
      // Substituir conteúdo do Sobre pelo de Categorias
      const title = "Categorias | VibesFilm";
      const description = "Explore as análises e listas de filmes do VibesFilm organizados por categorias emocionais e cinematográficas.";
      const canonicalUrl = "https://vibesfilm.com/categorias";
      
      const html = baseHtml
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${description}">`)
        .replace(/<link rel="canonical" href=".*?"\s*\/?>/, `<link rel="canonical" href="${canonicalUrl}">`)
        .replace(/<main>[\s\S]*?<\/main>/, `<main>${listContent}</main>`);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/categorias`);
  } catch (error) {
    console.error('❌ Erro no SSR de categorias:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/categorias`);
  }
});

/**
 * GET /categoria/:categorySlug
 * SSR para arquivos de categoria
 */
router.get('/categoria/:categorySlug', async (req: Request, res: Response) => {
  try {
    const { categorySlug } = req.params;
    const userAgent = req.headers['user-agent'];
    const bot = isBot(userAgent);
    
    console.log(`📂 SSR - Requisição para artigos da categoria: ${categorySlug}`);
    
    if (bot) {
      console.log(`✅ Bot detectado, buscando artigos da categoria...`);
      const postsResult = await blogService.getPostsByCategory(categorySlug, 1, 30);
      
      if (!postsResult.success || !postsResult.data) {
        throw new Error(`Falha ao buscar posts para categoria ${categorySlug}`);
      }
      
      const posts = (postsResult.data as any).articles || [];
      const categoryTitle = posts.length > 0 ? posts[0].category_title : categorySlug;
      const categoryDesc = posts.length > 0 ? (posts[0].category_description || `Artigos e análises na categoria ${categoryTitle}`) : `Artigos e análises na categoria ${categoryTitle}`;
      
      const html = renderArchiveHTML(posts, `Categoria: ${categoryTitle}`, categoryDesc, `/categoria/${categorySlug}`);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/categoria/${categorySlug}`);
  } catch (error) {
    console.error(`❌ Erro no SSR da categoria ${req.params.categorySlug}:`, error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/categoria/${req.params.categorySlug}`);
  }
});

/**
 * GET /tag/:tagSlug
 * SSR para arquivos de tag
 */
router.get('/tag/:tagSlug', async (req: Request, res: Response) => {
  try {
    const { tagSlug } = req.params;
    const userAgent = req.headers['user-agent'];
    const bot = isBot(userAgent);
    
    console.log(`🏷️ SSR - Requisição para artigos da tag: ${tagSlug}`);
    
    if (bot) {
      console.log(`✅ Bot detectado, buscando artigos da tag...`);
      const postsResult = await blogService.getPostsByTag(tagSlug, 1, 30);
      
      if (!postsResult.success || !postsResult.data) {
        throw new Error(`Falha ao buscar posts para tag ${tagSlug}`);
      }
      
      const posts = (postsResult.data as any).articles || [];
      const tagTitle = tagSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      const html = renderArchiveHTML(posts, `Tag: ${tagTitle}`, `Artigos e análises de filmes relacionados à tag ${tagTitle}`, `/tag/${tagSlug}`);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/tag/${tagSlug}`);
  } catch (error) {
    console.error(`❌ Erro no SSR da tag ${req.params.tagSlug}:`, error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://vibesfilm.com';
    return res.redirect(302, `${frontendUrl}/tag/${req.params.tagSlug}`);
  }
});

export default router;

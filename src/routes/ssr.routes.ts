/**
 * 🎨 Rotas SSR - Server-Side Rendering para SEO
 * 
 * Renderiza HTML completo com meta tags para bots do Google
 * Usuários normais são redirecionados para frontend SPA
 */

import { Router, Request, Response } from 'express';
import { prismaApp } from '../prisma';
import { movieHeroService } from '../services/movieHero.service';
import { BlogPrismaService } from '../services/blogPrismaService';
import { vibeLandingService } from '../services/vibeLanding.service';
import { renderMovieHTML, renderArticleHTML, renderHomeHTML, renderVibeLandingHTML, renderStaticPageHTML, renderArchiveHTML, isBot, isSocialBot } from '../utils/ssrRenderer';

const router = Router();
const blogService = new BlogPrismaService();

async function buildHomeSSRHtml(): Promise<string> {
  const [postsResult, recentMovies, vibes] = await Promise.all([
    blogService.getPosts({ page: 1, limit: 12 }),
    prismaApp.movie.findMany({
      where: {
        slug: { not: null },
        movieSentiments: { some: {} }
      },
      select: {
        title: true,
        year: true,
        slug: true,
        landingPageHook: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 30
    }).catch(() => []),
    vibeLandingService.getAllVibes().catch(() => [])
  ]);

  const posts = (postsResult.success && postsResult.data ? (postsResult.data as any).articles : []) || [];
  return renderHomeHTML(
    posts,
    recentMovies.filter(m => m.slug) as Array<{ title: string; year?: number | null; slug: string; landingPageHook?: string | null }>,
    vibes
  );
}

/**
 * GET /ssr-home
 * SSR para a página inicial (Home) do blog
 */
router.get('/ssr-home', async (req: Request, res: Response) => {
  try {
    const html = await buildHomeSSRHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('❌ Erro no SSR da home:', error);
    return res.status(500).send('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Erro temporário | VibesFilm</title></head><body><h1>Erro temporário</h1><p>Não foi possível carregar a página inicial no momento.</p></body></html>');
  }
});

/**
 * GET /
 * Alias da home SSR — recebe requisições de bots via nginx
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const html = await buildHomeSSRHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('❌ Erro no SSR da raiz (/):', error);
    return res.status(500).send('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Erro temporário | VibesFilm</title></head><body><h1>Erro temporário</h1><p>Não foi possível carregar a página inicial no momento.</p></body></html>');
  }
});

/**
 * GET /onde-assistir/:slug
 * Redirecionamento permanente 301 para a Ficha Premium Unificada /filme/:slug
 */
router.get('/onde-assistir/:slug', (req: Request, res: Response) => {
  return res.redirect(301, `https://vibesfilm.com/filme/${req.params.slug}`);
});

/**
 * GET /filmes-para/:slug
 * SSR para Landing Pages de Vibes / Coleções Emocionais
 */
router.get('/filmes-para/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const vibeData = await vibeLandingService.getVibeByIdentifier(slug, 40);
    if (!vibeData) {
      return res.status(404).send('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Coleção não encontrada | VibesFilm</title></head><body><h1>Coleção não encontrada</h1><p><a href="/">Voltar para a página inicial</a></p></body></html>');
    }
    const html = renderVibeLandingHTML(vibeData);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error(`❌ Erro no SSR da vibe ${req.params.slug}:`, error);
    return res.status(500).send('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Erro temporário | VibesFilm</title></head><body><h1>Erro temporário</h1></body></html>');
  }
});

router.get('/vibe/:slug', (req: Request, res: Response) => {
  return res.redirect(301, `https://vibesfilm.com/filmes-para/${req.params.slug}`);
});

/**
 * GET /filme/:slug
 * SSR para página editorial do filme
 */
router.get('/filme/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userAgent = req.headers['user-agent'];

    console.log(`🎬 SSR - Requisição para página editorial do filme: ${slug} | UA: ${userAgent}`);

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
            <p>O filme solicitado não foi encontrado. <a href="/">Voltar para a página inicial</a></p>
          </body>
          </html>
        `);
      }

      throw error;
    }
  } catch (error) {
    console.error('❌ Erro no SSR editorial de filme:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Erro temporário | VibesFilm</title>
      </head>
      <body>
        <h1>Erro temporário</h1>
        <p>Não foi possível carregar a página do filme no momento.</p>
      </body>
      </html>
    `);
  }
});

/**
 * GET /blog/artigo/:slug
 * SSR canônico para artigos do blog
 */
const articleBotHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const userAgent = req.headers['user-agent'];

    console.log(`📝 SSR - Requisição para artigo: ${slug} | UA: ${userAgent}`);

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
          <p>O artigo solicitado não foi encontrado. <a href="/">Voltar para a página inicial</a></p>
        </body>
        </html>
      `);
    }

    const article = result.data;
    const type = article.type || 'analise';

    const html = renderArticleHTML(article, slug, type as any);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('❌ Erro no SSR de artigo:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Erro temporário | VibesFilm</title>
      </head>
      <body>
        <h1>Erro temporário</h1>
        <p>Não foi possível carregar o artigo no momento.</p>
      </body>
      </html>
    `);
  }
};

// Rota canônica oficial para artigos
router.get('/blog/artigo/:slug', articleBotHandler);

// Redirecionamentos 301 permanentes absolutos para consolidar SEO na rota oficial /blog/artigo/:slug
router.get('/artigo/:slug', (req, res) => res.redirect(301, `https://vibesfilm.com/blog/artigo/${req.params.slug}`));
router.get('/analise/:slug', (req, res) => res.redirect(301, `https://vibesfilm.com/blog/artigo/${req.params.slug}`));
router.get('/lista/:slug', (req, res) => res.redirect(301, `https://vibesfilm.com/blog/artigo/${req.params.slug}`));
router.get('/blog/analise/:slug', (req, res) => res.redirect(301, `https://vibesfilm.com/blog/artigo/${req.params.slug}`));
router.get('/blog/lista/:slug', (req, res) => res.redirect(301, `https://vibesfilm.com/blog/artigo/${req.params.slug}`));

// Redirecionamentos institucionais 301 permanentes
router.get('/blog', (req, res) => res.redirect(301, 'https://vibesfilm.com/'));
router.get('/blog/sobre', (req, res) => res.redirect(301, 'https://vibesfilm.com/sobre'));
router.get('/blog/contato', (req, res) => res.redirect(301, 'https://vibesfilm.com/contato'));
router.get('/blog/privacidade', (req, res) => res.redirect(301, 'https://vibesfilm.com/privacidade'));
router.get('/blog/termos', (req, res) => res.redirect(301, 'https://vibesfilm.com/termos'));
router.get('/blog/cookies', (req, res) => res.redirect(301, 'https://vibesfilm.com/cookies'));
router.get('/blog/categorias', (req, res) => res.redirect(301, 'https://vibesfilm.com/categorias'));
router.get('/blog/categoria/:categorySlug', (req, res) => res.redirect(301, `https://vibesfilm.com/categoria/${req.params.categorySlug}`));

/**
 * GET /sobre, /contato, /privacidade, /termos, /cookies
 * SSR para páginas institucionais
 */
const staticPagesHandler = async (req: Request, res: Response) => {
  try {
    const path = req.path;
    const pageType = path.replace(/^\//, '') || 'sobre';

    const html = renderStaticPageHTML(pageType);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('❌ Erro no SSR da página institucional:', error);
    return res.status(500).send('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Erro temporário | VibesFilm</title></head><body><h1>Erro temporário</h1><p>Não foi possível carregar a página no momento.</p></body></html>');
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
    const categoriesResult = await blogService.getCategories();

    if (!categoriesResult.success || !categoriesResult.data) {
      throw new Error('Falha ao buscar categorias');
    }

    const categories = categoriesResult.data as any[];
    let listContent = '<h2>Categorias de Filmes e Análises</h2><ul>';
    categories.forEach((cat: any) => {
      listContent += `<li><a href="/categoria/${cat.slug}">${cat.title}</a> (${cat.article_count} artigos)</li>`;
    });
    listContent += '</ul>';

    const baseHtml = renderStaticPageHTML('sobre');
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
  } catch (error) {
    console.error('❌ Erro no SSR de categorias:', error);
    return res.status(500).send('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Erro temporário | VibesFilm</title></head><body><h1>Erro temporário</h1><p>Não foi possível carregar as categorias no momento.</p></body></html>');
  }
});

/**
 * GET /categoria/:categorySlug
 * SSR para arquivos de categoria
 */
router.get('/categoria/:categorySlug', async (req: Request, res: Response) => {
  try {
    const { categorySlug } = req.params;
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
  } catch (error) {
    console.error(`❌ Erro no SSR da categoria ${req.params.categorySlug}:`, error);
    return res.status(500).send('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Erro temporário | VibesFilm</title></head><body><h1>Erro temporário</h1><p>Não foi possível carregar a categoria no momento.</p></body></html>');
  }
});

/**
 * GET /blog/tag/:tagSlug
 * SSR para arquivos de tag
 */
const tagBotHandler = async (req: Request, res: Response) => {
  try {
    const { tagSlug } = req.params;
    const postsResult = await blogService.getPostsByTag(tagSlug, 1, 30);

    if (!postsResult.success || !postsResult.data) {
      throw new Error(`Falha ao buscar posts para tag ${tagSlug}`);
    }

    const posts = (postsResult.data as any).articles || [];
    const tagTitle = tagSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    const html = renderArchiveHTML(posts, `Tag: ${tagTitle}`, `Artigos e análises de filmes relacionados à tag ${tagTitle}`, `/blog/tag/${tagSlug}`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error(`❌ Erro no SSR da tag ${req.params.tagSlug}:`, error);
    return res.status(500).send('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Erro temporário | VibesFilm</title></head><body><h1>Erro temporário</h1><p>Não foi possível carregar a tag no momento.</p></body></html>');
  }
};

router.get('/blog/tag/:tagSlug', tagBotHandler);
router.get('/tag/:tagSlug', (req, res) => res.redirect(301, `https://vibesfilm.com/blog/tag/${req.params.tagSlug}`));

export default router;

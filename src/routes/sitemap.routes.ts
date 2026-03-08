import { Router } from 'express';
import { prismaApp, prismaBlog } from '../prisma';

const router = Router();

// Cache em memória simples para sitemaps (10 minutos)
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 });

// URL frontend de produção (utilizada para construir a <loc> do sitemap)
const FRONTEND_URL = 'https://vibesfilm.com';

router.get('/movies.xml', async (req, res) => {
  try {
    const cacheKey = 'sitemap_movies_xml';
    const cached = cache.get(cacheKey);
    if (cached) {
      res.header('Content-Type', 'application/xml');
      return res.send(cached);
    }

    // Buscar todos os filmes que possuem análises/journeys no sistema
    const movies = await prismaApp.movie.findMany({
      where: {
        movieSentiments: {
          some: {} // Apenas filmes validados que já receberam sentimentos
        }
      },
      select: {
        slug: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    movies.forEach((movie) => {
      // Use updatedAt se existir, senão data atual
      const lastMod = movie.updatedAt ? movie.updatedAt.toISOString() : new Date().toISOString();
      const slug = movie.slug ? movie.slug : 'undefined-slug';

      sitemap += `  <url>\n`;
      sitemap += `    <loc>${FRONTEND_URL}/onde-assistir/${slug}</loc>\n`;
      sitemap += `    <lastmod>${lastMod}</lastmod>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `    <priority>0.8</priority>\n`;
      sitemap += `  </url>\n`;
    });

    sitemap += `</urlset>`;

    cache.set(cacheKey, sitemap);

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);

  } catch (error) {
    console.error('Erro ao gerar sitemap de movies:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

router.get('/articles.xml', async (req, res) => {
  try {
    const cacheKey = 'sitemap_articles_xml';
    const cached = cache.get(cacheKey);
    if (cached) {
      res.header('Content-Type', 'application/xml');
      return res.send(cached);
    }

    // Buscar os publicações de Vibe/Artigos usando Query Raw pois o schema do Blog não exporta models tipados
    const query = `
      SELECT slug, date, "updatedAt"
      FROM "Article"
      WHERE "blogId" = 3 AND published = true
      ORDER BY date DESC
    `;

    const articles = await prismaBlog.$queryRawUnsafe(query) as any[];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    articles.forEach((article) => {
      const date = article.updatedAt || article.date || new Date();
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${FRONTEND_URL}/blog/artigo/${article.slug}</loc>\n`;
      sitemap += `    <lastmod>${new Date(date).toISOString()}</lastmod>\n`;
      sitemap += `    <changefreq>monthly</changefreq>\n`;
      sitemap += `    <priority>0.7</priority>\n`;
      sitemap += `  </url>\n`;
    });

    sitemap += `</urlset>`;

    cache.set(cacheKey, sitemap);

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);

  } catch (error) {
    console.error('Erro ao gerar sitemap de artigos:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

export default router;

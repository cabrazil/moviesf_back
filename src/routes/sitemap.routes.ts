import { Router } from 'express';
import { prismaApp, prismaBlog } from '../prisma';

const router = Router();

// Cache em memória simples para sitemaps (10 minutos)
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 });

// URL frontend de produção (utilizada para construir a <loc> do sitemap)
const FRONTEND_URL = 'https://vibesfilm.com';

router.get('/index.xml', (req, res) => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  const sitemaps = [
    'movies.xml',
    'movie-landings.xml',
    'articles.xml',
    'categories.xml',
    'tags.xml'
  ];

  sitemaps.forEach(s => {
    xml += `  <sitemap>\n`;
    xml += `    <loc>https://api.vibesfilm.com/sitemap/${s}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
    xml += `  </sitemap>\n`;
  });

  xml += `</sitemapindex>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

type MovieSitemapRoute = {
  cacheKey: string;
  pathPrefix: string;
  changefreq: string;
  priority: string;
  logLabel: string;
};

async function generateMovieSitemap(res: any, route: MovieSitemapRoute) {
  const cached = cache.get(route.cacheKey);
  if (cached) {
    res.header('Content-Type', 'application/xml');
    return res.send(cached);
  }

  const movies = await prismaApp.movie.findMany({
    where: {
      slug: {
        not: null
      },
      movieSentiments: {
        some: {}
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
    if (!movie.slug) {
      return;
    }

    const lastMod = movie.updatedAt ? movie.updatedAt.toISOString() : new Date().toISOString();

    sitemap += `  <url>\n`;
    sitemap += `    <loc>${FRONTEND_URL}${route.pathPrefix}${movie.slug}</loc>\n`;
    sitemap += `    <lastmod>${lastMod}</lastmod>\n`;
    sitemap += `    <changefreq>${route.changefreq}</changefreq>\n`;
    sitemap += `    <priority>${route.priority}</priority>\n`;
    sitemap += `  </url>\n`;
  });

  sitemap += `</urlset>`;

  cache.set(route.cacheKey, sitemap);

  res.header('Content-Type', 'application/xml');
  return res.send(sitemap);
}

router.get('/movies.xml', async (req, res, next) => {
  try {
    await generateMovieSitemap(res, {
      cacheKey: 'sitemap_movies_xml',
      pathPrefix: '/filme/',
      changefreq: 'weekly',
      priority: '0.9',
      logLabel: 'editorial'
    });
  } catch (error) {
    console.error('Erro ao gerar sitemap de movies:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

router.get('/movie-landings.xml', async (req, res) => {
  try {
    await generateMovieSitemap(res, {
      cacheKey: 'sitemap_movie_landings_xml',
      pathPrefix: '/onde-assistir/',
      changefreq: 'weekly',
      priority: '0.7',
      logLabel: 'landing'
    });
  } catch (error) {
    console.error('Erro ao gerar sitemap de landing pages:', error);
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

router.get('/categories.xml', async (req, res) => {
  try {
    const cacheKey = 'sitemap_categories_xml';
    const cached = cache.get(cacheKey);
    if (cached) {
      res.header('Content-Type', 'application/xml');
      return res.send(cached);
    }

    const query = `
      SELECT slug, "updatedAt"
      FROM "Category"
      WHERE "blogId" = 3
      ORDER BY name ASC
    `;

    const categories = await prismaBlog.$queryRawUnsafe(query) as any[];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    categories.forEach((cat) => {
      const date = cat.updatedAt || new Date();
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${FRONTEND_URL}/blog/categoria/${cat.slug}</loc>\n`;
      sitemap += `    <lastmod>${new Date(date).toISOString()}</lastmod>\n`;
      sitemap += `    <changefreq>monthly</changefreq>\n`;
      sitemap += `    <priority>0.6</priority>\n`;
      sitemap += `  </url>\n`;
    });

    sitemap += `</urlset>`;

    cache.set(cacheKey, sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Erro ao gerar sitemap de categorias:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

router.get('/tags.xml', async (req, res) => {
  try {
    const cacheKey = 'sitemap_tags_xml';
    const cached = cache.get(cacheKey);
    if (cached) {
      res.header('Content-Type', 'application/xml');
      return res.send(cached);
    }

    const query = `
      SELECT slug, "updatedAt"
      FROM "Tag"
      WHERE "blogId" = 3
      ORDER BY name ASC
    `;

    const tags = await prismaBlog.$queryRawUnsafe(query) as any[];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    tags.forEach((tag) => {
      const date = tag.updatedAt || new Date();
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${FRONTEND_URL}/blog/tag/${tag.slug}</loc>\n`;
      sitemap += `    <lastmod>${new Date(date).toISOString()}</lastmod>\n`;
      sitemap += `    <changefreq>monthly</changefreq>\n`;
      sitemap += `    <priority>0.5</priority>\n`;
      sitemap += `  </url>\n`;
    });

    sitemap += `</urlset>`;

    cache.set(cacheKey, sitemap);
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Erro ao gerar sitemap de tags:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

export default router;

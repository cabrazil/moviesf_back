import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

// Pool de conexão para o banco de dados do blog
const blogDbPool = new Pool({
  connectionString: process.env.BLOG_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// GET /api/blog/articles - Listar artigos
router.get('/articles', async (req, res) => {
  try {
    const {
      blogId = '3',
      published = 'true',
      categorySlug,
      tagSlug,
      limit = '10',
      offset = '0'
    } = req.query;

    const whereCondition: any = {
      blogId: parseInt(blogId as string),
      published: published === 'true',
    };

    // Filtro por categoria
    if (categorySlug) {
      whereCondition.category = {
        slug: categorySlug as string
      };
    }

    // Filtro por tag
    if (tagSlug) {
      whereCondition.tags = {
        some: {
          slug: tagSlug as string
        }
      };
    }

    // Construir a query SQL
    let query = `
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.description,
        a.content,
        a."imageUrl",
        a.keywords,
        a.published,
        a."viewCount",
        a."likeCount",
        a.date,
        a."createdAt",
        a."updatedAt",
        json_build_object(
          'id', au.id,
          'name', au.name,
          'role', au.role,
          'imageUrl', au."imageUrl",
          'bio', au.bio,
          'email', au.email,
          'website', au.website
        ) as author,
        json_build_object(
          'id', c.id,
          'title', c.title,
          'slug', c.slug,
          'description', c.description
        ) as category,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'slug', t.slug,
              'color', t.color
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as tags
      FROM "Article" a
      LEFT JOIN "Author" au ON a."authorId" = au.id
      LEFT JOIN "Category" c ON a."categoryId" = c.id
      LEFT JOIN "Article" at ON a.id = at.id
      LEFT JOIN "Tag" t ON t.id IN (
        SELECT "Tag".id FROM "Tag" 
        JOIN "Article" ON "Article".id = a.id
        WHERE "Tag"."blogId" = $1
      )
      WHERE a."blogId" = $1 AND a.published = $2
    `;

    const params = [parseInt(blogId as string), published === 'true'];
    let paramIndex = 3;

    if (categorySlug) {
      query += ` AND c.slug = $${paramIndex}`;
      params.push(categorySlug as string);
      paramIndex++;
    }

    if (tagSlug) {
      query += ` AND EXISTS (
        SELECT 1 FROM "Tag" t2 
        WHERE t2.slug = $${paramIndex} AND t2."blogId" = $1
      )`;
      params.push(tagSlug as string);
      paramIndex++;
    }

    query += `
      GROUP BY a.id, au.id, c.id
      ORDER BY a.date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await blogDbPool.query(query, params);
    const articles = result.rows;

    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/blog/articles/:slug - Buscar artigo por slug
router.get('/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { blogId = '3' } = req.query;

    const query = `
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.description,
        a.content,
        a."imageUrl",
        a.keywords,
        a.published,
        a."viewCount",
        a."likeCount",
        a.date,
        a."createdAt",
        a."updatedAt",
        json_build_object(
          'id', au.id,
          'name', au.name,
          'role', au.role,
          'imageUrl', au."imageUrl",
          'bio', au.bio,
          'email', au.email,
          'website', au.website
        ) as author,
        json_build_object(
          'id', c.id,
          'title', c.title,
          'slug', c.slug,
          'description', c.description
        ) as category,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'slug', t.slug,
              'color', t.color
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as tags
      FROM "Article" a
      LEFT JOIN "Author" au ON a."authorId" = au.id
      LEFT JOIN "Category" c ON a."categoryId" = c.id
      LEFT JOIN "Tag" t ON t.id IN (
        SELECT "Tag".id FROM "Tag" 
        WHERE "Tag"."blogId" = $1
      )
      WHERE a.slug = $2 AND a."blogId" = $1 AND a.published = true
      GROUP BY a.id, au.id, c.id
    `;

    const result = await blogDbPool.query(query, [parseInt(blogId as string), slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// POST /api/blog/articles/:id/view - Incrementar visualizações
router.post('/articles/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const { blogId = '3' } = req.body;

    await blogPrisma.article.update({
      where: {
        id: parseInt(id),
        blogId: parseInt(blogId),
      },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    res.status(500).json({ error: 'Failed to increment view count' });
  }
});

// GET /api/blog/categories - Listar categorias
router.get('/categories', async (req, res) => {
  try {
    const { blogId = '3' } = req.query;

    const query = `
      SELECT 
        id,
        title,
        slug,
        description,
        "imageUrl",
        "createdAt",
        "updatedAt"
      FROM "Category"
      WHERE "blogId" = $1
      ORDER BY title ASC
    `;

    const result = await blogDbPool.query(query, [parseInt(blogId as string)]);
    const categories = result.rows;

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/blog/articles/search - Buscar artigos
router.get('/articles/search', async (req, res) => {
  try {
    const { blogId = '3', search = '' } = req.query;

    if (!search || typeof search !== 'string') {
      return res.json([]);
    }

    const articles = await blogPrisma.article.findMany({
      where: {
        blogId: parseInt(blogId as string),
        published: true,
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { keywords: { has: search } },
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            imageUrl: true,
            bio: true,
            email: true,
            website: true
          }
        },
        category: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true
          }
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true
          }
        },
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    res.json(articles);
  } catch (error) {
    console.error('Error searching articles:', error);
    res.status(500).json({ error: 'Failed to search articles' });
  }
});

// GET /api/blog/tags - Listar tags
router.get('/tags', async (req, res) => {
  try {
    const { blogId = '3' } = req.query;

    const tags = await blogPrisma.tag.findMany({
      where: {
        blogId: parseInt(blogId as string)
      },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        _count: {
          select: {
            articles: true
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    // Transform to include count
    const tagsWithCount = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      count: tag._count.articles
    }));

    res.json(tagsWithCount);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/blog/authors - Listar autores
router.get('/authors', async (req, res) => {
  try {
    const { blogId = '3' } = req.query;

    const authors = await blogPrisma.author.findMany({
      where: {
        blogId: parseInt(blogId as string)
      },
      select: {
        id: true,
        name: true,
        role: true,
        imageUrl: true,
        bio: true,
        email: true,
        website: true,
        social: true,
        skills: true,
        _count: {
          select: {
            articles: true
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    res.json(authors);
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
});

export default router;

import { Router } from 'express';
import { BlogPrismaService } from '../services/blogPrismaService';

const router = Router();
const blogService = new BlogPrismaService();

/**
 * GET /api/blog/posts
 * Listar artigos com paginação e filtros
 */
router.get('/posts', async (req, res) => {
  try {
    const { page, limit, category, search, featured } = req.query;
    
    const result = await blogService.getPosts({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      category: category as string,
      search: search as string,
      featured: featured === 'true'
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Erro na rota de artigos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * GET /api/blog/posts/featured
 * Buscar artigos em destaque
 */
router.get('/posts/featured', async (req, res) => {
  try {
    const result = await blogService.getFeaturedPosts();

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Erro na rota de artigos em destaque:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * GET /api/blog/posts/:slug
 * Buscar artigo por slug
 */
router.get('/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await blogService.getPostBySlug(slug);

    if (!result.success) {
      const statusCode = result.error === 'Artigo não encontrado' ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Erro na rota de artigo por slug:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * GET /api/blog/categories
 * Listar categorias
 */
router.get('/categories', async (req, res) => {
  try {
    const result = await blogService.getCategories();

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Erro na rota de categorias:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * GET /api/blog/categories/:slug/posts
 * Buscar artigos por categoria
 */
router.get('/categories/:slug/posts', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page, limit } = req.query;
    
    const result = await blogService.getPostsByCategory(
      slug, 
      page ? parseInt(page as string) : 1, 
      limit ? parseInt(limit as string) : 10
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Erro na rota de artigos por categoria:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * GET /api/blog/tags
 * Listar tags
 */
router.get('/tags', async (req, res) => {
  try {
    const result = await blogService.getTags();

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Erro na rota de tags:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * GET /api/blog/tags/:slug/posts
 * Buscar artigos por tag
 */
router.get('/tags/:slug/posts', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page, limit } = req.query;
    
    const result = await blogService.getPostsByTag(
      slug, 
      page ? parseInt(page as string) : 1, 
      limit ? parseInt(limit as string) : 10
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Erro na rota de artigos por tag:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * GET /api/blog/posts/:id/comments
 * Buscar comentários de um artigo
 */
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const articleId = parseInt(id);
    
    if (isNaN(articleId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID do artigo inválido' 
      });
    }
    
    const result = await blogService.getPostComments(articleId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Erro na rota de comentários:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

/**
 * GET /api/blog/health
 * Health check para o blog
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Blog API funcionando!',
    timestamp: new Date().toISOString()
  });
});

export default router;
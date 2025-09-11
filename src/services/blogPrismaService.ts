import { prismaBlog } from '../prisma';
import { supabaseBlog } from '../lib/supabaseBlog';
import { BlogPost, BlogCategory, BlogAuthor, BlogTag, BlogComment } from '../types/blog';

// Usa a instância singleton do Prisma Client para o blog
const blogPrisma = prismaBlog;

export class BlogPrismaService {
  private readonly BLOG_ID = 3; // ID do blog VibesFilm

  /**
   * Buscar artigos do blog com paginação e filtros
   */
  async getPosts(options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    featured?: boolean;
  } = {}) {
    try {
      const { page = 1, limit = 10, category, search, featured } = options;
      const offset = (page - 1) * limit;

      // Construir query SQL
      let whereClause = `WHERE a."blogId" = ${this.BLOG_ID} AND a.published = true`;
      let orderClause = featured ? 'ORDER BY a."viewCount" DESC' : 'ORDER BY a.date DESC';

      if (category) {
        whereClause += ` AND c.slug = '${category}'`;
      }

      if (search) {
        whereClause += ` AND (a.title ILIKE '%${search}%' OR a.description ILIKE '%${search}%')`;
      }

      const query = `
        SELECT 
          a.id,
          a.title,
          a.content,
          a.description,
          a.date,
          a."imageUrl",
          a."imageAlt",
          a.published,
          a."viewCount",
          a."likeCount",
          a."createdAt",
          a."updatedAt",
          a.slug,
          a."blogId",
          au.id as author_id,
          au.name as author_name,
          au.role as author_role,
          au."imageUrl" as author_image,
          au.bio as author_bio,
          c.id as category_id,
          c.title as category_title,
          c.slug as category_slug,
          c.description as category_description,
          c."imageUrl" as category_image
        FROM "Article" a
        LEFT JOIN "Author" au ON a."authorId" = au.id
        LEFT JOIN "Category" c ON a."categoryId" = c.id
        ${whereClause}
        ${orderClause}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM "Article" a
        LEFT JOIN "Category" c ON a."categoryId" = c.id
        ${whereClause}
      `;

      const [articles, countResult] = await Promise.all([
        blogPrisma.$queryRawUnsafe(query),
        blogPrisma.$queryRawUnsafe(countQuery)
      ]);

      const totalCount = (countResult as any)[0]?.total || 0;

      return {
        success: true,
        data: { articles },
        pagination: {
          page,
          limit,
          total: parseInt(totalCount),
          totalPages: Math.ceil(parseInt(totalCount) / limit)
        }
      };
    } catch (error: any) {
      console.error('Erro ao buscar artigos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar artigo por slug
   */
  async getPostBySlug(slug: string) {
    try {
      // Primeiro, buscar o artigo
      const articleQuery = `
        SELECT 
          a.id,
          a.title,
          a.content,
          a.description,
          a.date,
          a."imageUrl",
          a."imageAlt",
          a.published,
          a."viewCount",
          a."likeCount",
          a."createdAt",
          a."updatedAt",
          a.slug,
          a."blogId",
          au.id as author_id,
          au.name as author_name,
          au.role as author_role,
          au."imageUrl" as author_image,
          au.bio as author_bio,
          c.id as category_id,
          c.title as category_title,
          c.slug as category_slug,
          c.description as category_description,
          c."imageUrl" as category_image
        FROM "Article" a
        LEFT JOIN "Author" au ON a."authorId" = au.id
        LEFT JOIN "Category" c ON a."categoryId" = c.id
        WHERE a."blogId" = ${this.BLOG_ID} AND a.published = true AND a.slug = '${slug}'
        LIMIT 1
      `;

      const articles = await blogPrisma.$queryRawUnsafe(articleQuery);
      const article = (articles as any)[0];

      if (!article) {
        return {
          success: false,
          error: 'Artigo não encontrado'
        };
      }

      // Buscar as tags do artigo
      const tagsQuery = `
        SELECT 
          t.id,
          t.name,
          t.slug,
          t.color
        FROM "Tag" t
        INNER JOIN "_ArticleToTag" att ON t.id = att."B"
        WHERE att."A" = ${article.id}
        ORDER BY t.name ASC
      `;

      const tags = await blogPrisma.$queryRawUnsafe(tagsQuery);

      // Adicionar as tags ao artigo
      article.tags = tags;

      return {
        success: true,
        data: article
      };
    } catch (error: any) {
      console.error('Erro ao buscar artigo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar categorias do blog
   */
  async getCategories() {
    try {
      const query = `
        SELECT 
          c.id,
          c.title,
          c.slug,
          c.description,
          c."imageUrl",
          c."createdAt",
          c."updatedAt",
          c."blogId",
          COUNT(a.id)::int as article_count
        FROM "Category" c
        LEFT JOIN "Article" a ON c.id = a."categoryId" AND a.published = true
        WHERE c."blogId" = ${this.BLOG_ID}
        GROUP BY c.id, c.title, c.slug, c.description, c."imageUrl", c."createdAt", c."updatedAt", c."blogId"
        ORDER BY c.title ASC
      `;

      const categories = await blogPrisma.$queryRawUnsafe(query);

      return {
        success: true,
        data: categories
      };
    } catch (error: any) {
      console.error('Erro ao buscar categorias:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar tags do blog
   */
  async getTags() {
    try {
      const { data: tags, error } = await supabaseBlog
        .from('Tag')
        .select(`
          id,
          name,
          slug,
          color,
          blogId,
          createdAt,
          updatedAt
        `)
        .eq('blogId', this.BLOG_ID)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      // Buscar contagem de artigos para cada tag
      const tagsWithCount = await Promise.all(
        (tags || []).map(async (tag) => {
          const { count } = await supabaseBlog
            .from('_ArticleToTag')
            .select('*', { count: 'exact', head: true })
            .eq('B', tag.id);

          return {
            ...tag,
            articleCount: count || 0
          };
        })
      );

      return {
        success: true,
        data: tagsWithCount
      };
    } catch (error: any) {
      console.error('Erro ao buscar tags:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar artigos em destaque
   */
  async getFeaturedPosts() {
    try {
      const query = `
        SELECT 
          a.id,
          a.title,
          a.content,
          a.description,
          a.date,
          a."imageUrl",
          a."imageAlt",
          a.published,
          a."viewCount",
          a."likeCount",
          a."createdAt",
          a."updatedAt",
          a.slug,
          a."blogId",
          au.id as author_id,
          au.name as author_name,
          au.role as author_role,
          au."imageUrl" as author_image,
          au.bio as author_bio,
          c.id as category_id,
          c.title as category_title,
          c.slug as category_slug,
          c.description as category_description,
          c."imageUrl" as category_image
        FROM "Article" a
        LEFT JOIN "Author" au ON a."authorId" = au.id
        LEFT JOIN "Category" c ON a."categoryId" = c.id
        WHERE a."blogId" = ${this.BLOG_ID} AND a.published = true
        ORDER BY a."viewCount" DESC
        LIMIT 3
      `;

      const articles = await blogPrisma.$queryRawUnsafe(query);

      return {
        success: true,
        data: articles
      };
    } catch (error: any) {
      console.error('Erro ao buscar artigos em destaque:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar artigos por categoria
   */
  async getPostsByCategory(categorySlug: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      // Buscar artigos da categoria
      const { data: articles, error: articlesError } = await supabaseBlog
        .from('Article')
        .select(`
          id,
          title,
          slug,
          content,
          description,
          imageUrl,
          imageAlt,
          date,
          published,
          readingTime,
          authorId,
          categoryId,
          blogId,
          Author!inner(id, name, image),
          Category!inner(id, title, slug, description, image),
          _ArticleToTag(
            Tag(id, name, slug, color)
          )
        `)
        .eq('blogId', this.BLOG_ID)
        .eq('published', true)
        .eq('Category.slug', categorySlug)
        .order('date', { ascending: false })
        .range(skip, skip + limit - 1);

      if (articlesError) {
        throw articlesError;
      }

      // Buscar contagem total
      const { count, error: countError } = await supabaseBlog
        .from('Article')
        .select('*', { count: 'exact', head: true })
        .eq('blogId', this.BLOG_ID)
        .eq('published', true)
        .eq('Category.slug', categorySlug);

      if (countError) {
        throw countError;
      }

      // Processar dados para o formato esperado
      const processedArticles = (articles || []).map((article: any) => ({
        ...article,
        author_name: Array.isArray(article.Author) ? article.Author[0]?.name : article.Author?.name,
        author_image: Array.isArray(article.Author) ? article.Author[0]?.image : article.Author?.image,
        category_title: Array.isArray(article.Category) ? article.Category[0]?.title : article.Category?.title,
        category_slug: Array.isArray(article.Category) ? article.Category[0]?.slug : article.Category?.slug,
        category_description: Array.isArray(article.Category) ? article.Category[0]?.description : article.Category?.description,
        category_image: Array.isArray(article.Category) ? article.Category[0]?.image : article.Category?.image,
        tags: article._ArticleToTag?.map((at: any) => at.Tag) || []
      }));

      return {
        success: true,
        data: { articles: processedArticles },
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error: any) {
      console.error('Erro ao buscar artigos por categoria:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar artigos por tag
   */
  async getPostsByTag(tagSlug: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      // Query para buscar artigos por tag
      const articlesQuery = `
        SELECT 
          a.id,
          a.title,
          a.content,
          a.description,
          a.date,
          a."imageUrl",
          a."imageAlt",
          a.published,
          a."viewCount",
          a."likeCount",
          a."createdAt",
          a."updatedAt",
          a.slug,
          a."blogId",
          au.id as author_id,
          au.name as author_name,
          au.role as author_role,
          au."imageUrl" as author_image,
          au.bio as author_bio,
          c.id as category_id,
          c.title as category_title,
          c.slug as category_slug,
          c.description as category_description,
          c."imageUrl" as category_image
        FROM "Article" a
        LEFT JOIN "Author" au ON a."authorId" = au.id
        LEFT JOIN "Category" c ON a."categoryId" = c.id
        INNER JOIN "_ArticleToTag" att ON a.id = att."A"
        INNER JOIN "Tag" t ON att."B" = t.id
        WHERE a."blogId" = ${this.BLOG_ID} 
          AND a.published = true 
          AND t.slug = '${tagSlug}'
        ORDER BY a.date DESC
        LIMIT ${limit} OFFSET ${skip}
      `;

      // Query para contar total de artigos
      const countQuery = `
        SELECT COUNT(DISTINCT a.id)::int as total
        FROM "Article" a
        INNER JOIN "_ArticleToTag" att ON a.id = att."A"
        INNER JOIN "Tag" t ON att."B" = t.id
        WHERE a."blogId" = ${this.BLOG_ID} 
          AND a.published = true 
          AND t.slug = '${tagSlug}'
      `;

      const [articles, countResult] = await Promise.all([
        blogPrisma.$queryRawUnsafe(articlesQuery),
        blogPrisma.$queryRawUnsafe(countQuery)
      ]);

      const totalCount = (countResult as any)[0]?.total || 0;

      return {
        success: true,
        data: { articles },
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error: any) {
      console.error('Erro ao buscar artigos por tag:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar comentários de um artigo
   */
  async getPostComments(articleId: number) {
    try {
      const { data: comments, error } = await supabaseBlog
        .from('Comment')
        .select(`
          id,
          content,
          createdAt,
          updatedAt,
          articleId,
          authorId,
          userId,
          approved,
          parentId,
          ipAddress,
          aiGenerated,
          aiModel,
          blogId,
          Author(id, name, image),
          User(id, name, email)
        `)
        .eq('articleId', articleId)
        .eq('blogId', this.BLOG_ID)
        .eq('approved', true)
        .order('createdAt', { ascending: true });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: comments || []
      };
    } catch (error: any) {
      console.error('Erro ao buscar comentários:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

import { supabaseBlog, BlogPost, BlogAuthor, BlogCategory, BlogTag, BlogComment, BlogApiResponse } from '../lib/supabaseBlog';

export class BlogService {
  private readonly BLOG_ID = 3; // ID do blog VibesFilm (baseado no simple-server.js)

  /**
   * Buscar artigos do blog com paginação e filtros
   */
  async getPosts(options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    featured?: boolean;
  } = {}): Promise<BlogApiResponse<{ articles: BlogPost[] }>> {
    try {
      const { page = 1, limit = 10, category, search, featured } = options;
      const offset = (page - 1) * limit;

      // Construir query base
      let query = supabaseBlog
        .from('Article')
        .select(`
          *,
          author:Author(*),
          category:Category(*),
          tags:Tag(*)
        `)
        .eq('blogId', this.BLOG_ID)
        .eq('published', true);

      // Aplicar filtros
      if (category) {
        query = query.eq('category.slug', category);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (featured !== undefined) {
        // Assumindo que artigos em destaque são os mais visualizados
        if (featured) {
          query = query.order('viewCount', { ascending: false });
        } else {
          query = query.order('date', { ascending: false });
        }
      } else {
        query = query.order('date', { ascending: false });
      }

      // Aplicar paginação
      query = query.range(offset, offset + limit - 1);

      const { data: articles, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar artigos:', error);
        return { success: false, error: 'Erro ao buscar artigos' };
      }

      return {
        success: true,
        data: { articles: articles || [] },
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Erro no serviço de artigos:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  /**
   * Buscar artigo por slug
   */
  async getPostBySlug(slug: string): Promise<BlogApiResponse<{ article: BlogPost }>> {
    try {
      const { data: article, error } = await supabaseBlog
        .from('Article')
        .select(`
          *,
          author:Author(*),
          category:Category(*),
          tags:Tag(*)
        `)
        .eq('blogId', this.BLOG_ID)
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Artigo não encontrado' };
        }
        console.error('Erro ao buscar artigo:', error);
        return { success: false, error: 'Erro ao buscar artigo' };
      }

      // Incrementar visualizações
      await this.incrementViewCount(article.id);

      return {
        success: true,
        data: { article }
      };
    } catch (error) {
      console.error('Erro no serviço de artigo:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  /**
   * Buscar categorias do blog
   */
  async getCategories(): Promise<BlogApiResponse<{ categories: BlogCategory[] }>> {
    try {
      const { data: categories, error } = await supabaseBlog
        .from('Category')
        .select(`
          *,
          articles:Article!inner(count)
        `)
        .eq('blogId', this.BLOG_ID)
        .eq('articles.published', true)
        .order('title', { ascending: true });

      if (error) {
        console.error('Erro ao buscar categorias:', error);
        return { success: false, error: 'Erro ao buscar categorias' };
      }

      return {
        success: true,
        data: { categories: categories || [] }
      };
    } catch (error) {
      console.error('Erro no serviço de categorias:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  /**
   * Buscar tags do blog
   */
  async getTags(): Promise<BlogApiResponse<{ tags: BlogTag[] }>> {
    try {
      const { data: tags, error } = await supabaseBlog
        .from('Tag')
        .select(`
          *,
          articles:Article!inner(count)
        `)
        .eq('blogId', this.BLOG_ID)
        .eq('articles.published', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar tags:', error);
        return { success: false, error: 'Erro ao buscar tags' };
      }

      return {
        success: true,
        data: { tags: tags || [] }
      };
    } catch (error) {
      console.error('Erro no serviço de tags:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  /**
   * Buscar artigos em destaque
   */
  async getFeaturedPosts(limit: number = 3): Promise<BlogApiResponse<{ articles: BlogPost[] }>> {
    try {
      const { data: articles, error } = await supabaseBlog
        .from('Article')
        .select(`
          *,
          author:Author(*),
          category:Category(*),
          tags:Tag(*)
        `)
        .eq('blogId', this.BLOG_ID)
        .eq('published', true)
        .order('viewCount', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar artigos em destaque:', error);
        return { success: false, error: 'Erro ao buscar artigos em destaque' };
      }

      return {
        success: true,
        data: { articles: articles || [] }
      };
    } catch (error) {
      console.error('Erro no serviço de artigos em destaque:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  /**
   * Buscar comentários de um artigo
   */
  async getPostComments(articleId: number): Promise<BlogApiResponse<{ comments: BlogComment[] }>> {
    try {
      const { data: comments, error } = await supabaseBlog
        .from('Comment')
        .select(`
          *,
          author:Author(*),
          user:User(*)
        `)
        .eq('articleId', articleId)
        .eq('approved', true)
        .order('createdAt', { ascending: true });

      if (error) {
        console.error('Erro ao buscar comentários:', error);
        return { success: false, error: 'Erro ao buscar comentários' };
      }

      return {
        success: true,
        data: { comments: comments || [] }
      };
    } catch (error) {
      console.error('Erro no serviço de comentários:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  /**
   * Incrementar contador de visualizações
   */
  private async incrementViewCount(articleId: number): Promise<void> {
    try {
      await supabaseBlog
        .from('Article')
        .update({ viewCount: (supabaseBlog as any).raw('viewCount + 1') })
        .eq('id', articleId);
    } catch (error) {
      console.error('Erro ao incrementar visualizações:', error);
      // Não falhar a operação principal por causa disso
    }
  }

  /**
   * Buscar artigos por categoria
   */
  async getPostsByCategory(categorySlug: string, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<BlogApiResponse<{ articles: BlogPost[] }>> {
    return this.getPosts({ ...options, category: categorySlug });
  }

  /**
   * Buscar artigos por tag
   */
  async getPostsByTag(tagSlug: string, options: {
    page?: number;
    limit?: number;
  } = {}): Promise<BlogApiResponse<{ articles: BlogPost[] }>> {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const { data: articles, error, count } = await supabaseBlog
        .from('Article')
        .select(`
          *,
          author:Author(*),
          category:Category(*),
          tags:Tag!inner(*)
        `)
        .eq('blogId', this.BLOG_ID)
        .eq('published', true)
        .eq('tags.slug', tagSlug)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Erro ao buscar artigos por tag:', error);
        return { success: false, error: 'Erro ao buscar artigos por tag' };
      }

      return {
        success: true,
        data: { articles: articles || [] },
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Erro no serviço de artigos por tag:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  }
}

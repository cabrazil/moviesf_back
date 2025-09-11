import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase para o Blog
const supabaseBlogUrl = process.env.SUPABASE_BLOG_URL;
const supabaseBlogKey = process.env.SUPABASE_BLOG_SERVICE_KEY;

if (!supabaseBlogUrl || !supabaseBlogKey) {
  throw new Error('Variáveis de ambiente do Supabase Blog não configuradas');
}

// Cliente Supabase para o Blog
export const supabaseBlog = createClient(supabaseBlogUrl, supabaseBlogKey);

// Tipos TypeScript baseados no schema do blog
export interface BlogPost {
  id: number;
  title: string;
  content: string;
  description: string;
  date: string;
  imageUrl: string;
  imageAlt?: string;
  createdAt: string;
  updatedAt: string;
  categoryId: number;
  authorId: number;
  userId?: number;
  slug: string;
  published: boolean;
  viewCount: number;
  likeCount: number;
  metadata?: any;
  keywords: string[];
  aiConfidence?: number;
  aiGenerated: boolean;
  aiModel?: string;
  aiPrompt?: string;
  blogId: number;
  author: BlogAuthor;
  category: BlogCategory;
  tags: BlogTag[];
}

export interface BlogAuthor {
  id: number;
  name: string;
  role: string;
  imageUrl: string;
  bio?: string;
  signature?: string;
  createdAt: string;
  updatedAt: string;
  email?: string;
  website?: string;
  social?: any;
  skills: string[];
  aiModel?: string;
  isAi: boolean;
  blogId: number;
}

export interface BlogCategory {
  id: number;
  title: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  aiKeywords: string[];
  aiPrompt?: string;
  blogId: number;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  aiRelated: boolean;
  blogId: number;
}

export interface BlogComment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  articleId: number;
  authorId?: number;
  userId?: number;
  approved: boolean;
  parentId?: number;
  ipAddress?: string;
  aiGenerated: boolean;
  aiModel?: string;
  blogId: number;
  author?: BlogAuthor;
  user?: any;
}

// Tipos para respostas da API
export interface BlogApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

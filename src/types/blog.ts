export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  description?: string;
  excerpt?: string;
  imageUrl?: string;
  imageAlt?: string;
  featuredImage?: string;
  date: string;
  published: boolean;
  readingTime?: number;
  authorId: number;
  categoryId: number;
  blogId: number;
  author_name?: string;
  author_image?: string;
  category_title?: string;
  category_slug?: string;
  category_description?: string;
  category_image?: string;
  tags?: BlogTag[];
}

export interface BlogCategory {
  id: number;
  title: string;
  name?: string;
  slug: string;
  description?: string;
  image?: string;
  color?: string;
  blogId: number;
}

export interface BlogAuthor {
  id: number;
  name: string;
  email?: string;
  image?: string;
  bio?: string;
  blogId: number;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
  color?: string;
  blogId: number;
}

export interface BlogComment {
  id: number;
  content: string;
  authorName: string;
  authorEmail: string;
  date: string;
  approved: boolean;
  articleId: number;
  blogId: number;
}

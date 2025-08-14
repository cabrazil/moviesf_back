import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Gera um slug a partir de um título
 * @param title - Título do filme
 * @returns Slug formatado
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim();
}

/**
 * Gera um slug único verificando se já existe no banco
 * @param title - Título do filme
 * @returns Slug único
 */
export async function generateUniqueSlug(title: string): Promise<string> {
  let slug = generateSlug(title);
  let counter = 1;
  
  // Verificar se o slug existe usando Prisma (sem o campo slug por enquanto)
  while (true) {
    const existingMovie = await prisma.movie.findFirst({
      where: { 
        title: {
          contains: slug.replace(/-/g, ' '),
          mode: 'insensitive'
        }
      }
    });
    if (!existingMovie) {
      break;
    }
    slug = `${generateSlug(title)}-${counter}`;
    counter++;
  }
  
  return slug;
}

/**
 * Gera URL amigável para filme
 * @param movie - Objeto do filme com título e ano
 * @returns URL formatada
 */
export function generateMovieUrl(movie: { title: string; year?: number; tmdbId?: number }): string {
  const slug = generateSlug(movie.title);
  return `/filme/${slug}`;
}

/**
 * Gera URL amigável para sentimento
 * @param sentiment - Nome do sentimento
 * @returns URL formatada
 */
export function generateSentimentUrl(sentiment: string): string {
  const slug = generateSlug(sentiment);
  return `/sentimentos/${slug}`;
}

/**
 * Gera URL amigável para jornada
 * @param journey - Nome da jornada
 * @returns URL formatada
 */
export function generateJourneyUrl(journey: string): string {
  const slug = generateSlug(journey);
  return `/jornadas/${slug}`;
}

/**
 * Valida se um slug é válido
 * @param slug - Slug a ser validado
 * @returns true se válido, false caso contrário
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]+$/;
  return slugRegex.test(slug) && slug.length > 0 && slug.length <= 255;
}

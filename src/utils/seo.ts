// ===============================================
// UTILITÁRIOS PARA SEO E URLS AMIGÁVEIS
// ===============================================

/**
 * Gera slug amigável para SEO
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim()
    .replace(/^-|-$/g, ''); // Remove hífens no início e fim
}

/**
 * Gera URL amigável para filme (estrutura JustWatch)
 */
export function generateMovieUrl(movie: { title: string; year?: number; tmdbId?: number }): string {
  const slug = generateSlug(movie.title);
  return `/filme/${slug}`;
}

/**
 * Gera URL amigável para sentimento
 */
export function generateSentimentUrl(sentiment: { name: string; id: number }): string {
  const slug = generateSlug(sentiment.name);
  return `/sentimentos/${slug}`;
}

/**
 * Gera URL amigável para jornada
 */
export function generateJourneyUrl(journey: { mainSentiment: { name: string }; id: number }): string {
  const slug = generateSlug(journey.mainSentiment.name);
  return `/jornadas/${slug}`;
}

/**
 * Gera título SEO para página de filme
 */
export function generateMovieSEOTitle(movie: { title: string; year?: number }): string {
  const year = movie.year ? ` (${movie.year})` : '';
  return `Onde Assistir ${movie.title}${year} - Streaming + Análise Emocional`;
}

/**
 * Gera descrição SEO para página de filme
 */
export function generateMovieSEODescription(
  movie: { title: string; year?: number; description?: string },
  platforms: string[],
  sentiments: string[]
): string {
  const year = movie.year ? ` (${movie.year})` : '';
  const platformText = platforms.length > 0 ? ` Disponível em ${platforms.join(', ')}.` : '';
  const sentimentText = sentiments.length > 0 ? ` Análise emocional: ${sentiments.join(', ')}.` : '';
  
  return `Descubra onde assistir ${movie.title}${year} online.${platformText}${sentimentText} Experimente nossa jornada emocional personalizada.`;
}

/**
 * Gera título SEO para página de sentimento
 */
export function generateSentimentSEOTitle(sentiment: { name: string }): string {
  return `Filmes para Quando Estou ${sentiment.name} - Recomendações Emocionais`;
}

/**
 * Gera descrição SEO para página de sentimento
 */
export function generateSentimentSEODescription(
  sentiment: { name: string; description?: string },
  movieCount: number
): string {
  const baseDesc = `Descubra os melhores filmes para quando você está ${sentiment.name.toLowerCase()}.`;
  const countDesc = `${movieCount} filmes cuidadosamente selecionados para sua jornada emocional.`;
  const ctaDesc = `Experimente nossa análise personalizada e encontre o filme perfeito para seu momento.`;
  
  return `${baseDesc} ${countDesc} ${ctaDesc}`;
}

/**
 * Gera título SEO para página de jornada
 */
export function generateJourneySEOTitle(journey: { mainSentiment: { name: string } }): string {
  return `Jornada Emocional: Como Lidar com ${journey.mainSentiment.name} - Filmes e Reflexões`;
}

/**
 * Gera descrição SEO para página de jornada
 */
export function generateJourneySEODescription(
  journey: { mainSentiment: { name: string; description?: string } }
): string {
  const baseDesc = `Jornada emocional personalizada para quando você está ${journey.mainSentiment.name.toLowerCase()}.`;
  const processDesc = `Descubra filmes, reflexões e exercícios para processar e transformar seus sentimentos.`;
  const ctaDesc = `Inicie sua jornada de autoconhecimento através do cinema.`;
  
  return `${baseDesc} ${processDesc} ${ctaDesc}`;
}

/**
 * Gera keywords para SEO
 */
export function generateKeywords(
  baseKeywords: string[],
  additionalKeywords: string[] = []
): string[] {
  const defaultKeywords = [
    'filmes',
    'streaming',
    'onde assistir',
    'recomendações',
    'jornada emocional',
    'cinema',
    'análise emocional'
  ];
  
  return [...new Set([...defaultKeywords, ...baseKeywords, ...additionalKeywords])];
}

/**
 * Gera metadados Open Graph
 */
export function generateOpenGraphData(
  title: string,
  description: string,
  image?: string,
  url?: string
) {
  return {
    'og:title': title,
    'og:description': description,
    'og:image': image || '/images/default-og.jpg',
    'og:url': url,
    'og:type': 'website',
    'og:site_name': 'Filmes Emocionais',
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': image || '/images/default-og.jpg'
  };
}

/**
 * Gera breadcrumbs para SEO
 */
export function generateBreadcrumbs(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url
    }))
  };
}

/**
 * Gera schema.org para filme
 */
export function generateMovieSchema(movie: {
  title: string;
  year?: number;
  description?: string;
  director?: string;
  vote_average?: number;
  thumbnail?: string;
  platforms: Array<{ streamingPlatform: { name: string } }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    'name': movie.title,
    'description': movie.description,
    'dateCreated': movie.year ? `${movie.year}-01-01` : undefined,
    'director': movie.director ? {
      '@type': 'Person',
      'name': movie.director
    } : undefined,
    'aggregateRating': movie.vote_average ? {
      '@type': 'AggregateRating',
      'ratingValue': movie.vote_average,
      'bestRating': 10
    } : undefined,
    'image': movie.thumbnail,
    'offers': movie.platforms.map(platform => ({
      '@type': 'Offer',
      'availability': 'https://schema.org/InStock',
      'seller': {
        '@type': 'Organization',
        'name': platform.streamingPlatform.name
      }
    }))
  };
}

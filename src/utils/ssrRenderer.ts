/**
 * 🎨 SSR Renderer - Utilitários para renderização Server-Side
 * 
 * Funções helper para gerar HTML com meta tags para SEO
 */

/**
 * Gera HTML completo para landing page de filme
 */
export function renderMovieHTML(movieData: any, slug: string): string {
  const { movie, subscriptionPlatforms = [], rentalPurchasePlatforms = [] } = movieData;
  
  // Gerar meta tags
  // Formato: "Filme (Ano): Onde assistir e Análise Emocional | Vibesfilm"
  // Para títulos longos, usar versão mais curta para evitar truncamento
  const baseTitle = `${movie.title}${movie.year ? ` (${movie.year})` : ''}`;
  const titleLength = baseTitle.length;
  
  // Se título do filme + ano > 40 caracteres, usar versão mais curta
  const title = titleLength > 40
    ? `${baseTitle}: Onde assistir | Vibesfilm`
    : `${baseTitle}: Onde assistir e Análise Emocional | Vibesfilm`;
  
  // Descrição otimizada
  let description = `Descubra onde assistir ${movie.title}${movie.year ? ` (${movie.year})` : ''}`;
  
  // Determinar tipos de acesso disponíveis
  const hasSubscription = subscriptionPlatforms.some((p: any) => 
    p.accessType === 'INCLUDED_WITH_SUBSCRIPTION'
  );
  const hasRentalPurchase = rentalPurchasePlatforms.length > 0;
  
  let availabilityText = '';
  if (hasSubscription && hasRentalPurchase) {
    availabilityText = ' Disponível em streaming e aluguel/compra.';
  } else if (hasSubscription) {
    availabilityText = ' Disponível em plataformas de streaming (teste gratuito para novos usuários).';
  } else if (hasRentalPurchase) {
    availabilityText = ' Disponível para aluguel e compra digital.';
  } else {
    availabilityText = ' Consulte as plataformas para disponibilidade.';
  }
  
  // Priorizar targetAudienceForLP (conteúdo emocional)
  if (movie.targetAudienceForLP) {
    const emotionalDesc = movie.targetAudienceForLP.length > 120 
      ? `${movie.targetAudienceForLP.substring(0, 120)}...` 
      : movie.targetAudienceForLP;
    description = `${description}. ${emotionalDesc}${availabilityText}`;
  } else if (movie.description) {
    const movieDesc = movie.description.length > 100 
      ? `${movie.description.substring(0, 100)}...` 
      : movie.description;
    description = `${description}. ${movieDesc}${availabilityText}`;
  } else {
    description = `${description}${availabilityText}`;
  }
  
  // Limitar descrição para SEO (160 caracteres)
  const seoDescription = description.length > 160 
    ? `${description.substring(0, 157)}...` 
    : description;
  
  // URL canônica
  const canonicalUrl = `https://vibesfilm.com/onde-assistir/${slug}`;
  
  // Schema.org JSON-LD
  const allPlatforms = [...subscriptionPlatforms, ...rentalPurchasePlatforms];
  
  // Remover plataformas duplicadas (mesmo nome)
  const uniquePlatforms = allPlatforms.reduce((acc: any[], platform: any) => {
    const exists = acc.find(p => p.name === platform.name);
    if (!exists) {
      acc.push(platform);
    }
    return acc;
  }, []);
  
  const offers = uniquePlatforms.map((platform: any) => ({
    "@type": "Offer",
    "availability": "https://schema.org/InStock",
    "url": platform.baseUrl || `https://${platform.name.toLowerCase().replace(/\s+/g, '')}.com`,
    "name": platform.name,
    "description": `Assistir ${movie.title} no ${platform.name}`
  }));
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": movie.title,
    "description": movie.description || seoDescription,
    "image": movie.thumbnail,
    "dateCreated": movie.year ? `${movie.year}-01-01` : undefined,
    "director": movie.director ? {
      "@type": "Person",
      "name": movie.director
    } : undefined,
    "genre": movie.genres?.join(', '),
    // AggregateRating: usar vote_average (TMDB) com vote_count
    // Google Rich Results REQUER ratingCount quando aggregateRating existe
    // Só incluir se tiver vote_average E vote_count válido (> 0)
    "aggregateRating": (movie.vote_average && movie.vote_count && movie.vote_count > 0) ? {
      "@type": "AggregateRating",
      "ratingValue": movie.vote_average,
      "bestRating": 10,
      "worstRating": 0,
      "ratingCount": movie.vote_count
    } : undefined,
    "offers": offers.length > 0 ? offers : undefined
  };
  
  // Gerar keywords
  const keywords = [
    movie.title,
    'streaming',
    'onde assistir',
    ...(movie.genres || []),
    'filmes online'
  ].join(', ');
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Meta tags básicas -->
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(seoDescription)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  
  <!-- URL canônica -->
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph tags -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:image" content="${movie.thumbnail || ''}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="vibesfilm">
  
  <!-- Twitter Card tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(seoDescription)}">
  <meta name="twitter:image" content="${movie.thumbnail || ''}">
  
  <!-- Schema.org markup -->
  <script type="application/ld+json">
    ${JSON.stringify(schema, null, 2)}
  </script>
  
  <!-- Meta tags adicionais -->
  <meta name="robots" content="index, follow">
  <meta name="author" content="vibesfilm">
  
  <!-- Redirect para SPA após carregar (para usuários) -->
  <script>
    // Se não for bot, redirecionar para frontend SPA
    if (!navigator.userAgent.match(/Googlebot|Bingbot|Slurp|facebookexternalhit|Twitterbot/i)) {
      window.location.href = 'https://vibesfilm.com/onde-assistir/${slug}';
    }
  </script>
</head>
<body>
  <div id="root">
    <h1>${escapeHtml(movie.title)}${movie.year ? ` (${movie.year})` : ''}</h1>
    <p>${escapeHtml(seoDescription)}</p>
    ${movie.description ? `<p>${escapeHtml(movie.description.substring(0, 500))}</p>` : ''}
    ${movie.thumbnail ? `<img src="${movie.thumbnail}" alt="${escapeHtml(movie.title)}" style="max-width: 100%; height: auto;">` : ''}
    <p>Plataformas disponíveis: ${uniquePlatforms.map((p: any) => p.name).join(', ')}</p>
  </div>
</body>
</html>`;
}

/**
 * Gera HTML completo para artigo do blog
 */
export function renderArticleHTML(article: any, slug: string, articleType: 'analise' | 'lista'): string {
  const route = `/${articleType}/${slug}`;
  const canonicalUrl = `https://vibesfilm.com${route}`;
  
  // Título e descrição
  const title = article.title || 'Artigo do VibesFilm Blog';
  const description = article.description || 
    (article.content ? article.content.replace(/<[^>]*>/g, '').substring(0, 160) : '');
  
  // Limitar para SEO
  const seoTitle = title.length > 60 ? `${title.substring(0, 57)}...` : title;
  const seoDescription = description.length > 160 
    ? `${description.substring(0, 157)}...` 
    : description;
  
  // Schema.org para artigo
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": seoDescription,
    "author": {
      "@type": "Person",
      "name": article.author_name || "VibesFilm Blog"
    },
    "publisher": {
      "@type": "Organization",
      "name": "VibesFilm",
      "logo": {
        "@type": "ImageObject",
        "url": "https://vibesfilm.com/logo.png"
      }
    }
  };
  
  if (article.imageUrl) {
    schema.image = {
      "@type": "ImageObject",
      "url": article.imageUrl,
      "caption": article.imageAlt || title
    };
  }
  
  if (article.date) {
    schema.datePublished = article.date;
    schema.dateModified = article.date;
  }
  
  if (article.category_title) {
    schema.articleSection = article.category_title;
  }
  
  if (article.tags && article.tags.length > 0) {
    schema.keywords = article.tags.map((tag: any) => tag.name).join(", ");
  }
  
  // Keywords
  const keywords = [
    title,
    article.category_title || '',
    'cinema',
    'filmes',
    'blog',
    ...(article.tags ? article.tags.map((tag: any) => tag.name) : [])
  ].filter(Boolean).join(', ');
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Meta tags básicas -->
  <title>${escapeHtml(seoTitle)} | VibesFilm Blog</title>
  <meta name="description" content="${escapeHtml(seoDescription)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  
  <!-- URL canônica -->
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph tags -->
  <meta property="og:title" content="${escapeHtml(seoTitle)}">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:image" content="${article.imageUrl || ''}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="VibesFilm Blog">
  
  <!-- Article specific Open Graph tags -->
  ${article.date ? `<meta property="article:published_time" content="${article.date}">` : ''}
  ${article.author_name ? `<meta property="article:author" content="${escapeHtml(article.author_name)}">` : ''}
  ${article.category_title ? `<meta property="article:section" content="${escapeHtml(article.category_title)}">` : ''}
  ${article.tags && article.tags.length > 0 ? article.tags.map((tag: any) => 
    `<meta property="article:tag" content="${escapeHtml(tag.name)}">`
  ).join('\n  ') : ''}
  
  <!-- Twitter Card tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(seoTitle)}">
  <meta name="twitter:description" content="${escapeHtml(seoDescription)}">
  <meta name="twitter:image" content="${article.imageUrl || ''}">
  <meta name="twitter:site" content="@vibesfilm">
  <meta name="twitter:creator" content="@vibesfilm">
  
  <!-- Schema.org markup -->
  <script type="application/ld+json">
    ${JSON.stringify(schema, null, 2)}
  </script>
  
  <!-- Meta tags adicionais -->
  <meta name="robots" content="index, follow">
  <meta name="author" content="${escapeHtml(article.author_name || 'VibesFilm Blog')}">
  
  <!-- Redirect para SPA após carregar (para usuários) -->
  <script>
    // Se não for bot, redirecionar para frontend SPA
    if (!navigator.userAgent.match(/Googlebot|Bingbot|Slurp|facebookexternalhit|Twitterbot/i)) {
      window.location.href = 'https://vibesfilm.com${route}';
    }
  </script>
</head>
<body>
  <div id="root">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(seoDescription)}</p>
    ${article.imageUrl ? `<img src="${article.imageUrl}" alt="${escapeHtml(article.imageAlt || title)}" style="max-width: 100%; height: auto;">` : ''}
    ${article.content ? `<div>${article.content.substring(0, 1000)}...</div>` : ''}
  </div>
</body>
</html>`;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Detecta se a requisição é de um bot
 */
export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return /Googlebot|Bingbot|Slurp|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Applebot/i.test(userAgent);
}


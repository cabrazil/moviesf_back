/**
 * 🎨 SSR Renderer - Utilitários para renderização Server-Side
 * 
 * Funções helper para gerar HTML com meta tags para SEO
 */

/**
 * Gera HTML completo para landing page de filme
 */
export function renderMovieHTML(
  movieData: any,
  slug: string,
  routeType: 'landing' | 'editorial' = 'landing'
): string {
  const { movie, subscriptionPlatforms = [], rentalPurchasePlatforms = [] } = movieData;
  const isEditorial = routeType === 'editorial';

  // Converter vote_count para número e validar
  let voteCount: number | null = null;

  // Debug: log SEMPRE (Vercel mostra console.log/warn/error)
  console.log(`🔍 [SSR] Filme ${movie.title} (${slug}):`, {
    vote_average: movie.vote_average,
    vote_count_raw: movie.vote_count,
    vote_count_type: typeof movie.vote_count,
    vote_count_null: movie.vote_count == null,
    vote_count_undefined: movie.vote_count === undefined
  });

  if (movie.vote_count != null && movie.vote_count !== undefined) {
    let parsed: number;

    if (typeof movie.vote_count === 'string') {
      parsed = parseInt(movie.vote_count, 10);
    } else if (typeof movie.vote_count === 'number') {
      parsed = movie.vote_count;
    } else {
      parsed = Number(movie.vote_count);
    }

    // Validar se é um número válido
    if (!isNaN(parsed) && Number.isFinite(parsed) && parsed > 0) {
      voteCount = parsed;
      console.log(`✅ [SSR] vote_count processado com sucesso: ${voteCount}`);
    } else {
      console.warn(`⚠️ [SSR] Filme ${movie.title}: vote_count inválido após conversão:`, parsed, `(original:`, movie.vote_count, `)`);
    }
  } else {
    console.warn(`⚠️ [SSR] Filme ${movie.title} (${slug}): vote_count está null/undefined`);
    console.warn(`   vote_count value:`, movie.vote_count, `typeof:`, typeof movie.vote_count);
    console.warn(`   movie keys disponíveis:`, Object.keys(movie).filter(k => k.includes('vote') || k.includes('rating')));
  }

  // Gerar meta tags
  // Formato: "Filme (Ano): Onde assistir e Análise Emocional | Vibesfilm"
  // Para títulos longos, usar versão mais curta para evitar truncamento
  const baseTitle = `${movie.title}${movie.year ? ` (${movie.year})` : ''}`;
  const titleLength = baseTitle.length;

  // Se título do filme + ano > 40 caracteres, usar versão mais curta
  const title = isEditorial
    ? `${baseTitle}: Análise e Onde Assistir | Vibesfilm`
    : titleLength > 40
      ? `${baseTitle}: Onde assistir | Vibesfilm`
      : `${baseTitle}: Onde assistir e Análise Emocional | Vibesfilm`;

  // Descrição otimizada
  let description = isEditorial
    ? `Análise e guia de onde assistir ${movie.title}${movie.year ? ` (${movie.year})` : ''}`
    : `Descubra onde assistir ${movie.title}${movie.year ? ` (${movie.year})` : ''}`;

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

  // URL canônica consolidada (Sempre usar /onde-assistir/ para evitar conteúdo duplicado)
  const routePath = `/onde-assistir/${slug}`;
  const canonicalUrl = `https://vibesfilm.com${routePath}`;

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

  // Função helper para remover campos undefined do objeto
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) return obj.map(removeUndefined).filter(item => item !== undefined);
    if (typeof obj !== 'object') return obj;

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  };

  const schema: any = {
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
    "offers": offers.length > 0 ? offers : undefined
  };

  // AggregateRating: SÓ incluir se tiver vote_average E vote_count válido (> 0)
  // Google Rich Results REQUER ratingCount quando aggregateRating existe
  if (movie.vote_average && voteCount && voteCount > 0 && !isNaN(voteCount)) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": movie.vote_average,
      "bestRating": 10,
      "worstRating": 0,
      "ratingCount": voteCount
    };
    console.log(`✅ [SSR] aggregateRating incluído para ${movie.title}: ratingCount=${voteCount}`);
  } else {
    // Log para debug quando aggregateRating NÃO é incluído
    if (movie.vote_average) {
      console.warn(`⚠️ [SSR] Filme ${movie.title} (${slug}): vote_average existe mas aggregateRating NÃO será incluído:`, {
        vote_average: movie.vote_average,
        vote_count_raw: movie.vote_count,
        vote_count_processed: voteCount,
        reason: !voteCount ? 'vote_count ausente' : voteCount <= 0 ? 'vote_count <= 0' : 'isNaN'
      });
    }
  }

  // Remover campos undefined antes de serializar
  const cleanedSchema = removeUndefined(schema);

  // Validação final: garantir que aggregateRating tenha ratingCount se existir
  if (cleanedSchema.aggregateRating) {
    if (!cleanedSchema.aggregateRating.ratingCount) {
      console.error(`❌ [SSR] ERRO CRÍTICO: aggregateRating sem ratingCount para ${movie.title}! Removendo aggregateRating.`);
      console.error(`   Schema antes da remoção:`, JSON.stringify(cleanedSchema.aggregateRating, null, 2));
      delete cleanedSchema.aggregateRating;
    } else {
      console.log(`✅ [SSR] aggregateRating válido para ${movie.title}: ratingCount=${cleanedSchema.aggregateRating.ratingCount}`);
    }
  } else {
    console.log(`ℹ️ [SSR] aggregateRating NÃO incluído para ${movie.title} (normal se não tiver vote_count válido)`);
  }

  // Gerar keywords
  const keywords = [
    movie.title,
    ...(isEditorial ? ['análise de filme'] : []),
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
  <meta property="og:type" content="${isEditorial ? 'article' : 'video.movie'}">
  <meta property="og:site_name" content="VibesFilm">
  <meta property="og:locale" content="pt_BR">
  
  <!-- Twitter Card tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(seoDescription)}">
  <meta name="twitter:image" content="${movie.thumbnail || ''}">
  <meta name="twitter:url" content="${canonicalUrl}">
  
  <!-- Schema.org markup -->
  <script type="application/ld+json">
    ${JSON.stringify(cleanedSchema, null, 2)}
  </script>
  
  <!-- Meta tags adicionais -->
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="author" content="vibesfilm">
  
  <!-- Redirect para SPA após carregar (para usuários) -->
  <script>
    // Se não for bot, redirecionar para frontend SPA
    if (!navigator.userAgent.match(/Googlebot|Bingbot|Slurp|facebookexternalhit|Twitterbot/i)) {
      window.location.href = 'https://vibesfilm.com${routePath}';
    }
  </script>
</head>
<body>
  <div id="root">
    <header>
      <h1>${escapeHtml(movie.title)}${movie.year ? ` (${movie.year})` : ''}</h1>
      <p><strong>${escapeHtml(seoDescription)}</strong></p>
    </header>

    <main>
      <section id="detalhes">
        <h2>Sobre o filme</h2>
        ${movie.description ? `<p>${escapeHtml(movie.description)}</p>` : ''}
        ${movie.thumbnail ? `<img src="${movie.thumbnail}" alt="${escapeHtml(movie.title)}" style="max-width: 300px; height: auto; border-radius: 8px;">` : ''}
      </section>

      <section id="onde-assistir">
        <h2>Onde assistir ${escapeHtml(movie.title)}</h2>
        <p>Disponível nas seguintes plataformas: ${uniquePlatforms.length > 0 ? uniquePlatforms.map((p: any) => p.name).join(', ') : 'Consulte disponibilidade local.'}</p>
      </section>

      ${movie.emotionalTags && movie.emotionalTags.length > 0 ? `
      <section id="vibe-emocional">
        <h2>Vibe e Sentimentos</h2>
        <ul>
          ${movie.emotionalTags.map((t: any) => `<li><strong>${escapeHtml(t.mainSentiment)}</strong>: ${escapeHtml(t.subSentiment)}</li>`).join('\n          ')}
        </ul>
      </section>` : ''}

      ${movie.oscarAwards && (movie.oscarAwards.totalWins > 0 || movie.oscarAwards.totalNominations > 0) ? `
      <section id="premios">
        <h2>Reconhecimentos e Prêmios</h2>
        <p>${movie.title} possui ${movie.oscarAwards.totalWins} vitórias e ${movie.oscarAwards.totalNominations} indicações ao Oscar.</p>
      </section>` : ''}

      ${movie.mainCast && movie.mainCast.length > 0 ? `
      <section id="elenco">
        <h2>Elenco Principal</h2>
        <ul>
          ${movie.mainCast.slice(0, 10).map((c: any) => `<li>${escapeHtml(c.actorName)} como ${escapeHtml(c.characterName)}</li>`).join('\n          ')}
        </ul>
      </section>` : ''}
      
      <section id="direcao">
        <p>Direção: ${escapeHtml(movie.director || 'Informação não disponível')}</p>
        <p>Gêneros: ${escapeHtml(movie.genres?.join(', ') || 'Informação não disponível')}</p>
      </section>
    </main>

    <footer>
      <p>Encontre o filme certo para o seu momento no VibesFilm.</p>
    </footer>
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

  // Função helper para remover campos undefined (reutilizar se já não existir)
  const removeUndefinedFromSchema = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) return obj.map(removeUndefinedFromSchema).filter(item => item !== undefined);
    if (typeof obj !== 'object') return obj;

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFromSchema(value);
      }
    }
    return cleaned;
  };

  // Schema.org para artigo
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": seoDescription,
    "author": {
      "@type": "Person",
      "name": article.author_name || "VibesFilm Blog",
      "url": "https://vibesfilm.com/blog"
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

  // Resolver data de publicação (pode vir como Date, string ou undefined)
  const rawDate = article.date || article.published_at || article.createdAt || article.created_at;
  const isoDate = rawDate
    ? (rawDate instanceof Date ? rawDate.toISOString() : new Date(rawDate).toISOString())
    : null;

  if (isoDate) {
    schema.datePublished = isoDate;
    schema.dateModified = isoDate;
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
    ${JSON.stringify(removeUndefinedFromSchema(schema), null, 2)}
  </script>
  
  <!-- Meta tags adicionais -->
  <meta name="robots" content="index, follow, max-image-preview:large">
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
    ${article.content ? `<div>${article.content}</div>` : ''}
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

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
  
  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6851520236157623"
       crossorigin="anonymous"></script>
  
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
  <meta name="robots" content="noindex, follow">
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
  
  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6851520236157623"
       crossorigin="anonymous"></script>
  
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
    ${(() => {
      if (!article.content) return '';
      let contentHtml = article.content;
      if (process.env.HIDE_MOVIE_HUB_LINKS === 'true') {
        contentHtml = contentHtml.replace(
          /<a\s+[^>]*href=["'](?:https?:\/\/(?:www\.)?vibesfilm\.com)?\/(filme|onde-assistir)\/[^"']*["'][^>]*>(.*?)<\/a>/gi,
          '$2'
        );
      }
      return `<div>${contentHtml}</div>`;
    })()}
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
 * Gera HTML completo para a página inicial (Home) do blog
 */
export function renderHomeHTML(posts: any[]): string {
  const title = "VibesFilm - Cada emoção tem um filme";
  const description = "O cinema é a bússola para o que você sente. Encontre o filme perfeito para a sua vibe atual, leia análises detalhadas e descubra onde assistir.";
  const canonicalUrl = "https://vibesfilm.com/";
  
  const postsHtml = posts.map((post: any) => {
    const isList = post.category_slug === 'lista' || post.type === 'lista';
    const postRoute = `/${isList ? 'lista' : 'analise'}/${post.slug}`;
    const postDate = post.date ? new Date(post.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : '';
    
    return `
      <article style="margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
        <h2><a href="${postRoute}" style="color: #011627; text-decoration: none;">${escapeHtml(post.title)}</a></h2>
        <p style="color: #666; font-size: 0.9rem;">Publicado em ${postDate} por ${escapeHtml(post.author_name || 'VibesFilm')}</p>
        ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${escapeHtml(post.imageAlt || post.title)}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0;">` : ''}
        <p>${escapeHtml(post.description || '')}</p>
        <a href="${postRoute}" style="font-weight: bold; color: #E91E63; text-decoration: none;">Ler análise completa →</a>
      </article>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6851520236157623"
       crossorigin="anonymous"></script>
  
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="VibesFilm">
  <meta property="og:locale" content="pt_BR">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  
  <meta name="robots" content="index, follow, max-image-preview:large">
  
  <script>
    // Se não for bot, redirecionar para o frontend SPA normal
    if (!navigator.userAgent.match(/Googlebot|Bingbot|Slurp|facebookexternalhit|Twitterbot|Mediapartners-Google|AdsBot-Google|Google-AdSense/i)) {
      window.location.href = '${canonicalUrl}';
    }
  </script>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #FDFFFC;">
  <header style="border-bottom: 2px solid #011627; padding-bottom: 20px; margin-bottom: 30px;">
    <h1 style="color: #011627; margin-bottom: 5px;">VibesFilm</h1>
    <p style="font-size: 1.1rem; color: #555; margin-top: 0;">Cada emoção tem um filme.</p>
    <nav>
      <a href="/" style="margin-right: 15px; font-weight: bold; color: #011627; text-decoration: none;">Blog Home</a>
      <a href="/sobre" style="margin-right: 15px; color: #555; text-decoration: none;">Sobre</a>
      <a href="/contato" style="margin-right: 15px; color: #555; text-decoration: none;">Contato</a>
      <a href="/privacidade" style="margin-right: 15px; color: #555; text-decoration: none;">Privacidade</a>
      <a href="/termos" style="color: #555; text-decoration: none;">Termos de Uso</a>
    </nav>
  </header>

  <main>
    <section id="apresentacao" style="margin-bottom: 40px; background-color: #f7f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #011627;">
      <h2>Descubra Filmes pela sua Vibe Emocional</h2>
      <p>O VibesFilm ajuda você a encontrar o filme perfeito com base no seu estado emocional atual e intenção (processar, transformar, manter ou explorar sentimentos). Conecte-se com narrativas de forma profunda.</p>
      <p><strong>Quer experimentar nossa ferramenta de recomendação personalizada?</strong> Acesse <a href="/app" style="color: #E91E63; font-weight: bold; text-decoration: none;">VibesFilm App</a>.</p>
    </section>

    <section id="artigos-recentes">
      <h2 style="border-bottom: 1px solid #011627; padding-bottom: 10px; color: #011627;">Últimas Análises de Filmes</h2>
      ${postsHtml}
    </section>
  </main>

  <footer style="margin-top: 60px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 0.9rem; color: #777; text-align: center;">
    <p>© 2026 VibesFilm. Todos os direitos reservados.</p>
    <p>
      <a href="/privacidade" style="color: #777; text-decoration: underline;">Política de Privacidade</a> | 
      <a href="/termos" style="color: #777; text-decoration: underline;">Termos de Uso</a> | 
      <a href="/cookies" style="color: #777; text-decoration: underline;">Cookies</a>
    </p>
  </footer>
</body>
</html>`;
}
/**
 * Detecta se a requisição é de um bot
 */
export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return /Googlebot|Bingbot|Slurp|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Applebot|Mediapartners-Google|AdsBot-Google|Google-AdSense/i.test(userAgent);
}

/**
 * Gera HTML para páginas estáticas do blog (Sobre, Contato, Privacidade, Termos, Cookies)
 */
export function renderStaticPageHTML(pageType: string): string {
  let title = "VibesFilm";
  let description = "Cada emoção tem um filme.";
  let content = "";

  if (pageType === 'sobre') {
    title = "Sobre o Projeto | VibesFilm";
    description = "Conheça o VibesFilm, uma plataforma de curadoria emocional criada para conectar pessoas com filmes baseados em seus estados de espírito.";
    content = `
      <section style="background-color: #f7f9fa; padding: 25px; border-radius: 8px; border-left: 4px solid #011627; margin-bottom: 30px;">
        <h2>Sobre o Fundador</h2>
        <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; margin-top: 15px;">
          <img src="https://avatars.githubusercontent.com/u/1273623?v=4" alt="Carlos B Silva" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #3B82F6; object-fit: cover;">
          <div style="flex: 1; min-width: 250px;">
            <p style="margin: 0 0 10px 0;"><strong>Carlos B Silva</strong> é o fundador e curador do VibesFilm. Construiu sua carreira na área de tecnologia, trabalhando com análise, sistemas e resolução de problemas. Após se retirar da vida corporativa, passou a dedicar parte do seu tempo à união de duas paixões: cinema e tecnologia.</p>
            <p style="margin: 0;">O Vibesfilm nasceu dessa combinação. Utilizando uma abordagem estruturada, Carlos desenvolve uma metodologia própria de curadoria emocional para ajudar pessoas a encontrar filmes pela experiência emocional que procuram viver.</p>
          </div>
        </div>
      </section>

      <section style="margin-bottom: 30px;">
        <h2>A Proposta do VibesFilm</h2>
        <p>Quantas vezes você já passou mais tempo procurando um filme do que assistindo? A paralisia da escolha é real. Rolamos por catálogos infinitos em serviços de streaming, recebendo sugestões baseadas em um único critério: o gênero. Mas e se a sua real necessidade não for um gênero, mas sim uma emoção?</p>
        <p>É exatamente essa a lacuna que o Vibesfilm preenche. Para tornar isso possível, o Vibesfilm organiza sentimentos, intenções e experiências emocionais em jornadas cuidadosamente mapeadas. Cada recomendação busca responder não apenas ao que você gosta de assistir, mas ao que você precisa sentir, compreender ou vivenciar naquele momento.</p>
      </section>

      <section style="margin-bottom: 30px;">
        <h2>Como Funciona a Curadoria</h2>
        <ul>
          <li><strong>Subsentimentos e Nuances Emocionais:</strong> Não classificamos os filmes apenas como "alegres" ou "tristes". Nós mapeamos subsentimentos específicos (como nostalgia, superação, melancolia acolhedora ou calmaria reflexiva). Isso nos permite entender a real atmosfera de uma obra para conectá-la ao seu estado de espírito exato.</li>
          <li><strong>Cálculo de Relevância (Intensidade vs Cobertura):</strong> Utilizamos um modelo de pontuação próprio que cruza a Intensidade da emoção no filme com a sua Cobertura (o quanto desse sentimento está presente ao longo da narrativa).</li>
          <li><strong>Jornadas de Transição:</strong> Reconhecemos que as emoções são dinâmicas. Nosso sistema é desenhado para ajudar você em quatro direções: Manter sua vibe atual, Processar uma emoção complexa, Transformar seu humor para um estado melhor, ou simplesmente Explorar novas sensações.</li>
          <li><strong>Sensibilidade Humana com Rigor de Dados:</strong> Embora utilizemos uma estrutura analítica de dados e inteligência artificial para mapear os sentimentos, cada indicação passa por uma validação e curadoria fina manual. É a fusão da engenharia de dados com a paixão real pelo cinema.</li>
        </ul>
      </section>
    `;
  } else if (pageType === 'contato') {
    title = "Contato | VibesFilm";
    description = "Entre em contato com a equipe do VibesFilm para dúvidas, sugestões, feedback ou parcerias.";
    content = `
      <h2>Fale Conosco</h2>
      <p>Se você tem dúvidas, sugestões, parcerias ou gostaria de saber mais sobre a nossa metodologia de curadoria baseada em emoções, entre em contato através do nosso canal de comunicação oficial:</p>
      <p style="font-size: 1.2rem; background-color: #f7f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #E91E63; display: inline-block; margin-top: 15px;">
        📧 Email: <a href="mailto:contato@vibesfilm.com" style="color: #E91E63; font-weight: bold; text-decoration: none;">contato@vibesfilm.com</a>
      </p>
      <p style="margin-top: 20px;">Responderemos o mais breve possível.</p>
    `;
  } else if (pageType === 'privacidade') {
    title = "Política de Privacidade | VibesFilm";
    description = "Consulte a Política de Privacidade do VibesFilm e saiba como tratamos e protegemos seus dados pessoais.";
    content = `
      <h2>Política de Privacidade</h2>
      <p>Esta Política descreve como o <strong>vibesfilm.com</strong> coleta e trata dados pessoais. Nosso foco é editorial e de curadoria cinematográfica; coletamos o mínimo necessário para melhorar sua experiência de descoberta de filmes.</p>
      
      <h3>1. Dados que coletamos</h3>
      <p>As informações pessoais que coletamos podem incluir:</p>
      <ul>
        <li>Dados de navegação (páginas visitadas, tempo de permanência, origem de tráfego)</li>
        <li>E-mail, quando você se inscreve na newsletter</li>
        <li>Mensagens enviadas via formulário de contato</li>
        <li>Preferências de conteúdo e interações com o site</li>
      </ul>

      <h3>2. Cookies e Web Beacons</h3>
      <p>Utilizamos cookies para armazenar informações como suas preferências pessoais quando visita nosso website. Isso pode incluir configurações de interface, preferences de conteúdo ou dados de sessão.</p>
      <p>Também utilizamos cookies de análise (como Google Analytics) para entender como os usuários interagem com nosso conteúdo, melhorando a experiência de navegação.</p>

      <h3>3. Anúncios e Publicidade</h3>
      <p>O <strong>vibesfilm.com</strong> pode utilizar serviços de publicidade de terceiros para exibir anúncios. Esses serviços podem usar cookies e web beacons para personalizar anúncios baseados em suas visitas a este e outros websites.</p>
      <p>Você pode desativar a publicidade personalizada acessando as <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style="color: #3B82F6;">Configurações de anúncios do Google</a>.</p>

      <h3>4. Newsletter</h3>
      <p>Quando você se inscreve em nossa newsletter, coletamos e armazenamos seu endereço de email para enviar comunicações relacionadas ao conteúdo do VibesFilm. Mantemos seu email em nossa base enquanto você permanecer inscrito. Você pode solicitar a exclusão a qualquer momento enviando um e-mail para <a href="mailto:contato@vibesfilm.com" style="color: #3B82F6;">contato@vibesfilm.com</a>.</p>

      <h3>5. Compartilhamento de Dados</h3>
      <p>Não vendemos seus dados pessoais. Compartilhamos apenas com provedores de serviços necessários (hospedagem, analytics), parceiros de publicidade (com consentimento) ou por exigência legal.</p>

      <h3>6. Seus Direitos</h3>
      <p>Você tem o direito de acessar, corrigir, solicitar exclusão ou portabilidade de seus dados. Para exercer esses direitos, contate-nos em <a href="mailto:contato@vibesfilm.com" style="color: #3B82F6;">contato@vibesfilm.com</a>.</p>
    `;
  } else if (pageType === 'termos') {
    title = "Termos de Uso | VibesFilm";
    description = "Leia os Termos de Uso e Condições de navegação e utilização do site VibesFilm.";
    content = `
      <h2>Termos de Uso</h2>
      <p>Ao acessar ou usar nosso site, você concorda em cumprir e estar vinculado aos seguintes Termos de Uso e Condições. Caso não concorde com qualquer parte deste acordo, solicitamos que não utilize o site.</p>
      
      <h3>1. Aceitação dos Termos</h3>
      <p>O uso do site <strong>vibesfilm.com</strong> está sujeito a estes Termos de Uso, que podem ser atualizados periodicamente sem aviso prévio.</p>

      <h3>2. Descrição do Serviço</h3>
      <p>O VibesFilm é uma plataforma de curadoria cinematográfica que conecta pessoas com filmes baseados em suas emoções e estados de espírito. O site fornece conteúdo de maneira gratuita, incluindo recomendações personalizadas, artigos sobre cinema e análises emocionais.</p>

      <h3>3. Propriedade Intelectual</h3>
      <p>Todo o conteúdo disponível no VibesFilm (textos, gráficos, logotipos, etc.) é de propriedade do VibesFilm ou de seus licenciadores e é protegido pelas leis de direitos autorais. Você não pode copiar ou distribuir o conteúdo sem permissão expressa.</p>

      <h3>4. Limitação de Responsabilidade</h3>
      <p>O VibesFilm se esforça para fornecer informações precisas, mas não garante que todo o conteúdo seja isento de erros. Não nos responsabilizamos por danos decorrentes do uso do site ou de transações com anunciantes externos.</p>

      <h3>5. Legislação Aplicável</h3>
      <p>Estes Termos de Uso serão regidos e interpretados de acordo com as leis brasileiras.</p>
    `;
  } else if (pageType === 'cookies') {
    title = "Política de Cookies | VibesFilm";
    description = "Saiba o que são cookies, como os utilizamos no VibesFilm e como você pode gerenciá-los.";
    content = `
      <h2>Política de Cookies</h2>
      <p>O <strong>vibesfilm.com</strong> utiliza cookies para melhorar o desempenho e a sua experiência como usuário no nosso site.</p>
      
      <h3>O que são cookies?</h3>
      <p>Cookies são pequenos arquivos de texto que um site coloca no seu computador ou no seu dispositivo móvel através do navegador de internet. Eles ajudam o site a reconhecer o seu dispositivo na próxima visita.</p>

      <h3>Para que servem os cookies?</h3>
      <p>Os cookies determinam a utilidade, interesse e número de utilizações do site, permitindo uma navegação mais rápida e eficiente e eliminando a necessidade de introduzir repetidamente as mesmas informações.</p>

      <h3>Que tipo de cookies utilizamos?</h3>
      <ul>
        <li><strong>Cookies estritamente necessários:</strong> Permitem a navegação no website e utilização das suas aplicações básicas.</li>
        <li><strong>Cookies analíticos:</strong> São utilizados anonimamente para criação de estatísticas de uso para melhorar o funcionamento do website.</li>
        <li><strong>Cookies de funcionalidade:</strong> Guardam as preferências do usuário para que não seja necessário configurar o site a cada visita.</li>
        <li><strong>Cookies de publicidade de terceiros:</strong> Medem a eficácia de publicidade externa e personalizam anúncios baseados no histórico de navegação.</li>
      </ul>

      <h3>Como gerenciar cookies?</h3>
      <p>Todos os navegadores permitem ao usuário aceitar, recusar ou apagar cookies nas opções do menu de configurações. Note que a desativação de cookies pode afetar o funcionamento de algumas áreas do site.</p>
    `;
  }

  const canonicalUrl = `https://vibesfilm.com/${pageType}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6851520236157623"
       crossorigin="anonymous"></script>
  
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="VibesFilm">
  
  <meta name="robots" content="index, follow">
  
  <script>
    // Se não for bot, redirecionar para o frontend SPA normal
    if (!navigator.userAgent.match(/Googlebot|Bingbot|Slurp|facebookexternalhit|Twitterbot|Mediapartners-Google|AdsBot-Google|Google-AdSense/i)) {
      window.location.href = '${canonicalUrl}';
    }
  </script>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #FDFFFC;">
  <header style="border-bottom: 2px solid #011627; padding-bottom: 20px; margin-bottom: 30px;">
    <h1 style="color: #011627; margin-bottom: 5px;"><a href="/" style="color: #011627; text-decoration: none;">VibesFilm</a></h1>
    <p style="font-size: 1.1rem; color: #555; margin-top: 0;">Cada emoção tem um filme.</p>
    <nav>
      <a href="/" style="margin-right: 15px; color: #555; text-decoration: none;">Blog Home</a>
      <a href="/sobre" style="margin-right: 15px; ${pageType === 'sobre' ? 'font-weight: bold; color: #011627;' : 'color: #555;'} text-decoration: none;">Sobre</a>
      <a href="/contato" style="margin-right: 15px; ${pageType === 'contato' ? 'font-weight: bold; color: #011627;' : 'color: #555;'} text-decoration: none;">Contato</a>
      <a href="/privacidade" style="margin-right: 15px; ${pageType === 'privacidade' ? 'font-weight: bold; color: #011627;' : 'color: #555;'} text-decoration: none;">Privacidade</a>
      <a href="/termos" style="${pageType === 'termos' ? 'font-weight: bold; color: #011627;' : 'color: #555;'} text-decoration: none;">Termos de Uso</a>
    </nav>
  </header>

  <main>
    ${content}
  </main>

  <footer style="margin-top: 60px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 0.9rem; color: #777; text-align: center;">
    <p>© 2026 VibesFilm. Todos os direitos reservados.</p>
    <p>
      <a href="/privacidade" style="color: #777; text-decoration: underline;">Política de Privacidade</a> | 
      <a href="/termos" style="color: #777; text-decoration: underline;">Termos de Uso</a> | 
      <a href="/cookies" style="color: #777; text-decoration: underline;">Cookies</a>
    </p>
  </footer>
</body>
</html>`;
}

/**
 * Gera HTML para listagens de artigos (Arquivo/Categoria/Tag)
 */
export function renderArchiveHTML(posts: any[], archiveTitle: string, archiveDesc: string, archivePath: string): string {
  const canonicalUrl = `https://vibesfilm.com${archivePath}`;
  
  const postsHtml = posts.map((post: any) => {
    const isList = post.category_slug === 'lista' || post.type === 'lista';
    const postRoute = `/${isList ? 'lista' : 'analise'}/${post.slug}`;
    const postDate = post.date ? new Date(post.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : '';
    
    return `
      <article style="margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
        <h2><a href="${postRoute}" style="color: #011627; text-decoration: none;">${escapeHtml(post.title)}</a></h2>
        <p style="color: #666; font-size: 0.9rem;">Publicado em ${postDate} por ${escapeHtml(post.author_name || 'VibesFilm')}</p>
        ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${escapeHtml(post.imageAlt || post.title)}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0;">` : ''}
        <p>${escapeHtml(post.description || '')}</p>
        <a href="${postRoute}" style="font-weight: bold; color: #E91E63; text-decoration: none;">Ler análise completa →</a>
      </article>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6851520236157623"
       crossorigin="anonymous"></script>
  
  <title>${escapeHtml(archiveTitle)} | VibesFilm</title>
  <meta name="description" content="${escapeHtml(archiveDesc)}">
  <link rel="canonical" href="${canonicalUrl}">
  
  <meta name="robots" content="index, follow">
  
  <script>
    // Se não for bot, redirecionar para o frontend SPA normal
    if (!navigator.userAgent.match(/Googlebot|Bingbot|Slurp|facebookexternalhit|Twitterbot|Mediapartners-Google|AdsBot-Google|Google-AdSense/i)) {
      window.location.href = '${canonicalUrl}';
    }
  </script>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #FDFFFC;">
  <header style="border-bottom: 2px solid #011627; padding-bottom: 20px; margin-bottom: 30px;">
    <h1 style="color: #011627; margin-bottom: 5px;"><a href="/" style="color: #011627; text-decoration: none;">VibesFilm</a></h1>
    <p style="font-size: 1.1rem; color: #555; margin-top: 0;">Cada emoção tem um filme.</p>
    <nav>
      <a href="/" style="margin-right: 15px; color: #555; text-decoration: none;">Blog Home</a>
      <a href="/sobre" style="margin-right: 15px; color: #555; text-decoration: none;">Sobre</a>
      <a href="/contato" style="margin-right: 15px; color: #555; text-decoration: none;">Contato</a>
      <a href="/privacidade" style="margin-right: 15px; color: #555; text-decoration: none;">Privacidade</a>
      <a href="/termos" style="color: #555; text-decoration: none;">Termos de Uso</a>
    </nav>
  </header>

  <main>
    <h2 style="border-bottom: 1px solid #011627; padding-bottom: 10px; color: #011627;">${escapeHtml(archiveTitle)}</h2>
    <p style="color: #666; font-style: italic; margin-bottom: 30px;">${escapeHtml(archiveDesc)}</p>
    ${postsHtml.length > 0 ? postsHtml : '<p>Nenhum artigo encontrado nesta listagem.</p>'}
  </main>

  <footer style="margin-top: 60px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 0.9rem; color: #777; text-align: center;">
    <p>© 2026 VibesFilm. Todos os direitos reservados.</p>
    <p>
      <a href="/privacidade" style="color: #777; text-decoration: underline;">Política de Privacidade</a> | 
      <a href="/termos" style="color: #777; text-decoration: underline;">Termos de Uso</a> | 
      <a href="/cookies" style="color: #777; text-decoration: underline;">Cookies</a>
    </p>
  </footer>
</body>
</html>`;
}


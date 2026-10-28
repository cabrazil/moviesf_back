import NodeCache from 'node-cache';
import { prismaApp as prisma, prismaBlog } from '../prisma';
import { generateSlug } from '../utils/slugGenerator';

// Cache em memória para alta performance (respostas em < 5ms)
const vibeCache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // 10 min
const slugCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // 1 hora

export interface VibeMovieItem {
  id: string;
  title: string;
  year: number | null;
  slug: string;
  thumbnail: string | null;
  backdropUrl?: string | null;
  genres: string[];
  runtime: number | null;
  imdbRating: number | null;
  voteAverage: number | null;
  relevanceScore: number;
  tier: 'Ouro' | 'Prata' | 'Bronze' | 'Sem Bônus';
  reason: string;
  synopsis: string | null;
  director: string | null;
  contentWarnings: string | null;
  streamingPlatforms: Array<{
    id: number;
    name: string;
    category: string;
    logoPath?: string | null;
  }>;
  badges: string[];
  blogArticle: {
    title: string;
    slug: string;
    url: string;
  } | null;
}

export interface VibeLandingData {
  vibe: {
    id: number;
    slug: string;
    title: string;
    optionText: string;
    summary: string | null;
    mobileText: string | null;
    sentiment: {
      id: number;
      name: string;
    };
    intention: {
      type: string;
      description: string;
    };
    totalMovies: number;
    seo: {
      title: string;
      description: string;
      canonicalUrl: string;
    };
  };
  movies: VibeMovieItem[];
}

export interface VibeSummaryItem {
  id: number;
  slug: string;
  title: string;
  optionText: string;
  summary: string | null;
  sentiment: string;
  intention: string;
  movieCount: number;
  url: string;
}

/**
 * Gera um slug limpo e amigável para SEO para uma JOF
 */
export function getJofSlug(jof: { id: number; displayTitle?: string | null; text: string }): string {
  const baseText = jof.displayTitle || jof.text;
  let clean = generateSlug(baseText);
  // 1. Remove prefixos de coleção redundantes
  clean = clean.replace(/^(filmes-sobre-|filmes-que-|filmes-para-|filmes-|para-)/, '');
  // 2. Remove verbos transitivos no início para URLs mais naturais e alinhadas à busca orgânica
  clean = clean.replace(/^(oferecem-|oferece-|celebram-|celebra-|trazem-|traz-|mostram-|mostra-|proporcionam-|proporciona-|garantem-|garante-|ajudam-a-|ajuda-a-|ajudam-|ajuda-|provocam-|provoca-|despertam-|desperta-|permitem-|permita-|permite-|embarcam-|embarque-|convidam-a-|convidam-|exploram-|explore-|mergulham-|mergulhe-|inspiram-|inspire-|fazem-|faca-)/, '');
  return clean || `vibe-${jof.id}`;
}

/**
 * Calcula o patamar do filme baseado no score
 */
function getTierFromScore(score: number): 'Ouro' | 'Prata' | 'Bronze' | 'Sem Bônus' {
  if (score >= 7.5) return 'Ouro';
  if (score >= 6.5) return 'Prata';
  if (score >= 5.0) return 'Bronze';
  return 'Sem Bônus';
}

export class VibeLandingService {
  /**
   * Busca uma Vibe Landing Page por ID numérico ou Slug textual
   */
  async getVibeByIdentifier(identifier: string, limit = 12): Promise<VibeLandingData | null> {
    const cacheKey = `vibe:${identifier}:${limit}`;
    const cached = vibeCache.get<VibeLandingData>(cacheKey);
    if (cached) {
      return cached;
    }

    const isNumeric = !isNaN(Number(identifier));
    let targetJofId: number | null = null;

    if (isNumeric) {
      targetJofId = parseInt(identifier, 10);
    } else {
      // Normalizar identificador recebido na URL
      const cleanInput = generateSlug(identifier).replace(/^(filmes-sobre-|filmes-que-|filmes-para-|filmes-)/, '');

      // Buscar mapa de slugs em cache ou preencher
      let slugMap = slugCache.get<Map<string, number>>('slug_to_jof_map');
      if (!slugMap) {
        const allEndJofs = await prisma.journeyOptionFlow.findMany({
          where: { isEndState: true },
          select: { id: true, displayTitle: true, text: true }
        });
        slugMap = new Map<string, number>();
        for (const j of allEndJofs) {
          const s = getJofSlug(j);
          slugMap.set(s, j.id);
          slugMap.set(`jornada-${j.id}`, j.id);
          slugMap.set(`vibe-${j.id}`, j.id);
          slugMap.set(String(j.id), j.id);
        }
        slugCache.set('slug_to_jof_map', slugMap);
      }

      targetJofId = slugMap.get(cleanInput) || null;
    }

    if (!targetJofId) return null;

    // Buscar detalhes da JOF, filmes e total de filmes em paralelo
    const [jof, suggestions, totalMovies] = await Promise.all([
      prisma.journeyOptionFlow.findUnique({
        where: { id: targetJofId },
        include: {
          journeyStepFlow: {
            include: {
              journeyFlow: {
                include: { mainSentiment: true }
              },
              emotionalIntentionJourneySteps: {
                include: {
                  emotionalIntention: {
                    include: { mainSentiment: true }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.movieSuggestionFlow.findMany({
        where: {
          journeyOptionFlowId: targetJofId,
          movie: {
            thumbnail: { not: null }
          }
        },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              year: true,
              slug: true,
              genres: true,
              runtime: true,
              imdbRating: true,
              vote_average: true,
              thumbnail: true,
              description: true,
              director: true,
              certification: true,
              contentWarnings: true,
              hasAnalysisArticle: true,
              analysisArticleSlug: true,
              platforms: {
                include: {
                  streamingPlatform: true
                }
              },
              movieSentiments: {
                include: {
                  subSentiment: true
                },
                orderBy: {
                  relevance: 'desc'
                },
                take: 3
              },
              pillarArticles: {
                select: {
                  title: true,
                  slug: true
                },
                take: 1
              }
            }
          }
        },
        orderBy: {
          relevanceScore: 'desc'
        },
        take: Math.min(Math.max(limit, 1), 30)
      }),
      prisma.movieSuggestionFlow.count({
        where: { journeyOptionFlowId: targetJofId }
      })
    ]);

    if (!jof) return null;

    const eij = jof.journeyStepFlow?.emotionalIntentionJourneySteps?.[0]?.emotionalIntention;
    const mainSent = eij?.mainSentiment || jof.journeyStepFlow?.journeyFlow?.mainSentiment;

    // Buscar títulos dos artigos do blog para filmes que possuem artigo dedicado
    const articleSlugs = suggestions
      .map(s => s.movie.analysisArticleSlug)
      .filter((s): s is string => Boolean(s));

    const blogArticlesMap = new Map<string, string>();
    if (articleSlugs.length > 0) {
      try {
        const blogArticles = await prismaBlog.article.findMany({
          where: {
            slug: { in: articleSlugs },
            published: true
          },
          select: {
            slug: true,
            title: true
          }
        });
        for (const a of blogArticles) {
          blogArticlesMap.set(a.slug, a.title);
        }
      } catch (err) {
        console.warn('⚠️ Não foi possível consultar títulos de artigos do blog:', err);
      }
    }

    const slug = getJofSlug(jof);
    const title = jof.displayTitle || jof.text;
    const cleanTitle = title.replace(/^\.\.\./, '').trim();

    // Mapear filmes para o formato da resposta
    const mappedMovies: VibeMovieItem[] = suggestions.map(s => {
      const m = s.movie;
      const scoreNum = parseFloat(String(s.relevanceScore || 0));

      // Extrair plataformas únicas
      const platformsMap = new Map<string, { id: number; name: string; category: string; logoPath?: string | null }>();
      for (const p of m.platforms) {
        if (p.streamingPlatform?.name && !platformsMap.has(p.streamingPlatform.name)) {
          platformsMap.set(p.streamingPlatform.name, {
            id: p.streamingPlatform.id,
            name: p.streamingPlatform.name,
            category: p.accessType || p.streamingPlatform.category || 'INCLUDED_WITH_SUBSCRIPTION',
            logoPath: p.streamingPlatform.logoPath
          });
        }
      }

      // Badges emocionais (subsentimentos com maior relevância)
      const badges = (m.movieSentiments as any[])
        .filter(ms => ms.subSentiment?.name)
        .map(ms => ms.subSentiment.name);

      // Artigo do blog vinculado: Prioridade 1 para hasAnalysisArticle / analysisArticleSlug
      let blogArticle: { title: string; slug: string; url: string } | null = null;
      if (m.hasAnalysisArticle && m.analysisArticleSlug) {
        const articleTitle = blogArticlesMap.get(m.analysisArticleSlug) || `Análise de ${m.title}`;
        blogArticle = {
          title: articleTitle,
          slug: m.analysisArticleSlug,
          url: `/blog/artigo/${m.analysisArticleSlug}`
        };
      } else if (m.pillarArticles && m.pillarArticles.length > 0) {
        blogArticle = {
          title: m.pillarArticles[0].title,
          slug: m.pillarArticles[0].slug,
          url: `/blog/artigo/${m.pillarArticles[0].slug}`
        };
      }

      return {
        id: m.id,
        title: m.title,
        year: m.year,
        slug: m.slug || m.id,
        thumbnail: m.thumbnail,
        backdropUrl: null,
        genres: m.genres || [],
        runtime: m.runtime,
        imdbRating: m.imdbRating ? Number(m.imdbRating) : null,
        voteAverage: m.vote_average ? Number(m.vote_average) : null,
        relevanceScore: Number(scoreNum.toFixed(3)),
        tier: getTierFromScore(scoreNum),
        reason: s.reason,
        synopsis: m.description,
        director: m.director,
        contentWarnings: m.contentWarnings,
        streamingPlatforms: Array.from(platformsMap.values()),
        badges,
        blogArticle
      };
    });

    const sentimentName = mainSent?.name || 'Geral';
    const intentionType = eij?.intentionType || 'GERAL';
    const intentionDescription = eij?.description || '';

    const result: VibeLandingData = {
      vibe: {
        id: jof.id,
        slug,
        title: cleanTitle,
        optionText: jof.text,
        summary: jof.summary,
        mobileText: jof.mobileText,
        sentiment: {
          id: mainSent?.id || 0,
          name: sentimentName
        },
        intention: {
          type: intentionType,
          description: intentionDescription
        },
        totalMovies,
        seo: {
          title: `${cleanTitle} - Filmes Recomendados | Vibesfilm`,
          description: `Descubra os melhores filmes selecionados pela curadoria do Vibesfilm para ${cleanTitle.toLowerCase()}. Sinopses, onde assistir e análises emocionais.`,
          canonicalUrl: `https://vibesfilm.com/filmes-para/${slug}`
        }
      },
      movies: mappedMovies
    };

    // Salvar em cache tanto por identificador, ID e slug
    vibeCache.set(cacheKey, result);
    vibeCache.set(`vibe:${targetJofId}:${limit}`, result);
    vibeCache.set(`vibe:${slug}:${limit}`, result);

    return result;
  }

  /**
   * Lista todas as Vibes/Jornadas ativas que possuem filmes curados
   */
  async getAllVibes(): Promise<VibeSummaryItem[]> {
    const cached = vibeCache.get<VibeSummaryItem[]>('all_vibes');
    if (cached) return cached;

    const endJofs = await prisma.journeyOptionFlow.findMany({
      where: { isEndState: true },
      include: {
        journeyStepFlow: {
          include: {
            journeyFlow: {
              include: { mainSentiment: true }
            },
            emotionalIntentionJourneySteps: {
              include: {
                emotionalIntention: {
                  include: { mainSentiment: true }
                }
              }
            }
          }
        },
        _count: {
          select: {
            movieSuggestions: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    const activeVibes = endJofs
      .filter(j => j._count.movieSuggestions > 0)
      .map(j => {
        const eij = j.journeyStepFlow?.emotionalIntentionJourneySteps?.[0]?.emotionalIntention;
        const mainSent = eij?.mainSentiment || j.journeyStepFlow?.journeyFlow?.mainSentiment;
        const slug = getJofSlug(j);
        const title = j.displayTitle || j.text;

        return {
          id: j.id,
          slug,
          title: title.replace(/^\.\.\./, '').trim(),
          optionText: j.text,
          summary: j.summary,
          sentiment: mainSent?.name || 'Geral',
          intention: eij?.intentionType || 'GERAL',
          movieCount: j._count.movieSuggestions,
          url: `/filmes-para/${slug}`
        };
      });

    vibeCache.set('all_vibes', activeVibes);
    return activeVibes;
  }
}

export const vibeLandingService = new VibeLandingService();

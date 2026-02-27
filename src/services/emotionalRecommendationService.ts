

import { prismaApp as prisma } from '../prisma';

interface SubSentiment {
  name: string;
}

interface MovieSentiment {
  subSentiment: SubSentiment;
  mainSentiment: any; // Assuming mainSentiment is also an object, but not directly used in the error lines.
}

interface MovieWithSentiments {
  id: string;
  title: string;
  year?: number;
  thumbnail?: string;
  runtime?: number;
  genres: string[];
  vote_average?: number;
  movieSentiments: MovieSentiment[];
}

interface EmotionalIntentionConfig {
  id: number;
  description: string;
  preferredGenres: string[];
  avoidGenres: string[];
  emotionalTone: string;
  intentionType: 'PROCESS' | 'TRANSFORM' | 'MAINTAIN' | 'EXPLORE';
  subSentimentWeights: Record<string, number>;
}

export interface EmotionalRecommendationRequest {
  mainSentimentId: number;
  intentionType: 'PROCESS' | 'TRANSFORM' | 'MAINTAIN' | 'EXPLORE';
  userId?: string;
  contextData?: any;
}

export interface EmotionalRecommendationResponse {
  sessionId: string;
  recommendations: Array<{
    movieId: string;
    title: string;
    year?: number;
    personalizedReason: string;
    relevanceScore: number;
    intentionAlignment: number;
    thumbnail?: string;
    genres: string[];
    runtime?: number;
  }>;
  intentionConfig: {
    description: string;
    preferredGenres: string[];
    avoidGenres: string[];
    emotionalTone: string;
  };
}

export class EmotionalRecommendationService {
  
  /**
   * Inicia uma nova sessão de recomendação baseada em intenção emocional
   */
  async startRecommendationSession(request: EmotionalRecommendationRequest): Promise<EmotionalRecommendationResponse> {
    console.log('🎭 Iniciando sessão de recomendação emocional...');
    
    // 1. Buscar configuração de intenção
    const intentionConfig = await prisma.emotionalIntention.findFirst({
      where: {
        mainSentimentId: request.mainSentimentId,
        intentionType: request.intentionType
      },
      include: {
        mainSentiment: true
      }
    });

    if (!intentionConfig) {
      throw new Error(`Configuração de intenção não encontrada para sentimento ${request.mainSentimentId} e tipo ${request.intentionType}`);
    }

    console.log(`✅ Configuração encontrada: ${intentionConfig.description}`);

    // 2. Criar sessão de recomendação
    const session = await prisma.recommendationSession.create({
      data: {
        userId: request.userId,
        mainSentimentId: request.mainSentimentId,
        emotionalIntentionId: intentionConfig.id,
        sessionData: request.contextData || {}
      }
    });

    console.log(`📝 Sessão criada: ${session.id}`);

    // 3. Buscar filmes compatíveis
    const recommendations = await this.generateEmotionalRecommendations(
      session.id,
      intentionConfig
    );

    console.log(`🎬 Geradas ${recommendations.length} recomendações`);

    return {
      sessionId: session.id,
      recommendations,
      intentionConfig: {
        description: intentionConfig.description,
        preferredGenres: intentionConfig.preferredGenres,
        avoidGenres: intentionConfig.avoidGenres,
        emotionalTone: intentionConfig.emotionalTone
      }
    };
  }

  /**
   * Gera recomendações baseadas na configuração de intenção emocional
   */
  private async generateEmotionalRecommendations(
    sessionId: string,
    intentionConfig: EmotionalIntentionConfig
  ): Promise<EmotionalRecommendationResponse['recommendations']> {
    
    const subSentimentWeights = intentionConfig.subSentimentWeights as Record<string, number>;
    const preferredGenres = intentionConfig.preferredGenres;
    const avoidGenres = intentionConfig.avoidGenres;

    console.log('🔍 Buscando filmes compatíveis...');
    console.log(`SubSentiments priorizados: ${Object.keys(subSentimentWeights).join(', ')}`);
    console.log(`Gêneros preferidos: ${preferredGenres.join(', ')}`);
    console.log(`Gêneros evitados: ${avoidGenres.join(', ')}`);

    // 1. Buscar filmes que possuem os subsentimentos priorizados
    const moviesWithSubSentiments = await prisma.movie.findMany({
      where: {
        movieSentiments: {
          some: {
            subSentiment: {
              name: {
                in: Object.keys(subSentimentWeights)
              }
            }
          }
        }
      },
      include: {
        movieSentiments: {
          include: {
            subSentiment: true,
            mainSentiment: true
          }
        }
      }
    });

    console.log(`📊 Filmes encontrados com subsentiments: ${moviesWithSubSentiments.length}`);

    // 2. Filtrar por gêneros preferidos/evitados
    const filteredMovies = moviesWithSubSentiments.filter((movie: MovieWithSentiments) => {
      const movieGenres = movie.genres.map((g: string) => g.toLowerCase());
      
      // Verificar se possui gêneros evitados
      const hasAvoidedGenres = avoidGenres.some((avoidGenre: string) => 
        movieGenres.some((movieGenre: string) => 
          movieGenre.includes(avoidGenre.toLowerCase()) || 
          avoidGenre.toLowerCase().includes(movieGenre)
        )
      );

      if (hasAvoidedGenres) {
        return false;
      }

      // Verificar se possui gêneros preferidos (se especificados)
      if (preferredGenres.length > 0) {
        const hasPreferredGenres = preferredGenres.some((prefGenre: string) => 
          movieGenres.some((movieGenre: string) => 
            movieGenre.includes(prefGenre.toLowerCase()) || 
            prefGenre.toLowerCase().includes(movieGenre)
          )
        );
        return hasPreferredGenres;
      }

      return true;
    });

    console.log(`📊 Filmes após filtro de gêneros: ${filteredMovies.length}`);

    // 3. Calcular scores e criar recomendações
    const recommendations: EmotionalRecommendationResponse['recommendations'] = [];

    for (const movie of filteredMovies.slice(0, 10)) { // Limitar a 10 recomendações
      const relevanceScore = this.calculateRelevanceScore(movie, subSentimentWeights);
      const intentionAlignment = this.calculateIntentionAlignment(movie, intentionConfig);
      
      if (relevanceScore > 0.3) { // Filtro mínimo de relevância
        const personalizedReason = await this.generatePersonalizedReason(
          movie,
          intentionConfig,
          relevanceScore
        );

        // Criar registro de sugestão emocional
        await prisma.emotionalSuggestion.create({
          data: {
            recommendationSessionId: sessionId,
            emotionalIntentionId: intentionConfig.id,
            movieId: movie.id,
            personalizedReason,
            relevanceScore,
            intentionAlignment,
            contextualFactors: {
              subSentimentMatches: movie.movieSentiments
                .filter((ms: MovieSentiment) => subSentimentWeights[ms.subSentiment.name])
                .map((ms: MovieSentiment) => ({
                  name: ms.subSentiment.name,
                  weight: subSentimentWeights[ms.subSentiment.name]
                })),
              genreMatches: movie.genres.filter((genre: string) => 
                preferredGenres.some(pref => 
                  genre.toLowerCase().includes(pref.toLowerCase())
                )
              )
            }
          }
        });

        recommendations.push({
          movieId: movie.id,
          title: movie.title,
          year: movie.year || undefined,
          personalizedReason,
          relevanceScore,
          intentionAlignment,
          thumbnail: movie.thumbnail || undefined,
          genres: movie.genres,
          runtime: movie.runtime || undefined
        });
      }
    }

    // 4. Ordenar por relevância e alinhamento
    recommendations.sort((a, b) => {
      const scoreA = a.relevanceScore * 0.6 + a.intentionAlignment * 0.4;
      const scoreB = b.relevanceScore * 0.6 + b.intentionAlignment * 0.4;
      return scoreB - scoreA;
    });

    return recommendations;
  }

  /**
   * Calcula score de relevância baseado nos subsentimentos
   */
  private calculateRelevanceScore(movie: MovieWithSentiments, subSentimentWeights: Record<string, number>): number {
    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const [subSentimentName, weight] of Object.entries(subSentimentWeights)) {
      maxPossibleScore += weight;
      
      const hasSubSentiment = movie.movieSentiments.some((ms: MovieSentiment) => 
        ms.subSentiment.name === subSentimentName
      );
      
      if (hasSubSentiment) {
        totalScore += weight;
      }
    }

    return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
  }

  /**
   * Calcula alinhamento com a intenção emocional
   */
  private calculateIntentionAlignment(movie: MovieWithSentiments, intentionConfig: EmotionalIntentionConfig): number {
    let alignmentScore = 0;
    
    // Verificar alinhamento com gêneros preferidos
    const movieGenres = movie.genres.map((g: string) => g.toLowerCase());
    const preferredGenres = intentionConfig.preferredGenres.map((g: string) => g.toLowerCase());
    
    const genreMatches = movieGenres.filter((genre: string) => 
      preferredGenres.some((pref: string) => genre.includes(pref) || pref.includes(genre))
    );
    
    alignmentScore += (genreMatches.length / Math.max(preferredGenres.length, 1)) * 0.5;

    // Verificar tom emocional
    const emotionalTone = intentionConfig.emotionalTone;
    if (emotionalTone === 'similar') {
      // Priorizar filmes com sentimentos similares
      alignmentScore += 0.3;
    } else if (emotionalTone === 'contrasting') {
      // Priorizar filmes com sentimentos contrastantes
      alignmentScore += 0.2;
    } else if (emotionalTone === 'progressive') {
      // Priorizar filmes que promovem crescimento
      alignmentScore += 0.4;
    }

    // Verificar qualidade do filme (se disponível)
    if (movie.vote_average && movie.vote_average > 7) {
      alignmentScore += 0.2;
    }

    return Math.min(alignmentScore, 1.0);
  }

  /**
   * Gera razão personalizada para a recomendação
   */
  private async generatePersonalizedReason(
    movie: MovieWithSentiments,
    intentionConfig: EmotionalIntentionConfig,
    relevanceScore: number
  ): Promise<string> {
    const intentionType = intentionConfig.intentionType;
    const movieTitle = movie.title;
    const mainGenre = movie.genres[0] || 'filme';

    // Templates de razões baseadas no tipo de intenção
    const reasonTemplates = {
      PROCESS: [
        `Este ${mainGenre.toLowerCase()} oferece uma oportunidade de reflexão profunda sobre seus sentimentos atuais.`,
        `"${movieTitle}" apresenta temas que ressoam com sua necessidade de processar emoções.`,
        `Uma narrativa que ajuda a compreender e elaborar sentimentos complexos.`
      ],
      TRANSFORM: [
        `Este filme pode ajudar a transformar seu estado emocional atual.`,
        `"${movieTitle}" oferece uma perspectiva diferente que pode mudar sua energia.`,
        `Uma história que inspira mudança e renovação emocional.`
      ],
      MAINTAIN: [
        `Este ${mainGenre.toLowerCase()} ressoa perfeitamente com seu estado emocional atual.`,
        `"${movieTitle}" complementa e honra seus sentimentos presentes.`,
        `Uma narrativa que acompanha e valida sua experiência emocional.`
      ],
      EXPLORE: [
        `Este filme oferece uma exploração rica de diferentes aspectos emocionais.`,
        `"${movieTitle}" apresenta nuances que podem ampliar sua compreensão.`,
        `Uma jornada cinematográfica que revela novas dimensões emocionais.`
      ]
    };

    const templates = reasonTemplates[intentionType as keyof typeof reasonTemplates];
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    return randomTemplate;
  }

  /**
   * Registra feedback do usuário sobre uma recomendação
   */
  async recordUserFeedback(
    sessionId: string,
    movieId: string,
    wasViewed: boolean,
    wasAccepted: boolean,
    feedback?: string
  ): Promise<void> {
    await prisma.emotionalSuggestion.updateMany({
      where: {
        recommendationSessionId: sessionId,
        movieId: movieId
      },
      data: {
        wasViewed,
        wasAccepted,
        userFeedback: feedback
      }
    });

    console.log(`📝 Feedback registrado para filme ${movieId} na sessão ${sessionId}`);
  }

  /**
   * Finaliza uma sessão de recomendação
   */
  async completeSession(sessionId: string): Promise<void> {
    await prisma.recommendationSession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        isActive: false
      }
    });

    console.log(`✅ Sessão ${sessionId} finalizada`);
  }

  /**
   * Obtém histórico de recomendações de um usuário
   */
  async getUserRecommendationHistory(userId: string): Promise<any[]> {
    const sessions = await prisma.recommendationSession.findMany({
      where: { userId },
      include: {
        mainSentiment: true,
        emotionalIntention: true,
        emotionalSuggestions: {
          include: {
            movie: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sessions;
  }
}

export default EmotionalRecommendationService; 
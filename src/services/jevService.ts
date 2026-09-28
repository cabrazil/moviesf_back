import axios from 'axios';

export interface MovieContentWarningInput {
  title: string;
  year?: number;
  genres?: string[];
  keywords?: string[];
  description?: string;
  sentimentContext?: string;
  certification?: string;
}

export interface JevDecisionResponse {
  answers?: Record<string, {
    type: 'noul' | 'choice' | 'score';
    noul?: number;
    choice?: string;
    score?: number;
    probabilities?: Record<string, number> | number[];
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cost: number;
  };
  error?: {
    message: string;
    code?: number;
  };
}

export interface JevContentWarningResult {
  success: boolean;
  warning?: string;
  probabilities?: Record<string, number>;
  cost?: number;
  error?: string;
}

export interface SubSentimentCandidate {
  id: number;
  name: string;
  keywords?: string[];
  expectedWeight?: number;
}

export interface MovieSentimentAlignmentInput {
  title: string;
  year?: number;
  genres?: string[];
  keywords?: string[];
  description?: string;
  journeyOptionText: string;
  mainSentimentName?: string;
  mainSentimentKeywords?: string[];
  intentionType?: string;
  intentionDescription?: string;
  candidates: SubSentimentCandidate[];
}

export interface SentimentAlignmentItemResult {
  subSentimentId: number;
  name: string;
  relevance: number;
  expectedWeight?: number;
  isActivated: boolean;
}

export interface JevSentimentAlignmentResult {
  success: boolean;
  alignments?: SentimentAlignmentItemResult[];
  rawAnswers?: Record<string, any>;
  cost?: number;
  durationMs?: number;
  error?: string;
}


export const DEFAULT_CATEGORY_THRESHOLDS: Record<string, number> = {
  violencia_extrema: 0.70,
  violencia_brutalidade: 0.55,
  violencia_guerra: 0.60,
  violencia_moderada: 0.60,
  abuso_coercao_sexual: 0.55,
  sexo_explicito: 0.50,
  insinuacoes_sexuais: 0.60,
  drogas_alcool: 0.50,
  linguagem_forte: 0.55,
  perturbador_angustia: 0.40,
  preconceito_discriminacao: 0.55,
  humor_acido: 0.60
};

export function getCategoryThreshold(
  category: string,
  overrides?: Record<string, number>,
  globalFallback = 0.60
): number {
  if (overrides && typeof overrides[category] === 'number') {
    return overrides[category];
  }
  return DEFAULT_CATEGORY_THRESHOLDS[category] ?? globalFallback;
}

export interface JevEvaluationOptions {
  thresholds?: Record<string, number> | number;
}

export class JevService {
  private readonly apiUrl = 'https://openrouter.ai/api/alpha/decisions';
  private readonly defaultModel = process.env.JEV_MODEL || '~typesafe/jev-latest';

  /**
   * Avalia um filme e gera contentWarnings padronizados utilizando o modelo Jev (TypeSafe AI) via OpenRouter
   */
  async evaluateContentWarnings(
    movie: MovieContentWarningInput,
    options?: JevEvaluationOptions
  ): Promise<JevContentWarningResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'OPENROUTER_API_KEY não configurada nas variáveis de ambiente'
      };
    }

    const state = this.buildMovieState(movie);

    const questions = {
      violencia_extrema: {
        type: 'noul',
        instructions: 'O filme contém cenas explícitas de violência gráfica, sangue excessivo, decapitação, mutilação, gore ou tortura sádica visceral?'
      },
      violencia_brutalidade: {
        type: 'noul',
        instructions: 'O filme retrata violência física severa, espancamentos cruéis, brutalidade policial/carcerária, execuções a sangue frio ou agressões realistas sem gore?'
      },
      violencia_guerra: {
        type: 'noul',
        instructions: 'O filme retrata conflitos armados, combates militares realistas, bombardeios, tiroteios bélicos ou violência de guerra?'
      },
      violencia_moderada: {
        type: 'noul',
        instructions: 'O filme contém cenas de ação, lutas, crime, perseguições ou violência física moderada?'
      },
      abuso_coercao_sexual: {
        type: 'noul',
        instructions: 'O filme aborda ou retrata agressão sexual, assédio grave, coerção, tentativa de estupro ou violência sexual?'
      },
      sexo_explicito: {
        type: 'noul',
        instructions: 'O filme contém cenas de nudez frontal, sexo explícito, forte erotismo gráfico ou prostituição?'
      },
      insinuacoes_sexuais: {
        type: 'noul',
        instructions: 'O filme aborda insinuações sexuais, conversas adultas de sedução ou temas maduros de relacionamento sem sexo explícito?'
      },
      drogas_alcool: {
        type: 'noul',
        instructions: 'O filme aborda uso explícito de drogas ilícitas, dependência química ou consumo excessivo/problemático de álcool?'
      },
      linguagem_forte: {
        type: 'noul',
        instructions: 'O filme possui uso frequente de linguagem vulgar, ofensiva ou palavrões?'
      },
      perturbador_angustia: {
        type: 'noul',
        instructions: 'O filme possui cenas profundamente angustiantes, pânico, violência psicológica, situações extremas de sobrevivência, desespero ou vulnerabilidade?'
      },
      preconceito_discriminacao: {
        type: 'noul',
        instructions: 'O filme aborda preconceito, discriminação, intolerância social ou perseguição sistêmica como conflito central?'
      },
      humor_acido: {
        type: 'noul',
        instructions: 'O filme utiliza humor ácido, humor negro, piadas controversas ou sátira corrosiva?'
      }
    };


    try {
      const response = await axios.post<JevDecisionResponse>(
        this.apiUrl,
        {
          model: this.defaultModel,
          state,
          questions
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://vibesfilm.com',
            'X-Title': 'Vibesfilm'
          },
          timeout: 10000
        }
      );

      const data = response.data;
      if (!data.answers) {
        return {
          success: false,
          error: data.error?.message || 'Resposta da API Jev não continha decisões (answers)'
        };
      }

      const probabilities: Record<string, number> = {};
      for (const [key, val] of Object.entries(data.answers)) {
        if (typeof val.noul === 'number') {
          probabilities[key] = val.noul;
        }
      }

      const warning = this.synthesizeWarning(probabilities, options?.thresholds);

      return {
        success: true,
        warning,
        probabilities,
        cost: data.usage?.cost
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.error?.message || error?.message;
      return {
        success: false,
        error: `Falha na API Jev (${status || 'N/A'}): ${message}`
      };
    }
  }

  private buildMovieState(movie: MovieContentWarningInput): string {
    const parts: string[] = [];
    parts.push(`Filme: ${movie.title}${movie.year ? ` (${movie.year})` : ''}`);
    if (movie.certification) {
      parts.push(`Classificação Indicativa: ${movie.certification}${movie.certification === '18' ? ' anos (conteúdo restrito / estritamente adulto)' : ''}`);
    }
    if (movie.genres && movie.genres.length > 0) {
      parts.push(`Gêneros: ${movie.genres.join(', ')}`);
    }
    if (movie.keywords && movie.keywords.length > 0) {
      parts.push(`Palavras-chave: ${movie.keywords.slice(0, 60).join(', ')}`);
    }
    if (movie.description) {
      parts.push(`Sinopse: ${movie.description}`);
    }
    if (movie.sentimentContext) {
      parts.push(`Contexto emocional: ${movie.sentimentContext}`);
    }
    return parts.join('\n');
  }

  synthesizeWarning(
    probs: Record<string, number>,
    thresholdInput?: Record<string, number> | number
  ): string {
    const isGlobal = typeof thresholdInput === 'number';
    const getThresh = (cat: string) =>
      isGlobal
        ? (thresholdInput as number)
        : getCategoryThreshold(cat, thresholdInput as Record<string, number>);

    const clauses: string[] = [];

    // 1. Violência (Hierárquica: Extrema > Brutalidade > Guerra > Moderada/Ação)
    const hasViolenciaExtrema = (probs.violencia_extrema || 0) >= getThresh('violencia_extrema');
    const hasViolenciaBrutalidade = (probs.violencia_brutalidade || 0) >= getThresh('violencia_brutalidade');
    const hasViolenciaGuerra = (probs.violencia_guerra || 0) >= getThresh('violencia_guerra');
    const hasViolenciaModerada = (probs.violencia_moderada || 0) >= getThresh('violencia_moderada');

    if (hasViolenciaGuerra) {
      if (hasViolenciaExtrema) {
        clauses.push('cenas de combate militar e violência gráfica extrema');
      } else if (hasViolenciaBrutalidade) {
        clauses.push('cenas intensas de combate e brutalidade');
      } else {
        clauses.push('cenas intensas de combate e violência de guerra');
      }
    } else {
      if (hasViolenciaExtrema) {
        clauses.push('cenas de violência gráfica extrema');
      } else if (hasViolenciaBrutalidade) {
        clauses.push('cenas de violência física e brutalidade');
      } else if (hasViolenciaModerada) {
        clauses.push('cenas de violência e perigo');
      }
    }

    // 2. Abuso / Coerção Sexual (Alerta de gatilho de alta sensibilidade)
    const hasAbusoCoercaoSexual = (probs.abuso_coercao_sexual || 0) >= getThresh('abuso_coercao_sexual');
    if (hasAbusoCoercaoSexual) {
      clauses.push('temas sensíveis de agressão ou coerção sexual');
    }

    // 3. Sexo / Nudez Consensual (Hierárquica: se explícito, ignora insinuações; se há agressão sexual grave, omite insinuações brandas)
    if ((probs.sexo_explicito || 0) >= getThresh('sexo_explicito')) {
      clauses.push('cenas de sexo explícito e nudez');
    } else if (!hasAbusoCoercaoSexual && (probs.insinuacoes_sexuais || 0) >= getThresh('insinuacoes_sexuais')) {
      clauses.push('insinuações sexuais e conteúdo adulto');
    }

    // 4. Drogas e Álcool
    if ((probs.drogas_alcool || 0) >= getThresh('drogas_alcool')) {
      if ((probs.drogas_alcool || 0) >= 0.70) {
        clauses.push('uso explícito de drogas ou substâncias entorpecentes');
      } else {
        clauses.push('referências ao uso de drogas e álcool');
      }
    }

    // 5. Linguagem
    if ((probs.linguagem_forte || 0) >= getThresh('linguagem_forte')) {
      clauses.push('linguagem forte');
    }

    // 6. Angústia / Perturbador
    if ((probs.perturbador_angustia || 0) >= getThresh('perturbador_angustia')) {
      clauses.push('situações emocionalmente angustiantes ou perturbadoras');
    }

    // 7. Preconceito / Discriminação
    if ((probs.preconceito_discriminacao || 0) >= getThresh('preconceito_discriminacao')) {
      clauses.push('temas de discriminação e preconceito');
    }

    // 8. Humor Ácido
    if ((probs.humor_acido || 0) >= getThresh('humor_acido')) {
      clauses.push('humor ácido e situações controversas');
    }

    if (clauses.length === 0) {
      return 'Atenção: nenhum alerta de conteúdo significativo.';
    }

    if (clauses.length === 1) {
      return `Atenção: contém ${clauses[0]}.`;
    }

    if (clauses.length === 2) {
      return `Atenção: contém ${clauses[0]} e ${clauses[1]}.`;
    }

    const allButLast = clauses.slice(0, -1).join(', ');
    const last = clauses[clauses.length - 1];
    return `Atenção: contém ${allButLast} e ${last}.`;
  }

  /**
   * Avalia o alinhamento de um filme com uma lista de SubSentimentos candidatos para uma jornada usando Jev
   */
  async evaluateSentimentAlignment(
    input: MovieSentimentAlignmentInput,
    options?: { threshold?: number }
  ): Promise<JevSentimentAlignmentResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'OPENROUTER_API_KEY não configurada nas variáveis de ambiente'
      };
    }

    if (!input.candidates || input.candidates.length === 0) {
      return {
        success: false,
        error: 'Nenhum SubSentiment candidato fornecido para avaliação'
      };
    }

    const state = this.buildSentimentState(input);
    const questions: Record<string, { type: 'noul'; instructions: string }> = {};

    for (const cand of input.candidates) {
      const kwHint = cand.keywords && cand.keywords.length > 0
        ? ` (conceitos associados: ${cand.keywords.slice(0, 4).join(', ')})`
        : '';
      questions[`sub_${cand.id}`] = {
        type: 'noul',
        instructions: `Considerando a jornada "${input.journeyOptionText}" e o tom do filme, a obra aborda de forma evidente e relevante o sentimento/tema "${cand.name}"${kwHint}?`
      };
    }

    const startTime = Date.now();
    try {
      const response = await axios.post<JevDecisionResponse>(
        this.apiUrl,
        {
          model: this.defaultModel,
          state,
          questions
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://vibesfilm.com',
            'X-Title': 'Vibesfilm'
          },
          timeout: 15000
        }
      );

      const durationMs = Date.now() - startTime;
      const data = response.data;
      if (!data.answers) {
        return {
          success: false,
          error: data.error?.message || 'Resposta da API Jev não continha decisões (answers)'
        };
      }

      const threshold = options?.threshold ?? 0.55;
      const alignments: SentimentAlignmentItemResult[] = [];

      for (const cand of input.candidates) {
        const ans = data.answers[`sub_${cand.id}`];
        const rawProb = typeof ans?.noul === 'number' ? ans.noul : 0;
        alignments.push({
          subSentimentId: cand.id,
          name: cand.name,
          relevance: Number(rawProb.toFixed(3)),
          expectedWeight: cand.expectedWeight,
          isActivated: rawProb >= threshold
        });
      }

      // Ordenar por relevância decrescente
      alignments.sort((a, b) => b.relevance - a.relevance);

      return {
        success: true,
        alignments,
        rawAnswers: data.answers,
        cost: data.usage?.cost,
        durationMs
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.error?.message || error?.message;
      return {
        success: false,
        error: `Falha na API Jev (${status || 'N/A'}): ${message}`
      };
    }
  }

  private buildSentimentState(input: MovieSentimentAlignmentInput): string {
    const parts: string[] = [];
    parts.push(`Filme: ${input.title}${input.year ? ` (${input.year})` : ''}`);
    if (input.genres && input.genres.length > 0) {
      parts.push(`Gêneros: ${input.genres.join(', ')}`);
    }
    if (input.keywords && input.keywords.length > 0) {
      parts.push(`Palavras-chave do Filme: ${input.keywords.slice(0, 60).join(', ')}`);
    }
    if (input.description) {
      parts.push(`Sinopse: ${input.description}`);
    }
    if (input.mainSentimentName) {
      parts.push(`Lente Emocional Principal: ${input.mainSentimentName}${input.mainSentimentKeywords?.length ? ` (Keywords da Lente: ${input.mainSentimentKeywords.join(', ')})` : ''}`);
    }
    if (input.intentionType) {
      parts.push(`Intenção Emocional do Espectador: [${input.intentionType}]${input.intentionDescription ? ` "${input.intentionDescription}"` : ''}`);
    }
    parts.push(`Opção de Jornada Específica: "${input.journeyOptionText}"`);

    // Identificar conexões semânticas explícitas (interseção ou proximidade de keywords)
    if (input.keywords && input.keywords.length > 0) {
      const movieKwLower = new Set(input.keywords.map(k => k.toLowerCase().trim()));
      const matchedConcepts: string[] = [];

      // Checar com keywords do MainSentiment
      if (input.mainSentimentKeywords) {
        for (const mk of input.mainSentimentKeywords) {
          const mkLow = mk.toLowerCase().trim();
          if (movieKwLower.has(mkLow) || [...movieKwLower].some(mk2 => mk2.length >= 4 && (mk2.includes(mkLow) || mkLow.includes(mk2)))) {
            matchedConcepts.push(mk);
          }
        }
      }

      // Checar com keywords dos SubSentiments
      if (input.candidates) {
        for (const cand of input.candidates) {
          if (cand.keywords) {
            for (const sk of cand.keywords) {
              const skLow = sk.toLowerCase().trim();
              if (movieKwLower.has(skLow) || [...movieKwLower].some(mk2 => mk2.length >= 4 && (mk2.includes(skLow) || skLow.includes(mk2)))) {
                matchedConcepts.push(`${cand.name} (${sk})`);
              }
            }
          }
        }
      }

      if (matchedConcepts.length > 0) {
        const uniqueMatches = Array.from(new Set(matchedConcepts));
        parts.push(`Conexões Temáticas Diretas Identificadas: ${uniqueMatches.slice(0, 12).join(', ')}`);
      }
    }

    return parts.join('\n');
  }
}

export const jevService = new JevService();

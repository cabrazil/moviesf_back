import axios from 'axios';

export interface MovieContentWarningInput {
  title: string;
  year?: number;
  genres?: string[];
  keywords?: string[];
  description?: string;
  sentimentContext?: string;
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

export class JevService {
  private readonly apiUrl = 'https://openrouter.ai/api/alpha/decisions';
  private readonly defaultModel = process.env.JEV_MODEL || '~typesafe/jev-latest';

  /**
   * Avalia um filme e gera contentWarnings padronizados utilizando o modelo Jev (TypeSafe AI) via OpenRouter
   */
  async evaluateContentWarnings(movie: MovieContentWarningInput): Promise<JevContentWarningResult> {
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
        instructions: 'O filme contém cenas explícitas de violência gráfica, sangue excessivo, decapitação, mutilação ou combate visceral?'
      },
      violencia_moderada: {
        type: 'noul',
        instructions: 'O filme contém ação, lutas físicas, perseguições ou perigo sem violência visceral gráfica?'
      },
      sexo_explicito: {
        type: 'noul',
        instructions: 'O filme contém cenas de nudez frontal ou sexo explícito/gráfico?'
      },
      insinuacoes_sexuais: {
        type: 'noul',
        instructions: 'O filme aborda insinuações sexuais, conversas adultas de sedução ou temas maduros de relacionamento sem sexo explícito?'
      },
      drogas_alcool: {
        type: 'noul',
        instructions: 'O filme aborda uso explícito de drogas ilícitas ou consumo excessivo/problemático de álcool?'
      },
      linguagem_forte: {
        type: 'noul',
        instructions: 'O filme possui uso frequente de linguagem vulgar, ofensiva ou palavrões?'
      },
      perturbador_angustia: {
        type: 'noul',
        instructions: 'O filme possui cenas profundamente angustiantes, desintegração psicológica, terror de sobrevivência, luto severo ou suicídio?'
      },
      preconceito_discriminacao: {
        type: 'noul',
        instructions: 'O filme aborda racismo, discriminação, homofobia ou perseguição sistêmica?'
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

      const warning = this.synthesizeWarning(probabilities);

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
    if (movie.genres && movie.genres.length > 0) {
      parts.push(`Gêneros: ${movie.genres.join(', ')}`);
    }
    if (movie.keywords && movie.keywords.length > 0) {
      parts.push(`Palavras-chave: ${movie.keywords.slice(0, 15).join(', ')}`);
    }
    if (movie.description) {
      parts.push(`Sinopse: ${movie.description}`);
    }
    if (movie.sentimentContext) {
      parts.push(`Contexto emocional: ${movie.sentimentContext}`);
    }
    return parts.join('\n');
  }

  private synthesizeWarning(probs: Record<string, number>, threshold = 0.70): string {
    const clauses: string[] = [];

    // 1. Violência (Hierárquica: se extrema, ignora moderada)
    if ((probs.violencia_extrema || 0) >= threshold) {
      clauses.push('cenas explícitas de violência extrema');
    } else if ((probs.violencia_moderada || 0) >= threshold) {
      clauses.push('violência moderada e cenas de ação');
    }

    // 2. Sexo / Nudez (Hierárquica: se explícito, ignora insinuações)
    if ((probs.sexo_explicito || 0) >= threshold) {
      clauses.push('nudez e conteúdo sexual explícito');
    } else if ((probs.insinuacoes_sexuais || 0) >= threshold) {
      clauses.push('insinuações sexuais e temas adultos');
    }

    // 3. Drogas e Álcool
    if ((probs.drogas_alcool || 0) >= threshold) {
      clauses.push('referências ao uso de drogas e álcool');
    }

    // 4. Linguagem
    if ((probs.linguagem_forte || 0) >= threshold) {
      clauses.push('linguagem forte');
    }

    // 5. Angústia / Perturbador
    if ((probs.perturbador_angustia || 0) >= threshold) {
      clauses.push('elementos que podem ser emocionalmente angustiantes e perturbadores');
    }

    // 6. Preconceito / Discriminação
    if ((probs.preconceito_discriminacao || 0) >= threshold) {
      clauses.push('temas de preconceito e discriminação');
    }

    // 7. Humor Ácido
    if ((probs.humor_acido || 0) >= threshold) {
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
}

export const jevService = new JevService();

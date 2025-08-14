import axios from 'axios';

export type AIProvider = 'openai' | 'gemini';

// Interfaces para tipagem das respostas das APIs
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface AIResponse {
  content: string;
  success: boolean;
  error?: string;
}

export interface AIConfig {
  provider: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

class AIProviderManager {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async generateResponse(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AIResponse> {
    const temperature = options?.temperature ?? this.config.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens ?? 600;

    switch (this.config.provider) {
      case 'openai':
        return this.generateOpenAIResponse(systemPrompt, userPrompt, temperature, maxTokens);
      case 'gemini':
        return this.generateGeminiResponse(systemPrompt, userPrompt, temperature, maxTokens);
      default:
        throw new Error(`Provedor de IA não suportado: ${this.config.provider}`);
    }
  }

  private async generateOpenAIResponse(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    try {
      const response = await axios.post<OpenAIResponse>('https://api.openai.com/v1/chat/completions', {
        model: this.config.model || 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      return { content, success: true };
    } catch (error) {
      console.error('Erro na API OpenAI:', error);
      return {
        content: '',
        success: false,
        error: `Erro OpenAI: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async generateContentWithOpenAI(
    userPrompt: string,
    systemPrompt: string
  ): Promise<AIResponse> {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      return { content, success: true };
    } catch (error) {
      console.error('Erro no fallback OpenAI:', error);
      return {
        content: '',
        success: false,
        error: `Erro OpenAI Fallback: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async generateGeminiResponse(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    try {
      // Prompt otimizado específico para Gemini
      const enhancedSystemPrompt = `
${systemPrompt}

INSTRUÇÕES ESPECÍFICAS PARA ANÁLISE PRECISA:
1. PRIORIZE SEMPRE subsentimentos que já existem na base de dados
2. Para cada gênero, considere os padrões comprovados:
   - Ação/Aventura: "Adrenalina / Emoção Intensa", "Deslumbramento Visual", "Inspiração / Motivação para Agir"
   - Romance/Comédia Romântica: "Conforto / Aconchego Emocional", "Doçura / Encanto", "Nostalgia (Positiva)"
   - Família/Animação: "Leveza / Diversão Descompromissada", "Conforto / Aconchego Emocional", "Doçura / Encanto"
   - Suspense/Thriller: "Suspense Crescente", "Desintegração Psicológica", "Desespero Crescente"
   - Drama Guerra: "Conflito e Sobrevivência", "Esperança e Superação", "Conexão Humana e Natureza"
   - Coming-of-age: "Autodescoberta e Crescimento", "Esperança e Superação", "Conexão Humana e Natureza"
3. EVITE criar novos subsentimentos sem necessidade crítica real
4. Use vocabulário técnico cinematográfico preciso e específico
5. Foque na ESSÊNCIA emocional do filme para a jornada do usuário

FORMATO DE RESPOSTA OBRIGATÓRIO:
Responda SEMPRE com um JSON válido no formato exato:
\`\`\`json
{
  "suggestedSubSentiments": [
    {
      "name": "Nome do SubSentimento",
      "relevance": 0.95,
      "explanation": "Explicação detalhada",
      "isNew": false
    }
  ]
}
\`\`\`
`;

      // Combinar prompts otimizados
      const combinedPrompt = `${enhancedSystemPrompt}\n\n${userPrompt}`;
      
      const response = await axios.post<GeminiResponse>(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model || 'gemini-1.5-flash'}:generateContent`,
        {
          contents: [{
            parts: [{
              text: combinedPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,           // Mais determinístico
            maxOutputTokens: 1500,      // Aumentado para JSON completo
            topP: 0.8,                  // Menos restritivo para permitir criatividade
            topK: 20,                   // Menos restritivo 
            candidateCount: 1           // Uma resposta apenas
            // Removido stopSequences que estava cortando o JSON
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          params: {
            key: process.env.GEMINI_API_KEY
          }
        }
      );

      const content = response.data.candidates[0].content.parts[0].text;
      return {
        content,
        success: true
      };
    } catch (error) {
      console.error('Erro na API Gemini:', error);
      
      // Verificar se é erro 503 (Service Unavailable)
      if (axios.isAxiosError(error) && error.response?.status === 503) {
        console.log('🔄 Erro 503 detectado - Tentando fallback para OpenAI...');
        
        // Fallback para OpenAI se disponível
        if (process.env.OPENAI_API_KEY) {
          try {
            console.log('🔄 Usando OpenAI como fallback...');
            const openaiResult = await this.generateContentWithOpenAI(userPrompt, enhancedSystemPrompt);
            if (openaiResult.success) {
              console.log('✅ Fallback para OpenAI bem-sucedido');
              return openaiResult;
            }
          } catch (fallbackError) {
            console.error('❌ Fallback para OpenAI também falhou:', fallbackError);
          }
        }
      }
      
      return {
        content: '',
        success: false,
        error: `Erro Gemini: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

export function createAIProvider(config: AIConfig): AIProviderManager {
  return new AIProviderManager(config);
}

export function getDefaultConfig(provider: AIProvider): AIConfig {
  return {
    provider,
    model: provider === 'openai' ? 'gpt-4-turbo' : 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 2000
  };
}

// Sistema de decisão automática de AI Provider
interface MovieContext {
  genres?: string[];
  keywords?: string[];
  analysisLens?: number;
  isComplexDrama?: boolean;
}

export function selectOptimalAIProvider(context: MovieContext): AIProvider {
  const { genres = [], keywords = [], analysisLens, isComplexDrama } = context;
  
  // Converter para lowercase para comparação
  const lowerGenres = genres.map(g => g.toLowerCase());
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  
  // OpenAI necessário para casos complexos
  const complexIndicators = [
    'coming-of-age', 'chegando à maioridade', 'adolescente', 'autodescoberta',
    'thriller psicológico', 'suspense psicológico', 'psicológico',
    'drama complexo', 'trauma', 'depressão', 'saúde mental'
  ];
  
  const isComplex = complexIndicators.some(indicator => 
    lowerKeywords.includes(indicator) || lowerGenres.includes(indicator)
  );
  
  // Coming-of-age sempre OpenAI
  if (isComplex || isComplexDrama) {
    return 'openai';
  }
  
  // Gemini excelente para estes gêneros
  const geminiOptimalGenres = [
    'romance', 'comédia romântica', 'família', 'animação', 
    'comédia', 'aventura', 'ação'
  ];
  
  const isGeminiOptimal = geminiOptimalGenres.some(genre => 
    lowerGenres.includes(genre) || lowerKeywords.includes(genre)
  );
  
  if (isGeminiOptimal) {
    return 'gemini';
  }
  
  // Lógica por lente de análise
  switch (analysisLens) {
    case 13: // Feliz - Gemini bom para conteúdo positivo
    case 17: // Animado - Gemini bom para energia
      return 'gemini';
    
    case 14: // Triste - Depende do contexto
      return isComplex ? 'openai' : 'gemini';
    
    case 16: // Ansioso - OpenAI melhor para suspense
      return 'openai';
    
    default:
      return 'gemini'; // Default para economia
  }
}

// Função de conveniência para criar provider automaticamente
export function createAutoAIProvider(context: MovieContext): AIProviderManager {
  const provider = selectOptimalAIProvider(context);
  const config = getDefaultConfig(provider);
  return new AIProviderManager(config);
} 
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AIProvider = 'openai' | 'gemini' | 'deepseek' | 'kimi';

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

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface KimiResponse {
  choices: Array<{
    message: {
      content: string;
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
      case 'deepseek':
        return this.generateDeepSeekResponse(systemPrompt, userPrompt, temperature, maxTokens);
      case 'kimi':
        return this.generateKimiResponse(systemPrompt, userPrompt, temperature, maxTokens);
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
      const modelToUse = this.config.model || 'gpt-4-turbo';

      const response = await axios.post<OpenAIResponse>('https://api.openai.com/v1/chat/completions', {
        model: modelToUse,
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
    } catch (error: any) {
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.error?.message || error?.message;
      const modelUsed = this.config.model || 'gpt-4-turbo';

      console.error(`Erro na API OpenAI (modelo: ${modelUsed}):`, {
        status,
        message: errorMessage,
        error: error?.response?.data
      });

      return {
        content: '',
        success: false,
        error: `Erro OpenAI (${status || 'N/A'}): ${errorMessage || 'Erro desconhecido'}`
      };
    }
  }

  private async generateContentWithOpenAI(
    userPrompt: string,
    systemPrompt: string
  ): Promise<AIResponse> {
    try {
      const response = await axios.post<OpenAIResponse>('https://api.openai.com/v1/chat/completions', {
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

  /**
   * Extrai JSON de uma string que pode conter markdown ou texto adicional.
   * Se não encontrar JSON válido, retorna o texto original (útil para texto puro como hooks e warnings).
   */
  private extractJSONFromResponse(text: string): string {
    // Tentar encontrar JSON dentro de markdown code blocks
    const markdownJsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (markdownJsonMatch) {
      try {
        // Validar se é JSON válido
        JSON.parse(markdownJsonMatch[1]);
        return markdownJsonMatch[1];
      } catch {
        // Se não for JSON válido, continuar procurando
      }
    }

    // Tentar encontrar JSON direto (pode estar no início ou meio do texto)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        // Validar se é JSON válido
        JSON.parse(jsonMatch[0]);
        return jsonMatch[0];
      } catch {
        // Se não for JSON válido, pode ser texto que contém chaves mas não é JSON
        // Retornar texto original para preservar conteúdo de hooks/warnings
      }
    }

    // Se não encontrou JSON válido, retornar o texto original
    // Isso é importante para hooks e warnings que são texto puro
    return text;
  }

  private async generateGeminiResponse(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    // Verificar se esperamos JSON (análise de sentimentos) ou texto puro (hooks, warnings)
    const expectsJSON = systemPrompt.includes('suggestedSubSentiments') ||
      systemPrompt.includes('JSON') ||
      userPrompt.includes('suggestedSubSentiments') ||
      userPrompt.includes('JSON válido');

    let enhancedSystemPrompt: string;

    if (expectsJSON) {
      // Prompt otimizado para análise de sentimentos (JSON obrigatório)
      enhancedSystemPrompt = `
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

FORMATO DE RESPOSTA OBRIGATÓRIO - CRÍTICO:
⚠️ IMPORTANTE: Responda APENAS com JSON válido, SEM markdown, SEM texto adicional, SEM explicações.
⚠️ NÃO use blocos de código markdown (três backticks seguidos).
⚠️ NÃO adicione texto antes ou depois do JSON.
⚠️ Responda DIRETAMENTE com o JSON puro no formato exato abaixo:

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
`;
    } else {
      // Prompt para texto puro (hooks, warnings, etc.) - sem instruções rígidas de JSON
      enhancedSystemPrompt = `
${systemPrompt}

INSTRUÇÕES IMPORTANTES:
⚠️ Responda APENAS com o texto solicitado, SEM markdown, SEM blocos de código, SEM JSON.
⚠️ NÃO use formatação markdown (três backticks seguidos).
⚠️ NÃO adicione explicações ou texto adicional.
⚠️ Responda DIRETAMENTE com o conteúdo solicitado.
`;
    }

    // Combinar prompts otimizados
    const combinedPrompt = `${enhancedSystemPrompt}\n\n${userPrompt}`;

    const modelToUse = this.config.model || 'gemini-2.5-flash';

    console.log(`🤖 Tentando Gemini com biblioteca oficial (modelo: ${modelToUse})...`);

    // Verificar se a chave de API está disponível
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY não encontrada nas variáveis de ambiente');
      return {
        content: '',
        success: false,
        error: 'GEMINI_API_KEY não configurada'
      };
    }

    try {
      // Inicializar a biblioteca oficial do Google
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      // Obter o modelo
      const model = genAI.getGenerativeModel({
        model: modelToUse,
        generationConfig: {
          temperature: 0.2,           // Mais determinístico
          maxOutputTokens: maxTokens, // Usar o parametro passado (default 2000 ou o que vier do script)
          topP: 0.8,
          topK: 20
        }
      });

      // Log apenas em desenvolvimento para debug detalhado
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Usando biblioteca oficial @google/generative-ai`);
        console.log(`📏 Tamanho do prompt: ${combinedPrompt.length} caracteres`);
        console.log(`🎫 Max Tokens solicitados: ${maxTokens}`);
      }

      // Gerar conteúdo usando a biblioteca oficial
      const result = await model.generateContent(combinedPrompt);
      const response = await result.response;

      if (!response || !response.text) {
        throw new Error('Resposta vazia - nenhum texto retornado');
      }

      let content = response.text();

      // Extrair JSON se vier em markdown ou com texto adicional
      content = this.extractJSONFromResponse(content);

      return {
        content,
        success: true
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido';
      const status = error?.status || error?.response?.status;

      // Log do erro
      if (status === 429 || errorMessage.includes('429') || errorMessage.includes('quota')) {
        console.error(`Erro 429 (Quota excedida) na API Gemini`);
      } else if (status === 503 || errorMessage.includes('503') || errorMessage.includes('unavailable')) {
        console.error(`Erro 503 (Service Unavailable) na API Gemini`);
      } else if (status === 404 || errorMessage.includes('404') || errorMessage.includes('not found')) {
        console.error(`Erro 404 (Modelo não encontrado): ${modelToUse}`);
      } else {
        console.error(`Erro na API Gemini:`, errorMessage);
      }

      // Fallback 1: DeepSeek se disponível (forçar modelo correto)
      if (process.env.DEEPSEEK_API_KEY) {
        try {
          console.log('🔄 Erro persistente no Gemini - tentando fallback para DeepSeek (modelo: deepseek-chat)...');
          const deepseekResult = await this.generateDeepSeekResponse(systemPrompt, userPrompt, temperature, maxTokens, 'deepseek-chat');
          if (deepseekResult.success) {
            console.log('✅ Fallback para DeepSeek bem-sucedido (modelo: deepseek-chat)');
            return deepseekResult;
          } else {
            console.warn('⚠️ Fallback DeepSeek retornou erro:', deepseekResult.error);
          }
        } catch (fallbackError: any) {
          console.error('❌ Fallback para DeepSeek falhou:', fallbackError?.message || fallbackError);
        }
      }

      // Fallback 2: OpenAI como último recurso
      if (process.env.OPENAI_API_KEY) {
        try {
          console.log('🔄 DeepSeek falhou - tentando fallback final para OpenAI (modelo: gpt-4-turbo)...');
          const openaiResult = await this.generateOpenAIResponse(systemPrompt, userPrompt, temperature, maxTokens);
          if (openaiResult.success) {
            console.log('✅ Fallback para OpenAI bem-sucedido (modelo: gpt-4-turbo)');
            return openaiResult;
          } else {
            console.warn('⚠️ Fallback OpenAI retornou erro:', openaiResult.error);
          }
        } catch (fallbackError: any) {
          console.error('❌ Fallback para OpenAI também falhou:', fallbackError?.message || fallbackError);
        }
      }

      return {
        content: '',
        success: false,
        error: 'Erro Gemini: falha após tentar biblioteca oficial, fallback DeepSeek e fallback OpenAI.'
      };
    }
  }

  private async generateDeepSeekResponse(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number,
    forcedModel?: string
  ): Promise<AIResponse> {
    try {
      // Usar modelo forçado se fornecido, senão usar o do config, senão usar padrão
      // Isso corrige o bug onde fallback do Gemini tentava usar 'gemini-2.5-flash' no DeepSeek
      const modelToUse = forcedModel || this.config.model || 'deepseek-chat';

      // Log do modelo sendo usado (apenas se for diferente do esperado)
      if (forcedModel && forcedModel !== this.config.model) {
        console.log(`📌 Usando modelo forçado para DeepSeek: ${modelToUse} (config original: ${this.config.model})`);
      }

      // Validar e limitar maxTokens (alguns modelos têm limites)
      const safeMaxTokens = Math.min(maxTokens, 4000); // Limite seguro para DeepSeek

      // Validar tamanho do prompt (alguns modelos têm limite de contexto)
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      if (combinedPrompt.length > 100000) {
        console.warn('⚠️ Prompt muito longo para DeepSeek, truncando...');
        const truncatedUserPrompt = userPrompt.substring(0, 50000);
        const response = await axios.post<DeepSeekResponse>('https://api.deepseek.com/v1/chat/completions', {
          model: modelToUse,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: truncatedUserPrompt }
          ],
          temperature,
          max_tokens: safeMaxTokens
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        const content = response.data.choices[0].message.content;
        return { content, success: true };
      }

      const response = await axios.post<DeepSeekResponse>('https://api.deepseek.com/v1/chat/completions', {
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: safeMaxTokens
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('Resposta vazia - nenhuma escolha retornada');
      }

      const content = response.data.choices[0].message.content;
      return { content, success: true };
    } catch (error: any) {
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message;

      const modelUsed = forcedModel || this.config.model || 'deepseek-chat';
      console.error(`Erro na API DeepSeek (modelo: ${modelUsed}):`, {
        status,
        message: errorMessage,
        error: error?.response?.data
      });

      return {
        content: '',
        success: false,
        error: `Erro DeepSeek (${status || 'N/A'}): ${errorMessage || 'Erro desconhecido'}`
      };
    }
  }

  private async generateKimiResponse(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    try {
      const modelToUse = this.config.model || 'moonshotai/kimi-k2.5';
      const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

      console.log(`🤖 Tentando Kimi (via Nvidia) modelo: ${modelToUse}...`);

      if (!process.env.KIMI_API_KEY) {
        throw new Error('KIMI_API_KEY não configurada nas variáveis de ambiente');
      }

      const response = await axios.post<KimiResponse>(invokeUrl, {
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: maxTokens, // User example limits to 16384, but we use strict args
        temperature: temperature,
        top_p: 1.00,
        stream: false,
        chat_template_kwargs: { thinking: true } // As per user example
      }, {
        headers: {
          "Authorization": `Bearer ${process.env.KIMI_API_KEY}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('Resposta vazia - nenhuma escolha retornada');
      }

      const content = response.data.choices[0].message.content;
      return { content, success: true };

    } catch (error: any) {
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message;

      console.error(`Erro na API Kimi/Nvidia:`, {
        status,
        message: errorMessage,
        error: error?.response?.data
      });

      return {
        content: '',
        success: false,
        error: `Erro Kimi (${status || 'N/A'}): ${errorMessage || 'Erro desconhecido'}`
      };
    }
  }
}

export function createAIProvider(config: AIConfig): AIProviderManager {
  return new AIProviderManager(config);
}

export function getDefaultConfig(provider: AIProvider): AIConfig {
  const modelMap = {
    openai: 'gpt-3.5-turbo', // Downgrade seguro para evitar erros de cota (era gpt-4-turbo)
    gemini: 'gemini-2.5-flash',
    deepseek: 'deepseek-chat',
    kimi: 'moonshotai/kimi-k2.5'
  };

  return {
    provider,
    model: modelMap[provider],
    temperature: provider === 'deepseek' || provider === 'kimi' ? 1.0 : 0.7,
    maxTokens: provider === 'kimi' ? 4000 : 2000
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
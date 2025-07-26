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

  private async generateGeminiResponse(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    try {
      // Combinar system e user prompt para Gemini (que não tem system role)
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      const response = await axios.post<GeminiResponse>(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model || 'gemini-1.5-flash'}:generateContent`,
        {
          contents: [{
            parts: [{
              text: combinedPrompt
            }]
          }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topP: 0.8,
            topK: 40
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
      return { content, success: true };
    } catch (error) {
      console.error('Erro na API Gemini:', error);
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
  const configs = {
    openai: {
      provider: 'openai' as const,
      model: 'gpt-4-turbo',
      temperature: 0.7,
      maxTokens: 600
    },
    gemini: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 600
    }
  };

  return configs[provider];
} 
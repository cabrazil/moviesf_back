export interface CurationConfig {
  // Configurações da API
  openai: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  
  // Configurações do TMDB
  tmdb: {
    language: string;
    region: string;
  };
  
  // Configurações de processamento
  processing: {
    batchSize: number;
    retryAttempts: number;
    delayBetweenRequests: number;
  };
  
  // Configurações de sentimentos
  sentiment: {
    minRelevanceScore: number;
    maxSubSentiments: number;
    requiredWeightThreshold: number;
  };
  
  // Configurações de validação
  validation: {
    minKeywordMatches: number;
    genreCompatibilityStrict: boolean;
  };
  
  // Configurações de arquivos
  files: {
    insertsPath: string;
    csvPath: string;
    logPath: string;
  };
}

export const defaultCurationConfig: CurationConfig = {
  openai: {
    model: 'gpt-4-turbo',
    temperature: 0.5,
    maxTokens: 600
  },
  
  tmdb: {
    language: 'pt-BR',
    region: 'BR'
  },
  
  processing: {
    batchSize: 10,
    retryAttempts: 3,
    delayBetweenRequests: 1000
  },
  
  sentiment: {
    minRelevanceScore: 0.5,
    maxSubSentiments: 3,
    requiredWeightThreshold: 0.7
  },
  
  validation: {
    minKeywordMatches: 2,
    genreCompatibilityStrict: false
  },
  
  files: {
    insertsPath: '../inserts.sql',
    csvPath: '../movies_list.csv',
    logPath: '../logs/curation.log'
  }
};

// Ambientes específicos
export const developmentConfig: Partial<CurationConfig> = {
  openai: {
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 500
  },
  
  processing: {
    batchSize: 5,
    retryAttempts: 2,
    delayBetweenRequests: 2000
  }
};

export const productionConfig: Partial<CurationConfig> = {
  openai: {
    model: 'gpt-4-turbo',
    temperature: 0.3,
    maxTokens: 800
  },
  
  processing: {
    batchSize: 20,
    retryAttempts: 5,
    delayBetweenRequests: 500
  },
  
  validation: {
    minKeywordMatches: 3,
    genreCompatibilityStrict: true
  }
};

// Factory para criar configuração baseada no ambiente
export function createCurationConfig(env: string = 'development'): CurationConfig {
  const baseConfig = { ...defaultCurationConfig };
  
  switch (env) {
    case 'development':
      return { ...baseConfig, ...developmentConfig };
    case 'production':
      return { ...baseConfig, ...productionConfig };
    default:
      return baseConfig;
  }
}

// Validação de configuração
export function validateCurationConfig(config: CurationConfig): boolean {
  const requiredEnvVars = ['OPENAI_API_KEY', 'TMDB_API_KEY', 'DATABASE_URL'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Variável de ambiente obrigatória não encontrada: ${envVar}`);
    }
  }
  
  if (config.sentiment.minRelevanceScore < 0 || config.sentiment.minRelevanceScore > 1) {
    throw new Error('minRelevanceScore deve estar entre 0 e 1');
  }
  
  if (config.processing.batchSize < 1 || config.processing.batchSize > 100) {
    throw new Error('batchSize deve estar entre 1 e 100');
  }
  
  return true;
} 
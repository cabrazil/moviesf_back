// Configuração de ambiente
export const ENV_CONFIG = {
  // Verificar se está rodando na Vercel
  IS_VERCEL: process.env.VERCEL === '1',
  
  // Verificar se está em desenvolvimento
  IS_DEV: process.env.NODE_ENV === 'development',
  
  // Verificar se está em produção
  IS_PROD: process.env.NODE_ENV === 'production',
  
  // Porta do servidor
  PORT: process.env.PORT || 3000,
  
  // URLs de conexão
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  
  // API Keys
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Configurações específicas da Vercel
  VERCEL: {
    MAX_DURATION: 30,
    REGIONS: ['iad1', 'sfo1']
  }
} as const;

// Função para obter a URL base da API
export const getApiBaseUrl = (): string => {
  if (ENV_CONFIG.IS_VERCEL) {
    // Na Vercel, usar a URL do projeto
    return process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://moviesf-back.vercel.app';
  }
  
  // Local
  return `http://localhost:${ENV_CONFIG.PORT}`;
};

// Função para verificar se deve usar SSL
export const shouldUseSSL = (): boolean => {
  return ENV_CONFIG.IS_VERCEL || ENV_CONFIG.IS_PROD;
};

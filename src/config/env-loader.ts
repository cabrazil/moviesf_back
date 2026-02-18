/**
 * Carregador de variáveis de ambiente
 * 
 * Prioridade de carregamento:
 * 1. .env.{NODE_ENV} (development ou production) - maior prioridade
 * 2. .env.local (opcional, override se necessário)
 * 3. .env (fallback)
 * 
 * Uso:
 * - Desenvolvimento: NODE_ENV=development npm run dev
 * - Produção: NODE_ENV=production npm start
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Carrega variáveis de ambiente na ordem de prioridade correta
 */
export function loadEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const projectRoot = path.resolve(__dirname, '../..');

  // 1. Carregar .env.{NODE_ENV} baseado no ambiente (maior prioridade)
  const envSpecificPath = path.join(projectRoot, `.env.${nodeEnv}`);
  const hasEnvSpecific = fs.existsSync(envSpecificPath);

  if (hasEnvSpecific) {
    dotenv.config({ path: envSpecificPath, override: false });
    if (nodeEnv !== 'production') {
      console.log(`📋 Carregado: .env.${nodeEnv}`);
    }
  } else {
    // Aviso se arquivo não existe
    if (nodeEnv !== 'production') {
      console.warn(`⚠️  Arquivo .env.${nodeEnv} não encontrado!`);
    }
  }

  // 2. Carregar .env.local apenas se NÃO existir arquivo específico de ambiente
  // (para manter compatibilidade com setups antigos que usam apenas .env.local)
  const localEnvPath = path.join(projectRoot, '.env.local');
  if (!hasEnvSpecific && fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: false });
    if (nodeEnv !== 'production') {
      console.log('📋 Carregado: .env.local');
    }
  } else if (hasEnvSpecific && fs.existsSync(localEnvPath)) {
    // Aviso se .env.local existe mas não será usado
    if (nodeEnv !== 'production') {
      console.log('ℹ️  .env.local ignorado (usando .env.' + nodeEnv + ')');
    }
  }

  // 3. Carregar .env como fallback
  const defaultEnvPath = path.join(projectRoot, '.env');
  if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath, override: false });
    if (nodeEnv !== 'production') {
      console.log('📋 Carregado: .env');
    }
  }

  // Log do ambiente atual
  const dbUrl = process.env.DATABASE_URL || '';
  const blogDbUrl = process.env.BLOG_DATABASE_URL || '';

  const dbHost = dbUrl.match(/@([^:]+)/)?.[1] || 'não configurado';
  const blogDbHost = blogDbUrl.match(/@([^:]+)/)?.[1] || 'não configurado';

  // Mostrar banner de ambiente apenas se não for subprocesso silencioso
  if (process.env.SILENT_ENV_LOG !== 'true') {
    console.log(`🌍 Ambiente: ${nodeEnv}`);
    console.log(`📊 DB Filmes: ${dbHost}`);
    console.log(`📝 DB Blog: ${blogDbHost}`);
  }
}

/**
 * Valida se as variáveis de ambiente obrigatórias estão configuradas
 */
export function validateEnvironment(): void {
  const required = ['DATABASE_URL', 'BLOG_DATABASE_URL'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não configuradas:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Dica: Execute ./scripts/setup-env.sh [development|production]');
    throw new Error(`Variáveis de ambiente obrigatórias faltando: ${missing.join(', ')}`);
  }
}


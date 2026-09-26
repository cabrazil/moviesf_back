/**
 * Helper para scripts de manutenção
 * Carrega variáveis de ambiente antes de executar scripts
 *
 * Sempre usa o banco de produção (.env) para consistência com o ambiente de deploy.
 *
 * Uso: Importe no início de qualquer script
 * import './scripts-helper';
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '../..');

// Sempre carregar .env (banco de produção)
dotenv.config({ path: path.join(projectRoot, '.env') });

// Sinalizar que as variáveis já foram carregadas (evita log duplo do env-loader)
process.env.SCRIPTS_ENV_LOADED = 'true';

// Validar variáveis obrigatórias
const required = ['DATABASE_URL'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('❌ Variáveis obrigatórias não configuradas:', missing.join(', '));
  console.error('   Verifique o arquivo .env na raiz do projeto.');
  process.exit(1);
}

// Banner informativo
const dbUrl = process.env.DATABASE_URL || '';
const dbHost = dbUrl.match(/@([^:/]+)/)?.[1] || 'não configurado';
console.log(`\n📋 Ambiente: produção (.env)`);
console.log(`📊 Banco: ${dbHost}\n`);


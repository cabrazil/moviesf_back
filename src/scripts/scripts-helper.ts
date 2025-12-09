/**
 * Helper para scripts de manutenção
 * Carrega variáveis de ambiente antes de executar scripts
 * 
 * Uso: Importe no início de qualquer script
 * import './scripts-helper';
 */

import { loadEnvironment, validateEnvironment } from '../config/env-loader';
import * as fs from 'fs';
import * as path from 'path';

// Se NODE_ENV não estiver definido, tentar detectar do arquivo de ambiente ativo
if (!process.env.NODE_ENV) {
  const projectRoot = path.resolve(__dirname, '../..');
  const envFiles = ['.env.development', '.env.production'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(projectRoot, envFile);
    if (fs.existsSync(envPath)) {
      // Verificar qual arquivo foi modificado mais recentemente (mais provável de estar ativo)
      const stats = fs.statSync(envPath);
      const env = envFile.replace('.env.', '');
      if (!process.env.NODE_ENV || 
          (fs.existsSync(path.join(projectRoot, `.env.${process.env.NODE_ENV}`)) &&
           stats.mtime > fs.statSync(path.join(projectRoot, `.env.${process.env.NODE_ENV}`)).mtime)) {
        process.env.NODE_ENV = env;
      }
    }
  }
}

// Carregar variáveis de ambiente antes de qualquer uso do Prisma
loadEnvironment();
validateEnvironment();

// Log do ambiente carregado (apenas se NODE_ENV não for production)
if (process.env.NODE_ENV !== 'production') {
  const dbUrl = process.env.DATABASE_URL || '';
  const dbHost = dbUrl.match(/@([^:]+)/)?.[1] || 'não configurado';
  console.log(`\n📋 Script executando com ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Conectando ao banco: ${dbHost}\n`);
}


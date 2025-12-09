#!/usr/bin/env node
/**
 * Script para configurar ambiente e executar o servidor
 * Uso: node scripts/setup-and-run.js [development|production] [dev|start]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const env = args[0] || 'development';
const command = args[1] || 'dev';

if (env !== 'development' && env !== 'production') {
  console.error('❌ Ambiente inválido:', env);
  console.error('Uso: node scripts/setup-and-run.js [development|production] [dev|start]');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const envFile = path.join(projectRoot, `.env.${env}`);

// Verificar se arquivo de ambiente existe
if (!fs.existsSync(envFile)) {
  const exampleFile = path.join(projectRoot, `.env.${env}.example`);
  if (fs.existsSync(exampleFile)) {
    console.error(`❌ Arquivo .env.${env} não encontrado!`);
    console.error(`💡 Copie o arquivo de exemplo: cp .env.${env}.example .env.${env}`);
    console.error(`💡 Ou execute: npm run env:setup:${env === 'development' ? 'dev' : 'prod'}`);
    console.error(`💡 Depois edite .env.${env} com suas credenciais reais.\n`);
  } else {
    console.error(`❌ Arquivo .env.${env} não encontrado!`);
    console.error(`❌ Arquivo de exemplo .env.${env}.example também não existe!\n`);
  }
  process.exit(1);
}

console.log(`📋 Usando ambiente: .env.${env}\n`);

// Executar comando npm com NODE_ENV definido
console.log(`🚀 Executando: NODE_ENV=${env} npm run ${command}\n`);

const npmProcess = spawn('npm', ['run', command], {
  env: {
    ...process.env,
    NODE_ENV: env
  },
  stdio: 'inherit',
  shell: true,
  cwd: projectRoot
});

npmProcess.on('error', (error) => {
  console.error('❌ Erro ao executar comando:', error);
  process.exit(1);
});

npmProcess.on('exit', (code) => {
  process.exit(code || 0);
});


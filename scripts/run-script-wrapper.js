#!/usr/bin/env node
/**
 * Wrapper para executar scripts com ambiente correto
 * Aceita argumentos do npm corretamente
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const env = args[0];
const scriptPath = args[1];
const scriptArgs = args.slice(2);

if (!env || (env !== 'development' && env !== 'production')) {
  console.error('❌ Uso: npm run script:dev|prod -- <script-path> [args...]');
  console.error('');
  console.error('Exemplos:');
  console.error('  npm run script:prod -- src/scripts/orchestrator.ts --title="Shrek" --year=2001');
  process.exit(1);
}

if (!scriptPath) {
  console.error('❌ Caminho do script não fornecido');
  console.error('💡 Use: npm run script:prod -- src/scripts/orchestrator.ts [args...]');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const envFile = path.join(projectRoot, `.env.${env}`);

if (!fs.existsSync(envFile)) {
  console.error(`❌ Arquivo .env.${env} não encontrado!`);
  console.error(`💡 Execute: npm run env:setup:${env === 'development' ? 'dev' : 'prod'}`);
  process.exit(1);
}

// Carregar variáveis do arquivo
const envVars = {};
const envContent = fs.readFileSync(envFile, 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  }
});

console.log(`📋 Executando script com ambiente: ${env}`);
console.log(`📁 Script: ${scriptPath}`);
if (scriptArgs.length > 0) {
  console.log(`📝 Argumentos: ${scriptArgs.join(' ')}`);
}
console.log('');

// Executar ts-node com variáveis de ambiente
const proc = spawn('npx', ['ts-node', scriptPath, ...scriptArgs], {
  env: {
    ...process.env,
    NODE_ENV: env,
    ...envVars
  },
  stdio: 'inherit',
  shell: true,
  cwd: projectRoot
});

proc.on('error', (error) => {
  console.error('❌ Erro ao executar comando:', error);
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code || 0);
});


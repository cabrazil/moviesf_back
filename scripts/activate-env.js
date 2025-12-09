#!/usr/bin/env node
/**
 * Ativa ambiente e executa comando no mesmo processo
 * Uso: node scripts/activate-env.js [development|production] <comando> [args...]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const env = args[0];
const command = args.slice(1);

if (!env || (env !== 'development' && env !== 'production')) {
  console.error('❌ Uso: node scripts/activate-env.js [development|production] <comando> [args...]');
  console.error('');
  console.error('Exemplos:');
  console.error('  node scripts/activate-env.js production ts-node src/scripts/orchestrator.ts --title="Shrek" --year=2001');
  process.exit(1);
}

if (command.length === 0) {
  console.error('❌ Nenhum comando fornecido');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const envFile = path.join(projectRoot, `.env.${env}`);

if (!fs.existsSync(envFile)) {
  console.error(`❌ Arquivo .env.${env} não encontrado!`);
  console.error(`💡 Execute: npm run env:setup:${env}`);
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
      // Remover aspas se existirem
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  }
});

// Executar comando com variáveis de ambiente
const [cmd, ...cmdArgs] = command;
const proc = spawn(cmd, cmdArgs, {
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


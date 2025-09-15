#!/usr/bin/env node

/**
 * 🔍 Script de Diagnóstico de Conexão
 * 
 * Verifica se o backend está rodando e acessível
 */

const http = require('http');
const net = require('net');

// Configurações
const BACKEND_PORT = 3003;
const BACKEND_HOST = 'localhost';

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Função para verificar se a porta está em uso
function checkPort(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, host, () => {
      server.once('close', () => {
        resolve(false); // Porta disponível
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(true); // Porta em uso
    });
  });
}

// Função para testar conexão HTTP
function testHttpConnection(host, port, path = '/health') {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout',
        code: 'TIMEOUT'
      });
    });

    req.end();
  });
}

// Função para listar processos na porta
function getProcessOnPort(port) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`lsof -i :${port}`, (error, stdout, stderr) => {
      if (error) {
        resolve(null);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function runDiagnostics() {
  log('🔍 Diagnóstico de Conexão - vibesfilm Backend', 'bold');
  log('=' .repeat(50), 'blue');
  
  // 1. Verificar se a porta está em uso
  log('\n1️⃣ Verificando porta 3003...', 'blue');
  const portInUse = await checkPort(BACKEND_HOST, BACKEND_PORT);
  
  if (portInUse) {
    log('  ✅ Porta 3003 está em uso', 'green');
    
    // Verificar qual processo está usando a porta
    const processInfo = await getProcessOnPort(BACKEND_PORT);
    if (processInfo) {
      log('  📋 Processo na porta 3003:', 'yellow');
      console.log(processInfo);
    }
  } else {
    log('  ❌ Porta 3003 não está em uso', 'red');
    log('  💡 Inicie o backend com: npm run dev', 'yellow');
    return;
  }

  // 2. Testar conexão HTTP
  log('\n2️⃣ Testando conexão HTTP...', 'blue');
  const httpResult = await testHttpConnection(BACKEND_HOST, BACKEND_PORT, '/health');
  
  if (httpResult.success) {
    log(`  ✅ HTTP OK - Status: ${httpResult.status}`, 'green');
    log(`  📄 Resposta: ${httpResult.data.substring(0, 100)}...`, 'yellow');
  } else {
    log(`  ❌ HTTP Error: ${httpResult.error} (${httpResult.code})`, 'red');
  }

  // 3. Testar endpoint específico
  log('\n3️⃣ Testando endpoint /main-sentiments...', 'blue');
  const sentimentsResult = await testHttpConnection(BACKEND_HOST, BACKEND_PORT, '/main-sentiments');
  
  if (sentimentsResult.success) {
    log(`  ✅ /main-sentiments OK - Status: ${sentimentsResult.status}`, 'green');
  } else {
    log(`  ❌ /main-sentiments Error: ${sentimentsResult.error} (${sentimentsResult.code})`, 'red');
  }

  // 4. Verificar variáveis de ambiente
  log('\n4️⃣ Verificando configuração...', 'blue');
  
  if (process.env.DATABASE_URL) {
    log('  ✅ DATABASE_URL configurada', 'green');
  } else {
    log('  ⚠️  DATABASE_URL não configurada', 'yellow');
  }
  
  if (process.env.DIRECT_URL) {
    log('  ✅ DIRECT_URL configurada', 'green');
  } else {
    log('  ⚠️  DIRECT_URL não configurada', 'yellow');
  }

  // 5. Resumo
  log('\n📊 Resumo do Diagnóstico:', 'bold');
  log('=' .repeat(30), 'blue');
  
  if (portInUse && httpResult.success) {
    log('🎉 Backend está funcionando corretamente!', 'green');
    log('\n🔧 Possíveis soluções para o frontend:', 'blue');
    log('  1. Verificar se o frontend está rodando em localhost:5173', 'yellow');
    log('  2. Limpar cache do navegador (Ctrl+Shift+R)', 'yellow');
    log('  3. Verificar console do navegador para logs da API', 'yellow');
    log('  4. Testar diretamente: http://localhost:3003/main-sentiments', 'yellow');
  } else {
    log('❌ Backend não está funcionando corretamente', 'red');
    log('\n🔧 Soluções:', 'blue');
    log('  1. Iniciar backend: cd moviesf_back && npm run dev', 'yellow');
    log('  2. Verificar se há erros no terminal do backend', 'yellow');
    log('  3. Verificar configuração do banco de dados', 'yellow');
    log('  4. Verificar se a porta 3003 não está sendo usada por outro processo', 'yellow');
  }
}

// Executar diagnóstico
runDiagnostics().catch(console.error);

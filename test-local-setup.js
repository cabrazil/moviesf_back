#!/usr/bin/env node

/**
 * 🧪 Script de Teste Local - vibesfilm
 * 
 * Verifica se o ambiente local está configurado corretamente
 */

const http = require('http');
const https = require('https');

// Configurações
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

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

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function testBackend() {
  log('\n🔧 Testando Backend...', 'blue');
  
  try {
    // Teste 1: Health Check Geral
    log('  📡 Testando health check geral...', 'yellow');
    const healthResponse = await makeRequest(`${BACKEND_URL}/health`);
    
    if (healthResponse.status === 200) {
      log('  ✅ Health check geral: OK', 'green');
    } else {
      log(`  ❌ Health check geral: Status ${healthResponse.status}`, 'red');
      return false;
    }

    // Teste 2: Health Check Movie Hero
    log('  🎬 Testando health check movie hero...', 'yellow');
    const movieHealthResponse = await makeRequest(`${BACKEND_URL}/api/movie/health`);
    
    if (movieHealthResponse.status === 200) {
      log('  ✅ Health check movie hero: OK', 'green');
    } else {
      log(`  ❌ Health check movie hero: Status ${movieHealthResponse.status}`, 'red');
      return false;
    }

    // Teste 3: Endpoint Movie Hero (com slug de teste)
    log('  🎭 Testando endpoint movie hero...', 'yellow');
    const movieResponse = await makeRequest(`${BACKEND_URL}/api/movie/test-movie/hero`);
    
    if (movieResponse.status === 404) {
      log('  ✅ Endpoint movie hero: Respondendo corretamente (404 para filme inexistente)', 'green');
    } else if (movieResponse.status === 200) {
      log('  ✅ Endpoint movie hero: Funcionando (filme encontrado)', 'green');
    } else {
      log(`  ⚠️  Endpoint movie hero: Status inesperado ${movieResponse.status}`, 'yellow');
    }

    return true;
  } catch (error) {
    log(`  ❌ Erro no backend: ${error.message}`, 'red');
    return false;
  }
}

async function testFrontend() {
  log('\n🌐 Testando Frontend...', 'blue');
  
  try {
    const response = await makeRequest(FRONTEND_URL);
    
    if (response.status === 200) {
      log('  ✅ Frontend: OK', 'green');
      return true;
    } else {
      log(`  ❌ Frontend: Status ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ❌ Erro no frontend: ${error.message}`, 'red');
    return false;
  }
}

async function testDatabaseConnection() {
  log('\n🗄️  Testando Conexão com Banco...', 'blue');
  
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
      log('  ⚠️  Variáveis de ambiente não configuradas', 'yellow');
      log('  📝 Crie um arquivo .env com DATABASE_URL e DIRECT_URL', 'yellow');
      return false;
    }

    log('  ✅ Variáveis de ambiente configuradas', 'green');
    return true;
  } catch (error) {
    log(`  ❌ Erro na configuração: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('🧪 Iniciando Testes do Ambiente Local - vibesfilm', 'bold');
  log('=' .repeat(50), 'blue');

  const results = {
    database: await testDatabaseConnection(),
    backend: await testBackend(),
    frontend: await testFrontend()
  };

  log('\n📊 Resultados dos Testes:', 'bold');
  log('=' .repeat(30), 'blue');
  
  log(`🗄️  Banco de Dados: ${results.database ? '✅ OK' : '❌ FALHOU'}`, results.database ? 'green' : 'red');
  log(`🔧 Backend: ${results.backend ? '✅ OK' : '❌ FALHOU'}`, results.backend ? 'green' : 'red');
  log(`🌐 Frontend: ${results.frontend ? '✅ OK' : '❌ FALHOU'}`, results.frontend ? 'green' : 'red');

  const allPassed = Object.values(results).every(result => result);

  if (allPassed) {
    log('\n🎉 Todos os testes passaram! Ambiente configurado corretamente.', 'green');
    log('\n🚀 Próximos passos:', 'blue');
    log('  1. Acesse: http://localhost:5173', 'yellow');
    log('  2. Teste: http://localhost:5173/movie/[slug-do-filme]', 'yellow');
    log('  3. Verifique logs do backend para performance', 'yellow');
  } else {
    log('\n❌ Alguns testes falharam. Verifique a configuração.', 'red');
    log('\n🔧 Soluções:', 'blue');
    log('  1. Verifique se o backend está rodando: npm run dev', 'yellow');
    log('  2. Verifique se o frontend está rodando: npm run dev', 'yellow');
    log('  3. Configure o arquivo .env com as variáveis do banco', 'yellow');
  }

  log('\n📚 Documentação completa: LOCAL_TESTING_GUIDE.md', 'blue');
}

// Executar testes
runTests().catch(console.error);

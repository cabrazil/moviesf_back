// Carregar variáveis de ambiente
import './scripts-helper';
import axios from 'axios';

interface GeminiModel {
  name: string;
  displayName: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

interface GeminiListModelsResponse {
  models: GeminiModel[];
}

interface GeminiGenerateResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason?: string;
  }>;
}

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️ ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️ ${message}`, colors.cyan);
}

// Verificar se a chave de API está configurada
function checkApiKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logError('GEMINI_API_KEY não encontrada no ambiente');
    logInfo('Configure a variável GEMINI_API_KEY no arquivo .env ou .env.local');
    return false;
  }
  
  if (apiKey.length < 20) {
    logWarning(`Chave de API parece muito curta (${apiKey.length} caracteres)`);
  }
  
  logSuccess(`Chave de API encontrada (${apiKey.substring(0, 10)}...)`);
  return true;
}

// Teste 1: Listar modelos disponíveis
async function listAvailableModels(apiVersion: 'v1' | 'v1beta' = 'v1beta'): Promise<GeminiModel[]> {
  log(`\n${'='.repeat(60)}`);
  log(`📋 TESTE 1: Listando modelos disponíveis (API ${apiVersion})`, colors.blue);
  log(`${'='.repeat(60)}`);
  
  try {
    const response = await axios.get<GeminiListModelsResponse>(
      `https://generativelanguage.googleapis.com/${apiVersion}/models`,
      {
        params: {
          key: process.env.GEMINI_API_KEY
        }
      }
    );

    const models = response.data.models || [];
    logSuccess(`Total de modelos encontrados: ${models.length}`);
    
    // Filtrar modelos que suportam generateContent
    const supportedModels = models.filter(model => 
      model.supportedGenerationMethods?.includes('generateContent')
    );
    
    logInfo(`Modelos que suportam generateContent: ${supportedModels.length}`);
    
    // Mostrar modelos recomendados
    const recommendedModels = [
      'gemini-3-pro-preview',  // Nome correto encontrado na API
      'gemini-3-pro',          // Tentar sem sufixo também
      'gemini-pro-3',
      'gemini-2.5-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-pro-latest'      // Encontrado na lista
    ];
    
    log(`\n🎯 Modelos recomendados disponíveis:`, colors.cyan);
    recommendedModels.forEach(modelName => {
      const model = supportedModels.find(m => m.name.includes(modelName));
      if (model) {
        logSuccess(`  ✓ ${model.name} - ${model.displayName || 'N/A'}`);
      } else {
        logWarning(`  ✗ ${modelName} - Não encontrado`);
      }
    });
    
    return supportedModels;
  } catch (error: any) {
    logError(`Erro ao listar modelos: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Resposta: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return [];
  }
}

// Teste 2: Testar requisição simples com diferentes modelos
async function testModelGeneration(
  modelName: string,
  apiVersion: 'v1' | 'v1beta' = 'v1beta'
): Promise<{ success: boolean; response?: string; error?: string }> {
  log(`\n${'='.repeat(60)}`);
  log(`🔄 TESTE 2: Testando modelo ${modelName} (API ${apiVersion})`, colors.blue);
  log(`${'='.repeat(60)}`);
  
  const testPrompt = 'Responda apenas com a palavra "SUCESSO" em português.';
  
  try {
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent`;
    
    logInfo(`URL: ${url}`);
    logInfo(`Prompt: "${testPrompt}"`);
    
    const response = await axios.post<GeminiGenerateResponse>(
      url,
      {
        contents: [{
          parts: [{
            text: testPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 100,
          topP: 0.8,
          topK: 20
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          key: process.env.GEMINI_API_KEY
        },
        timeout: 30000 // 30 segundos
      }
    );

    if (response.data.candidates && response.data.candidates.length > 0) {
      const text = response.data.candidates[0].content.parts[0].text;
      logSuccess(`Resposta recebida: "${text.trim()}"`);
      logInfo(`Finish Reason: ${response.data.candidates[0].finishReason || 'N/A'}`);
      return { success: true, response: text };
    } else {
      logError('Resposta vazia - nenhum candidato retornado');
      return { success: false, error: 'Resposta vazia' };
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    const statusCode = error.response?.status;
    
    logError(`Erro ao testar modelo: ${errorMessage}`);
    if (statusCode) {
      logError(`Status HTTP: ${statusCode}`);
      
      if (statusCode === 404) {
        logWarning('Modelo não encontrado ou não disponível nesta versão da API');
      } else if (statusCode === 400) {
        logWarning('Requisição inválida - verifique o formato do payload');
      } else if (statusCode === 403) {
        logWarning('Acesso negado - verifique a chave de API e permissões');
      } else if (statusCode === 503) {
        logWarning('Serviço temporariamente indisponível - tente novamente mais tarde');
      } else if (statusCode === 429) {
        logWarning('Rate limit excedido - aguarde antes de tentar novamente');
      }
    }
    
    if (error.response?.data) {
      logError(`Detalhes: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return { success: false, error: errorMessage };
  }
}

// Teste 3: Testar autenticação com header Authorization
async function testAuthWithHeader(modelName: string): Promise<boolean> {
  log(`\n${'='.repeat(60)}`);
  log(`🔐 TESTE 3: Testando autenticação com header Authorization`, colors.blue);
  log(`${'='.repeat(60)}`);
  
  try {
    const response = await axios.post<GeminiGenerateResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        contents: [{
          parts: [{
            text: 'Teste'
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
        },
        timeout: 10000
      }
    );
    
    logSuccess('Autenticação com header Authorization funcionou');
    return true;
  } catch (error: any) {
    logWarning(`Autenticação com header falhou: ${error.message}`);
    return false;
  }
}

// Teste 4: Testar requisição JSON complexa (simulando uso real)
async function testComplexRequest(
  modelName: string,
  apiVersion: 'v1' | 'v1beta' = 'v1beta'
): Promise<boolean> {
  log(`\n${'='.repeat(60)}`);
  log(`🧪 TESTE 4: Testando requisição JSON complexa (${modelName})`, colors.blue);
  log(`${'='.repeat(60)}`);
  
  const systemPrompt = 'Você é um especialista em análise de filmes.';
  const userPrompt = `
Analise o filme "Joias Brutas" (2019) e sugira subsentimentos.

Responda APENAS com JSON válido no formato:
{
  "suggestedSubSentiments": [
    {
      "name": "Nome do SubSentimento",
      "relevance": 0.95,
      "explanation": "Explicação",
      "isNew": false
    }
  ]
}
`;

  try {
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    const response = await axios.post<GeminiGenerateResponse>(
      `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent`,
      {
        contents: [{
          parts: [{
            text: combinedPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1500,
          topP: 0.8,
          topK: 20,
          candidateCount: 1
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          key: process.env.GEMINI_API_KEY
        },
        timeout: 60000 // 60 segundos para requisição complexa
      }
    );

    if (response.data.candidates && response.data.candidates.length > 0) {
      const text = response.data.candidates[0].content.parts[0].text;
      logSuccess('Resposta recebida com sucesso');
      logInfo(`Tamanho da resposta: ${text.length} caracteres`);
      
      // Tentar validar JSON
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const json = JSON.parse(jsonMatch[0]);
          logSuccess('JSON válido encontrado na resposta');
          logInfo(`Estrutura: ${JSON.stringify(Object.keys(json), null, 2)}`);
        } else {
          logWarning('JSON não encontrado na resposta (pode estar em markdown)');
        }
      } catch (parseError) {
        logWarning('Resposta não é JSON válido (pode estar em markdown ou truncada)');
      }
      
      return true;
    }
    
    return false;
  } catch (error: any) {
    logError(`Erro na requisição complexa: ${error.message}`);
    if (error.response?.status) {
      logError(`Status: ${error.response.status}`);
    }
    return false;
  }
}

// Função principal
async function main() {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`🔍 DIAGNÓSTICO COMPLETO DA API GEMINI`, colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
  
  // Verificar chave de API
  if (!checkApiKey()) {
    process.exit(1);
  }
  
  // Listar modelos disponíveis
  const modelsV1Beta = await listAvailableModels('v1beta');
  const modelsV1 = await listAvailableModels('v1');
  
  // Modelos para testar (prioridade)
  // Nota: A API retorna modelos com prefixo "models/", mas nas chamadas usamos sem o prefixo
  const modelsToTest = [
    'gemini-3-pro-preview',  // Nome correto encontrado: models/gemini-3-pro-preview
    'gemini-3-pro',          // Tentar sem sufixo também
    'gemini-pro-3',
    'gemini-2.5-flash',      // Funciona na v1
    'gemini-2.0-flash-exp',
    'gemini-pro-latest',     // Encontrado na lista
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro'
  ];
  
  // Versões da API para testar
  const apiVersions: Array<'v1' | 'v1beta'> = ['v1beta', 'v1'];
  
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`📊 RESUMO DOS TESTES`, colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
  
  const results: Array<{
    model: string;
    version: string;
    success: boolean;
    error?: string;
  }> = [];
  
  // Testar cada combinação de modelo e versão
  for (const apiVersion of apiVersions) {
    for (const modelName of modelsToTest) {
      const result = await testModelGeneration(modelName, apiVersion);
      results.push({
        model: modelName,
        version: apiVersion,
        success: result.success,
        error: result.error
      });
      
      // Se funcionou, testar requisição complexa
      if (result.success) {
        await testComplexRequest(modelName, apiVersion);
        break; // Parar de testar outros modelos se este funcionou
      }
      
      // Pequeno delay entre requisições
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Resumo final
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`📋 RESUMO FINAL`, colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    logSuccess(`\n✅ Modelos funcionando:`);
    successful.forEach(r => {
      log(`   • ${r.model} (${r.version})`, colors.green);
    });
  }
  
  if (failed.length > 0) {
    logError(`\n❌ Modelos com erro:`);
    failed.forEach(r => {
      log(`   • ${r.model} (${r.version}): ${r.error || 'Erro desconhecido'}`, colors.red);
    });
  }
  
  // Recomendação
  if (successful.length > 0) {
    const best = successful[0];
    log(`\n💡 RECOMENDAÇÃO:`, colors.cyan);
    log(`   Use o modelo "${best.model}" com API "${best.version}"`, colors.green);
    log(`   Atualize aiProvider.ts para usar:`, colors.cyan);
    log(`   - Modelo: ${best.model}`, colors.cyan);
    log(`   - Versão API: ${best.version}`, colors.cyan);
  } else {
    logWarning(`\n⚠️ Nenhum modelo funcionou. Verifique:`);
    logWarning(`   1. Chave de API está correta e ativa`);
    logWarning(`   2. Quotas não foram excedidas`);
    logWarning(`   3. Serviço Gemini está online`);
    logWarning(`   4. Modelos estão disponíveis na sua região`);
  }
}

// Executar
main().catch(error => {
  logError(`Erro fatal: ${error.message}`);
  process.exit(1);
});


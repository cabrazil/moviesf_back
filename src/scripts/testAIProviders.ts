import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function testAIProviders() {
  // Verificar se as chaves estão carregadas
  console.log('🔑 Verificando variáveis de ambiente...');
  console.log(`OpenAI Key: ${process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ Não encontrada'}`);
  console.log(`Gemini Key: ${process.env.GEMINI_API_KEY ? '✅ Configurada' : '❌ Não encontrada'}`);
  console.log(`DeepSeek Key: ${process.env.DEEPSEEK_API_KEY ? '✅ Configurada' : '❌ Não encontrada'}`);
  console.log();
  console.log('🧪 === TESTE DE PROVEDORES DE IA ===\n');

  const testPrompt = `
Filme: "O Poderoso Chefão" (1972)
Sinopse: A história da família Corleone, uma das cinco famílias da máfia de Nova York.
Gêneros: Drama, Crime
Palavras-chave: família, poder, lealdade, tradição

Com base nessas informações, escreva uma reflexão curta, inspiradora e específica sobre este filme, capturando sua essência emocional e os temas principais da história.

A reflexão deve:
- Ter entre 20-35 palavras
- Ser inspiradora e envolvente
- Capturar o tom e tema específico do filme
- Terminar com um ponto final
- Não repetir o nome do filme
- Conectar os temas principais com o impacto emocional
`;

  const systemPrompt = 'Você é um crítico de cinema especializado em análise emocional de filmes. Escreva reflexões concisas e inspiradoras que capturem a essência emocional única de cada filme.';

  const providers: AIProvider[] = ['openai', 'gemini', 'deepseek'];

  for (const provider of providers) {
    console.log(`\n🔍 Testando ${provider.toUpperCase()}:`);
    console.log('─'.repeat(50));

    try {
      const config = getDefaultConfig(provider);
      const aiProvider = createAIProvider(config);

      const startTime = Date.now();
      const response = await aiProvider.generateResponse(systemPrompt, testPrompt, {
        temperature: 0.8,
        maxTokens: 120
      });
      const endTime = Date.now();

      if (response.success) {
        console.log(`✅ Sucesso!`);
        console.log(`⏱️  Tempo de resposta: ${endTime - startTime}ms`);
        console.log(`📝 Resposta:`);
        console.log(`"${response.content}"`);
      } else {
        console.log(`❌ Erro: ${response.error}`);
      }
    } catch (error) {
      console.log(`❌ Erro inesperado: ${error}`);
    }
  }

  console.log('\n🎯 === COMPARAÇÃO CONCLUÍDA ===');
  console.log('\nPara usar um provedor específico nos scripts:');
  console.log('• OpenAI: npx ts-node orchestrator.ts --title="..." --ai-provider=openai');
  console.log('• Gemini: npx ts-node orchestrator.ts --title="..." --ai-provider=gemini');
  console.log('• DeepSeek: npx ts-node orchestrator.ts --title="..." --ai-provider=deepseek');
  console.log('\nOu definir a variável de ambiente:');
  console.log('• export AI_PROVIDER=openai');
  console.log('• export AI_PROVIDER=gemini');
  console.log('• export AI_PROVIDER=deepseek');
}

if (require.main === module) {
  testAIProviders().catch(console.error);
} 
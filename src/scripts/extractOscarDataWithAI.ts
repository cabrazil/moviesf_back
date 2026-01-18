
import './scripts-helper';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';

async function main() {
  const args = process.argv.slice(2);
  let title = '';
  let year = '';
  let providerParam: AIProvider = 'deepseek';

  // Parse argumentos simples: --title="Filme" --year=2023 --provider=gemini
  args.forEach(arg => {
    if (arg.startsWith('--title=')) title = arg.split('=')[1].replace(/^"|"$/g, '');
    if (arg.startsWith('--year=')) year = arg.split('=')[1];
    if (arg.startsWith('--provider=')) providerParam = arg.split('=')[1] as AIProvider;
  });

  if (!title || !year) {
    console.log('❌ Uso: npx ts-node src/scripts/extractOscarDataWithAI.ts --title="Nome do Filme" --year=YYYY [--provider=deepseek|gemini|openai]');
    return;
  }

  console.log(`🎬 PREPARANDO EXTRAÇÃO DE DADOS DO OSCAR COM IA (${providerParam.toUpperCase()})`);
  console.log(`📽️  Filme: ${title} (${year})`);
  console.log('='.repeat(50));

  // 1. Configurar provedor de IA
  const config = getDefaultConfig(providerParam);
  // Aumentar temperatura para garantir criatividade factual? Não, queremos precisão (temperatura baixa).
  // Deepseek default é 1.0 (criativo), vamos forçar algo menor se possível, mas usemos o default por enquanto e instruiremos no prompt.
  // Ajustando config manual
  if (providerParam === 'deepseek') config.temperature = 0.1;
  if ((providerParam as string) === 'gemini') config.temperature = 0.1;

  const aiProvider = createAIProvider(config);

  // 2. Definir Prompt
  const systemPrompt = `Você é um especialista em história do cinema e banco de dados oficial do Oscar (Academy Awards).`;

  const userPrompt = `
Forneça a lista completa de indicações e vitórias no Oscar para o filme "${title}" lançado em ${year}.

A saída DEVE seguir ESTRITAMENTE este formato de texto plano (sem markdown, sem intro, sem conclusão):

Linha 1: Título do Filme (em inglês)
Linha 2: Produtoras (separadas por ponto e vírgula, ex: Warner Bros.; Syncopy) - Se não souber, use "Unknown Production"
Linha 3: Ano da cerimônia e número da edição (FORMATO EXATO: "YYYY (NNth)" ou "YYYY (NNst/nd/rd)")
Linhas seguintes: Categoria -- Indicados

REGRAS CRUCIAIS:
1. Marque os VENCEDORES com um asterisco (*) no início da linha, colado no texto.
2. Use "--" para separar a categoria dos indicados.
3. Liste TODAS as indicações e vitórias oficiais da Academia.
4. IMPORTANTE: O formato da Linha 3 deve ser o ANO DA CERIMÔNIA, não do lançamento do filme (geralmente é o ano seguinte ao lançamento). Ex: Filme de 2017 -> Cerimônia 2018 (90th).
5. NÃO use formatação Markdown. APENAS texto puro.
6. Kategorias devem estar em INGLÊS e MAIÚSCULAS (ex: BEST PICTURE, CINEMATOGRAPHY).

Exemplo de saída esperada:
Dunkirk
Syncopy Pictures Production; Warner Bros.
2018 (90th)
CINEMATOGRAPHY -- Hoyte van Hoytema
DIRECTING -- Christopher Nolan
*FILM EDITING -- Lee Smith
MUSIC (Original Score) -- Hans Zimmer
BEST PICTURE -- Emma Thomas and Christopher Nolan, Producers
PRODUCTION DESIGN -- Production Design: Nathan Crowley; Set Decoration: Gary Fettis
*SOUND EDITING -- Richard King and Alex Gibson
*SOUND MIXING -- Gregg Landaker, Gary A. Rizzo and Mark Weingarten
`;

  console.log('🤖 Consultando IA para obter dados históricos...');
  const response = await aiProvider.generateResponse(systemPrompt, userPrompt);

  if (!response.success) {
    console.error('❌ Erro na IA:', response.error);
    return;
  }

  const generatedText = response.content.trim();

  // Remover possíveis blocos de código markdown se a IA desobedecer
  const cleanText = generatedText.replace(/```text/g, '').replace(/```/g, '').trim();

  console.log('\n📄 Dados Recebidos:');
  console.log('-'.repeat(30));
  console.log(cleanText);
  console.log('-'.repeat(30));

  // 3. Salvar em awards.txt
  const awardsFilePath = path.join(process.cwd(), 'awards.txt');
  fs.writeFileSync(awardsFilePath, cleanText);
  console.log(`💾 Dados salvos temporariamente em: ${awardsFilePath}`);

  // 4. Executar script de processamento
  console.log('\n🚀 Executando processador de banco de dados...');
  const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'processOscarData.ts');

  try {
    // Usando npx ts-node
    execSync(`npx ts-node ${scriptPath} ${awardsFilePath}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Erro ao executar processOscarData.ts');
  }

  console.log('\n✅ FLUXO AUTOMATIZADO CONCLUÍDO!');
}

main().catch(console.error);

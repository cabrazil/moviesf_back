
import './scripts-helper';
import { createAIProvider, getDefaultConfig } from '../utils/aiProvider';

async function testPrompt() {
  const title = "Medo da Verdade";
  const year = 2007;

  console.log(`🎬 Testando Prompt para: ${title} (${year})`);

  const config = getDefaultConfig('deepseek');
  config.temperature = 0.1;
  const aiProvider = createAIProvider(config);

  const systemPrompt = `Você é um bibliotecário rigoroso do banco de dados oficial do Oscar (Academy Awards). Sua prioridade máxima é a PRECISÃO FACTUAL.
    Você NUNCA deve inventar vitórias. É melhor listar apenas indicações do que inventar uma vitória falsa.
    Muitos filmes são indicados a várias categorias mas não ganham nenhuma. Isso é normal.
    Se um filme não tem vitórias, NÃO coloque asteriscos.`;

  const userPrompt = `
Forneça a lista completa de indicações e vitórias no Oscar para o filme "${title}" lançado em ${year}.

A saída DEVE seguir ESTRITAMENTE este formato de texto plano:

Linha 1: Título do Filme (em inglês)
Linha 2: Produtoras (separadas por ponto e vírgula)
Linha 3: Ano da cerimônia e número da edição (FORMATO EXATO: "YYYY (NNth)")
Linhas seguintes: Categoria -- Indicados

REGRAS DE PRECISÃO (CRÍTICO):
1. Marque VENCEDORES com um asterisco (*) APENAS se tiver 100% de certeza absoluta.
2. CUIDADO: É comum filmes terem muitas indicações (Nominations) e ZERO vitórias (Wins). Não confunda.
3. Exemplo de erro comum: "News of the World" NÃO ganhou Visual Effects (o vencedor foi Tenet). Não cometa esse erro.
4. Use "--" para separar categoria dos indicados.
5. Liste TODAS as indicações.

Exemplo de filme SEM vitórias:
The Wolf of Wall Street
Red Granite Pictures; Appian Way
2014 (86th)
BEST PICTURE -- Martin Scorsese, Leonardo DiCaprio, Joey McFarland and Emma Tillinger Koskoff, Producers
DIRECTING -- Martin Scorsese
ACTOR IN A LEADING ROLE -- Leonardo DiCaprio
ACTOR IN A SUPPORTING ROLE -- Jonah Hill
WRITING (Adapted Screenplay) -- Screenplay by Terence Winter

Exemplo de filme COM vitórias:
Dunkirk
Syncopy Pictures Production; Warner Bros.
2018 (90th)
DIRECTING -- Christopher Nolan
*FILM EDITING -- Lee Smith
`;

  console.log('🤖 Consultando IA...');
  const result = await aiProvider.generateResponse(systemPrompt, userPrompt);

  console.log('\n📄 Resposta da IA:');
  console.log('--------------------------------------------------');
  console.log(result.content);
  console.log('--------------------------------------------------');
}

testPrompt();

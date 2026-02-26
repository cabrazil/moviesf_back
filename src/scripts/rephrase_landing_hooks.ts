// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import { createAIProvider, getDefaultConfig } from '../utils/aiProvider';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Leitura de input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function rephraseLandingHookWithAI(
  movie: any,
  providerName: string = 'deepseek'
): Promise<string> {
  try {
    const config = getDefaultConfig(providerName as any);
    const aiProvider = createAIProvider(config);

    let sentimentContext = '';
    if (movie.movieSentiments && movie.movieSentiments.length > 0) {
      const topSentiments = movie.movieSentiments
        .sort((a: any, b: any) => parseFloat(b.relevance) - parseFloat(a.relevance))
        .slice(0, 3);

      sentimentContext = '\\n\\nAnálise emocional do filme:\\n';
      topSentiments.forEach((sentiment: any, index: number) => {
        sentimentContext += `${index + 1}. ${sentiment.subSentiment.name} (Relevância: ${sentiment.relevance}): ${sentiment.explanation}\\n`;
      });
    }

    const hookPrompt = `Filme: '${movie.title}' (${movie.year}). Gêneros: ${movie.genres?.join(', ') || 'N/A'}. Palavras-chave: ${movie.keywords?.slice(0, 5).join(', ') || 'N/A'}.${sentimentContext}\n\nSua tarefa é criar um gancho emocional imersivo (cerca de 30 palavras) que capture a atmosfera, a tensão ou o impacto da experiência de assistir ao filme.\n\nExemplos de estilo desejado (varie a estrutura, não fique preso a um único modelo):\n- "A obsessão sombria de um gênio da cirurgia, onde os limites da vingança e da identidade se dissolvem em um thriller perturbador sobre os extremos do amor transformado em monstro."\n- "A banalidade do mal: um jardim idílico e uma família perfeita escondem o genocídio ao lado, desafiando tudo o que você entende sobre humanidade."\n- "Em um frenesi cinético de vingança pura, onde cada bala é um passo na dança mortal de um assassino aposentado que despertou."\n- "O loop temporal de adrenalina e sobrevivência: a mesma batalha revivida à exaustão, onde a morte brutal é o único ensaio para a maestria absoluta."\n- "Uma jornada inesquecível: Gran Torino te confronta com a amargura de um veterano e a redenção através da conexão humana, em uma história que reavalia a vida e redefine o significado de família."\n\nREGRAS MANDATÓRIAS:\n1. PROIBIDO FAZER RESUMO DA SINOPSE OU CITAR NOME DE PERSONAGENS. Foque apenas na VIBE, no tema e na sensação transmitida.\n2. Mantenha em uma única frase impetuosa e marcante.\n3. NUNCA use termos de marketing como "Prepare-se", "Não perca", "Descubra o que acontece", "Assista a".\n\nResponda APENAS com o texto exigido, sem aspas.`;

    const hookResponse = await aiProvider.generateResponse(
      "Você é um especialista em marketing cinematográfico que cria ganchos cativantes para landing pages de filmes.",
      hookPrompt,
      {
        maxTokens: 300,
        temperature: 0.7
      }
    );

    if (hookResponse.success && hookResponse.content) {
      let hook = hookResponse.content.trim().replace(/^"|"$/g, '');
      // Remover JSON caso a IA tenha gerado (fallback)
      hook = hook.replace(/```[\\s\\S]*?```/g, '').trim();
      return hook;
    }

    return movie.landingPageHook || '';
  } catch (error) {
    console.error('Erro na IA:', error);
    return movie.landingPageHook || '';
  }
}

async function main() {
  const args = process.argv.slice(2);

  const parsedArgs: any = {
    execute: !args.includes('--dry-run'),
    provider: 'deepseek' // Default Provider
  };

  for (const arg of args) {
    const argLower = arg.toLowerCase();
    if (argLower.startsWith('--title=')) {
      parsedArgs.title = arg.split('=')[1].replace(/^"|"$/g, '');
    }
    if (argLower.startsWith('--year=')) {
      parsedArgs.year = parseInt(arg.split('=')[1].replace(/^"|"$/g, ''));
    }
    if (argLower.startsWith('--ai-provider=') || argLower.startsWith('--ia-provider=')) {
      parsedArgs.provider = arg.split('=')[1].replace(/^"|"$/g, '');
    }
  }

  // Se tem --dry-run como flag explícita, set explicitly to false
  if (args.includes('--dry-run')) {
    parsedArgs.execute = false;
  }
  // Alternativamente, se usam --execute
  if (args.includes('--execute')) {
    parsedArgs.execute = true;
  }

  const executeMode = parsedArgs.execute;

  console.log(`\n🔍 === REFATORADOR DE LANDING PAGE HOOKS ===`);
  if (parsedArgs.title) console.log(`🎬 Filtro por Filme: ${parsedArgs.title}`);
  if (parsedArgs.year) console.log(`📅 Filtro por Ano: ${parsedArgs.year}`);
  console.log(`🧠 Provider: ${parsedArgs.provider}`);
  console.log(`⚙️  Modo: ${executeMode ? 'EXECUÇÃO (Salvar no Banco)' : 'DRY-RUN (Apenas Simulação)'}`);

  try {
    const whereClause: any = {};

    if (parsedArgs.title) {
      whereClause.title = { contains: parsedArgs.title, mode: 'insensitive' };
    }
    if (parsedArgs.year) {
      whereClause.year = parsedArgs.year;
    }

    if (Object.keys(whereClause).length === 0) {
      console.log('⚠️ Processando TODOS os filmes do banco. Cuidado!');
      const confirmAll = await question('\nDeseja processar TODOS os filmes? (s/N): ');
      if (confirmAll.toLowerCase() !== 's') {
        console.log('❌ Operação cancelada. Use --title="Nome" para filtrar.');
        return;
      }
    }

    const movies = await prisma.movie.findMany({
      where: whereClause,
      include: {
        movieSentiments: {
          include: { subSentiment: true }
        }
      }
    });

    console.log(`📊 Encontrados ${movies.length} filmes.`);

    if (movies.length === 0) {
      console.log('Nenhum registro encontrado.');
      return;
    }

    const updates: Array<{ id: string, title: string, old: string, new: string }> = [];

    console.log('\n--- Processando Amostras ---');

    for (const movie of movies) {
      const oldHook = movie.landingPageHook || '(vazio)';

      process.stdout.write(`Processando: ${movie.title} (${movie.year})... `);
      const newHook = await rephraseLandingHookWithAI(movie, parsedArgs.provider);
      process.stdout.write('OK\n');

      if (oldHook !== newHook && newHook !== '') {
        updates.push({ id: movie.id, title: movie.title, old: oldHook, new: newHook });

        console.log(`\n🎥 Filme: ${movie.title}`);
        console.log(`🔴 Antes: "${oldHook}"`);
        console.log(`🟢 Depois: "${newHook}"`);
        console.log('--------------------------------------------------');
      } else {
        console.log(`⚠️ Sem alteração estrutural para ${movie.title}`);
      }
    }

    console.log(`\n📊 Resumo: ${updates.length} filmes seriam (ou foram) atualizados.`);

    if (updates.length > 0 && executeMode) {
      const confirm = await question('\n⚠️ Deseja SALVAR estas alterações no banco de dados? (s/n): ');
      if (confirm.toLowerCase() === 's') {
        console.log('\n💾 Salvando alterações...');
        const updateOperations = updates.map(update =>
          prisma.movie.update({
            where: { id: update.id },
            data: { landingPageHook: update.new }
          })
        );

        await prisma.$transaction(updateOperations);
        console.log('✅ Atualização concluída com sucesso!');
      } else {
        console.log('❌ Operação cancelada. Nenhuma alteração salva.');
      }
    } else if (updates.length > 0 && !executeMode) {
      console.log('\n💡 Você está em modo DRY-RUN. Para aplicar as alterações, execute passando a flag --execute (remover --dry-run)');
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();

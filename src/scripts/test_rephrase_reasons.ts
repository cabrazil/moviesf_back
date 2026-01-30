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

async function rephraseReasonWithAI(originalReason: string): Promise<string> {
  try {
    const provider = 'openai'; // Voltar para OpenAI (agora usando 3.5 no provider)
    const config = getDefaultConfig(provider);
    const aiProvider = createAIProvider(config);

    const prompt = `
Tarefa: Transformar a frase abaixo em uma Frase Nominal curta, poética e direta, removendo o verbo inicial e proibindo terminantemente o uso de rótulos como "Um testemunho de", "Uma crônica de", "Um estudo sobre" ou "Um retrato de".

EXEMPLOS DE REFERÊNCIA (Siga esta cadência):

"A quieta revelação de que a centelha da vida não é um destino a conquistar, mas o sopro que já habita cada momento comum."

"A liberdade que habita no desapego e a profunda conexão humana que floresce nos espaços entre um lugar e outro."

"A beleza serena que habita o limiar entre a vida e a morte, onde o último cuidado é também o primeiro ato de autoconhecimento."

"A trajetória de um homem comum que atravessa o mundo para, finalmente, encontrar-se no instante em que para de sonhar e começa a viver."

"A beleza rude de um sonho que floresce nos pântanos, onde a amizade improvável se torna a única lei e a liberdade a única vitória."

REGRAS DE OURO:

IMPACTO IMEDIATO: Comece diretamente pelo tema central (Amor, Dor, Resiliência, Obsessão).

LIMITE ESTRITO: Máximo de 24 palavras. Seja econômico e denso.

NOMINALIZAÇÃO: Transforme o verbo inicial em substantivo se necessário, mas mantenha a fluidez (ex: em vez de "Testemunhar a dor", use "A dor visceral...").

ESTÉTICA: Mantenha os adjetivos que dão textura à frase.

Frase Original: "${originalReason}" Responda APENAS com a nova frase.
`;

    const response = await aiProvider.generateResponse(
      'Você é um editor de texto especializado em gramática e estilo.',
      prompt,
      { temperature: 0.3, maxTokens: 200 }
    );

    if (response.success) {
      return response.content.replace(/^"|"$/g, '').trim(); // Remove aspas extras se houver
    }

    return originalReason; // Fallback
  } catch (error) {
    console.error('Erro na IA:', error);
    return originalReason;
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments manually to support --title="X" --year=Y
  const parsedArgs: any = {
    execute: args.includes('--execute')
  };

  let jofIdArg = args[0];
  // Se o primeiro arg não começar com --, assumimos que é o ID
  if (jofIdArg && !jofIdArg.startsWith('--')) {
    parsedArgs.journeyOptionFlowId = parseInt(jofIdArg);
  }

  for (const arg of args) {
    if (arg.startsWith('--title=')) {
      parsedArgs.title = arg.split('=')[1].replace(/^"|"$/g, '');
    }
    if (arg.startsWith('--year=')) {
      parsedArgs.year = parseInt(arg.split('=')[1].replace(/^"|"$/g, ''));
    }
  }

  const journeyOptionFlowId = parsedArgs.journeyOptionFlowId;
  const executeMode = parsedArgs.execute;

  console.log(`\n🔍 === TESTE DE REFRASEAMENTO DE REFLEXÕES ===`);
  if (journeyOptionFlowId) console.log(`🎯 JourneyOptionFlowId Alvo: ${journeyOptionFlowId}`);
  if (parsedArgs.title) console.log(`🎬 Filtro por Filme: ${parsedArgs.title}`);
  console.log(`⚙️  Modo: ${executeMode ? 'EXECUÇÃO (Salvar no Banco)' : 'DRY-RUN (Apenas Simulação)'}`);

  try {
    // Construir filtro dinâmico
    const whereClause: any = {};

    if (journeyOptionFlowId) {
      whereClause.journeyOptionFlowId = journeyOptionFlowId;
    }

    if (parsedArgs.title) {
      console.log(`🔍 Buscando filme: "${parsedArgs.title}"${parsedArgs.year ? ` (${parsedArgs.year})` : ''}...`);
      const movie = await prisma.movie.findFirst({
        where: {
          title: { contains: parsedArgs.title, mode: 'insensitive' },
          ...(parsedArgs.year ? { year: parsedArgs.year } : {})
        }
      });

      if (!movie) {
        console.log('❌ Filme não encontrado.');
        return;
      }
      console.log(`✅ Filme encontrado: ${movie.title} (ID: ${movie.id})`);
      whereClause.movieId = movie.id;
    }

    if (Object.keys(whereClause).length === 0) {
      console.log('❌ É necessário fornecer pelo menos um filtro: ID da Jornada (primeiro argumento) ou --title="Nome"');
      return;
    }

    const suggestions = await prisma.movieSuggestionFlow.findMany({
      where: whereClause,
      include: { movie: true }
    });

    console.log(`📊 Encontrados ${suggestions.length} registros.`);

    if (suggestions.length === 0) {
      console.log('Nenhum registro encontrado para este ID.');
      return;
    }

    const updates: Array<{ id: number, old: string, new: string }> = [];

    console.log('\n--- Processando Amostras ---');

    for (const suggestion of suggestions) {
      const oldReason = suggestion.reason;

      // Simples verificação se parece começar com verbo (heurística básica para log)
      // Mas sempre passamos pela IA para garantir a transformação correta

      process.stdout.write(`Processando ID ${suggestion.id}... `);
      const newReason = await rephraseReasonWithAI(oldReason);
      process.stdout.write('OK\n');

      if (oldReason !== newReason) {
        updates.push({ id: suggestion.id, old: oldReason, new: newReason });

        const reasonLower = newReason.charAt(0).toLowerCase() + newReason.slice(1);

        console.log(`\n🎥 Filme: ${suggestion.movie.title}`);
        console.log(`🔴 Antes: "${oldReason}"`);
        console.log(`🟢 Depois: "${newReason}"`);
        if (!executeMode) {
          console.log(`\nContexto 1: "Este filme pode ser perfeito para quem busca ${reasonLower}"`);
          console.log(`Contexto 2: "Para quem está Calmo(a) e quer Explorar: ${newReason}"`);
        }
        console.log('--------------------------------------------------');
      } else {
        console.log(`⚠️ Sem alteração para ID ${suggestion.id}`);
      }
    }

    console.log(`\n📊 Resumo: ${updates.length} sugestões seriam atualizadas.`);

    if (updates.length > 0 && !executeMode) {
      console.log('\n💡 Para aplicar as alterações, execute com a flag --execute');
      console.log(`Comando: npx ts-node src/scripts/test_rephrase_reasons.ts ${journeyOptionFlowId} --execute`);
    }

    if (updates.length > 0 && executeMode) {
      const confirm = await question('\n⚠️ Deseja SALVAR estas alterações no banco de dados? (s/n): ');
      if (confirm.toLowerCase() === 's') {
        console.log('\n💾 Salvando alterações...');
        const updateOperations = updates.map(update =>
          prisma.movieSuggestionFlow.update({
            where: { id: update.id },
            data: { reason: update.new }
          })
        );

        await prisma.$transaction(updateOperations);
        console.log('✅ Atualização concluída com sucesso!');
      } else {
        console.log('❌ Operação cancelada. Nenhuma alteração salva.');
      }
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();

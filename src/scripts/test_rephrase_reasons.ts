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
    const provider = 'openai'; // Usar OpenAI para melhor qualidade de reescrita
    const config = getDefaultConfig(provider);
    const aiProvider = createAIProvider(config);

    const prompt = `
Tarefa: Transformar a frase abaixo, que inicia com um verbo, em uma Frase Nominal (começando com artigo, substantivo ou pronome).
Objetivo: A frase será usada como complemento de "Este filme traz..."

Regras:
1. Remova o verbo inicial (ex: "Descobrir...", "Testemunhar...", "Vivenciar...").
2. Inicie com letra MAIÚSCULA.
3. Mantenha o restante da frase o mais fiel possível ao original.
4. O resultado deve fluir naturalmente após "Este filme pode ser perfeito para quem busca...".
5. EVITE iniciar com "Uma busca" ou "A busca" para não repetir a palavra "busca" do contexto anterior. Prefira "Uma jornada", "A procura", "O encontro", "Uma caçada", etc.

Exemplos:
- "Descobrir a beleza da vida" -> "A beleza da vida"
- "Testemunhar uma jornada épica" -> "Uma jornada épica"
- "Vivenciar a transformação da dor" -> "A transformação da dor"
- "Sentir a emoção do primeiro amor" -> "A emoção do primeiro amor"
- "Refletir sobre a existência" -> "Uma reflexão sobre a existência"
- "Buscar a verdade" -> "A perseguição da verdade" (Evitar "A busca da verdade")

Frase Original: "${originalReason}"

Responda APENAS com a nova frase.
`;

    const response = await aiProvider.generateResponse(
      'Você é um editor de texto especializado em gramática e estilo.',
      prompt,
      { temperature: 0.3, maxTokens: 100 }
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
  const journeyOptionFlowId = args[0] ? parseInt(args[0]) : 75;
  const executeMode = args.includes('--execute');

  console.log(`\n🔍 === TESTE DE REFRASEAMENTO DE REFLEXÕES ===`);
  console.log(`🎯 JourneyOptionFlowId Alvo: ${journeyOptionFlowId}`);
  console.log(`⚙️  Modo: ${executeMode ? 'EXECUÇÃO (Salvar no Banco)' : 'DRY-RUN (Apenas Simulação)'}`);

  try {
    const suggestions = await prisma.movieSuggestionFlow.findMany({
      where: { journeyOptionFlowId },
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
        console.log(`\nContexto 1: "Este filme pode ser perfeito para quem busca ${reasonLower}"`);
        console.log(`Contexto 2: "Para quem está Calmo(a) e quer Explorar: ${newReason}"`);
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
        for (const update of updates) {
          await prisma.movieSuggestionFlow.update({
            where: { id: update.id },
            data: { reason: update.new }
          });
        }
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

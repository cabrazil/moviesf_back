// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para atualizar um título específico
 * 
 * Uso: npx ts-node src/scripts/updateJourneyTitle.ts <id> "<novo título>"
 * 
 * Exemplo: npx ts-node src/scripts/updateJourneyTitle.ts 145 "Filmes que exploram a ambição e excelência"
 */

const args = process.argv.slice(2);
const journeyId = parseInt(args[0]);
const newTitle = args[1];

if (!journeyId || !newTitle) {
  console.error('❌ Erro: ID e título são obrigatórios');
  console.log('📝 Uso: npx ts-node src/scripts/updateJourneyTitle.ts <id> "<novo título>"');
  console.log('📝 Exemplo: npx ts-node src/scripts/updateJourneyTitle.ts 145 "Filmes que exploram a ambição e excelência"');
  process.exit(1);
}

async function updateJourneyTitle() {
  try {
    console.log('🔄 ATUALIZANDO TÍTULO DA JORNADA');
    console.log('=================================');
    console.log(`📌 ID: ${journeyId}`);
    console.log(`✨ Novo título: "${newTitle}"`);
    console.log('');

    // Buscar jornada atual
    const journey = await prisma.journeyOptionFlow.findUnique({
      where: { id: journeyId }
    });

    if (!journey) {
      console.error(`❌ Erro: Jornada com ID ${journeyId} não encontrada`);
      return;
    }

    console.log('📝 Dados atuais:');
    console.log(`   Text: ${journey.text}`);
    console.log(`   Display Title (antigo): ${journey.displayTitle || '[NÃO DEFINIDO]'}`);
    console.log('');

    // Atualizar
    const updated = await prisma.journeyOptionFlow.update({
      where: { id: journeyId },
      data: { displayTitle: newTitle }
    });

    console.log('✅ ATUALIZADO COM SUCESSO!');
    console.log('');
    console.log('📝 Dados novos:');
    console.log(`   Display Title: ${updated.displayTitle}`);
    console.log('');

    // Verificar quantos filmes usam essa jornada
    const moviesCount = await prisma.movieSuggestionFlow.count({
      where: { journeyOptionFlowId: journeyId }
    });

    console.log(`📊 Esta jornada está associada a ${moviesCount} filme(s)`);

  } catch (error) {
    console.error('❌ Erro ao atualizar título:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
updateJourneyTitle();

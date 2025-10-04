import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para revisar os títulos gerados
 * 
 * Uso: npx ts-node src/scripts/reviewJourneyTitles.ts
 */

async function reviewJourneyTitles() {
  try {
    console.log('📋 REVISÃO DOS TÍTULOS DAS JORNADAS EMOCIONAIS');
    console.log('===============================================');
    console.log('');

    // Buscar todas as jornadas com seus títulos
    const journeys = await prisma.journeyOptionFlow.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        text: true,
        displayTitle: true
      }
    });

    console.log(`📊 Total de jornadas: ${journeys.length}`);
    console.log('');

    // Estatísticas
    const withTitle = journeys.filter(j => j.displayTitle && j.displayTitle.trim() !== '');
    const withoutTitle = journeys.filter(j => !j.displayTitle || j.displayTitle.trim() === '');

    console.log('📈 ESTATÍSTICAS:');
    console.log(`   ✅ Com título: ${withTitle.length}`);
    console.log(`   ❌ Sem título: ${withoutTitle.length}`);
    console.log('');

    // Listar todas as jornadas
    console.log('📋 LISTA COMPLETA:');
    console.log('==================');
    
    journeys.forEach(journey => {
      console.log(`\n🔍 ID: ${journey.id}`);
      console.log(`   📝 Text: ${journey.text}`);
      
      if (journey.displayTitle) {
        console.log(`   ✨ Display Title: ${journey.displayTitle}`);
      } else {
        console.log(`   ⚠️  Display Title: [NÃO DEFINIDO]`);
      }
      console.log('   ---');
    });

    console.log('');
    console.log('===============================================');
    console.log('💡 SUGESTÕES PARA AJUSTES MANUAIS:');
    console.log('===============================================');
    console.log('');
    console.log('Se algum título não ficou adequado, execute este SQL no Supabase:');
    console.log('');
    console.log('UPDATE "JourneyOptionFlow"');
    console.log('SET "displayTitle" = \'Seu novo título aqui\'');
    console.log('WHERE id = [ID_DA_JORNADA];');
    console.log('');
    console.log('Exemplo:');
    console.log('UPDATE "JourneyOptionFlow"');
    console.log('SET "displayTitle" = \'Filmes que exploram a ambição e excelência\'');
    console.log('WHERE id = 145;');
    console.log('');

    // Listar os mais usados (baseado em MovieSuggestionFlow)
    console.log('📊 JORNADAS MAIS USADAS:');
    console.log('========================');
    
    const mostUsed = await prisma.movieSuggestionFlow.groupBy({
      by: ['journeyOptionFlowId'],
      _count: {
        journeyOptionFlowId: true
      },
      orderBy: {
        _count: {
          journeyOptionFlowId: 'desc'
        }
      },
      take: 15
    });

    for (const usage of mostUsed) {
      const journey = journeys.find(j => j.id === usage.journeyOptionFlowId);
      if (journey) {
        console.log(`\n📌 ID ${journey.id} - Usado ${usage._count.journeyOptionFlowId}x`);
        console.log(`   ${journey.displayTitle || '[SEM TÍTULO]'}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao revisar títulos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
reviewJourneyTitles();

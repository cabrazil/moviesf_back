import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para gerar e popular o campo displayTitle na tabela JourneyOptionFlow
 * 
 * Uso: npx ts-node src/scripts/generateJourneyTitles.ts
 */

function generateDisplayTitle(text: string): string {
  // Remover reticências e pontuação
  let processed = text
    .replace(/\.\.\./g, '')
    .replace(/\?/g, '')
    .trim();

  // Padrões comuns de transformação - usando "que" e primeira pessoa do plural
  const patterns = [
    // Padrões específicos com transformações de verbos
    { from: /^te prenda com (.+)$/i, to: 'Filmes que te prendem com $1' },
    { from: /^te envolva em (.+)$/i, to: 'Filmes que te envolvem em $1' },
    { from: /^te faça (.+)$/i, to: 'Filmes que te fazem $1' },
    { from: /^me faça (.+)$/i, to: 'Filmes que me fazem $1' },
    { from: /^seja (.+)$/i, to: 'Filmes que são $1' },
    { from: /^seja (.+) e (.+)$/i, to: 'Filmes que são $1 e $2' },
    
    // Padrões gerais
    { from: /^as complexidades (.+)$/i, to: 'Filmes que exploram $1' },
    { from: /^explore (.+)$/i, to: 'Filmes que exploram $1' },
    { from: /^mergulhe (.+)$/i, to: 'Filmes que mergulham em $1' },
    { from: /^revele (.+)$/i, to: 'Filmes que revelam $1' },
    { from: /^ofereça (.+)$/i, to: 'Filmes que oferecem $1' },
    { from: /^uma exploração (.+)$/i, to: 'Filmes com uma exploração de $1' },
    { from: /^uma análise (.+)$/i, to: 'Filmes com uma análise de $1' },
    { from: /^um mergulho (.+)$/i, to: 'Filmes com um mergulho em $1' },
    
    // Padrões com "e" - usando "que" em vez de "sobre"
    { from: /^(.+) e (.+)$/i, to: 'Filmes que $1 e $2' },
  ];

  for (const pattern of patterns) {
    const match = processed.match(pattern.from);
    if (match) {
      return processed.replace(pattern.from, pattern.to);
    }
  }

  // Fallback: adicionar prefixo genérico usando "que" em vez de "sobre"
  return `Filmes que ${processed}`;
}

async function generateJourneyTitles() {
  try {
    console.log('🎬 GERANDO TÍTULOS PARA JORNADAS EMOCIONAIS');
    console.log('=============================================');
    console.log('');

    // Buscar todas as jornadas
    const journeys = await prisma.journeyOptionFlow.findMany({
      orderBy: { id: 'asc' }
    });

    console.log(`📊 Total de jornadas encontradas: ${journeys.length}`);
    console.log('');

    let updatedCount = 0;
    let skippedCount = 0;

    // Processar cada jornada
    for (const journey of journeys) {
      console.log(`\n🔍 Processando Jornada ID: ${journey.id}`);
      console.log(`   📝 Text: ${journey.text}`);

      // Verificar se já tem displayTitle
      if (journey.displayTitle && journey.displayTitle.trim() !== '') {
        console.log(`   ⚠️  DisplayTitle já existe: "${journey.displayTitle}"`);
        console.log(`   ⏭️  Pulando...`);
        skippedCount++;
        continue;
      }

      // Gerar título
      const generatedTitle = generateDisplayTitle(journey.text);
      console.log(`   ✨ Título gerado: "${generatedTitle}"`);

      // Atualizar no banco
      await prisma.journeyOptionFlow.update({
        where: { id: journey.id },
        data: { displayTitle: generatedTitle }
      });

      console.log(`   ✅ Atualizado com sucesso!`);
      updatedCount++;
    }

    console.log('');
    console.log('=============================================');
    console.log('🎉 PROCESSAMENTO CONCLUÍDO!');
    console.log('=============================================');
    console.log(`✅ Jornadas atualizadas: ${updatedCount}`);
    console.log(`⏭️  Jornadas puladas: ${skippedCount}`);
    console.log(`📊 Total processado: ${journeys.length}`);
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('   1. Revisar os títulos gerados no Supabase');
    console.log('   2. Ajustar manualmente se necessário');
    console.log('   3. Executar novamente se quiser regenerar (apague os títulos primeiro)');
    console.log('');

    // Mostrar preview dos títulos gerados
    console.log('📋 PREVIEW DOS TÍTULOS GERADOS:');
    console.log('================================');
    const updatedJourneys = await prisma.journeyOptionFlow.findMany({
      where: {
        displayTitle: { not: null }
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        displayTitle: true,
        text: true
      }
    });

    updatedJourneys.forEach(j => {
      console.log(`\nID ${j.id}:`);
      console.log(`  Original: ${j.text}`);
      console.log(`  Gerado: ${j.displayTitle}`);
    });

  } catch (error) {
    console.error('❌ Erro ao gerar títulos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
generateJourneyTitles();

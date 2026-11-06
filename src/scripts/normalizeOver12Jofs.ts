import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando todas as JOFs com mais de 12 SubSentiments no banco...');

  const over12Before: Array<{ journeyOptionFlowId: number; cnt: bigint }> = await prisma.$queryRaw`
    SELECT "journeyOptionFlowId", COUNT(*) as cnt
    FROM "JourneyOptionFlowSubSentiment"
    GROUP BY "journeyOptionFlowId"
    HAVING COUNT(*) > 12
    ORDER BY "journeyOptionFlowId" ASC
  `;
  console.log('📋 Antes do ajuste:', over12Before.map(r => `JOF ${r.journeyOptionFlowId} (${r.cnt})`).join(', '));

  // ============================================================================
  // 1. JOF 105: "A tensão diante do desconhecido" (Tinha 16 -> Vai para 12)
  // ============================================================================
  console.log('\n🔧 Ajustando JOF 105 ("A tensão diante do desconhecido")...');
  const remove105 = [93, 26, 72, 78, 28, 103, 110]; // Remove conforto, humor leve, reflexão serena, autodescoberta (7 itens)
  const del105 = await prisma.journeyOptionFlowSubSentiment.deleteMany({
    where: { journeyOptionFlowId: 105, subSentimentId: { in: remove105 } }
  });
  console.log(`   🗑️  Removidos ${del105.count} SubSentiments incoerentes: [${remove105.join(', ')}]`);

  const upsert105 = [
    { subSentimentId: 79, weight: 1.00 },  // Suspense Crescente (era 0.95)
    { subSentimentId: 102, weight: 0.95 }, // Conflito e Sobrevivência (era 0.85)
    { subSentimentId: 34, weight: 0.90 },  // Adrenalina / Emoção Intensa (NOVO)
    { subSentimentId: 142, weight: 0.90 }, // Tensão Social e Invasiva (NOVO)
    { subSentimentId: 31, weight: 0.88 },  // Catarse / Liberação de Tensão Controlada (NOVO)
  ];
  for (const item of upsert105) {
    await prisma.journeyOptionFlowSubSentiment.upsert({
      where: {
        journeyOptionFlowId_subSentimentId: { journeyOptionFlowId: 105, subSentimentId: item.subSentimentId }
      },
      update: { weight: new Prisma.Decimal(item.weight), updatedAt: new Date() },
      create: {
        journeyOptionFlowId: 105,
        subSentimentId: item.subSentimentId,
        weight: new Prisma.Decimal(item.weight),
        updatedAt: new Date()
      }
    });
  }

  // ============================================================================
  // 2. JOF 135: "Histórias de renovação e vitalidade" (Tinha 18 -> Vai para 12)
  // ============================================================================
  console.log('\n🔧 Ajustando JOF 135 ("Histórias de renovação e vitalidade")...');
  const remove135 = [19, 18, 87, 102, 76, 75]; // Remove Emotivo(Triste), Vazio, Complexidade Psicológica, Conflito, Desafio Existencial, Isolamento (6 itens)
  const del135 = await prisma.journeyOptionFlowSubSentiment.deleteMany({
    where: { journeyOptionFlowId: 135, subSentimentId: { in: remove135 } }
  });
  console.log(`   🗑️  Removidos ${del135.count} SubSentiments incoerentes: [${remove135.join(', ')}]`);

  const upsert135 = [
    { subSentimentId: 21, weight: 1.00 }, // Inspiração / Otimismo
    { subSentimentId: 39, weight: 1.00 }, // Inspiração / Reacender a Chama
    { subSentimentId: 35, weight: 0.95 }, // Inspiração / Motivação para Agir
    { subSentimentId: 95, weight: 0.90 }, // Conexão Humana e Natureza
  ];
  for (const item of upsert135) {
    await prisma.journeyOptionFlowSubSentiment.upsert({
      where: {
        journeyOptionFlowId_subSentimentId: { journeyOptionFlowId: 135, subSentimentId: item.subSentimentId }
      },
      update: { weight: new Prisma.Decimal(item.weight), updatedAt: new Date() },
      create: {
        journeyOptionFlowId: 135,
        subSentimentId: item.subSentimentId,
        weight: new Prisma.Decimal(item.weight),
        updatedAt: new Date()
      }
    });
  }

  // ============================================================================
  // 3. JOF 160: "Beleza e poesia em meio aos dias cinzas" (Tinha 15 -> Vai para 12)
  // ============================================================================
  console.log('\n🔧 Ajustando JOF 160 ("Beleza e poesia em meio aos dias cinzas")...');
  const remove160 = [18, 76, 58, 94]; // Remove Vazio, Desafio Existencial, Drama Familiar, Nostalgia Positiva (4 itens)
  const del160 = await prisma.journeyOptionFlowSubSentiment.deleteMany({
    where: { journeyOptionFlowId: 160, subSentimentId: { in: remove160 } }
  });
  console.log(`   🗑️  Removidos ${del160.count} SubSentiments excedentes: [${remove160.join(', ')}]`);

  // Adiciona 143 - Beleza Melancólica (1.00)
  await prisma.journeyOptionFlowSubSentiment.upsert({
    where: {
      journeyOptionFlowId_subSentimentId: { journeyOptionFlowId: 160, subSentimentId: 143 }
    },
    update: { weight: new Prisma.Decimal(1.00), updatedAt: new Date() },
    create: {
      journeyOptionFlowId: 160,
      subSentimentId: 143,
      weight: new Prisma.Decimal(1.00),
      updatedAt: new Date()
    }
  });

  // Verificação final
  console.log('\n📊 Verificando resultado final nas JOFs 105, 135 e 160:');
  for (const jofId of [105, 135, 160]) {
    const rows: Array<{ subSentimentId: number; name: string; weight: any }> = await prisma.$queryRaw`
      SELECT jofss."subSentimentId", ss.name, jofss.weight
      FROM "JourneyOptionFlowSubSentiment" jofss
      JOIN "SubSentiment" ss ON ss.id = jofss."subSentimentId"
      WHERE jofss."journeyOptionFlowId" = ${jofId}
      ORDER BY jofss.weight DESC, ss.name ASC
    `;
    const uniqueNames = new Set(rows.map(r => r.name.trim().toLowerCase()));
    console.log(`   ✅ JOF ${jofId}: ${rows.length} registros | ${uniqueNames.size} nomes únicos`);
  }

  const over12After: Array<{ journeyOptionFlowId: number; cnt: bigint }> = await prisma.$queryRaw`
    SELECT "journeyOptionFlowId", COUNT(*) as cnt
    FROM "JourneyOptionFlowSubSentiment"
    GROUP BY "journeyOptionFlowId"
    HAVING COUNT(*) > 12
    ORDER BY "journeyOptionFlowId" ASC
  `;
  if (over12After.length === 0) {
    console.log('\n🎉 Nenhuma JOF com mais de 12 SubSentiments restante no banco!');
  } else {
    console.log('\n⚠️ Ainda restam JOFs com > 12:', over12After);
  }
}

main()
  .catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


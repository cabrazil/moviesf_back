
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugJourneyFlow() {
  const targetJofId = 176;

  console.log(`\n🔍 Investigando JourneyOptionFlow ID: ${targetJofId}\n`);

  // 1. Contar registros brutos na tabela de ligação (sem JOINs)
  const rawCount = await prisma.journeyOptionFlowSubSentiment.count({
    where: { journeyOptionFlowId: targetJofId }
  });
  console.log(`📊 Total na tabela 'JourneyOptionFlowSubSentiment': ${rawCount}`);

  if (rawCount === 0) {
    console.log("❌ Nenhum registro encontrado. Verifique se o ID 176 está correto.");
    return;
  }

  // 2. Buscar os IDs dos SubSentimentos vinculados
  const links = await prisma.journeyOptionFlowSubSentiment.findMany({
    where: { journeyOptionFlowId: targetJofId },
    select: { subSentimentId: true, weight: true }
  });

  const subIds = links.map(l => l.subSentimentId);
  console.log(`🆔 SubSentiment IDs vinculados: ${subIds.join(', ')}`);

  // 3. Verificar quais desses IDs realmente existem na tabela SubSentiment
  const validSubs = await prisma.subSentiment.findMany({
    where: { id: { in: subIds } },
    select: { id: true, name: true }
  });

  console.log(`✅ SubSentiments válidos encontrados: ${validSubs.length}`);

  // 4. Identificar o ID órfão (se houver)
  const validIds = validSubs.map(s => s.id);
  const orphanIds = subIds.filter(id => !validIds.includes(id));

  if (orphanIds.length > 0) {
    console.log(`\n⚠️ PROBLEMA ENCONTRADO: ${orphanIds.length} registro(s) com SubSentiment ID inválido (órfão):`);
    console.log(`   IDs Órfãos: ${orphanIds.join(', ')}`);
    console.log("   --> Estes registros são invisíveis no seu INNER JOIN.");
  } else if (rawCount < 12) {
    console.log(`\n⚠️ O problema é que realmente só existem ${rawCount} registros gravados.`);
    console.log("   Você pode ter esquecido de inserir um, ou houve duplicata removida pelo banco.");
  } else {
    console.log("\n✅ Tudo parece correto nos dados brutos. Se a query retorna menos, verifique os filtros do SQL.");
  }
}

debugJourneyFlow()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

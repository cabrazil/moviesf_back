
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSubSentiments() {
  const idsToCheck = [176, 103, 21, 110, 40, 68, 58, 105, 77, 106, 78, 24];

  console.log(`\n🔍 Verificando integridade dos IDs: ${idsToCheck.join(', ')}\n`);

  const existing = await prisma.subSentiment.findMany({
    where: { id: { in: idsToCheck } },
    select: { id: true, name: true }
  });

  const existingIds = existing.map(e => e.id);
  const missingIds = idsToCheck.filter(id => !existingIds.includes(id));

  console.log(`✅ IDs Encontrados (${existing.length}):`);
  existing.forEach(e => console.log(`   - ID ${e.id}: ${e.name}`));

  if (missingIds.length > 0) {
    console.log(`\n❌ IDs FALTANDO (Não existem na tabela SubSentiment):`);
    console.log(`   🚨 ${missingIds.join(', ')}`);
  } else {
    console.log(`\n✨ Todos os 12 IDs existem!`);
  }
}

checkSubSentiments()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

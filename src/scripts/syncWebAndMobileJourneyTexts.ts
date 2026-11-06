import './scripts-helper';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Sincronizando JourneyStepFlow.question = mobileQuestion...');
  const updatedSteps = await prisma.$executeRawUnsafe(`
    UPDATE "JourneyStepFlow"
    SET "question" = "mobileQuestion", "updatedAt" = NOW()
    WHERE "mobileQuestion" IS NOT NULL;
  `);
  console.log(`✅ ${updatedSteps} registros sincronizados em JourneyStepFlow (question = mobileQuestion).`);

  console.log('🚀 Sincronizando JourneyOptionFlow.text = mobileText...');
  const updatedOptions = await prisma.$executeRawUnsafe(`
    UPDATE "JourneyOptionFlow"
    SET "text" = "mobileText", "updatedAt" = NOW()
    WHERE "mobileText" IS NOT NULL;
  `);
  console.log(`✅ ${updatedOptions} registros sincronizados em JourneyOptionFlow (text = mobileText).`);

  console.log('\n🎉 Padronização Web + Mobile concluída com sucesso!');
}

main()
  .catch((err) => {
    console.error('❌ Erro durante a sincronização:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


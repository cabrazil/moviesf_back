
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getContext() {
  try {
    const journeyOption = await prisma.journeyOptionFlow.findUnique({
      where: { id: 87 },
      select: { text: true }
    });
    const sentiments = await prisma.mainSentiment.findMany({
      where: { id: { in: [17, 15] } },
      select: { id: true, name: true }
    });

    const analysisSentiment = sentiments.find(s => s.id === 17);
    const validationSentiment = sentiments.find(s => s.id === 15);

    console.log('\n--- Contexto da Curadoria ---');
    console.log(`Opção de Jornada (ID 87): "${journeyOption?.text}"`);
    console.log(`Lente de Análise (ID 17): "${analysisSentiment?.name}"`);
    console.log(`Validação da Jornada (ID 15): "${validationSentiment?.name}"`);
    console.log('-----------------------------\n');

  } catch (e) {
    console.error('Erro ao buscar contexto:', e);
  } finally {
    await prisma.$disconnect();
  }
}

getContext();

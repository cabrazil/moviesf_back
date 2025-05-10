import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function checkSequence() {
  try {
    console.log('Verificando sequência do autoincrement...');

    // Verificar o maior ID atual
    const result = await prisma.$queryRaw`
      SELECT MAX(id) as max_id FROM "JourneyOptionFlow";
    `;
    console.log('Maior ID atual:', result);

    // Verificar a sequência atual
    const sequenceInfo = await prisma.$queryRaw`
      SELECT last_value, is_called
      FROM "JourneyOptionFlow_id_seq";
    `;
    console.log('Informações da sequência:', sequenceInfo);

    // Tentar corrigir a sequência
    await prisma.$executeRaw`
      SELECT setval('"JourneyOptionFlow_id_seq"', (SELECT MAX(id) FROM "JourneyOptionFlow"));
    `;
    console.log('Sequência atualizada');

    // Verificar novamente a sequência
    const updatedSequenceInfo = await prisma.$queryRaw`
      SELECT last_value, is_called
      FROM "JourneyOptionFlow_id_seq";
    `;
    console.log('Informações atualizadas da sequência:', updatedSequenceInfo);

  } catch (error) {
    console.error('Erro ao verificar/corrigir sequência:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSequence(); 
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testJourneyStepFlow() {
  try {
    console.log('Tentando criar novo registro...');
    
    const now = new Date();
    
    const newStep = await prisma.journeyStepFlow.create({
      data: {
        journeyFlowId: 1,
        stepId: '2D',
        order: 2,
        question: 'Teste via código Prisma',
        createdAt: now,
        updatedAt: now
      }
    });

    console.log('Registro criado com sucesso:', newStep);
  } catch (error) {
    console.error('Erro ao criar registro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testJourneyStepFlow(); 
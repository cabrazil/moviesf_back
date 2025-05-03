import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listSteps() {
  try {
    console.log('\n=== Listando JourneyStepFlows ===');
    const steps = await prisma.journeyStepFlow.findMany({
      include: {
        options: true
      }
    });

    steps.forEach(step => {
      console.log(`\nStep ID: ${step.id}`);
      console.log(`Step Flow ID: ${step.stepId}`);
      console.log(`Ordem: ${step.order}`);
      console.log(`Pergunta: ${step.question}`);
      console.log('\nOpções:');
      step.options.forEach(option => {
        console.log(`  - ID: ${option.id}`);
        console.log(`    Texto: ${option.text}`);
        console.log(`    Próximo Step: ${option.nextStepId || 'Nenhum'}`);
        console.log(`    É Estado Final: ${option.isEndState}`);
      });
    });

  } catch (error) {
    console.error('❌ Erro ao listar steps:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
listSteps(); 
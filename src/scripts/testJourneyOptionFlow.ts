import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testJourneyOptionFlow() {
  try {
    console.log('Iniciando teste de inserção em JourneyOptionFlow...');

    // Verificar se o JourneyStepFlow existe
    const stepFlow = await prisma.journeyStepFlow.findUnique({
      where: { id: 9 }
    });

    if (!stepFlow) {
      console.log('JourneyStepFlow não encontrado');
      return;
    }

    console.log('JourneyStepFlow encontrado:', stepFlow);

    // Verificar se já existe um registro com o mesmo optionId
    const existingOption = await prisma.journeyOptionFlow.findFirst({
      where: {
        journeyStepFlowId: 9,
        optionId: "2A4"
      }
    });

    if (existingOption) {
      console.log('Já existe um registro com este optionId:', existingOption);
      return;
    }

    console.log('Preparando dados para inserção...');
    const data = {
      journeyStepFlowId: 9,
      optionId: "2A4",
      text: "...um drama pessoal, uma história de perda, ou algo que explore a fragilidade da condição humana?",
      nextStepId: null,
      isEndState: true
    };
    console.log('Dados preparados:', data);

    // Tentar criar o registro
    console.log('Tentando criar o registro...');
    const newOption = await prisma.journeyOptionFlow.create({
      data
    });

    console.log('Registro criado com sucesso:', newOption);
  } catch (error) {
    console.error('Erro ao criar registro:');
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Código do erro:', error.code);
      console.error('Mensagem:', error.message);
      if (error.meta) {
        console.error('Metadados:', error.meta);
      }
    } else {
      console.error('Erro não identificado:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testJourneyOptionFlow(); 
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Encontrar o passo 2 do estado de Tristeza
    const tristezaStep2 = await prisma.journeyStep.findFirst({
      where: {
        emotionalState: {
          name: "Estado inicial Tristeza"
        },
        stepId: "2"
      }
    });

    if (!tristezaStep2) {
      throw new Error('Passo 2 do estado de Tristeza não encontrado');
    }

    // Adicionar novas opções ao passo 2
    await prisma.journeyOption.createMany({
      data: [
        {
          journeyStepId: tristezaStep2.id,
          text: "...me ajude a melhorar meu humor",
          nextStepId: "3B",
          isFinal: false
        },
        {
          journeyStepId: tristezaStep2.id,
          text: "...me faça refletir sobre a vida",
          nextStepId: "3C",
          isFinal: false
        }
      ],
      skipDuplicates: true
    });

    // Criar passo 3B - Melhorar o humor
    await prisma.journeyStep.create({
      data: {
        emotionalStateId: tristezaStep2.emotionalStateId,
        order: 4,
        stepId: "3B",
        question: "Entendo. Que tipo de filme pode te ajudar a melhorar o humor?",
        options: {
          create: [
            {
              text: "Uma comédia leve e despretensiosa",
              isFinal: true
            },
            {
              text: "Uma história inspiradora de superação",
              isFinal: true
            },
            {
              text: "Um filme familiar reconfortante",
              isFinal: true
            }
          ]
        }
      }
    });

    // Criar passo 3C - Reflexão
    await prisma.journeyStep.create({
      data: {
        emotionalStateId: tristezaStep2.emotionalStateId,
        order: 5,
        stepId: "3C",
        question: "Que tipo de reflexão você busca neste momento?",
        options: {
          create: [
            {
              text: "Sobre o sentido da vida e nossa existência",
              isFinal: true
            },
            {
              text: "Sobre relacionamentos e conexões humanas",
              isFinal: true
            },
            {
              text: "Sobre transformação e crescimento pessoal",
              isFinal: true
            }
          ]
        }
      }
    });

    console.log('Opções e passos do estado de Tristeza expandidos com sucesso!');
  } catch (error) {
    console.error('Erro ao expandir opções do estado de Tristeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
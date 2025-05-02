import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Adicionar opções ao passo inicial do estado Felicidade
    const felicidadeStep1 = await prisma.journeyStep.findFirst({
      where: {
        emotionalState: {
          name: "Estado inicial Felicidade"
        },
        stepId: "1"
      }
    });

    if (felicidadeStep1) {
      await prisma.journeyOption.createMany({
        data: [
          {
            journeyStepId: felicidadeStep1.id,
            text: "Sim, estou me sentindo feliz e animado(a)!",
            nextStepId: "2",
            isFinal: false
          },
          {
            journeyStepId: felicidadeStep1.id,
            text: "Na verdade, estou mais para triste...",
            nextStepId: "1",
            isFinal: false
          }
        ],
        skipDuplicates: true
      });
    }

    // Adicionar opções ao passo inicial do estado Tristeza
    const tristezaStep1 = await prisma.journeyStep.findFirst({
      where: {
        emotionalState: {
          name: "Estado inicial Tristeza"
        },
        stepId: "1"
      }
    });

    if (tristezaStep1) {
      await prisma.journeyOption.createMany({
        data: [
          {
            journeyStepId: tristezaStep1.id,
            text: "Sim, estou me sentindo triste...",
            nextStepId: "2",
            isFinal: false
          },
          {
            journeyStepId: tristezaStep1.id,
            text: "Na verdade, estou mais para feliz!",
            nextStepId: "1",
            isFinal: false
          }
        ],
        skipDuplicates: true
      });
    }

    console.log('Opções iniciais adicionadas com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar opções:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
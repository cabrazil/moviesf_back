import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Corrigir stepId do passo 3 do estado Felicidade
    const felicidadeStep3 = await prisma.journeyStep.findFirst({
      where: {
        emotionalState: {
          name: "Estado inicial Felicidade"
        },
        stepId: "3"
      },
      include: {
        options: true
      }
    });

    if (felicidadeStep3) {
      await prisma.journeyStep.update({
        where: { id: felicidadeStep3.id },
        data: { stepId: "3A" }
      });
    }

    // Corrigir stepId do passo 3 do estado Tristeza
    const tristezaStep3 = await prisma.journeyStep.findFirst({
      where: {
        emotionalState: {
          name: "Estado inicial Tristeza"
        },
        stepId: "3"
      },
      include: {
        options: true
      }
    });

    if (tristezaStep3) {
      await prisma.journeyStep.update({
        where: { id: tristezaStep3.id },
        data: { stepId: "3A" }
      });
    }

    console.log('IDs dos passos corrigidos com sucesso!');
  } catch (error) {
    console.error('Erro ao corrigir IDs dos passos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
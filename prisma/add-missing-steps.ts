import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Encontrar o estado emocional de Felicidade
    const felicidadeState = await prisma.emotionalState.findFirst({
      where: {
        name: "Estado inicial Felicidade"
      }
    });

    if (!felicidadeState) {
      throw new Error('Estado emocional de Felicidade não encontrado');
    }

    // Criar passo 3B - Calor no coração
    const step3B = await prisma.journeyStep.create({
      data: {
        emotionalStateId: felicidadeState.id,
        order: 4,
        stepId: "3B",
        question: "Que tipo de história tocante você prefere?",
        options: {
          create: [
            {
              text: "Um romance doce e reconfortante",
              isFinal: true
            },
            {
              text: "Uma história de amizade e companheirismo",
              isFinal: true
            },
            {
              text: "Uma jornada de autodescoberta e crescimento pessoal",
              isFinal: true
            }
          ]
        }
      }
    });

    // Criar passo 3C - Energia e empolgação
    const step3C = await prisma.journeyStep.create({
      data: {
        emotionalStateId: felicidadeState.id,
        order: 5,
        stepId: "3C",
        question: "Que tipo de energia você quer sentir?",
        options: {
          create: [
            {
              text: "Ação e aventura eletrizante",
              isFinal: true
            },
            {
              text: "Competição e superação de desafios",
              isFinal: true
            },
            {
              text: "Música, dança e celebração",
              isFinal: true
            }
          ]
        }
      }
    });

    // Criar passo 3D - Nostalgia
    const step3D = await prisma.journeyStep.create({
      data: {
        emotionalStateId: felicidadeState.id,
        order: 6,
        stepId: "3D",
        question: "Que tipo de nostalgia você busca?",
        options: {
          create: [
            {
              text: "Clássicos atemporais que marcaram época",
              isFinal: true
            },
            {
              text: "Histórias que remetem à infância e juventude",
              isFinal: true
            },
            {
              text: "Filmes que celebram momentos especiais da vida",
              isFinal: true
            }
          ]
        }
      }
    });

    console.log('Passos faltantes adicionados com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar passos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixQuestionAssociations() {
  try {
    // 1. Remover associações do BasicSentiment id = 1
    await prisma.question.updateMany({
      where: {
        basicSentimentId: 1
      },
      data: {
        basicSentimentId: 3 // Temporariamente associando ao ID 3 para evitar erro de nulo
      }
    })

    // 2. Associar questões 2, 3 e 4 ao BasicSentiment id = 3
    await prisma.question.updateMany({
      where: {
        id: {
          in: [2, 3, 4]
        }
      },
      data: {
        basicSentimentId: 3
      }
    })

    // 3. Associar questões 5, 6 e 7 ao BasicSentiment id = 2
    await prisma.question.updateMany({
      where: {
        id: {
          in: [5, 6, 7]
        }
      },
      data: {
        basicSentimentId: 2
      }
    })

    console.log('Associações corrigidas com sucesso!')
  } catch (error) {
    console.error('Erro ao corrigir associações:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixQuestionAssociations() 
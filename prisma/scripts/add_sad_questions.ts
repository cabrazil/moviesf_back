import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addSadQuestions() {
  try {
    // Verificar o último order usado para o sentimento triste/melancólico
    const lastQuestion = await prisma.question.findFirst({
      where: {
        basicSentimentId: 3
      },
      orderBy: {
        order: 'desc'
      }
    })

    const nextOrder = (lastQuestion?.order || 0) + 1

    // Adicionar as novas questões
    const newQuestions = await prisma.question.createMany({
      data: [
        {
          text: "...me permita sentir essas emoções (uma catarse)?",
          order: nextOrder,
          isInitial: false,
          basicSentimentId: 3
        },
        {
          text: "...que tal um drama profundo e tocante?",
          order: nextOrder + 1,
          isInitial: false,
          basicSentimentId: 3
        }
      ]
    })

    console.log(`${newQuestions.count} novas questões adicionadas com sucesso!`)
  } catch (error) {
    console.error('Erro ao adicionar novas questões:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addSadQuestions() 
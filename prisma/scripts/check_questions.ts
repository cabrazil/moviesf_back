import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkQuestions() {
  try {
    const questions = await prisma.question.findMany({
      include: {
        basicSentiment: true
      },
      orderBy: {
        id: 'asc'
      }
    })

    console.log('\nQuestões e suas associações:')
    console.log('----------------------------')
    
    if (questions.length === 0) {
      console.log('Nenhuma questão encontrada!')
    } else {
      questions.forEach(question => {
        console.log(`\nID: ${question.id}`)
        console.log(`Texto: ${question.text}`)
        console.log(`Ordem: ${question.order}`)
        console.log(`É inicial: ${question.isInitial}`)
        console.log(`BasicSentiment ID: ${question.basicSentimentId}`)
        console.log(`BasicSentiment Nome: ${question.basicSentiment?.name || 'N/A'}`)
        console.log('----------------------------')
      })
    }
  } catch (error) {
    console.error('Erro ao consultar questões:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkQuestions() 
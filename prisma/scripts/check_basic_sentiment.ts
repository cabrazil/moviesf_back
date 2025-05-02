import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBasicSentiments() {
  try {
    const sentiments = await prisma.basicSentiment.findMany()

    console.log('\nRegistros em BasicSentiment:')
    console.log('----------------------------')
    
    if (sentiments.length === 0) {
      console.log('Nenhum registro encontrado!')
    } else {
      sentiments.forEach(sentiment => {
        console.log(`\nID: ${sentiment.id}`)
        console.log(`Nome: ${sentiment.name}`)
        console.log(`Descrição: ${sentiment.description || 'N/A'}`)
        console.log(`Criado em: ${sentiment.createdAt}`)
        console.log(`Atualizado em: ${sentiment.updatedAt}`)
        console.log('----------------------------')
      })
    }
  } catch (error) {
    console.error('Erro ao consultar BasicSentiments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBasicSentiments() 
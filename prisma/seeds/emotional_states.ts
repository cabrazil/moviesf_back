import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Exemplo de estado emocional triste/melancólico
  const sadState = {
    name: "Triste/Melancólico",
    description: "Estado emocional caracterizado por tristeza e melancolia",
    contextFlow: {
      rootQuestion: "Como você está se sentindo?",
      options: [
        {
          id: "sad-1",
          text: "Entendo. Nesses momentos, você geralmente prefere um filme que...",
          options: [
            {
              id: "sad-1-1",
              text: "...me faça refletir sobre a vida e talvez encontrar algum significado?",
              movieSuggestions: [
                {
                  movieId: "movie-1", // Será substituído pelo ID real do filme
                  reason: "Este filme apresenta uma jornada de superação que faz refletir sobre resiliência"
                }
              ]
            },
            {
              id: "sad-1-2",
              text: "...me permita sentir essas emoções (uma catarse)?",
              movieSuggestions: [
                {
                  movieId: "movie-2",
                  reason: "Um drama profundo que permite processar emoções difíceis"
                }
              ]
            }
          ]
        }
      ]
    }
  }

  // Criar o estado emocional no banco
  const createdState = await prisma.emotionalState.create({
    data: {
      name: sadState.name,
      description: sadState.description,
      contextFlow: sadState.contextFlow,
      isActive: true
    }
  })

  console.log('Estado emocional criado:', createdState)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 
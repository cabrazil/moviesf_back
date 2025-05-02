import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Estado Felicidade - Humor (3A)
    const humorOptions = await prisma.journeyOption.findMany({
      where: {
        journeyStep: {
          stepId: "3A",
          emotionalState: {
            name: "Estado inicial Felicidade"
          }
        },
        isFinal: true
      }
    });

    // Associações para humor pastelão
    if (humorOptions[0]) {
      await prisma.movieSuggestion.create({
        data: {
          movieId: (await prisma.movie.findUnique({ where: { title: "Curtindo a Vida Adoidado" } }))!.id,
          emotionalStateId: 2, // Felicidade
          journeyOptionId: humorOptions[0].id,
          reason: "Uma comédia clássica com humor irreverente e situações hilárias",
          relevance: 5
        }
      });
    }

    // Associações para humor inteligente
    if (humorOptions[1]) {
      await prisma.movieSuggestion.create({
        data: {
          movieId: (await prisma.movie.findUnique({ where: { title: "10 Coisas Que Eu Odeio em Você" } }))!.id,
          emotionalStateId: 2,
          journeyOptionId: humorOptions[1].id,
          reason: "Uma comédia romântica inteligente com diálogos afiados e referências a Shakespeare",
          relevance: 5
        }
      });
    }

    // Estado Felicidade - Calor no coração (3B)
    const heartOptions = await prisma.journeyOption.findMany({
      where: {
        journeyStep: {
          stepId: "3B",
          emotionalState: {
            name: "Estado inicial Felicidade"
          }
        },
        isFinal: true
      }
    });

    // Associações para romance doce
    if (heartOptions[0]) {
      await prisma.movieSuggestion.create({
        data: {
          movieId: (await prisma.movie.findUnique({ where: { title: "Um Lugar Chamado Notting Hill" } }))!.id,
          emotionalStateId: 2,
          journeyOptionId: heartOptions[0].id,
          reason: "Um romance encantador que aquece o coração com momentos doces e memoráveis",
          relevance: 5
        }
      });
    }

    // Estado Tristeza - Catarse (3A)
    const catharticOptions = await prisma.journeyOption.findMany({
      where: {
        journeyStep: {
          stepId: "3A",
          emotionalState: {
            name: "Estado inicial Tristeza"
          }
        },
        isFinal: true
      }
    });

    // Associações para drama profundo
    if (catharticOptions[0]) {
      await prisma.movieSuggestion.create({
        data: {
          movieId: (await prisma.movie.findUnique({ where: { title: "As Vantagens de Ser Invisível" } }))!.id,
          emotionalStateId: 6, // Tristeza
          journeyOptionId: catharticOptions[0].id,
          reason: "Um drama profundo e tocante sobre crescimento, amizade e superação de traumas",
          relevance: 5
        }
      });
    }

    // Associações para superação
    if (catharticOptions[1]) {
      await prisma.movieSuggestion.create({
        data: {
          movieId: (await prisma.movie.findUnique({ where: { title: "À Procura da Felicidade" } }))!.id,
          emotionalStateId: 6,
          journeyOptionId: catharticOptions[1].id,
          reason: "Uma história real e emocionante de superação e perseverança",
          relevance: 5
        }
      });
    }

    // Estado Tristeza - Melhorar humor (3B)
    const improveOptions = await prisma.journeyOption.findMany({
      where: {
        journeyStep: {
          stepId: "3B",
          emotionalState: {
            name: "Estado inicial Tristeza"
          }
        },
        isFinal: true
      }
    });

    // Associações para comédia leve
    if (improveOptions[0]) {
      await prisma.movieSuggestion.create({
        data: {
          movieId: (await prisma.movie.findUnique({ where: { title: "De Repente 30" } }))!.id,
          emotionalStateId: 6,
          journeyOptionId: improveOptions[0].id,
          reason: "Uma comédia leve e divertida que traz alegria e nostalgia",
          relevance: 5
        }
      });
    }

    // Estado Tristeza - Reflexão (3C)
    const reflectiveOptions = await prisma.journeyOption.findMany({
      where: {
        journeyStep: {
          stepId: "3C",
          emotionalState: {
            name: "Estado inicial Tristeza"
          }
        },
        isFinal: true
      }
    });

    // Associações para reflexão existencial
    if (reflectiveOptions[0]) {
      await prisma.movieSuggestion.create({
        data: {
          movieId: (await prisma.movie.findUnique({ where: { title: "Soul" } }))!.id,
          emotionalStateId: 6,
          journeyOptionId: reflectiveOptions[0].id,
          reason: "Uma animação profunda que nos faz refletir sobre o sentido da vida e nossa existência",
          relevance: 5
        }
      });
    }

    console.log('Filmes associados com sucesso!');
  } catch (error) {
    console.error('Erro ao associar filmes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
import { PrismaClient, Movie, MainSentiment, EmotionalState, SubSentiment, JourneyStep, JourneyOption, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface MainSentimentWithSubs extends MainSentiment {
  subSentiments: SubSentiment[];
}

interface JourneyStepWithOptions extends JourneyStep {
  options: JourneyOption[];
}

async function main() {
  // Limpar dados existentes
  await prisma.movieSuggestion.deleteMany();
  await prisma.journeyOption.deleteMany();
  await prisma.journeyStep.deleteMany();
  await prisma.movieSentiment.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.emotionalState.deleteMany();
  await prisma.subSentiment.deleteMany();
  await prisma.mainSentiment.deleteMany();

  // Criar alguns filmes de exemplo
  const movies = await Promise.all([
    prisma.movie.create({
      data: {
        title: "Todo Mundo em Pânico",
        year: 2000,
        director: "Keenen Ivory Wayans",
        description: "Uma paródia de filmes de terror e suspense",
        genres: ["Comédia", "Paródia"],
        streamingPlatforms: ["Netflix", "Amazon Prime"]
      }
    }),
    prisma.movie.create({
      data: {
        title: "O Diário de Bridget Jones",
        year: 2001,
        director: "Sharon Maguire",
        description: "Uma comédia romântica sobre uma mulher em busca do amor",
        genres: ["Comédia", "Romance"],
        streamingPlatforms: ["Netflix", "HBO Max"]
      }
    }),
    prisma.movie.create({
      data: {
        title: "Superbad",
        year: 2007,
        director: "Greg Mottola",
        description: "Dois amigos do ensino médio tentam comprar álcool para uma festa",
        genres: ["Comédia", "Adolescente"],
        streamingPlatforms: ["Netflix", "Amazon Prime"]
      }
    })
  ]);

  // Criar sentimento principal "Feliz / Alegre"
  const happySentiment = await prisma.mainSentiment.create({
    data: {
      name: "Feliz / Alegre",
      description: "Sentimento de alegria e felicidade",
      keywords: ["feliz", "alegre", "contente"],
      journeyFlow: {
        create: {
          steps: {
            create: [
              {
                stepId: "1",
                order: 1,
                question: "Como você está se sentindo principalmente neste momento?",
                options: {
                  create: [
                    {
                      optionId: "1A",
                      text: "Com muitas gargalhadas e um humor contagiante?",
                      nextStepId: "2A",
                      isEndState: false
                    },
                    {
                      optionId: "1B",
                      text: "Com calor no coração e uma sensação adorável?",
                      nextStepId: "2B",
                      isEndState: false
                    }
                  ]
                }
              },
              {
                stepId: "2A",
                order: 2,
                question: "Excelente! Você prefere um humor mais...",
                options: {
                  create: [
                    {
                      optionId: "2A1",
                      text: "Escancarado e físico (pastelão, situações absurdas)?",
                      nextStepId: null,
                      isEndState: true,
                      movieSuggestions: {
                        create: [
                          {
                            movieId: movies[0].id,
                            reason: "Comédia pastelão com situações hilárias",
                            relevance: 1
                          }
                        ]
                      }
                    },
                    {
                      optionId: "2A2",
                      text: "Inteligente e com diálogos afiados?",
                      nextStepId: null,
                      isEndState: true,
                      movieSuggestions: {
                        create: [
                          {
                            movieId: movies[2].id,
                            reason: "Comédia inteligente com humor refinado",
                            relevance: 1
                          }
                        ]
                      }
                    }
                  ]
                }
              },
              {
                stepId: "2B",
                order: 2,
                question: "Adorável! Você está mais no clima de...",
                options: {
                  create: [
                    {
                      optionId: "2B1",
                      text: "Uma comédia romântica com um final doce e feliz?",
                      nextStepId: null,
                      isEndState: true,
                      movieSuggestions: {
                        create: [
                          {
                            movieId: movies[1].id,
                            reason: "Comédia romântica leve e divertida",
                            relevance: 1
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    }
  });

  console.log('Dados iniciais criados com sucesso!');
  console.log('Sentimento principal criado:', happySentiment);
}

async function createMainSentiments(): Promise<MainSentimentWithSubs[]> {
  const sentiments = [
    {
      name: 'Felicidade',
      description: 'Sentimento de alegria e contentamento',
      keywords: ['feliz', 'alegre', 'contente'],
      subSentiments: [
        {
          name: 'Empolgação',
          description: 'Sentimento de grande entusiasmo',
          keywords: ['empolgado', 'entusiasmado', 'animado']
        },
        {
          name: 'Realização',
          description: 'Sentimento de conquista e sucesso',
          keywords: ['realizado', 'vitorioso', 'bem-sucedido']
        }
      ]
    },
    {
      name: 'Tristeza',
      description: 'Sentimento de melancolia e pesar',
      keywords: ['triste', 'melancólico', 'pesaroso'],
      subSentiments: [
        {
          name: 'Nostalgia',
          description: 'Saudade de momentos passados',
          keywords: ['nostálgico', 'saudoso']
        },
        {
          name: 'Solidão',
          description: 'Sentimento de isolamento',
          keywords: ['solitário', 'isolado']
        }
      ]
    }
  ];

  const createdSentiments: MainSentimentWithSubs[] = [];

  for (const sentiment of sentiments) {
    const mainSentiment = await prisma.mainSentiment.create({
      data: {
        name: sentiment.name,
        description: sentiment.description,
        keywords: sentiment.keywords,
        subSentiments: {
          create: sentiment.subSentiments
        }
      },
      include: {
        subSentiments: true
      }
    });
    createdSentiments.push(mainSentiment);
  }

  return createdSentiments;
}

async function createEmotionalStates(): Promise<EmotionalState[]> {
  const states = [
    {
      name: 'Como você está se sentindo?',
      description: 'Estado emocional inicial',
      isActive: true,
      mainSentiment: {
        connect: {
          name: 'Felicidade' // Conecta ao sentimento principal padrão
        }
      }
    }
  ];

  const createdStates: EmotionalState[] = [];

  for (const state of states) {
    const emotionalState = await prisma.emotionalState.create({
      data: state
    });
    createdStates.push(emotionalState);
  }

  return createdStates;
}

async function createMovies(): Promise<Movie[]> {
  const movies = [
    {
      title: 'À Procura da Felicidade',
      year: 2006,
      director: 'Gabriele Muccino',
      description: 'Um pai solteiro luta para criar seu filho enquanto busca uma vida melhor.',
      genres: ['Drama', 'Biografia']
    },
    {
      title: 'De Volta para o Futuro',
      year: 1985,
      director: 'Robert Zemeckis',
      description: 'Um adolescente viaja no tempo em um DeLorean modificado.',
      genres: ['Aventura', 'Ficção Científica', 'Comédia']
    },
    {
      title: 'Curtindo a Vida Adoidado',
      year: 1986,
      director: 'John Hughes',
      description: 'Um adolescente astuto planeja um dia de folga da escola.',
      genres: ['Comédia', 'Drama']
    },
    {
      title: 'As Patricinhas de Beverly Hills',
      year: 1995,
      director: 'Amy Heckerling',
      description: 'Uma adolescente popular ajuda uma nova aluna a se adaptar ao ensino médio.',
      genres: ['Comédia', 'Romance']
    },
    {
      title: 'O Clube dos Cinco',
      year: 1985,
      director: 'John Hughes',
      description: 'Cinco estudantes de diferentes grupos sociais passam um sábado de detenção juntos.',
      genres: ['Drama', 'Coming of Age']
    },
    {
      title: 'Dirty Dancing: Ritmo Quente',
      year: 1987,
      director: 'Emile Ardolino',
      description: 'Uma jovem se apaixona por seu instrutor de dança durante as férias de verão.',
      genres: ['Romance', 'Drama', 'Musical']
    },
    {
      title: 'Todos Menos Você',
      year: 2023,
      director: 'Will Gluck',
      description: 'Dois ex-namorados se veem forçados a fingir um relacionamento durante um casamento.',
      genres: ['Comédia', 'Romance']
    },
    {
      title: 'Uma Ideia de Você',
      year: 2024,
      director: 'Michael Showalter',
      description: 'Uma mãe solteira de 40 anos se envolve com o vocalista de uma boy band.',
      genres: ['Romance', 'Drama']
    },
    {
      title: 'De Repente 30',
      year: 2004,
      director: 'Gary Winick',
      description: 'Uma adolescente acorda um dia em seu corpo de 30 anos.',
      genres: ['Comédia', 'Romance', 'Fantasia']
    },
    {
      title: 'Como Perder um Cara em 10 Dias',
      year: 2003,
      director: 'Donald Petrie',
      description: 'Uma jornalista tenta fazer um homem terminar com ela em 10 dias para uma matéria.',
      genres: ['Comédia', 'Romance']
    },
    {
      title: 'Um Lugar Chamado Notting Hill',
      year: 1999,
      director: 'Roger Michell',
      description: 'Um livreiro tem sua vida transformada ao se apaixonar por uma famosa atriz.',
      genres: ['Romance', 'Comédia']
    },
    {
      title: '10 Coisas Que Eu Odeio em Você',
      year: 1999,
      director: 'Gil Junger',
      description: 'Adaptação moderna de Shakespeare onde um estudante é pago para conquistar uma garota difícil.',
      genres: ['Comédia', 'Romance', 'Drama']
    },
    {
      title: 'Um Sonho Possível',
      year: 2009,
      director: 'John Lee Hancock',
      description: 'A história real de um jovem sem-teto que se torna jogador de futebol americano.',
      genres: ['Drama', 'Biografia', 'Esporte']
    },
    {
      title: 'As Vantagens de Ser Invisível',
      year: 2012,
      director: 'Stephen Chbosky',
      description: 'Um calouro tímido encontra amizade e aceitação com dois estudantes mais velhos.',
      genres: ['Drama', 'Coming of Age']
    },
    {
      title: 'O Lado Bom da Vida',
      year: 2012,
      director: 'David O. Russell',
      description: 'Um homem com transtorno bipolar tenta se reconectar com sua vida após um colapso.',
      genres: ['Comédia', 'Drama', 'Romance']
    },
    {
      title: 'Soul',
      year: 2020,
      director: 'Pete Docter',
      description: 'Um professor de música busca reunir sua alma com seu corpo após um acidente.',
      genres: ['Animação', 'Aventura', 'Comédia']
    }
  ];

  const createdMovies: Movie[] = [];

  for (const movie of movies) {
    const createdMovie = await prisma.movie.create({
      data: movie as Prisma.MovieCreateInput
    });
    createdMovies.push(createdMovie);
  }

  return createdMovies;
}

async function createMovieSentiments(movies: Movie[], mainSentiments: MainSentimentWithSubs[]) {
  const movieSentimentMappings = [
    {
      movieTitle: 'À Procura da Felicidade',
      sentiments: [
        { main: 'Felicidade', sub: 'Realização' },
        { main: 'Tristeza', sub: 'Solidão' }
      ]
    },
    {
      movieTitle: 'De Volta para o Futuro',
      sentiments: [
        { main: 'Felicidade', sub: 'Empolgação' }
      ]
    },
    {
      movieTitle: 'Curtindo a Vida Adoidado',
      sentiments: [
        { main: 'Felicidade', sub: 'Empolgação' }
      ]
    },
    {
      movieTitle: 'As Patricinhas de Beverly Hills',
      sentiments: [
        { main: 'Felicidade', sub: 'Empolgação' }
      ]
    },
    {
      movieTitle: 'O Clube dos Cinco',
      sentiments: [
        { main: 'Tristeza', sub: 'Solidão' },
        { main: 'Felicidade', sub: 'Realização' }
      ]
    },
    // ... continuação dos mapeamentos para os outros filmes
  ];

  for (const mapping of movieSentimentMappings) {
    const movie = movies.find(m => m.title === mapping.movieTitle);
    if (!movie) continue;

    for (const sentiment of mapping.sentiments) {
      const mainSentiment = mainSentiments.find(s => s.name === sentiment.main);
      if (!mainSentiment) continue;

      const subSentiment = mainSentiment.subSentiments.find(s => s.name === sentiment.sub);
      if (!subSentiment) continue;

      await prisma.movieSentiment.create({
        data: {
          movieId: movie.id,
          mainSentimentId: mainSentiment.id,
          subSentimentId: subSentiment.id
        }
      });
    }
  }
}

async function createJourneySteps(emotionalStates: EmotionalState[]) {
  const initialState = emotionalStates[0];
  if (!initialState) return [];

  // Criar primeiro passo
  const firstStep = await prisma.journeyStep.create({
    data: {
      emotionalState: { connect: { id: initialState.id } },
      order: 1,
      stepId: '1',
      question: 'Como você está se sentindo?',
      options: {
        create: [
          {
            text: 'Feliz',
            nextStepId: '2A',
            isFinal: false
          },
          {
            text: 'Triste',
            nextStepId: '2B',
            isFinal: false
          }
        ]
      }
    },
    include: {
      options: true
    }
  });

  // Criar segundo passo para felicidade
  const happyStep = await prisma.journeyStep.create({
    data: {
      emotionalState: { connect: { id: initialState.id } },
      order: 2,
      stepId: '2A',
      question: 'Que tipo de felicidade?',
      options: {
        create: [
          {
            text: 'Empolgado',
            isFinal: true
          },
          {
            text: 'Realizado',
            isFinal: true
          }
        ]
      }
    },
    include: {
      options: true
    }
  });

  // Criar segundo passo para tristeza
  const sadStep = await prisma.journeyStep.create({
    data: {
      emotionalState: { connect: { id: initialState.id } },
      order: 2,
      stepId: '2B',
      question: 'Que tipo de tristeza?',
      options: {
        create: [
          {
            text: 'Nostálgico',
            isFinal: true
          },
          {
            text: 'Solitário',
            isFinal: true
          }
        ]
      }
    },
    include: {
      options: true
    }
  });

  return [firstStep, happyStep, sadStep];
}

async function createMovieSuggestions(movies: Movie[], emotionalStates: EmotionalState[], journeySteps: JourneyStepWithOptions[]) {
  const initialState = emotionalStates[0];
  if (!initialState) return;

  // Encontrar as opções finais
  const happyOptions = journeySteps.find(step => step.stepId === '2A')?.options || [];
  const sadOptions = journeySteps.find(step => step.stepId === '2B')?.options || [];

  const suggestions = [
    {
      movie: { connect: { title: 'À Procura da Felicidade' } },
      emotionalState: { connect: { id: initialState.id } },
      journeyOption: { connect: { id: happyOptions.find((opt: JourneyOption) => opt.text === 'Realizado')?.id } },
      reason: 'Este filme inspirador combina com seu momento de realização.',
      relevance: 1
    },
    {
      movie: { connect: { title: 'De Volta para o Futuro' } },
      emotionalState: { connect: { id: initialState.id } },
      journeyOption: { connect: { id: happyOptions.find((opt: JourneyOption) => opt.text === 'Empolgado')?.id } },
      reason: 'Uma aventura empolgante para seu momento de animação.',
      relevance: 1
    }
  ];

  for (const suggestion of suggestions) {
    if (suggestion.journeyOption.connect.id) {
      await prisma.movieSuggestion.create({
        data: {
          movie: suggestion.movie,
          emotionalState: suggestion.emotionalState,
          journeyOption: suggestion.journeyOption,
          reason: suggestion.reason,
          relevance: suggestion.relevance
        }
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
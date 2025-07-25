import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';

const prisma = new PrismaClient();

// @desc    Buscar estados emocionais disponíveis
// @route   GET /emotions/states
// @access  Public
export const getEmotionalStates = asyncHandler(async (req: Request, res: Response) => {
  try {
    const states = await prisma.emotionalState.findMany({
      include: {
        mainSentiment: true,
        journeySteps: {
          include: {
            options: true
          }
        }
      }
    });

    res.json(states);
  } catch (error) {
    console.error('Erro ao buscar estados emocionais:', error);
    res.status(500).json({ error: 'Erro ao buscar estados emocionais' });
  }
});

// @desc    Buscar sugestões de filmes baseadas no caminho emocional
// @route   GET /api/movies/suggestions
// @access  Public
export const getMovieSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const { emotionalStateId, path } = req.query;

  if (!emotionalStateId || !path) {
    res.status(400);
    throw new Error('Estado emocional e caminho são obrigatórios');
  }

  const suggestions = await prisma.movieSuggestion.findMany({
    where: {
      emotionalStateId: Number(emotionalStateId),
      contextPath: {
        equals: path as string[]
      }
    },
    include: {
      movie: {
        select: {
          id: true,
          title: true,
          description: true,
          year: true,
          director: true,
          genres: true,
          vote_average: true,
          imdbRating: true,
          rottenTomatoesRating: true,
          metacriticRating: true
        }
      }
    },
    orderBy: [
      {
        movie: {
          imdbRating: 'desc'
        }
      }
    ]
  });

  res.json(suggestions);
});

// @desc    Buscar filmes por sentimento
// @route   GET /api/movies/by-sentiment
// @access  Public
export const getMoviesBySentiment = asyncHandler(async (req: Request, res: Response) => {
  const { mainSentiment, subSentiment } = req.query;

  if (!mainSentiment) {
    res.status(400);
    throw new Error('Sentimento principal é obrigatório');
  }

  const movies = await prisma.movie.findMany({
    where: {
      movieSentiments: {
        some: {
          mainSentiment: {
            name: mainSentiment as string
          },
          ...(subSentiment && {
            subSentiment: {
              name: subSentiment as string
            }
          })
        }
      }
    },
    include: {
      movieSentiments: {
        include: {
          mainSentiment: true,
          subSentiment: true
        }
      }
    }
  });

  res.json(movies);
});

// @desc    Navegar no fluxo de perguntas
// @route   GET /api/emotions/flow
// @access  Public
export const getEmotionalFlow = asyncHandler(async (req: Request, res: Response) => {
  const { currentPath } = req.query;
  
  // Buscar o estado emocional inicial (que contém todo o fluxo)
  const emotionalState = await prisma.emotionalState.findFirst({
    where: {
      isActive: true
    }
  });

  if (!emotionalState || !emotionalState.contextFlow) {
    res.status(404);
    throw new Error('Fluxo emocional não encontrado');
  }

  // Se não tiver caminho atual, retorna a primeira pergunta
  if (!currentPath) {
    const flow = emotionalState.contextFlow as any;
    return res.json({
      emotionalStateId: emotionalState.id,
      currentQuestion: flow.question,
      options: flow.options.map((opt: any) => ({
        text: opt.text,
        isEndState: false
      })),
      isComplete: false
    });
  }

  // Se tiver caminho, navega até o ponto atual
  const path = (currentPath as string).split(',');
  let currentFlow = emotionalState.contextFlow as any;
  let currentQuestion = currentFlow.question;
  let currentOptions = currentFlow.options;
  
  for (const choice of path) {
    const selectedOption = currentOptions.find((opt: any) => opt.text === choice);
    if (!selectedOption) {
      res.status(400);
      throw new Error('Caminho inválido');
    }

    if (selectedOption.endState) {
      return res.json({
        emotionalStateId: emotionalState.id,
        currentPath: path,
        isComplete: true
      });
    }

    if (selectedOption.nextQuestion) {
      currentQuestion = selectedOption.nextQuestion.question;
      currentOptions = selectedOption.nextQuestion.options;
    } else {
      res.status(500);
      throw new Error('Fluxo mal configurado');
    }
  }

  return res.json({
    emotionalStateId: emotionalState.id,
    currentPath: path,
    currentQuestion,
    options: currentOptions.map((opt: any) => ({
      text: opt.text,
      isEndState: opt.endState || false
    })),
    isComplete: false
  });
}); 
import { Request, Response } from 'express';


import { prismaApp as prisma } from '../prisma';

export class MovieController {
  async getMoviesBySentiment(req: Request, res: Response): Promise<void> {
    const { mainSentiment, subSentiment } = req.query;

    if (!mainSentiment) {
      res.status(400).json({ error: 'O parâmetro mainSentiment é obrigatório.' });
      return;
    }

    try {
      // Buscar filmes do banco de dados
      const dbMovies = await prisma.movie.findMany({
        where: {
          movieSentiments: {
            some: {
              mainSentiment: {
                name: mainSentiment as string,
              },
              subSentiment: subSentiment ? { name: subSentiment as string } : undefined,
            },
          },
        },
        include: {
          movieSentiments: {
            include: {
              mainSentiment: true,
              subSentiment: true,
            },
          },
        },
      });

      res.json({
        moviesFromDatabase: dbMovies,
        suggestedMovies: [] // Removido temporariamente para deploy
      });
    } catch (error: any) {
      console.error('Erro ao buscar filmes por sentimento:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        details: error.message,
      });
    }
  }
} 
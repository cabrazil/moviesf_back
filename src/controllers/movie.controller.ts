import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MovieSearchService } from '../services/movieSearch.service';

const prisma = new PrismaClient();
const movieSearchService = new MovieSearchService();

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
          movieSentiment: {
            some: {
              mainSentiment: {
                name: mainSentiment as string,
              },
              subSentiment: subSentiment ? { name: subSentiment as string } : undefined,
            },
          },
        },
        include: {
          movieSentiment: {
            include: {
              mainSentiment: true,
              subSentiment: true,
            },
          },
        },
      });

      // Buscar filmes sugeridos baseados no sentimento
      const suggestedMovies = await movieSearchService.searchMoviesBySentiment(
        mainSentiment as string,
        subSentiment as string
      );

      res.json({
        moviesFromDatabase: dbMovies,
        suggestedMovies
      });
    } catch (error: any) {
      console.error('Erro ao buscar filmes por sentimento:', error);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    } finally {
      await prisma.$disconnect();
    }
  }
} 
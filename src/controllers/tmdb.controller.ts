import { Request, Response } from 'express';
import { TMDBService } from '../services/tmdb.service';

export class TMDBController {
  private tmdbService: TMDBService | null = null;

  private getService(): TMDBService {
    if (!this.tmdbService) {
      this.tmdbService = new TMDBService();
    }
    return this.tmdbService;
  }

  async searchMovies(req: Request, res: Response): Promise<void> {
    try {
      const { query, page = 1 } = req.query;
      
      if (!query) {
        res.status(400).json({ error: 'O parâmetro "query" é obrigatório para a busca.' });
        return;
      }

      const searchResults = await this.getService().searchMovies(
        query as string,
        Number(page)
      );

      res.json({
        success: true,
        data: searchResults
      });
    } catch (error) {
      console.error('Erro ao buscar filmes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar filmes no TMDB'
      });
    }
  }

  async getPopularMovies(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1 } = req.query;
      const popularMovies = await this.getService().getPopularMovies(Number(page));

      res.json({
        success: true,
        data: popularMovies
      });
    } catch (error) {
      console.error('Erro ao buscar filmes populares:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar filmes populares no TMDB'
      });
    }
  }

  async searchMoviesBySentiment(req: Request, res: Response): Promise<void> {
    try {
      const { mainSentiment, subSentiment } = req.query;
      
      if (!mainSentiment) {
        res.status(400).json({ error: 'O parâmetro "mainSentiment" é obrigatório.' });
        return;
      }

      const movies = await this.getService().searchMoviesBySentiment(
        mainSentiment as string,
        subSentiment as string
      );

      res.json({
        success: true,
        data: movies
      });
    } catch (error) {
      console.error('Erro ao buscar filmes por sentimento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar filmes por sentimento no TMDB'
      });
    }
  }
} 
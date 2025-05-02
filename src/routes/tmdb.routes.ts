import { Router } from 'express';
import { TMDBController } from '../controllers/tmdb.controller';

const router = Router();
const tmdbController = new TMDBController();

// Rota para buscar filmes por sentimento
router.get('/sentiment', (req, res) => tmdbController.searchMoviesBySentiment(req, res));

// Rota para buscar filmes por termo
router.get('/search', (req, res) => tmdbController.searchMovies(req, res));

// Rota para buscar filmes populares
router.get('/popular', (req, res) => tmdbController.getPopularMovies(req, res));

export default router; 
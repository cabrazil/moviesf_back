import express from 'express';
import {
  getEmotionalStates,
  getMovieSuggestions,
  getMoviesBySentiment,
  getEmotionalFlow
} from '../controllers/movieController';

const router = express.Router();

// Rotas para estados emocionais
router.get('/emotions/states', getEmotionalStates);
router.get('/emotions/flow', getEmotionalFlow);

// Rotas para filmes
router.get('/movies/suggestions', getMovieSuggestions);
router.get('/movies/by-sentiment', getMoviesBySentiment);

export default router; 
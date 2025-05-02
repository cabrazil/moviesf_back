import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import { MovieController } from '../controllers/movie.controller';

const router = Router();
const movieController = new MovieController();

router.get('/by-sentiment', asyncHandler(movieController.getMoviesBySentiment));

export const movieRoutes = router; 
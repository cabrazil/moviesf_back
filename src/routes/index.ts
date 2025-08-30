import { Router } from 'express';
import movieRoutes from './movieRoutes';

import mainSentimentsRoutes from './main-sentiments.routes';
import emotionalRecommendationRoutes from './emotionalRecommendation.routes';
import blogRoutes from './blog.routes';

const router = Router();

// Rotas do TMDB (carregadas apenas quando necessário)
if (process.env.TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN) {
  const tmdbRoutes = require('./tmdb.routes').default;
  router.use('/tmdb', tmdbRoutes);
}

router.use('/movies', movieRoutes);

router.use('/main-sentiments', mainSentimentsRoutes);
// router.use('/api', emotionalRecommendationRoutes); // COMENTADO - conflita com personalized-journey.routes.ts

router.use('/blog', blogRoutes);

export default router; 
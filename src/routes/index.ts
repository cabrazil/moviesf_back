import { Router } from 'express';
import movieRoutes from './movieRoutes';
import adminRoutes from './admin.routes';
import mainSentimentsRoutes from './main-sentiments.routes';
import emotionalRecommendationRoutes from './emotionalRecommendation.routes';

const router = Router();

// Rotas do TMDB (carregadas apenas quando necessário)
if (process.env.TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN) {
  const tmdbRoutes = require('./tmdb.routes').default;
  router.use('/tmdb', tmdbRoutes);
}

router.use('/movies', movieRoutes);
router.use('/admin', adminRoutes);
router.use('/main-sentiments', mainSentimentsRoutes);
router.use('/api', emotionalRecommendationRoutes);

export default router; 
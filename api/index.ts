import { loadEnvironment, validateEnvironment } from '../src/config/env-loader';

// Carregar variáveis de ambiente na ordem correta
loadEnvironment();
validateEnvironment();

import express from 'express';
import cors from 'cors';

// Importar todas as rotas necessárias
import ssrRoutes from '../src/routes/ssr.routes';
import mainSentimentsRoutes from '../src/routes/main-sentiments.routes';
import moviesRoutes from '../src/routes/movies.routes';
import blogRoutes from '../src/routes/blog.routes';
import personalizedJourneyRoutes from '../src/routes/personalized-journey.routes';
import publicRoutes from '../src/routes/public';
import emotionalIntentionsRoutes from '../src/routes/emotional-intentions.routes';
import streamingPlatformsRoutes from '../src/routes/streaming-platforms.routes';
import movieDetailsRoutes from '../src/routes/movie-details-optimized.routes';
import movieHeroRoutes from '../src/routes/movie-hero.routes';
import tmdbRoutes from '../src/routes/tmdb.routes';
import newsletterRoutes from '../src/routes/newsletter.routes';

const app = express();

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (apps mobile, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Lista de origens permitidas (web e mobile)
    const allowedOrigins = [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3333',  // Backend local
      'http://127.0.0.1:5173',  // Vite dev server (alternativo)
      'http://localhost:8081',  // Expo dev server (React Native)
      'http://127.0.0.1:8081',  // Expo dev server (alternativo)
      'https://moviesf-front.vercel.app',  // Frontend produção (Vercel)
      'https://vibesfilm.vercel.app',       // Frontend produção (Vercel alternativo)
      'https://cbrazil.com',                // Frontend staging (Coolify)
      'https://www.cbrazil.com',            // Frontend staging (Coolify www)
      'https://api-vibes.cbrazil.com',      // Backend staging (Coolify)
      'https://app-vibes.cbrazil.com'       // Frontend produção (Dokploy)
    ];

    // Permitir origens da lista ou qualquer origem localhost (desenvolvimento mobile)
    if (allowedOrigins.includes(origin) || origin?.startsWith('http://localhost:') || origin?.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir todas as origens para apps mobile em produção
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-csrf-token',
    'X-CSRF-Token'
  ]
}));
app.use(express.json());

// Log de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- Registro das Rotas ---

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rotas SSR - DEVEM VIR ANTES das rotas API para não serem interceptadas
// SSR renderiza HTML completo para bots do Google (SEO)
app.use('/', ssrRoutes);

// Rotas API (mantém como está)
app.use('/main-sentiments', mainSentimentsRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/personalized-journey', personalizedJourneyRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/emotional-intentions', emotionalIntentionsRoutes);
app.use('/api/streaming-platforms', streamingPlatformsRoutes);
app.use('/api/movie', movieDetailsRoutes);
app.use('/api/movie', movieHeroRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Handler para rotas não encontradas (404)
app.use('*', (req, res) => {
  res.status(404).json({ error: `Endpoint não encontrado: ${req.originalUrl}` });
});

// Handler para erros inesperados (500)
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({ error: 'Erro Interno do Servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;

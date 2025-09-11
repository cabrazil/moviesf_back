import express from 'express';
import cors from 'cors';

const app = express();

// CORS básico
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// Health check simples
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Main sentiments endpoint com dados mais realistas
app.get('/main-sentiments', (req, res) => {
  res.json([
    { 
      id: 1, 
      name: 'Alegria', 
      description: 'Sentimento de felicidade e contentamento',
      color: '#FFD700',
      icon: '😊'
    },
    { 
      id: 2, 
      name: 'Tristeza', 
      description: 'Sentimento de melancolia e pesar',
      color: '#4169E1',
      icon: '😢'
    },
    { 
      id: 3, 
      name: 'Medo', 
      description: 'Sentimento de ansiedade e preocupação',
      color: '#8B0000',
      icon: '😨'
    },
    { 
      id: 4, 
      name: 'Raiva', 
      description: 'Sentimento de irritação e frustração',
      color: '#DC143C',
      icon: '😠'
    },
    { 
      id: 5, 
      name: 'Surpresa', 
      description: 'Sentimento de admiração e espanto',
      color: '#FF8C00',
      icon: '😲'
    },
    { 
      id: 6, 
      name: 'Nojo', 
      description: 'Sentimento de repulsa e aversão',
      color: '#228B22',
      icon: '🤢'
    }
  ]);
});

// Journey flow endpoint mock
app.get('/main-sentiments/:id/journey-flow', (req, res) => {
  const sentimentId = parseInt(req.params.id);
  res.json({
    id: sentimentId,
    name: ['Alegria', 'Tristeza', 'Medo', 'Raiva', 'Surpresa', 'Nojo'][sentimentId - 1] || 'Desconhecido',
    journeyOptions: [
      { id: 1, name: 'Filmes Clássicos', description: 'Explore filmes atemporais' },
      { id: 2, name: 'Filmes Modernos', description: 'Descubra produções recentes' },
      { id: 3, name: 'Filmes Independentes', description: 'Conheça produções alternativas' }
    ]
  });
});

// Emotional intentions endpoint mock
app.get('/api/emotional-intentions/:sentimentId', (req, res) => {
  const sentimentId = parseInt(req.params.sentimentId);
  res.json([
    { id: 1, name: 'Relaxar', description: 'Quero me acalmar e relaxar' },
    { id: 2, name: 'Refletir', description: 'Quero pensar sobre a vida' },
    { id: 3, name: 'Motivar', description: 'Quero me sentir inspirado' }
  ]);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

export default app;

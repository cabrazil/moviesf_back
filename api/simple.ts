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

// Main sentiments endpoint simples
app.get('/main-sentiments', (req, res) => {
  res.json([
    { id: 1, name: 'Alegria', description: 'Sentimento de felicidade e contentamento' },
    { id: 2, name: 'Tristeza', description: 'Sentimento de melancolia e pesar' },
    { id: 3, name: 'Medo', description: 'Sentimento de ansiedade e preocupação' },
    { id: 4, name: 'Raiva', description: 'Sentimento de irritação e frustração' }
  ]);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

export default app;

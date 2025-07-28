import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

// Dados estáticos dos sentimentos para teste
const mockSentiments = [
  {
    id: 13,
    name: "Feliz / Alegre",
    description: "Em um momento de felicidade e alegria. Que tal um filme para amplificar, canalizar ou simplesmente saborear essa boa energia?",
    shortDescription: "Que filme te ajuda a amplificar, canalizar ou saborear essa boa energia?"
  },
  {
    id: 14,
    name: "Triste",
    description: "Passando por um momento de tristeza ou melancolia. O cinema pode ajudar a processar, explorar ou até mesmo transformar essa emoção.",
    shortDescription: "O cinema te guia para processar, explorar ou transformar essa emoção."
  },
  {
    id: 15,
    name: "Calmo(a)",
    description: "Em um momento de tranquilidade e paz. Que filme te ajuda a aprofundar, manter, explorar ou agitar essa serenidade?",
    shortDescription: "Que filme te ajuda a aprofundar, manter, explorar ou agitar essa serenidade?"
  },
  {
    id: 16,
    name: "Ansioso(a)",
    description: "Em um momento de ansiedade e nervosismo. Que tal um filme para te ajudar a processar, transformar ou focar essa inquietação?",
    shortDescription: "Um filme pode te ajudar a processar, transformar ou focar essa inquietação."
  },
  {
    id: 17,
    name: "Animado(a)",
    description: "Cheio de energia e entusiasmo. O cinema pode te ajudar a amplificar, direcionar ou surpreender com essa vibração.",
    shortDescription: "Um filme pode amplificar, direcionar ou surpreender essa vibração."
  },
  {
    id: 18,
    name: "Cansado(a)",
    description: "Sentindo-se cansado e sem motivação. Que filme pode te ajudar a recarregar as energias, descontrair ou explorar essa sensação?",
    shortDescription: "Que filme pode te ajudar a recarregar, descontrair ou explorar essa sensação?"
  }
];

// Configuração CORS simplificada para debug
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// Health check endpoint simples
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint simples
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Test main-sentiments diretamente
app.get('/main-sentiments/test', (req, res) => {
  res.json({ 
    message: 'Main-sentiments direto funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Test environment variables
app.get('/main-sentiments/env-test', (req, res) => {
  res.json({ 
    message: 'Environment variables test',
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Main sentiments com dados estáticos (FUNCIONAL)
app.get('/main-sentiments', (req, res) => {
  res.json(mockSentiments);
});

// Summary com dados estáticos (FUNCIONAL)
app.get('/main-sentiments/summary', (req, res) => {
  res.json(mockSentiments);
});

// Error Handling Middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Erro interno do servidor',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// Inicialização do servidor apenas se este arquivo for executado diretamente
if (require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${port}`);
  });
}

export default app; 
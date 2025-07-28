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

// Dados estáticos das intenções emocionais
const mockEmotionalIntentions = {
  13: { // Feliz / Alegre
    sentimentId: 13,
    sentimentName: "Feliz / Alegre",
    intentions: [
      {
        id: 1,
        type: 'MAINTAIN',
        description: 'Quero manter e amplificar essa boa energia.',
        preferredGenres: ['Comedy', 'Animation', 'Family'],
        avoidGenres: ['Horror', 'Thriller'],
        emotionalTone: 'uplifting'
      },
      {
        id: 2,
        type: 'EXPLORE',
        description: 'Quero explorar diferentes facetas da alegria.',
        preferredGenres: ['Musical', 'Romance', 'Adventure'],
        avoidGenres: ['Drama', 'War'],
        emotionalTone: 'adventurous'
      }
    ]
  },
  14: { // Triste
    sentimentId: 14,
    sentimentName: "Triste",
    intentions: [
      {
        id: 3,
        type: 'PROCESS',
        description: 'Quero processar e compreender essa tristeza.',
        preferredGenres: ['Drama', 'Romance'],
        avoidGenres: ['Comedy', 'Action'],
        emotionalTone: 'contemplative'
      },
      {
        id: 4,
        type: 'TRANSFORM',
        description: 'Quero transformar essa tristeza em algo positivo.',
        preferredGenres: ['Biography', 'Drama'],
        avoidGenres: ['Horror', 'Thriller'],
        emotionalTone: 'hopeful'
      }
    ]
  },
  15: { // Calmo(a)
    sentimentId: 15,
    sentimentName: "Calmo(a)",
    intentions: [
      {
        id: 5,
        type: 'MAINTAIN',
        description: 'Quero manter essa tranquilidade.',
        preferredGenres: ['Documentary', 'Animation'],
        avoidGenres: ['Action', 'Horror'],
        emotionalTone: 'peaceful'
      },
      {
        id: 6,
        type: 'EXPLORE',
        description: 'Quero explorar temas profundos com serenidade.',
        preferredGenres: ['Drama', 'Biography'],
        avoidGenres: ['Thriller', 'Action'],
        emotionalTone: 'meditative'
      }
    ]
  },
  16: { // Ansioso(a)
    sentimentId: 16,
    sentimentName: "Ansioso(a)",
    intentions: [
      {
        id: 7,
        type: 'PROCESS',
        description: 'Quero processar essa ansiedade.',
        preferredGenres: ['Drama', 'Biography'],
        avoidGenres: ['Thriller', 'Horror'],
        emotionalTone: 'grounding'
      },
      {
        id: 8,
        type: 'TRANSFORM',
        description: 'Quero canalizar essa energia de forma positiva.',
        preferredGenres: ['Adventure', 'Comedy'],
        avoidGenres: ['Horror', 'Thriller'],
        emotionalTone: 'energizing'
      }
    ]
  },
  17: { // Animado(a)
    sentimentId: 17,
    sentimentName: "Animado(a)",
    intentions: [
      {
        id: 9,
        type: 'MAINTAIN',
        description: 'Quero amplificar essa energia.',
        preferredGenres: ['Action', 'Adventure', 'Comedy'],
        avoidGenres: ['Drama', 'Documentary'],
        emotionalTone: 'energetic'
      },
      {
        id: 10,
        type: 'EXPLORE',
        description: 'Quero direcionar essa energia para algo novo.',
        preferredGenres: ['Sci-Fi', 'Fantasy', 'Adventure'],
        avoidGenres: ['Romance', 'Drama'],
        emotionalTone: 'dynamic'
      }
    ]
  },
  18: { // Cansado(a)
    sentimentId: 18,
    sentimentName: "Cansado(a)",
    intentions: [
      {
        id: 11,
        type: 'PROCESS',
        description: 'Quero entender e aceitar esse cansaço.',
        preferredGenres: ['Drama', 'Documentary'],
        avoidGenres: ['Action', 'Horror'],
        emotionalTone: 'restful'
      },
      {
        id: 12,
        type: 'TRANSFORM',
        description: 'Quero recarregar minhas energias.',
        preferredGenres: ['Comedy', 'Animation', 'Family'],
        avoidGenres: ['Thriller', 'War'],
        emotionalTone: 'restorative'
      }
    ]
  }
};

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

// Emotional intentions endpoint
app.get('/api/emotional-intentions/:sentimentId', (req, res) => {
  const sentimentId = parseInt(req.params.sentimentId);
  const intentions = mockEmotionalIntentions[sentimentId as keyof typeof mockEmotionalIntentions];
  
  if (intentions) {
    res.json(intentions);
  } else {
    res.status(404).json({ error: 'Intenções não encontradas para este sentimento' });
  }
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
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

// Criar Prisma client diretamente
const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const app = express();
const port = Number(process.env.PORT) || 3000;

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

// Test database connection
app.get('/main-sentiments/db-test', async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    res.json({ 
      message: 'Conexão com banco OK!',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro na conexão com banco:', error);
    res.status(500).json({ 
      error: 'Erro na conexão com banco',
      details: error.message
    });
  }
});

// Test main sentiments
app.get('/main-sentiments/summary', async (req, res) => {
  try {
    const sentiments = await prisma.mainSentiment.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        shortDescription: true,
      },
      orderBy: { id: 'asc' },
    });
    res.json(sentiments);
  } catch (error: any) {
    console.error('Erro ao buscar sentimentos principais:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar sentimentos principais',
      details: error.message
    });
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
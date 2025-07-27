import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import mainSentimentsRoutes from './routes/main-sentiments.routes';
import moviesRoutes from './routes/movies.routes';
import prisma from './prisma';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

// Teste de conexão com banco
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Conexão com banco estabelecida');
  } catch (error) {
    console.error('❌ Erro ao conectar com banco:', error);
    throw error;
  }
}

// Configuração CORS mais permissiva para desenvolvimento
app.use(cors({
  origin: '*', // Permite todas as origens em desenvolvimento
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  credentials: true,
  maxAge: 86400 // 24 horas
}));

app.use(express.json());

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Routes
app.use('/', routes);
app.use('/main-sentiments', mainSentimentsRoutes);
app.use('/movies', moviesRoutes);

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
  testDatabaseConnection()
    .then(() => {
      app.listen(port, '0.0.0.0', () => {
        console.log(`Servidor rodando em http://0.0.0.0:${port}`);
      });
    })
    .catch((error) => {
      console.error('Falha ao inicializar servidor:', error);
      process.exit(1);
    });
}

export default app; 
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import mainSentimentRoutes from './routes/mainSentiment.routes';
import emotionalStateRoutes from './routes/emotionalState.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configuração CORS mais específica
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Vite usa a porta 5173 por padrão
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Routes
app.use('/api', routes);
app.use('/api/main-sentiments', mainSentimentRoutes);
app.use('/api/emotions/states', emotionalStateRoutes);

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
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}

export default app; 
import express from 'express';
import cors from 'cors';
import mainSentimentsRoutes from '../src/routes/main-sentiments.routes'; // Importação direta

console.log('--- SIMPLIFIED API ENTRYPOINT LOADED ---');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

console.log('--- REGISTERING /main-sentiments ROUTE ---');
app.use('/main-sentiments', mainSentimentsRoutes);

app.use('*', (req, res) => {
  console.log(`--- 404 in simplified app for URL: ${req.originalUrl} ---`);
  res.status(404).json({ error: `Endpoint not found: ${req.originalUrl}` });
});

export default app;
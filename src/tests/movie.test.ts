import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { app } from '../server';

const prisma = new PrismaClient();

describe('Movie API Tests', () => {
  beforeAll(async () => {
    // Limpar o banco de dados
    await prisma.movieSentiment.deleteMany();
    await prisma.movie.deleteMany();
    await prisma.subSentiment.deleteMany();
    await prisma.mainSentiment.deleteMany();

    // Criar dados de teste
    const mainSentiment = await prisma.mainSentiment.create({
      data: { name: 'Emoções intensas' }
    });

    const subSentiment = await prisma.subSentiment.create({
      data: {
        name: 'Drama e sofrimento',
        mainSentimentId: mainSentiment.id
      }
    });

    const movie = await prisma.movie.create({
      data: {
        title: 'O Poderoso Chefão',
        year: 1972,
        director: 'Francis Ford Coppola',
        genres: ['Drama', 'Crime'],
        streamingPlatforms: ['Netflix', 'Amazon Prime']
      }
    });

    await prisma.movieSentiment.create({
      data: {
        movieId: movie.id,
        mainSentimentId: mainSentiment.id,
        subSentimentId: subSentiment.id
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/movies/by-sentiment', () => {
    it('should return movies by main sentiment', async () => {
      const response = await request(app)
        .get('/api/movies/by-sentiment')
        .query({ mainSentiment: 'Emoções intensas' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('movieSentiment');
    });

    it('should return movies by main and sub sentiment', async () => {
      const response = await request(app)
        .get('/api/movies/by-sentiment')
        .query({ 
          mainSentiment: 'Emoções intensas',
          subSentiment: 'Drama e sofrimento'
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return 400 if mainSentiment is not provided', async () => {
      const response = await request(app)
        .get('/api/movies/by-sentiment');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return empty array if no movies match the sentiment', async () => {
      const response = await request(app)
        .get('/api/movies/by-sentiment')
        .query({ mainSentiment: 'Sentimento inexistente' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });
}); 
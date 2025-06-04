import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getEmotionalStates,
  getMovieSuggestions,
  getMoviesBySentiment,
  getEmotionalFlow
} from '../controllers/movieController';

const router = express.Router();
const prisma = new PrismaClient();

// Rotas para estados emocionais
router.get('/emotions/states', getEmotionalStates);
router.get('/emotions/flow', getEmotionalFlow);

// Rotas para filmes
router.get('/suggestions', getMovieSuggestions);
router.get('/by-sentiment', getMoviesBySentiment);

// Rotas para gerenciamento de filmes
router.get('/', async (req, res) => {
  try {
    const movies = await prisma.movie.findMany({
      include: {
        movieSentiments: true,
        movieSuggestionFlows: true
      },
    });
    res.json(movies);
  } catch (error) {
    console.error('Erro ao buscar filmes:', error);
    res.status(500).json({ error: 'Erro ao buscar filmes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Buscando filme com ID:', id);

    // Verificar se o ID é um UUID válido
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      console.log('ID inválido:', id);
      return res.status(400).json({ error: 'ID do filme inválido' });
    }

    const movie = await prisma.movie.findUnique({
      where: { 
        id: id
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        year: true,
        director: true,
        vote_average: true,
        certification: true,
        genres: true,
        runtime: true,
        description: true,
        streamingPlatforms: true,
        movieSentiments: {
          select: {
            mainSentiment: {
              select: {
                name: true
              }
            },
            subSentiment: {
              select: {
                name: true
              }
            }
          }
        },
        movieSuggestionFlows: {
          select: {
            reason: true,
            relevance: true
          }
        }
      }
    });

    console.log('Filme encontrado:', movie);

    if (!movie) {
      console.log('Filme não encontrado');
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    res.json(movie);
  } catch (error) {
    console.error('Erro detalhado ao buscar filme:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar filme',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      year, 
      director, 
      genres, 
      thumbnail,
      streamingPlatforms,
      movieSentiments,
      movieSuggestions,
      movieSuggestionFlows
    } = req.body;

    // Primeiro, atualiza o filme
    const movie = await prisma.movie.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        year,
        director,
        genres,
        thumbnail,
        streamingPlatforms,
      },
    });

    // Atualiza os sentimentos do filme
    if (movieSentiments) {
      // Remove sentimentos existentes
      await prisma.movieSentiment.deleteMany({
        where: { movieId: movie.id }
      });

      // Adiciona novos sentimentos
      if (movieSentiments.length > 0) {
        await prisma.movieSentiment.createMany({
          data: movieSentiments.map((sentiment: any) => ({
            movieId: movie.id,
            mainSentimentId: sentiment.mainSentimentId,
            subSentimentId: sentiment.subSentimentId,
          }))
        });
      }
    }

    // Atualiza as sugestões do filme
    if (movieSuggestions) {
      // Remove sugestões existentes
      await prisma.movieSuggestion.deleteMany({
        where: { movieId: movie.id }
      });

      // Adiciona novas sugestões
      if (movieSuggestions.length > 0) {
        await prisma.movieSuggestion.createMany({
          data: movieSuggestions.map((suggestion: any) => ({
            movieId: movie.id,
            emotionalStateId: suggestion.emotionalStateId,
            journeyOptionId: suggestion.journeyOptionId,
            reason: suggestion.reason,
            relevance: suggestion.relevance,
          }))
        });
      }
    }

    // Atualiza os fluxos de sugestão do filme
    if (movieSuggestionFlows) {
      // Remove fluxos existentes
      await prisma.movieSuggestionFlow.deleteMany({
        where: { movieId: movie.id }
      });

      // Adiciona novos fluxos
      if (movieSuggestionFlows.length > 0) {
        await prisma.movieSuggestionFlow.createMany({
          data: movieSuggestionFlows.map((flow: any) => ({
            movieId: movie.id,
            journeyOptionFlowId: flow.journeyOptionFlowId,
            reason: flow.reason,
            relevance: flow.relevance,
          }))
        });
      }
    }

    // Retorna o filme atualizado com todas as relações
    const updatedMovie = await prisma.movie.findUnique({
      where: { id: movie.id },
      include: {
        movieSentiments: true,
        movieSuggestions: true,
        movieSuggestionFlows: true,
      },
    });

    res.json(updatedMovie);
  } catch (error) {
    console.error('Erro ao atualizar filme:', error);
    res.status(500).json({ error: 'Erro ao atualizar filme' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.movie.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar filme:', error);
    res.status(500).json({ error: 'Erro ao deletar filme' });
  }
});

export default router; 
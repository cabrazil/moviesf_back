import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Rota: GET /api/daily-curation/today
router.get('/today', async (req, res) => {
  try {
    const now = new Date();

    // Busca a curadoria ativa cuja data atual esteja entre startDate e endDate
    // Ordena pela maior prioridade, e em caso de empate, a que começou mais recentemente
    const dailyCuration = await prisma.dailyCuration.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: [
        { priority: 'desc' },
        { startDate: 'desc' }
      ]
    });

    if (!dailyCuration) {
      return res.status(404).json({ error: 'Nenhuma curadoria diária ativa encontrada.' });
    }

    res.json(dailyCuration);
  } catch (error) {
    console.error('Erro ao buscar curadoria diária:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar curadoria.' });
  }
});

// Rota: GET /api/daily-curation/today/full
// Retorna a curadoria ativa com dados completos dos filmes resolvidos
// Usado pelo blog para exibir posters, links e navegação inteligente
router.get('/today/full', async (req, res) => {
  try {
    const now = new Date();

    // Busca a curadoria ativa (mesma lógica de /today)
    const dailyCuration = await prisma.dailyCuration.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: [
        { priority: 'desc' },
        { startDate: 'desc' }
      ]
    });

    if (!dailyCuration) {
      return res.status(404).json({ error: 'Nenhuma curadoria diária ativa encontrada.' });
    }

    // Resolver os filmes a partir dos movieIds
    const moviesList = await prisma.movie.findMany({
      where: { id: { in: dailyCuration.movieIds } },
      select: {
        id: true,
        title: true,
        year: true,
        thumbnail: true,
        slug: true,
        genres: true,
        pillarArticles: {
          take: 1,
          select: { slug: true }
        }
      }
    });

    // Preservar a ordem original do array movieIds
    const orderedMovies = dailyCuration.movieIds
      .map(id => moviesList.find(m => m.id === id))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map(m => ({
        id: m.id,
        title: m.title,
        year: m.year,
        thumbnail: m.thumbnail,
        slug: m.slug,
        genres: m.genres,
        pillarArticle: m.pillarArticles.length > 0
          ? { slug: m.pillarArticles[0].slug }
          : null
      }));

    res.json({
      id: dailyCuration.id,
      buttonTitle: dailyCuration.buttonTitle,
      buttonMicrocopy: dailyCuration.buttonMicrocopy,
      headerPhrase: dailyCuration.headerPhrase,
      movies: orderedMovies,
      isActive: dailyCuration.isActive,
      startDate: dailyCuration.startDate,
      endDate: dailyCuration.endDate,
      priority: dailyCuration.priority
    });
  } catch (error) {
    console.error('Erro ao buscar curadoria diária completa:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar curadoria.' });
  }
});

export default router;

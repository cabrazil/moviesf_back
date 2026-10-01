import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  evaluateMovie,
  commitCurations,
  JofEvaluationResult
} from '../services/curationEngine';

const router = Router();

// ====================================================
// Armazenamento temporário em memória (TTL: 30 min)
// Guarda as seleções entre /preview e /confirm-pending
// ====================================================
interface PendingCuration {
  movieId: string;
  title: string;
  year: number | null;
  tmdbId: number;
  slug?: string;
  provider: any;
  topSelections: JofEvaluationResult[];
  expiresAt: number;
}

const pendingStore = new Map<string, PendingCuration>();

// Limpar entradas expiradas a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingStore.entries()) {
    if (value.expiresAt < now) pendingStore.delete(key);
  }
}, 10 * 60 * 1000);

// ====================================================
// POST /api/curate/preview
// Body: { title: string, year?: number, sentiment?: string, intention?: string, provider?: string }
// ====================================================
router.post('/preview', async (req, res) => {
  try {
    const { title, year, sentiment, intention, provider = 'deepseek' } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Campo "title" é obrigatório.' });
    }

    console.log(`📡 [API /curate/preview] Avaliando: "${title}" (${year || 'N/A'})...`);

    const result = await evaluateMovie(title, year ? Number(year) : undefined, {
      sentiment,
      intention,
      provider: provider as any
    });

    const pendingId = randomUUID();
    pendingStore.set(pendingId, {
      movieId: result.movie.id,
      title: result.movie.title,
      year: result.movie.year,
      tmdbId: result.movie.tmdbId,
      slug: result.movie.slug,
      provider,
      topSelections: result.topSelections,
      expiresAt: Date.now() + 30 * 60 * 1000
    });

    return res.json({
      success: true,
      pendingId,
      movie: {
        id: result.movie.id,
        title: result.movie.title,
        year: result.movie.year,
        tmdbId: result.movie.tmdbId,
        slug: result.movie.slug
      },
      topOptions: result.topSelections.map(opt => ({
        jofId: opt.jofId,
        score: Number(opt.score.toFixed(3)),
        tier: opt.tier,
        sentiment: opt.mainSentimentName,
        intention: opt.intentionType,
        intentionDescription: opt.intentionDescription,
        journeyText: opt.jofText,
        coverage: `${(opt.coverageRatio * 100).toFixed(0)}%`,
        activeCount: opt.matchesCount
      }))
    });
  } catch (error: any) {
    console.error('❌ Erro em /curate/preview:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro interno ao avaliar filme.'
    });
  }
});

// ====================================================
// POST /api/curate/confirm-pending/:pendingId
// Confirma e grava a curadoria previamente avaliada
// ====================================================
router.post('/confirm-pending/:pendingId', async (req, res) => {
  try {
    const { pendingId } = req.params;
    const pending = pendingStore.get(pendingId);

    if (!pending) {
      return res.status(404).json({
        success: false,
        error: 'Curadoria pendente não encontrada ou expirada. Execute /preview novamente.'
      });
    }

    console.log(`💾 [API /curate/confirm-pending] Gravando: "${pending.title}"...`);

    const savedOutput = await commitCurations(
      pending.movieId,
      pending.topSelections,
      pending.provider
    );

    pendingStore.delete(pendingId);

    return res.json({
      success: true,
      message: `Curadoria de "${pending.title}" salva com sucesso!`,
      movie: savedOutput.movie,
      savedSuggestions: savedOutput.savedSuggestions
    });
  } catch (error: any) {
    console.error('❌ Erro em /curate/confirm-pending:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao gravar curadoria pendente.'
    });
  }
});

// ====================================================
// POST /api/curate/confirm-direct
// Confirma e grava a curadoria recebendo os dados diretamente no body
// (sem depender do pendingStore — ideal para n8n com revisão humana)
// Body: {
//   movieId: string,
//   topSelections: JofEvaluationResult[],
//   provider?: string,
//   title?: string  (apenas para log)
// }
// ====================================================
router.post('/confirm-direct', async (req, res) => {
  try {
    const { movieId, topSelections, provider = 'deepseek', title } = req.body;

    if (!movieId || !topSelections || !Array.isArray(topSelections) || topSelections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: "movieId" (string) e "topSelections" (array com ao menos 1 item).'
      });
    }

    console.log(`💾 [API /curate/confirm-direct] Gravando: "${title || movieId}"...`);

    const savedOutput = await commitCurations(movieId, topSelections, provider as any);

    return res.json({
      success: true,
      message: `Curadoria de "${savedOutput.movie.title}" salva com sucesso!`,
      movie: savedOutput.movie,
      savedSuggestions: savedOutput.savedSuggestions
    });
  } catch (error: any) {
    console.error('❌ Erro em /curate/confirm-direct:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao gravar curadoria.'
    });
  }
});

// ====================================================
// POST /api/curate/cancel-pending/:pendingId
// ====================================================
router.post('/cancel-pending/:pendingId', (req, res) => {
  const { pendingId } = req.params;
  const existed = pendingStore.delete(pendingId);
  return res.json({ success: true, cancelled: existed });
});

// ====================================================
// POST /api/curate/auto
// Executa preview + confirm em uma única chamada (ideal para n8n/automações)
// Body: { title: string, year?: number, sentiment?: string, intention?: string, provider?: string }
// ====================================================
router.post('/auto', async (req, res) => {
  try {
    const { title, year, sentiment, intention, provider = 'deepseek' } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Campo "title" é obrigatório.' });
    }

    console.log(`📡 [API /curate/auto] Curadoria automática: "${title}" (${year || 'N/A'})...`);

    // Etapa 1: Avaliação (preview)
    const result = await evaluateMovie(title, year ? Number(year) : undefined, {
      sentiment,
      intention,
      provider: provider as any
    });

    // Etapa 2: Gravação imediata (commit) sem pendingStore
    const savedOutput = await commitCurations(
      result.movie.id,
      result.topSelections,
      provider as any
    );

    return res.json({
      success: true,
      mode: 'auto',
      movie: savedOutput.movie,
      topOptions: result.topSelections.map(opt => ({
        jofId: opt.jofId,
        score: Number(opt.score.toFixed(3)),
        tier: opt.tier,
        sentiment: opt.mainSentimentName,
        intention: opt.intentionType,
        intentionDescription: opt.intentionDescription,
        journeyText: opt.jofText,
        coverage: `${(opt.coverageRatio * 100).toFixed(0)}%`,
        activeCount: opt.matchesCount
      })),
      savedSuggestions: savedOutput.savedSuggestions
    });
  } catch (error: any) {
    console.error('❌ Erro em /curate/auto:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro interno ao executar curadoria automática.'
    });
  }
});

export default router;

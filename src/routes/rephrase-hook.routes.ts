import { Router } from 'express';
import { prismaApp as prisma } from '../prisma';
import { createAIProvider, getDefaultConfig } from '../utils/aiProvider';
import { randomUUID } from 'crypto';

const router = Router();

// ====================================================
// Armazenamento temporário em memória (TTL: 30 min)
// Guarda o newHook entre /preview e /confirm-pending
// ====================================================
interface PendingHook {
  movieId: string;
  title: string;
  newHook: string;
  expiresAt: number;
}
const pendingStore = new Map<string, PendingHook>();

// Limpar entradas expiradas a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingStore.entries()) {
    if (value.expiresAt < now) pendingStore.delete(key);
  }
}, 10 * 60 * 1000);

// ====================================================
// Helper: gera novo landingPageHook via IA
// (mesma lógica do script rephrase_landing_hooks.ts)
// ====================================================
async function generateHook(movie: any, providerName = 'deepseek'): Promise<string> {
  const config = getDefaultConfig(providerName as any);
  const aiProvider = createAIProvider(config);

  let sentimentContext = '';
  if (movie.movieSentiments && movie.movieSentiments.length > 0) {
    const topSentiments = movie.movieSentiments
      .sort((a: any, b: any) => parseFloat(b.relevance) - parseFloat(a.relevance))
      .slice(0, 3);

    sentimentContext = '\n\nAnálise emocional do filme:\n';
    topSentiments.forEach((sentiment: any, index: number) => {
      sentimentContext += `${index + 1}. ${sentiment.subSentiment.name} (Relevância: ${sentiment.relevance}): ${sentiment.explanation}\n`;
    });
  }

  const hookPrompt = `Filme: '${movie.title}' (${movie.year}). Gêneros: ${movie.genres?.join(', ') || 'N/A'}. Palavras-chave: ${movie.keywords?.slice(0, 5).join(', ') || 'N/A'}.${sentimentContext}\n\nSua tarefa é criar um gancho emocional imersivo (cerca de 30 palavras) que capture a atmosfera, a tensão ou o impacto da experiência de assistir ao filme.\n\nExemplos de estilo desejado (varie a estrutura, não fique preso a um único modelo):\n- "A obsessão sombria de um gênio da cirurgia, onde os limites da vingança e da identidade se dissolvem em um thriller perturbador sobre os extremos do amor transformado em monstro."\n- "A banalidade do mal: um jardim idílico e uma família perfeita escondem o genocídio ao lado, desafiando tudo o que você entende sobre humanidade."\n- "Em um frenesi cinético de vingança pura, onde cada bala é um passo na dança mortal de um assassino aposentado que despertou."\n- "O loop temporal de adrenalina e sobrevivência: a mesma batalha revivida à exaustão, onde a morte brutal é o único ensaio para a maestria absoluta."\n\nREGRAS MANDATÓRIAS:\n1. PROIBIDO FAZER RESUMO DA SINOPSE OU CITAR NOME DE PERSONAGENS. Foque apenas na VIBE, no tema e na sensação transmitida.\n2. Mantenha em uma única frase impetuosa e marcante.\n3. NUNCA use termos de marketing como "Prepare-se", "Não perca", "Descubra o que acontece", "Assista a".\n\nResponda APENAS com o texto exigido, sem aspas.`;

  const hookResponse = await aiProvider.generateResponse(
    "Você é um especialista em marketing cinematográfico que cria ganchos cativantes para landing pages de filmes.",
    hookPrompt,
    { maxTokens: 300, temperature: 0.7 }
  );

  if (hookResponse.success && hookResponse.content) {
    let hook = hookResponse.content.trim().replace(/^"|"$/g, '');
    hook = hook.replace(/```[\s\S]*?```/g, '').trim();
    return hook;
  }

  return movie.landingPageHook || '';
}

// ====================================================
// POST /api/rephrase-hook/preview
// Body: { title: string, year?: number, provider?: string }
// Retorna: { movieId, title, year, oldHook, newHook }
// ====================================================
router.post('/preview', async (req, res) => {
  try {
    const { title, year, provider = 'deepseek' } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Campo "title" é obrigatório.' });
    }

    const whereClause: any = {
      title: { contains: title, mode: 'insensitive' }
    };
    if (year) {
      whereClause.year = Number(year);
    }

    const movie = await prisma.movie.findFirst({
      where: whereClause,
      include: {
        movieSentiments: {
          include: { subSentiment: true }
        }
      }
    });

    if (!movie) {
      return res.status(404).json({
        error: `Filme "${title}"${year ? ` (${year})` : ''} não encontrado.`
      });
    }

    const newHook = await generateHook(movie, provider);

    // Salvar no pendingStore para o fluxo do Telegram
    const pendingId = randomUUID();
    pendingStore.set(pendingId, {
      movieId: movie.id,
      title: movie.title,
      newHook,
      expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutos
    });

    return res.json({
      pendingId,         // usado no callback_data dos botões Telegram
      movieId: movie.id,
      title: movie.title,
      year: movie.year,
      oldHook: movie.landingPageHook || '(vazio)',
      newHook
    });
  } catch (error: any) {
    console.error('Erro em /rephrase-hook/preview:', error);
    return res.status(500).json({ error: 'Erro interno ao gerar hook.' });
  }
});

// ====================================================
// POST /api/rephrase-hook/confirm
// Body: { movieId: string, newHook: string }
// Retorna: { success: true, title, updatedHook }
// ====================================================
router.post('/confirm', async (req, res) => {
  try {
    const { movieId, newHook } = req.body;

    if (!movieId || !newHook) {
      return res.status(400).json({ error: 'Campos "movieId" e "newHook" são obrigatórios.' });
    }

    const updated = await prisma.movie.update({
      where: { id: movieId },
      data: { landingPageHook: newHook },
      select: { id: true, title: true, landingPageHook: true }
    });

    return res.json({
      success: true,
      title: updated.title,
      updatedHook: updated.landingPageHook
    });
  } catch (error: any) {
    console.error('Erro em /rephrase-hook/confirm:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar hook.' });
  }
});

// ====================================================
// POST /api/rephrase-hook/confirm-pending/:pendingId
// Usado pelo Telegram callback: confirma ou cancela
// Body: { action: 'confirm' | 'cancel' }
// Retorna: { success, title, updatedHook? }
// ====================================================
router.post('/confirm-pending/:pendingId', async (req, res) => {
  try {
    const { pendingId } = req.params;
    const { action } = req.body;

    const pending = pendingStore.get(pendingId);
    if (!pending) {
      return res.status(404).json({ error: 'Sessão expirada ou inválida. Execute /hook novamente.' });
    }

    if (action === 'cancel') {
      pendingStore.delete(pendingId);
      return res.json({ success: true, cancelled: true, title: pending.title });
    }

    if (action === 'confirm') {
      const updated = await prisma.movie.update({
        where: { id: pending.movieId },
        data: { landingPageHook: pending.newHook },
        select: { id: true, title: true, landingPageHook: true }
      });

      pendingStore.delete(pendingId);

      return res.json({
        success: true,
        title: updated.title,
        updatedHook: updated.landingPageHook
      });
    }

    return res.status(400).json({ error: 'Action deve ser "confirm" ou "cancel".' });
  } catch (error: any) {
    console.error('Erro em /rephrase-hook/confirm-pending:', error);
    return res.status(500).json({ error: 'Erro interno ao processar confirmação.' });
  }
});

export default router;


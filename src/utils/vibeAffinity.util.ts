/**
 * 🎬 Vibe Affinity Utility
 * 
 * Cálculo de afinidade emocional, temática e estética entre filmes
 * para a seção "Filmes que conversam com esta vibe" (Hero Movie).
 */

export interface VibeAffinityTarget {
  genres: string[];
  keywords: string[];
  sentiments: Record<string | number, number>;
}

export interface VibeAffinityCandidate {
  id: string;
  genres: string[];
  keywords: string[];
  sentiments: Record<string | number, number>;
  jofScore: number;
}

export interface VibeAffinityResult {
  finalScore: number;
  cosine: number;
  genreSim: number;
  keywordScore: number;
  keywordMatches: string[];
  tonalPenalty: number;
  tonalReason?: string;
}

export const VIBE_WEIGHTS = {
  SENTIMENT_DNA: 0.50,
  JOF_SCORE: 0.30,
  KEYWORDS: 0.12,
  GENRES: 0.08
};

/**
 * Similaridade de Cosseno entre os vetores de SubSentimentos
 */
export function calculateCosineSimilarity(
  vecA: Record<string | number, number> | Map<number, number>,
  vecB: Record<string | number, number> | Map<number, number>
): number {
  const mapA = vecA instanceof Map ? vecA : new Map(Object.entries(vecA).map(([k, v]) => [Number(k), Number(v)]));
  const mapB = vecB instanceof Map ? vecB : new Map(Object.entries(vecB).map(([k, v]) => [Number(k), Number(v)]));

  if (mapA.size === 0 || mapB.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [id, valA] of mapA.entries()) {
    normA += valA * valA;
    if (mapB.has(id)) {
      const valB = mapB.get(id)!;
      dotProduct += valA * valB;
    }
  }

  for (const [, valB] of mapB.entries()) {
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Similaridade de Gêneros por Jaccard puro
 */
export function calculateGenreSimilarity(genresA: string[] = [], genresB: string[] = []): number {
  if (genresA.length === 0 || genresB.length === 0) return 0;

  const setA = new Set(genresA.map(g => g.toLowerCase().trim()));
  const setB = new Set(genresB.map(g => g.toLowerCase().trim()));

  let intersection = 0;
  for (const g of setA) {
    if (setB.has(g)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Overlap de Keywords semânticas
 * 1 kw = 0.35, 2 kws = 0.70, 3+ kws = 1.00
 */
export function calculateKeywordSimilarity(keywordsA: string[] = [], keywordsB: string[] = []): { score: number; matches: string[] } {
  if (keywordsA.length === 0 || keywordsB.length === 0) {
    return { score: 0, matches: [] };
  }

  const setA = new Set(keywordsA.map(k => k.toLowerCase().trim()));
  const setB = new Set(keywordsB.map(k => k.toLowerCase().trim()));

  const matches: string[] = [];
  for (const k of setA) {
    if (setB.has(k)) {
      matches.push(k);
    }
  }

  if (matches.length === 0) return { score: 0, matches: [] };

  const score = Math.min(1.0, matches.length * 0.35);
  return { score, matches };
}

/**
 * Penalidade Tonal para incompatibilidades estéticas/temáticas drásticas
 */
export function calculateTonalPenalty(genresA: string[] = [], genresB: string[] = []): { penalty: number; reason?: string } {
  const normA = new Set(genresA.map(g => g.toLowerCase().trim()));
  const normB = new Set(genresB.map(g => g.toLowerCase().trim()));

  const isGrittyA = normA.has('faroeste') || normA.has('western') || normA.has('guerra') || normA.has('terror') || normA.has('horror');
  const hasRomanceA = normA.has('romance');
  const isRomanceB = normB.has('romance');
  const isGrittyB = normB.has('faroeste') || normB.has('western') || normB.has('guerra') || normB.has('terror') || normB.has('horror');

  // 1. Árido/Brutal/Guerra/Faroeste vs Romance Doce (sem tom áspero compartilhado)
  if (isGrittyA && !hasRomanceA && isRomanceB && !isGrittyB) {
    return {
      penalty: 1.2,
      reason: 'Conflito tonal: Universo áspero/brutal vs Romance'
    };
  }

  if (normA.has('romance') && !isGrittyA && isGrittyB && !normB.has('romance')) {
    return {
      penalty: 1.2,
      reason: 'Conflito tonal: Romance vs Universo brutal/guerra/horror'
    };
  }

  // 2. Família / Infantil / Animação vs Terror / Guerra / Violência Extrema
  const isFamilyA = normA.has('família') || normA.has('familia') || normA.has('animação') || normA.has('animacao');
  const isDarkB = normB.has('terror') || normB.has('horror') || normB.has('guerra');
  const isFamilyB = normB.has('família') || normB.has('familia') || normB.has('animação') || normB.has('animacao');
  const isDarkA = normA.has('terror') || normA.has('horror') || normA.has('guerra');

  if (isFamilyA && !isDarkA && isDarkB && !isFamilyB) {
    return {
      penalty: 1.5,
      reason: 'Conflito tonal: Familiar/Animação vs Terror/Guerra'
    };
  }

  if (isDarkA && !isFamilyA && isFamilyB && !isDarkB) {
    return {
      penalty: 1.5,
      reason: 'Conflito tonal: Sombrio/Violento vs Familiar/Animação'
    };
  }

  // 3. Comédia Leve vs Guerra / Terror Pesado
  const isComedyOnlyA = (normA.has('comédia') || normA.has('comedia')) && !normA.has('drama');
  if (isComedyOnlyA && isDarkB) {
    return {
      penalty: 1.5,
      reason: 'Conflito tonal: Comédia descontraída vs Guerra/Terror'
    };
  }

  return { penalty: 0 };
}

/**
 * Calcula o score consolidado de afinidade (0 a 10)
 */
export function calculateVibeAffinityScore(
  target: VibeAffinityTarget,
  candidate: VibeAffinityCandidate
): VibeAffinityResult {
  const cosine = calculateCosineSimilarity(target.sentiments, candidate.sentiments);
  const genreSim = calculateGenreSimilarity(target.genres, candidate.genres);
  const kwSim = calculateKeywordSimilarity(target.keywords, candidate.keywords);
  const tonal = calculateTonalPenalty(target.genres, candidate.genres);

  const jofScoreNorm = Math.min(1.0, (candidate.jofScore || 0) / 10.0);

  const rawAffinity =
    (cosine * VIBE_WEIGHTS.SENTIMENT_DNA) +
    (jofScoreNorm * VIBE_WEIGHTS.JOF_SCORE) +
    (kwSim.score * VIBE_WEIGHTS.KEYWORDS) +
    (genreSim * VIBE_WEIGHTS.GENRES);

  const baseScore = rawAffinity * 10;
  const finalScore = Number(Math.max(0, baseScore - tonal.penalty).toFixed(3));

  return {
    finalScore,
    cosine,
    genreSim,
    keywordScore: kwSim.score,
    keywordMatches: kwSim.matches,
    tonalPenalty: tonal.penalty,
    tonalReason: tonal.reason
  };
}

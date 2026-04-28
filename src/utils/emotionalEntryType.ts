/**
 * emotionalEntryType.ts
 *
 * Utilitário para cálculo do "custo de entrada emocional" de um filme.
 *
 * Conceito:
 *   - emotionalEntryType: propriedade fixa do filme (inferida dos seus SubSentiments)
 *   - intentionType: intenção variável do usuário (MAINTAIN, PROCESS, TRANSFORM, EXPLORE)
 *   - entryAdjustment: ajuste aplicado em runtime ao relevanceScore → finalScore
 *
 * Fórmula:
 *   finalScore = relevanceScore + getEntryAdjustment(entryType, intentionType)
 */

export type EmotionalEntryType = 'ALIGNED' | 'TRANSITIONAL' | 'COMPLEX';
export type IntentionType = 'MAINTAIN' | 'PROCESS' | 'TRANSFORM' | 'EXPLORE';

// ─────────────────────────────────────────────────────────────────────────────
// SINAIS POR CATEGORIA
// ─────────────────────────────────────────────────────────────────────────────

const ALIGNED_SIGNALS = new Set([
  'Adrenalina / Emoção Intensa',
  'Frenesi Cinético',
  'Humor Contagiante',
  'Humor Irreverente',
  'Leveza / Diversão Descompromissada',
  'Distração Total / Escape',
  'Euforia / Celebração',
  'Celebração / Grandeza',
  'Intriga Leve / Humor',
]);

const TRANSITIONAL_SIGNALS = new Set([
  'Isolamento Reflexivo',
  'Fragilidade da Condição Humana',
  'Autodescoberta e Crescimento',
  'Beleza Melancólica',
  'Reflexão Serena',
  'Vida Simples e Reflexiva',
  'Reavaliação de Vida',
  'Sozinho(a)',
  'Emotivo(a) (Triste)',
  'Nostálgico(a) (Triste)',
  'Paz / Contemplação',
]);

const COMPLEX_SIGNALS = new Set([
  'Complexidade Psicológica',
  'Desintegração Psicológica',
  'Desespero Crescente',
  'Exaustão e Pressão',
  'Tensão Social e Invasiva',
  'Vazio(a)',
  'Desafio Existencial',
]);

// ─────────────────────────────────────────────────────────────────────────────
// inferEntryType
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Infere o EmotionalEntryType de um filme com base nos nomes dos seus SubSentiments.
 *
 * Regras de prioridade:
 *   1. COMPLEX  → 2+ sinais complex, OU 1 sinal complex sem nenhum sinal aligned
 *   2. TRANSITIONAL → mais sinais transitional do que aligned
 *   3. ALIGNED  → sinais aligned dominantes ou fallback seguro
 *
 * @param subSentimentNames - Lista de nomes de SubSentiments do filme
 */
export function inferEntryType(subSentimentNames: string[]): EmotionalEntryType {
  const subs = new Set(subSentimentNames);

  const complexCount      = [...COMPLEX_SIGNALS].filter(s => subs.has(s)).length;
  const transitionalCount = [...TRANSITIONAL_SIGNALS].filter(s => subs.has(s)).length;
  const alignedCount      = [...ALIGNED_SIGNALS].filter(s => subs.has(s)).length;

  // COMPLEX: requer 2+ sinais, MAS só classifica como COMPLEX se os sinais
  // transitionals não forem claramente dominantes (mais que o dobro dos complex).
  // Ex: complexCount=2, transitionalCount=5 → 5 > 2*2 → TRANSITIONAL (não COMPLEX)
  if (complexCount >= 2 && transitionalCount <= complexCount * 2) {
    return 'COMPLEX';
  }

  // COMPLEX com 1 sinal forte, sem nenhum sinal aligned para contrabalancear
  // e sem transitionals dominando
  if (complexCount === 1 && alignedCount === 0 && transitionalCount <= 2) {
    return 'COMPLEX';
  }

  // TRANSITIONAL: sinais contemplativos/melancólicos dominam sobre aligned
  if (transitionalCount > alignedCount) {
    return 'TRANSITIONAL';
  }

  // ALIGNED: sinais diretos presentes ou fallback seguro
  return 'ALIGNED';
}

// ─────────────────────────────────────────────────────────────────────────────
// getEntryAdjustment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna o ajuste a aplicar ao relevanceScore com base no tipo de entrada
 * emocional do filme e na intenção atual do usuário.
 *
 * Princípio:
 *   - ALIGNED   → entrega imediata, sempre positivo
 *   - TRANSITIONAL → depende da intenção (bom para PROCESSAR/TRANSFORMAR,
 *                    neutro para MANTER/EXPLORAR)
 *   - COMPLEX   → alto custo de entrada, penaliza mais em MANTER,
 *                 penaliza menos em TRANSFORMAR/PROCESSAR
 *
 * @param entryType    - EmotionalEntryType do filme
 * @param intentionType - Intenção emocional do usuário na sessão atual
 */
const ENTRY_ADJUSTMENT = {
  ALIGNED: {
    MAINTAIN: +0.2,
    PROCESS: +0.1,
    TRANSFORM: +0.3,
    EXPLORE: +0.2,
  },

  TRANSITIONAL: {
    MAINTAIN: 0.0,
    PROCESS: +0.2,
    TRANSFORM: -0.2,
    EXPLORE: -0.1,
  },

  COMPLEX: {
    MAINTAIN: 0.0,
    PROCESS: +0.1,
    TRANSFORM: -0.2,
    EXPLORE: -0.3,
  }
};

export function getEntryAdjustment(
  entryType: EmotionalEntryType,
  intentionType: IntentionType,
  userMood?: string
): number {
  let adjustment = ENTRY_ADJUSTMENT[entryType][intentionType];

  // ajustes finos opcionais baseados no humor do usuário
  if (userMood === 'Introspectivo' && entryType === 'COMPLEX' && intentionType === 'MAINTAIN') {
    adjustment += 0.1;
  }

  if (userMood === 'Feliz' && entryType === 'TRANSITIONAL' && intentionType === 'TRANSFORM') {
    adjustment -= 0.1;
  }

  return adjustment;
}

// ─────────────────────────────────────────────────────────────────────────────
// calcFinalScore
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o finalScore aplicando o ajuste de entrada emocional.
 * Garante o range de 0.0 a 10.0.
 *
 * Nunca deve ser salvo no banco — calculado em runtime no endpoint.
 *
 * @param relevanceScore - Score fixo salvo em MovieSuggestionFlow
 * @param entryType      - EmotionalEntryType do filme (pode ser null)
 * @param intentionType  - Intenção do usuário na sessão (pode ser null)
 * @param userMood       - Humor atual do usuário (opcional)
 */
export function calcFinalScore(
  relevanceScore: number,
  entryType: EmotionalEntryType | null | undefined,
  intentionType: IntentionType | null | undefined,
  userMood?: string
): number {
  if (!entryType || !intentionType) {
    // Sem dados suficientes → retorna o score original sem ajuste
    return relevanceScore;
  }

  const adjustment = getEntryAdjustment(entryType, intentionType, userMood);
  const finalScore = relevanceScore + adjustment;

  // Garantir range 0.0–10.0
  return Math.min(Math.max(finalScore, 0.0), 10.0);
}

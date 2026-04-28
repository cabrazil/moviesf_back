/**
 * diagnosisEntryType.ts
 *
 * Script de diagnóstico: mostra os sinais encontrados e o emotionalEntryType
 * inferido para uma lista de filmes, sem gravar nada no banco.
 *
 * Uso:
 *   npx ts-node src/scripts/diagnosisEntryType.ts
 */

import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { inferEntryType, EmotionalEntryType } from '../utils/emotionalEntryType';

const prisma = new PrismaClient();

// Threshold configurável via --threshold=0.90
const thresholdArg = process.argv.find(a => a.startsWith('--threshold='));
const MIN_RELEVANCE = thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : 0.80;
// Lista de filmes para testar (título parcial, case-insensitive)
const FILMS_TO_TEST: Array<{ title: string; year: number; expected?: EmotionalEntryType }> = [
  { title: 'A Forma da Água',                   year: 2017, expected: 'TRANSITIONAL' },
  { title: 'Vidas Passadas',                    year: 2023 },
  { title: 'A Culpa é das Estrelas',            year: 2014 },
  { title: 'A Incrível História de Adaline',    year: 2015 },
  { title: 'Mad Max: Estrada da Fúria',         year: 2015 },
  { title: 'Ela',                               year: 2013 },
  { title: 'Interestelar',                      year: 2014 },
  { title: 'Ford vs Ferrari',                   year: 2019 },
  { title: 'Corações de Ferro',                 year: 2014 },
  { title: 'Joias Brutas',                      year: 2019 },
  { title: 'O Brutalista',                      year: 2024 },
];

const ALIGNED_SIGNALS = new Set([
  'Adrenalina / Emoção Intensa', 'Frenesi Cinético', 'Humor Contagiante',
  'Humor Irreverente', 'Leveza / Diversão Descompromissada',
  'Distração Total / Escape', 'Euforia / Celebração',
  'Celebração / Grandeza', 'Intriga Leve / Humor',
]);
const TRANSITIONAL_SIGNALS = new Set([
  'Isolamento Reflexivo', 'Fragilidade da Condição Humana',
  'Autodescoberta e Crescimento', 'Beleza Melancólica', 'Reflexão Serena',
  'Vida Simples e Reflexiva', 'Reavaliação de Vida', 'Sozinho(a)',
  'Emotivo(a) (Triste)', 'Nostálgico(a) (Triste)', 'Paz / Contemplação',
]);
const COMPLEX_SIGNALS = new Set([
  'Complexidade Psicológica', 'Desintegração Psicológica', 'Desespero Crescente',
  'Exaustão e Pressão', 'Tensão Social e Invasiva', 'Vazio(a)',
  'Desafio Existencial',
]);

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔬 DIAGNÓSTICO: emotionalEntryType');
  console.log(`📏 Threshold: ≥ ${MIN_RELEVANCE} | Modo: apenas leitura`);
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const film of FILMS_TO_TEST) {
    const movie = await prisma.movie.findFirst({
      where: {
        title: { contains: film.title, mode: 'insensitive' },
        year: film.year,
      },
      select: { id: true, title: true, year: true, emotionalEntryType: true },
    });

    if (!movie) {
      console.log(`❌ NÃO ENCONTRADO: "${film.title}" (${film.year})\n`);
      continue;
    }

    const movieSentiments = await prisma.movieSentiment.findMany({
      where: {
        movieId: movie.id,
        relevance: { gte: MIN_RELEVANCE },
      },
      select: {
        relevance: true,
        subSentiment: { select: { name: true } },
      },
      orderBy: { relevance: 'desc' },
    });

    const subNames = movieSentiments.map(ms => ms.subSentiment.name);

    // Classificar sinais por categoria
    const complexFound      = subNames.filter(n => COMPLEX_SIGNALS.has(n));
    const transitionalFound = subNames.filter(n => TRANSITIONAL_SIGNALS.has(n));
    const alignedFound      = subNames.filter(n => ALIGNED_SIGNALS.has(n));

    const inferred = inferEntryType(subNames);
    const savedType = movie.emotionalEntryType as string | null;

    const matchExpected = film.expected
      ? (inferred === film.expected ? '✅' : `❌ esperado: ${film.expected}`)
      : '';

    console.log(`🎬 ${movie.title} (${movie.year})`);
    console.log(`   Inferido:  ${inferred} ${matchExpected}`);
    console.log(`   No banco:  ${savedType ?? 'null'}`);
    console.log(`   Sinais qualificados: ${subNames.length}`);

    if (complexFound.length > 0)
      console.log(`   🔴 COMPLEX      (${complexFound.length}): ${complexFound.join(' | ')}`);
    if (transitionalFound.length > 0)
      console.log(`   🟡 TRANSITIONAL (${transitionalFound.length}): ${transitionalFound.join(' | ')}`);
    if (alignedFound.length > 0)
      console.log(`   🟢 ALIGNED      (${alignedFound.length}): ${alignedFound.join(' | ')}`);

    console.log('─'.repeat(63));
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

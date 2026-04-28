/**
 * compareEntryTypeImpact.ts
 *
 * Script POC de comparação do impacto do `emotionalEntryType` e `intentionType`
 * nos scores dos filmes de uma determinada Jornada (JOF).
 *
 * Uso:
 *   npx ts-node src/scripts/compareEntryTypeImpact.ts --jofId=72 --intentionType=MAINTAIN
 *   npx ts-node src/scripts/compareEntryTypeImpact.ts --jofId=72 --intentionType=EXPLORE
 */

import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { IntentionType, EmotionalEntryType, calcFinalScore, getEntryAdjustment } from '../utils/emotionalEntryType';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  let jofId: number | undefined;
  let intentionType: IntentionType | undefined;
  let userMood: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--jofId=')) {
      jofId = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--intentionType=')) {
      const val = arg.split('=')[1].toUpperCase();
      if (['MAINTAIN', 'PROCESS', 'TRANSFORM', 'EXPLORE'].includes(val)) {
        intentionType = val as IntentionType;
      }
    } else if (arg.startsWith('--userMood=')) {
      userMood = arg.split('=')[1];
    }
  }

  if (!jofId || !intentionType) {
    console.error('❌ Parâmetros obrigatórios faltando.');
    console.error('Uso: npx ts-node src/scripts/compareEntryTypeImpact.ts --jofId=ID --intentionType=TIPO');
    console.error('Tipos de intenção: MAINTAIN, PROCESS, TRANSFORM, EXPLORE');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('⚖️  COMPARAÇÃO DE IMPACTO: Custo de Entrada Emocional');
  console.log(`🎯 JOF ID: ${jofId} | Intenção: ${intentionType} | Mood: ${userMood || 'N/A'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Buscar a jornada para exibir o título
  const jof = await prisma.journeyOptionFlow.findUnique({
    where: { id: jofId }
  });

  if (!jof) {
    console.error(`❌ Jornada ${jofId} não encontrada.`);
    process.exit(1);
  }

  console.log(`📌 Opção de Jornada: "${jof.text}"\n`);

  // Buscar sugestões de filmes para essa jornada
  const suggestions = await prisma.movieSuggestionFlow.findMany({
    where: { journeyOptionFlowId: jofId },
    include: {
      movie: {
        select: {
          title: true,
          year: true,
          emotionalEntryType: true
        }
      }
    },
    orderBy: { relevanceScore: 'desc' } // Ordenar pelo score original
  });

  if (suggestions.length === 0) {
    console.log(`⚠️ Nenhum filme sugerido encontrado para a JOF ${jofId}.`);
    process.exit(0);
  }

  // Tabela de comparação
  console.log('┌──────────────────────────────────────────┬──────────────┬────────┬────────┬────────┐');
  console.log('│ Filme                                    │ Entry Type   │ Origin │ Adjust │ Final  │');
  console.log('├──────────────────────────────────────────┼──────────────┼────────┼────────┼────────┤');

  interface ResultRow {
    title: string;
    entryType: EmotionalEntryType | null;
    originalScore: number;
    adjustment: number;
    finalScore: number;
  }

  const results: ResultRow[] = [];

  for (const sug of suggestions) {
    const originalScore = sug.relevanceScore ? Number(sug.relevanceScore) : 0;
    const entryType = sug.movie.emotionalEntryType as EmotionalEntryType | null;
    
    const adjustment = entryType ? getEntryAdjustment(entryType, intentionType, userMood) : 0;
    const finalScore = calcFinalScore(originalScore, entryType, intentionType, userMood);

    results.push({
      title: `${sug.movie.title} (${sug.movie.year || '?'})`,
      entryType,
      originalScore,
      adjustment,
      finalScore
    });
  }

  // Vamos exibir ordenado pelo NOVO score final para ver como o ranking mudou
  results.sort((a, b) => b.finalScore - a.finalScore);

  for (const row of results) {
    const titlePadded = row.title.length > 40 ? row.title.substring(0, 37) + '...' : row.title.padEnd(40);
    const entryTypePadded = (row.entryType || 'N/A').padEnd(12);
    const originPadded = row.originalScore.toFixed(3).padStart(6);
    
    const adjSign = row.adjustment > 0 ? '+' : (row.adjustment < 0 ? '-' : ' ');
    const adjFormatted = `${adjSign}${Math.abs(row.adjustment).toFixed(1)}`.padStart(6);
    
    const finalPadded = row.finalScore.toFixed(3).padStart(6);

    console.log(`│ ${titlePadded} │ ${entryTypePadded} │ ${originPadded} │ ${adjFormatted} │ ${finalPadded} │`);
  }

  console.log('└──────────────────────────────────────────┴──────────────┴────────┴────────┴────────┘\n');

  // Exibir resumo do impacto
  const promovidos = results.filter(r => r.adjustment > 0).length;
  const penalizados = results.filter(r => r.adjustment < 0).length;
  const inalterados = results.filter(r => r.adjustment === 0).length;

  console.log('📊 Resumo do Impacto:');
  console.log(`   📈 Promovidos (ganharam bônus):  ${promovidos}`);
  console.log(`   📉 Penalizados (perderam score): ${penalizados}`);
  console.log(`   ➡️  Inalterados (neutros ou N/A):  ${inalterados}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

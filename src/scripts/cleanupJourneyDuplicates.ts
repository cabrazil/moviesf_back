/// <reference types="node" />
// Script para limpar duplicatas semânticas em uma jornada específica
import './scripts-helper';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  // Parse argumentos
  let journeyOptionFlowId: number | undefined;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--jofId=')) {
      journeyOptionFlowId = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  if (!journeyOptionFlowId) {
    console.error('❌ Erro: --jofId é obrigatório');
    console.log('\nUso:');
    console.log('  npm run script:prod -- src/scripts/cleanupJourneyDuplicates.ts --jofId=ID [--dry-run]');
    console.log('\nExemplos:');
    console.log('  # Verificar duplicatas (dry-run)');
    console.log('  npm run script:prod -- src/scripts/cleanupJourneyDuplicates.ts --jofId=25 --dry-run');
    console.log('  # Limpar duplicatas');
    console.log('  npm run script:prod -- src/scripts/cleanupJourneyDuplicates.ts --jofId=25');
    process.exit(1);
  }

  console.log('🧹 LIMPEZA DE DUPLICATAS SEMÂNTICAS');
  console.log('═══════════════════════════════════════');
  console.log(`🎯 Jornada: ${journeyOptionFlowId}`);
  console.log(`${dryRun ? '🔍 MODO DRY-RUN (sem gravação)' : '💾 MODO GRAVAÇÃO'}\n`);

  try {
    // PASSO 1: Identificar duplicatas semânticas
    console.log('📊 PASSO 1: Identificando duplicatas semânticas...\n');

    const duplicates = await prisma.$queryRaw<Array<{
      name: string;
      count: bigint;
      sub_ids: number[];
      weights: number[];
    }>>`
      SELECT 
        ss.name,
        COUNT(*) as count,
        array_agg(jofs."subSentimentId" ORDER BY jofs."weight" DESC, jofs."subSentimentId" ASC) as sub_ids,
        array_agg(jofs."weight" ORDER BY jofs."weight" DESC, jofs."subSentimentId" ASC) as weights
      FROM "JourneyOptionFlowSubSentiment" jofs
      JOIN "SubSentiment" ss ON jofs."subSentimentId" = ss.id
      WHERE jofs."journeyOptionFlowId" = ${journeyOptionFlowId}
      GROUP BY ss.name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata semântica encontrada! A jornada está limpa.\n');
      return;
    }

    console.log(`⚠️  Encontradas ${duplicates.length} duplicatas semânticas:\n`);
    duplicates.forEach((dup, i) => {
      console.log(`${i + 1}. "${dup.name}"`);
      console.log(`   Ocorrências: ${dup.count}`);
      console.log(`   SubSentiment IDs: [${dup.sub_ids.join(', ')}]`);
      console.log(`   Pesos: [${dup.weights.map(w => Number(w).toFixed(2)).join(', ')}]`);
      console.log(`   ✅ Manter: ID ${dup.sub_ids[0]} (peso ${Number(dup.weights[0]).toFixed(2)})`);
      console.log(`   ❌ Deletar: IDs [${dup.sub_ids.slice(1).join(', ')}]\n`);
    });

    if (dryRun) {
      console.log('═══════════════════════════════════════');
      console.log('🔍 DRY-RUN: Nenhuma mudança foi aplicada');
      console.log('═══════════════════════════════════════\n');
      console.log('Para aplicar as mudanças, execute sem --dry-run:');
      console.log(`  npm run script:prod -- src/scripts/cleanupJourneyDuplicates.ts --jofId=${journeyOptionFlowId}\n`);
      return;
    }

    // PASSO 2: Deletar duplicatas
    console.log('🗑️  PASSO 2: Deletando duplicatas semânticas...\n');

    const deleteCount = await prisma.$executeRaw`
      WITH duplicates AS (
        SELECT 
          jofs.id as jofs_id,
          jofs."journeyOptionFlowId",
          ss.name,
          jofs."subSentimentId",
          jofs."weight",
          ROW_NUMBER() OVER (
            PARTITION BY jofs."journeyOptionFlowId", ss.name 
            ORDER BY jofs."weight" DESC, jofs."subSentimentId" ASC
          ) as rn
        FROM "JourneyOptionFlowSubSentiment" jofs
        JOIN "SubSentiment" ss ON jofs."subSentimentId" = ss.id
        WHERE jofs."journeyOptionFlowId" = ${journeyOptionFlowId}
      )
      DELETE FROM "JourneyOptionFlowSubSentiment"
      WHERE id IN (
        SELECT jofs_id FROM duplicates WHERE rn > 1
      )
    `;

    console.log(`✅ ${deleteCount} duplicatas deletadas\n`);

    // PASSO 3: Verificação final
    console.log('🔍 PASSO 3: Verificação final...\n');

    const finalCheck = await prisma.$queryRaw<Array<{
      name: string;
      count: bigint;
    }>>`
      SELECT 
        ss.name,
        COUNT(*) as count
      FROM "JourneyOptionFlowSubSentiment" jofs
      JOIN "SubSentiment" ss ON jofs."subSentimentId" = ss.id
      WHERE jofs."journeyOptionFlowId" = ${journeyOptionFlowId}
      GROUP BY ss.name
      HAVING COUNT(*) > 1
    `;

    if (finalCheck.length === 0) {
      console.log('✅ Verificação OK! Nenhuma duplicata semântica restante.\n');
    } else {
      console.log(`❌ ERRO: Ainda existem ${finalCheck.length} duplicatas!\n`);
      finalCheck.forEach(dup => {
        console.log(`   - "${dup.name}": ${dup.count} ocorrências`);
      });
      process.exit(1);
    }

    // PASSO 4: Estatísticas finais
    console.log('📊 ESTATÍSTICAS DA JORNADA:\n');

    const stats = await prisma.$queryRaw<Array<{
      metric: string;
      value: bigint;
    }>>`
      SELECT 
        'Total SubSentiments na jornada' as metric,
        COUNT(*) as value
      FROM "JourneyOptionFlowSubSentiment"
      WHERE "journeyOptionFlowId" = ${journeyOptionFlowId}
      UNION ALL
      SELECT 
        'SubSentiments únicos (por ID)',
        COUNT(DISTINCT "subSentimentId")
      FROM "JourneyOptionFlowSubSentiment"
      WHERE "journeyOptionFlowId" = ${journeyOptionFlowId}
      UNION ALL
      SELECT 
        'Conceitos únicos (por nome)',
        COUNT(DISTINCT ss.name)
      FROM "JourneyOptionFlowSubSentiment" jofs
      JOIN "SubSentiment" ss ON jofs."subSentimentId" = ss.id
      WHERE jofs."journeyOptionFlowId" = ${journeyOptionFlowId}
    `;

    stats.forEach(stat => {
      console.log(`   ${stat.metric}: ${stat.value}`);
    });

    console.log('\n═══════════════════════════════════════');
    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('═══════════════════════════════════════\n');
    console.log('💡 Próximo passo: Recalcular scores desta jornada');
    console.log(`   npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --jofId=${journeyOptionFlowId}\n`);

  } catch (error) {
    console.error('\n❌ ERRO durante a limpeza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

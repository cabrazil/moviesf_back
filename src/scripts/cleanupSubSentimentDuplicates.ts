/// <reference types="node" />
// Script para limpar duplicatas de SubSentiment antes de aplicar a constraint única
import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 LIMPEZA DE DUPLICATAS - SubSentiment');
  console.log('═══════════════════════════════════════\n');

  try {
    // PASSO 1: Identificar duplicatas
    console.log('📊 PASSO 1: Identificando duplicatas...\n');

    const duplicates = await prisma.$queryRaw<Array<{
      name: string;
      mainSentimentId: number;
      count: bigint;
      ids: number[];
    }>>`
      SELECT 
        name, 
        "mainSentimentId", 
        COUNT(*) as count,
        array_agg(id ORDER BY id) as ids
      FROM "SubSentiment"
      GROUP BY name, "mainSentimentId"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada! O banco já está limpo.\n');
      return;
    }

    console.log(`⚠️  Encontradas ${duplicates.length} duplicatas:\n`);
    duplicates.forEach((dup, i) => {
      console.log(`${i + 1}. "${dup.name}" (MainSentiment: ${dup.mainSentimentId})`);
      console.log(`   Ocorrências: ${dup.count} | IDs: [${dup.ids.join(', ')}]`);
      console.log(`   Manter: ${dup.ids[0]} | Deletar: [${dup.ids.slice(1).join(', ')}]\n`);
    });

    // Confirmar com o usuário
    console.log('⚠️  ATENÇÃO: Este script vai:');
    console.log('   1. Atualizar referências em MovieSentiment');
    console.log('   2. Atualizar/deletar referências em JourneyOptionFlowSubSentiment');
    console.log('   3. Deletar SubSentiments duplicados\n');

    // PASSO 2: Atualizar MovieSentiment
    console.log('🔄 PASSO 2: Atualizando referências em MovieSentiment...');

    const updateMovieSentiment = await prisma.$executeRaw`
      WITH duplicates AS (
        SELECT 
          name,
          "mainSentimentId",
          MIN(id) as keep_id,
          array_agg(id) FILTER (WHERE id != MIN(id)) as delete_ids
        FROM "SubSentiment"
        GROUP BY name, "mainSentimentId"
        HAVING COUNT(*) > 1
      )
      UPDATE "MovieSentiment" ms
      SET "subSentimentId" = d.keep_id
      FROM duplicates d,
           LATERAL unnest(d.delete_ids) as old_id
      WHERE ms."subSentimentId" = old_id
    `;

    console.log(`✅ ${updateMovieSentiment} registros atualizados em MovieSentiment\n`);

    // PASSO 3: Limpar JourneyOptionFlowSubSentiment (deletar conflitos)
    console.log('🔄 PASSO 3a: Deletando conflitos em JourneyOptionFlowSubSentiment...');

    const deleteConflicts = await prisma.$executeRaw`
      WITH duplicates AS (
        SELECT 
          name,
          "mainSentimentId",
          MIN(id) as keep_id,
          array_agg(id) FILTER (WHERE id != MIN(id)) as delete_ids
        FROM "SubSentiment"
        GROUP BY name, "mainSentimentId"
        HAVING COUNT(*) > 1
      )
      DELETE FROM "JourneyOptionFlowSubSentiment" jofs
      USING duplicates d,
            LATERAL unnest(d.delete_ids) as old_id
      WHERE jofs."subSentimentId" = old_id
        AND EXISTS (
          SELECT 1 
          FROM "JourneyOptionFlowSubSentiment" jofs2 
          WHERE jofs2."journeyOptionFlowId" = jofs."journeyOptionFlowId" 
            AND jofs2."subSentimentId" = d.keep_id
        )
    `;

    console.log(`✅ ${deleteConflicts} conflitos deletados\n`);

    // PASSO 3b: Atualizar não-conflitos
    console.log('🔄 PASSO 3b: Atualizando não-conflitos em JourneyOptionFlowSubSentiment...');

    const updateJourneyFlow = await prisma.$executeRaw`
      WITH duplicates AS (
        SELECT 
          name,
          "mainSentimentId",
          MIN(id) as keep_id,
          array_agg(id) FILTER (WHERE id != MIN(id)) as delete_ids
        FROM "SubSentiment"
        GROUP BY name, "mainSentimentId"
        HAVING COUNT(*) > 1
      )
      UPDATE "JourneyOptionFlowSubSentiment" jofs
      SET "subSentimentId" = d.keep_id
      FROM duplicates d,
           LATERAL unnest(d.delete_ids) as old_id
      WHERE jofs."subSentimentId" = old_id
    `;

    console.log(`✅ ${updateJourneyFlow} registros atualizados\n`);

    // PASSO 4: Deletar duplicatas
    console.log('🗑️  PASSO 4: Deletando SubSentiments duplicados...');

    const deleteSubSentiments = await prisma.$executeRaw`
      WITH duplicates AS (
        SELECT 
          id,
          ROW_NUMBER() OVER (
            PARTITION BY name, "mainSentimentId" 
            ORDER BY id ASC
          ) as rn
        FROM "SubSentiment"
      )
      DELETE FROM "SubSentiment"
      WHERE id IN (
        SELECT id FROM duplicates WHERE rn > 1
      )
    `;

    console.log(`✅ ${deleteSubSentiments} SubSentiments duplicados deletados\n`);

    // PASSO 5: Verificação final
    console.log('🔍 PASSO 5: Verificação final...');

    const finalCheck = await prisma.$queryRaw<Array<{
      name: string;
      mainSentimentId: number;
      count: bigint;
    }>>`
      SELECT 
        name, 
        "mainSentimentId", 
        COUNT(*) as count
      FROM "SubSentiment"
      GROUP BY name, "mainSentimentId"
      HAVING COUNT(*) > 1
    `;

    if (finalCheck.length === 0) {
      console.log('✅ Verificação OK! Nenhuma duplicata restante.\n');
    } else {
      console.log(`❌ ERRO: Ainda existem ${finalCheck.length} duplicatas!\n`);
      finalCheck.forEach(dup => {
        console.log(`   - "${dup.name}" (MainSentiment: ${dup.mainSentimentId}): ${dup.count} ocorrências`);
      });
      process.exit(1);
    }

    // PASSO 6: Estatísticas finais
    console.log('📊 ESTATÍSTICAS FINAIS:');

    const stats = await prisma.$queryRaw<Array<{
      metric: string;
      value: bigint;
    }>>`
      SELECT 
        'Total SubSentiments' as metric,
        COUNT(*) as value
      FROM "SubSentiment"
      UNION ALL
      SELECT 
        'Total MovieSentiment',
        COUNT(*)
      FROM "MovieSentiment"
      UNION ALL
      SELECT 
        'Total JourneyOptionFlowSubSentiment',
        COUNT(*)
      FROM "JourneyOptionFlowSubSentiment"
    `;

    stats.forEach(stat => {
      console.log(`   ${stat.metric}: ${stat.value}`);
    });

    console.log('\n═══════════════════════════════════════');
    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('═══════════════════════════════════════\n');
    console.log('📝 Próximo passo: Aplicar a migration');
    console.log('   npm run env:dev -- npx prisma migrate dev --name add_unique_constraint_subsentiment_name\n');

  } catch (error) {
    console.error('\n❌ ERRO durante a limpeza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Auditando diretamente o banco de dados PostgreSQL...\n');

  // Salvar snapshot atualizado de SubSentiment do banco para consulta rápida sem CSV
  const allSubSentiments = await prisma.subSentiment.findMany({
    orderBy: { id: 'asc' }
  });
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(
    path.join(backupDir, 'subsentiments-db-snapshot.json'),
    JSON.stringify(allSubSentiments, null, 2),
    'utf-8'
  );

  // 1. Verificar registros órfãos reais no banco (LEFT JOIN SubSentiment WHERE ss.id IS NULL)
  const orphans: Array<{ journeyOptionFlowId: number; subSentimentId: number; weight: any }> = await prisma.$queryRaw`
    SELECT jofss."journeyOptionFlowId", jofss."subSentimentId", jofss.weight
    FROM "JourneyOptionFlowSubSentiment" jofss
    LEFT JOIN "SubSentiment" ss ON ss.id = jofss."subSentimentId"
    WHERE ss.id IS NULL
    ORDER BY jofss."journeyOptionFlowId" ASC
  `;
  console.log(`1️⃣ Registros órfãos reais no banco (sem SubSentiment correspondente): ${orphans.length}`);
  for (const o of orphans) {
    console.log(`   ⚠️ JOF ${o.journeyOptionFlowId} -> subSentimentId=${o.subSentimentId} (weight=${o.weight})`);
  }

  // 2. Verificar contagem de SubSentiments por JOF diretamente no banco
  const counts: Array<{
    jofId: number;
    text: string;
    totalRows: bigint;
    validRows: bigint;
    uniqueNames: bigint;
    movieCount: bigint;
  }> = await prisma.$queryRaw`
    SELECT 
      jof.id as "jofId",
      jof.text,
      COUNT(jofss."subSentimentId") as "totalRows",
      COUNT(ss.id) as "validRows",
      COUNT(DISTINCT LOWER(TRIM(ss.name))) as "uniqueNames",
      (SELECT COUNT(*) FROM "MovieSuggestionFlow" msf WHERE msf."journeyOptionFlowId" = jof.id) as "movieCount"
    FROM "JourneyOptionFlow" jof
    LEFT JOIN "JourneyOptionFlowSubSentiment" jofss ON jofss."journeyOptionFlowId" = jof.id
    LEFT JOIN "SubSentiment" ss ON ss.id = jofss."subSentimentId"
    GROUP BY jof.id, jof.text
    HAVING COUNT(jofss."subSentimentId") != 12 OR COUNT(DISTINCT LOWER(TRIM(ss.name))) != 12
    ORDER BY COUNT(jofss."subSentimentId") DESC, jof.id ASC
  `;

  console.log(`\n2️⃣ JOFs no banco com quantidade diferente de 12 SubSentiments (${counts.length} JOFs):`);
  console.table(
    counts.map(c => ({
      jofId: c.jofId,
      text: c.text,
      totalRows: Number(c.totalRows),
      validRows: Number(c.validRows),
      uniqueNames: Number(c.uniqueNames),
      movies: Number(c.movieCount)
    }))
  );
}

main()
  .catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


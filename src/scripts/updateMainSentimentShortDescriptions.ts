import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const updates: { id: number; shortDescription: string }[] = [
  { id: 13, shortDescription: 'De bem com a vida, leve e positivo' },
  { id: 14, shortDescription: 'Pensativo, sensível ou mais quieto hoje' },
  { id: 15, shortDescription: 'Em paz, tranquilo e sem pressa' },
  { id: 16, shortDescription: 'Mente acelerada, inquieto ou tenso' },
  { id: 17, shortDescription: 'Cheio de energia, entusiasmo e disposição' },
  { id: 18, shortDescription: 'Sem energia, esgotado e pedindo pausa' },
];

async function main() {
  console.log('🔄 1. Fazendo backup da tabela MainSentiment...');
  const sentiments = await prisma.mainSentiment.findMany({
    orderBy: { id: 'asc' },
  });

  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "MainSentiment_backup";`);
  await prisma.$executeRawUnsafe(`CREATE TABLE "MainSentiment_backup" AS SELECT * FROM "MainSentiment";`);
  console.log(`✅ Tabela "MainSentiment_backup" criada no banco (${sentiments.length} registros).`);

  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFile = path.join(backupDir, 'main-sentiments-backup.json');
  fs.writeFileSync(
    backupFile,
    JSON.stringify({ createdAt: new Date().toISOString(), mainSentiments: sentiments }, null, 2)
  );
  console.log(`✅ Backup JSON de MainSentiment salvo em: ${backupFile}\n`);

  console.log('🚀 2. Atualizando MainSentiment.shortDescription (6 registros)...');
  for (const item of updates) {
    await prisma.mainSentiment.update({
      where: { id: item.id },
      data: { shortDescription: item.shortDescription },
    });
  }
  console.log('✅ Todos os 6 registros de MainSentiment foram atualizados com sucesso!');
}

main()
  .catch((err) => {
    console.error('❌ Erro durante a atualização:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


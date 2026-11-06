import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando backup de JourneyStepFlow e JourneyOptionFlow...');

  // 1. Buscar registros atuais
  const steps = await prisma.journeyStepFlow.findMany({
    orderBy: { id: 'asc' },
  });

  const options = await prisma.journeyOptionFlow.findMany({
    orderBy: { id: 'asc' },
  });

  console.log(`📊 Encontrados: ${steps.length} registros em JourneyStepFlow e ${options.length} registros em JourneyOptionFlow.`);

  // 2. Criar tabelas de backup no banco de dados
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "JourneyStepFlow_backup";`);
  await prisma.$executeRawUnsafe(`CREATE TABLE "JourneyStepFlow_backup" AS SELECT * FROM "JourneyStepFlow";`);
  console.log('✅ Tabela "JourneyStepFlow_backup" criada no banco com sucesso.');

  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "JourneyOptionFlow_backup";`);
  await prisma.$executeRawUnsafe(`CREATE TABLE "JourneyOptionFlow_backup" AS SELECT * FROM "JourneyOptionFlow";`);
  console.log('✅ Tabela "JourneyOptionFlow_backup" criada no banco com sucesso.');

  // 3. Salvar backup local em JSON
  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, 'journey-flows-mobile-backup.json');
  fs.writeFileSync(
    backupFilePath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        journeyStepFlow: steps,
        journeyOptionFlow: options,
      },
      null,
      2
    )
  );
  console.log(`✅ Backup JSON salvo em: ${backupFilePath}`);
}

main()
  .catch((err) => {
    console.error('❌ Erro no backup:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


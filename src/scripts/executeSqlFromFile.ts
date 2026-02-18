

// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { prismaApp as prisma } from '../prisma';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const filePathArg = process.argv[2];
  if (!filePathArg) {
    console.error('Por favor, forneça o caminho para o arquivo SQL.');
    console.error('Uso: npx ts-node src/scripts/executeSqlFromFile.ts <caminho_para_o_arquivo.sql>');
    process.exit(1);
  }

  const filePath = path.resolve(filePathArg);

  try {
    const sqlContent = await fs.readFile(filePath, 'utf-8');

    const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);

    if (statements.length === 0) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        successCount++;
      } catch (e) {
        const error = e as Error;
        const prismaError = error.message ? error.message.split('\n').slice(-1)[0] : String(error);
        console.error(`❌ Erro SQL: ${prismaError} | Comando: ${statement.substring(0, 80)}...`);
        errorCount++;
      }
    }

    const status = errorCount > 0 ? `⚠️ ${errorCount} erro(s)` : '✅ Todos ok';
    console.log(`💾 INSERTs: ${successCount}/${statements.length} executados | ${status}`);

    // Limpar o arquivo após a execução para evitar conflitos futuros
    try {
      await fs.writeFile(filePath, '', 'utf-8');
      console.log(`🧹 Arquivo ${path.basename(filePath)} limpo com sucesso.`);
    } catch (cleanupError) {
      console.warn(`⚠️ Aviso: Não foi possível limpar o arquivo ${path.basename(filePath)}`);
    }

  } catch (e) {
    const error = e as Error;
    console.error('❌ Erro fatal ao ler o arquivo ou conectar ao banco:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


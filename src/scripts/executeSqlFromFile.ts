

import prisma from '../prisma';
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
    console.log(`Lendo SQL de: ${filePath}`);
    const sqlContent = await fs.readFile(filePath, 'utf-8');

    const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);

    if (statements.length === 0) {
      console.log('Nenhum comando SQL encontrado no arquivo.');
      return;
    }

    console.log(`Encontrados ${statements.length} comandos para executar.`);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        console.log(`Executando: ${statement.substring(0, 100)}...`);
        const affectedRows = await prisma.$executeRawUnsafe(statement);
        console.log(`-> ✅ Sucesso. ${affectedRows} linhas afetadas.`);
        successCount++;
      } catch (e) {
        const error = e as Error;
        console.error(`-> ❌ Erro ao executar o comando: ${statement.substring(0, 100)}...`);
        if (error.message) {
            const prismaError = error.message.split('\n').slice(-1)[0];
            console.error(`   Erro: ${prismaError}`);
        } else {
            console.error(`   Erro: ${error}`);
        }
        errorCount++;
      }
    }

    console.log('\n--- Resumo da Execução ---');
    console.log(`Comandos executados com sucesso: ${successCount}`);
    console.log(`Comandos com erro: ${errorCount}`);
    console.log('--------------------------');

  } catch (e) {
    const error = e as Error;
    console.error('❌ Erro fatal ao ler o arquivo ou conectar ao banco:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import archiver from 'archiver';

const prisma = new PrismaClient();

interface BackupData {
  movies: any[];
  genres: any[];
  mainSentiments: any[];
  subSentiments: any[];
  movieSentiments: any[];
  journeyFlows: any[];
  journeyStepFlows: any[];
  journeyOptionFlows: any[];
  movieSuggestionFlows: any[];
}

function generateTimestamp(): string {
  const now = new Date();
  return now.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  .replace(/\//g, '-');
}

async function backupDatabase() {
  console.log('Iniciando backup do banco de dados...');
  
  try {
    // Criar diretório de backup se não existir
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Timestamp para o nome do arquivo
    const timestamp = generateTimestamp();
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    // Criar diretório para este backup
    fs.mkdirSync(backupPath);

    // Buscar dados de todas as tabelas
    const backupData: BackupData = {
      movies: await prisma.movie.findMany(),
      genres: await prisma.genre.findMany(),
      mainSentiments: await prisma.mainSentiment.findMany(),
      subSentiments: await prisma.subSentiment.findMany(),
      movieSentiments: await prisma.movieSentiment.findMany(),
      journeyFlows: await prisma.journeyFlow.findMany(),
      journeyStepFlows: await prisma.journeyStepFlow.findMany(),
      journeyOptionFlows: await prisma.journeyOptionFlow.findMany(),
      movieSuggestionFlows: await prisma.movieSuggestionFlow.findMany()
    };

    // Salvar cada tabela em um arquivo JSON
    for (const [tableName, data] of Object.entries(backupData)) {
      const jsonPath = path.join(backupPath, `${tableName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      console.log(`✅ Backup da tabela ${tableName} concluído`);
    }

    // Criar arquivo CSV com resumo
    const csvWriter = createObjectCsvWriter({
      path: path.join(backupPath, 'summary.csv'),
      header: [
        { id: 'table', title: 'Tabela' },
        { id: 'records', title: 'Registros' },
        { id: 'lastUpdate', title: 'Última Atualização' }
      ]
    });

    const summary = Object.entries(backupData).map(([table, data]) => ({
      table,
      records: data.length,
      lastUpdate: new Date().toISOString()
    }));

    await csvWriter.writeRecords(summary);
    console.log('✅ Resumo em CSV gerado');

    // Criar arquivo ZIP com todos os backups
    const output = fs.createWriteStream(`${backupPath}.zip`);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Máxima compressão
    });

    output.on('close', () => {
      console.log(`✅ Arquivo ZIP criado: ${archive.pointer()} bytes`);
      // Remover diretório temporário
      fs.rmSync(backupPath, { recursive: true, force: true });
    });

    archive.on('error', (err: Error) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(backupPath, false);
    await archive.finalize();

    console.log('\n=== Resumo do Backup ===');
    summary.forEach(item => {
      console.log(`${item.table}: ${item.records} registros`);
    });
    console.log(`\nBackup completo salvo em: ${backupPath}.zip`);

  } catch (error) {
    console.error('❌ Erro durante o backup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar backup
backupDatabase(); 
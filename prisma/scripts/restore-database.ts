import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const execAsync = promisify(exec);

// Carrega as variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function restoreDatabase() {
  try {
    // Obtém a URL do banco de dados local
    const localDatabaseUrl = process.env.LOCAL_DATABASE_URL;
    
    if (!localDatabaseUrl) {
      throw new Error('LOCAL_DATABASE_URL não encontrada nas variáveis de ambiente');
    }

    // Diretório de backups
    const backupDir = path.resolve(__dirname, '../backups');
    
    // Lista todos os arquivos de backup
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .sort()
      .reverse();

    if (backupFiles.length === 0) {
      throw new Error('Nenhum arquivo de backup encontrado');
    }

    // Usa o backup mais recente
    const latestBackup = path.join(backupDir, backupFiles[0]);
    console.log(`Usando o backup mais recente: ${latestBackup}`);

    // Comando para restaurar o backup usando psql do container
    const command = `docker exec -i fav_movies_postgres psql -U postgres -d fav_movies < "${latestBackup}"`;

    console.log('Iniciando restauração do banco de dados...');
    await execAsync(command);
    console.log('Restauração concluída com sucesso!');

  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    process.exit(1);
  }
}

// Executa a restauração
restoreDatabase(); 
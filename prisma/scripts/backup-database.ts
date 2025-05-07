import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const execAsync = promisify(exec);

// Carrega as variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function cleanDatabaseUrl(url: string): string {
  // Remove parâmetros de conexão que o pg_dump não suporta
  return url.split('?')[0];
}

async function backupDatabase() {
  try {
    // Obtém a URL direta do banco de dados do Supabase
    const databaseUrl = process.env.DIRECT_URL;
    
    if (!databaseUrl) {
      throw new Error('DIRECT_URL não encontrada nas variáveis de ambiente');
    }

    // Limpa a URL de conexão
    const cleanUrl = cleanDatabaseUrl(databaseUrl);

    // Cria o diretório de backup se não existir
    const backupDir = path.resolve(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Gera o nome do arquivo de backup com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    // Comando para fazer o backup usando pg_dump do container
    const command = `docker exec fav_movies_postgres pg_dump "${cleanUrl}" --no-owner --no-acl --clean --if-exists --schema-only > "${backupFile}" && docker exec fav_movies_postgres pg_dump "${cleanUrl}" --no-owner --no-acl --data-only >> "${backupFile}"`;

    console.log('Iniciando backup do banco de dados...');
    await execAsync(command);
    console.log(`Backup concluído com sucesso! Arquivo salvo em: ${backupFile}`);

  } catch (error) {
    console.error('Erro ao fazer backup:', error);
    process.exit(1);
  }
}

// Executa o backup
backupDatabase(); 
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  try {
    console.log('🚀 Iniciando migração dos gêneros e SubSentiments...');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'add_genre_sub_sentiment_relation.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar o SQL
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      throw error;
    }

    console.log('✅ Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  }
}

// Executar o script
if (require.main === module) {
  executeMigration();
} 
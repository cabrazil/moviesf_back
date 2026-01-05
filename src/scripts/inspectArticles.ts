
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
if (!process.env.BLOG_DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath });
}

const connectionString = process.env.BLOG_DATABASE_URL;
if (!connectionString) {
  console.error('❌ Erro: BLOG_DATABASE_URL não definido.');
  process.exit(1);
}

const client = new Client({ connectionString });

async function inspectArticles() {
  try {
    await client.connect();
    console.log('✅ Conectado.');

    const slug = 'filmes-reinventam-sua-realidade';
    console.log(`\n🔍 Artigo: ${slug}`);
    const res = await client.query('SELECT content FROM "Article" WHERE slug = $1', [slug]);

    if (res.rows.length === 0) {
      console.log('❌ Não encontrado.');
    } else {
      const content = res.rows[0].content;
      const fs = require('fs');
      fs.writeFileSync('article_dump.txt', content);
      console.log(`Conteúdo salvo em article_dump.txt (${content.length} caracteres)`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

inspectArticles();

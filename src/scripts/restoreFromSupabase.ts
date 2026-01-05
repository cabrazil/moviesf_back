
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load Target Env (VPS)
console.log('📂 Current working directory:', process.cwd());
const envLocalPath = path.resolve(process.cwd(), '.env.local');
console.log('📄 Tentando carregar:', envLocalPath);
dotenv.config({ path: envLocalPath });
if (!process.env.BLOG_DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath });
}

const targetUrl = process.env.BLOG_DATABASE_URL;
if (!targetUrl) {
  console.error('❌ Erro: BLOG_DATABASE_URL (Target) não definido.');
  process.exit(1);
}

// Source URL from user request
// User connection string: postgresql://postgres.dadrodpfylduydjbdxpy:Supa@2605ab@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
// Note: Password 'Supa@2605ab' contains '@', which might confuse parser. Encoding to 'Supa%402605ab'.
const sourceUrl = "postgresql://postgres.dadrodpfylduydjbdxpy:Supa%402605ab@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

async function restore() {
  const sourceClient = new Client({ connectionString: sourceUrl });
  const targetClient = new Client({ connectionString: targetUrl });

  try {
    console.log("🔌 Connecting to Source (Supabase)...");
    await sourceClient.connect();
    console.log("✅ Connected to Source.");

    // Fetch
    const articleId = 79;
    console.log(`📥 Fetching content for Article ID ${articleId}...`);
    const res = await sourceClient.query('SELECT content FROM "Article" WHERE id = $1', [articleId]);

    if (res.rows.length === 0) {
      throw new Error("❌ Article 79 not found in Source database.");
    }

    const content = res.rows[0].content;
    console.log(`📦 Fetched content from source. Length: ${content.length} chars.`);
    // console.log("Sample start:", content.substring(0, 100));

    console.log("🔌 Connecting to Target (VPS)...");
    await targetClient.connect();
    console.log("✅ Connected to Target.");

    // Update
    console.log(`📤 Updating Article ID ${articleId} in Target...`);
    await targetClient.query('UPDATE "Article" SET content = $1 WHERE id = $2', [content, articleId]);
    console.log("✨ Successfully restored Article 79 content in Target database!");

  } catch (e) {
    console.error("❌ Error during restoration:", e);
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

restore();

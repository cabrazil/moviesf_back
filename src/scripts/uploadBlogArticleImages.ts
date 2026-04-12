/// <reference types="node" />
// Script para converter .jpg/.jpeg para .webp e fazer upload para o Supabase
// Bucket: movie-images | Pasta: blog-articles
// Uso: npx ts-node src/scripts/uploadBlogArticleImages.ts <imagem1> [imagem2] [imagem3]
import './scripts-helper';

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SUPABASE_URL         = process.env.SUPABASE_BLOG_URL          || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_BLOG_SERVICE_KEY  || '';
const BUCKET_NAME          = 'movie-images';
const DEST_FOLDER          = 'blog-articles';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis SUPABASE_BLOG_URL e SUPABASE_BLOG_SERVICE_KEY não encontradas.');
  console.error('   Execute com: NODE_ENV=production npx ts-node src/scripts/uploadBlogArticleImages.ts ...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── tipos de arquivo aceitos ───────────────────────────────────────────────
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// ─── função principal de upload ──────────────────────────────────────────────
async function uploadImage(localPath: string): Promise<string | null> {
  const ext = path.extname(localPath).toLowerCase();

  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    console.warn(`⚠️  Ignorado (extensão não suportada): ${localPath}`);
    return null;
  }

  if (!fs.existsSync(localPath)) {
    console.error(`❌ Arquivo não encontrado: ${localPath}`);
    return null;
  }

  try {
    const originalBuffer = fs.readFileSync(localPath);
    const originalKB     = (originalBuffer.length / 1024).toFixed(1);

    // Converter para WebP
    console.log(`\n🖼️  ${path.basename(localPath)}  (${originalKB} KB)`);
    console.log(`   🎨 Convertendo para WebP...`);

    const webpBuffer = await sharp(originalBuffer)
      .webp({ quality: 85, effort: 6 })
      .toBuffer();

    const webpKB   = (webpBuffer.length / 1024).toFixed(1);
    const savings  = ((1 - webpBuffer.length / originalBuffer.length) * 100).toFixed(1);
    console.log(`   💾 ${originalKB} KB → ${webpKB} KB (redução: ${savings}%)`);

    // Nome de destino: mantém o nome original mas com extensão .webp
    const baseName    = path.basename(localPath, ext);
    const destPath    = `${DEST_FOLDER}/${baseName}.webp`;

    console.log(`   📤 Enviando para ${BUCKET_NAME}/${destPath}...`);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(destPath, webpBuffer, {
        contentType:  'image/webp',
        cacheControl: '31536000',
        upsert:       true          // sobrescreve se já existir
      });

    if (error) {
      console.error(`   ❌ Erro no upload: ${error.message}`);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(destPath);

    console.log(`   ✅ URL pública:`);
    console.log(`      ${publicUrlData.publicUrl}`);

    return publicUrlData.publicUrl;

  } catch (err) {
    console.error(`   ❌ Erro inesperado em ${localPath}:`, err);
    return null;
  }
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));

  if (args.length === 0) {
    console.log(`
📤 Upload de Imagens para o Supabase (bucket: ${BUCKET_NAME}/blog-articles)

Uso:
  NODE_ENV=production npx ts-node src/scripts/uploadBlogArticleImages.ts <img1.jpg> [img2.jpg] ...

Exemplos:
  npx ts-node src/scripts/uploadBlogArticleImages.ts ./capa.jpg
  npx ts-node src/scripts/uploadBlogArticleImages.ts ./foto1.jpeg ./foto2.jpg ./banner.png

As imagens são convertidas para .webp antes do upload.
`);
    process.exit(0);
  }

  console.log(`\n🚀 Iniciando upload de ${args.length} imagem(ns)...\n`);

  const results: { file: string; url: string | null }[] = [];

  for (const filePath of args) {
    const url = await uploadImage(filePath);
    results.push({ file: path.basename(filePath), url });
  }

  // Resumo final
  console.log('\n─────────────────────────────────────────────');
  console.log('📋 Resumo:');
  const ok  = results.filter(r => r.url).length;
  const err = results.filter(r => !r.url).length;

  results.forEach(r => {
    if (r.url) {
      console.log(`  ✅ ${r.file}`);
      console.log(`     ${r.url}`);
    } else {
      console.log(`  ❌ ${r.file}  (falhou)`);
    }
  });

  console.log(`\n  Total: ${ok} sucesso(s) | ${err} falha(s)`);
  console.log('─────────────────────────────────────────────\n');

  if (err > 0) process.exit(1);
}

main();

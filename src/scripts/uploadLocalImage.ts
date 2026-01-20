/// <reference types="node" />
// Script helper para fazer upload de imagens locais para o Supabase
import './scripts-helper';

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SUPABASE_URL = process.env.SUPABASE_BLOG_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_BLOG_SERVICE_KEY || '';
const BUCKET_NAME = 'movie-images';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function uploadLocalImage(localPath: string, destinationName?: string): Promise<string | null> {
  try {
    console.log(`📤 Fazendo upload: ${localPath}`);

    // Ler arquivo local
    const fileBuffer = fs.readFileSync(localPath);

    // Converter para WebP se não for
    let uploadBuffer = fileBuffer;
    let contentType = 'image/jpeg';

    if (!localPath.endsWith('.webp')) {
      console.log(`  🎨 Convertendo para WebP...`);
      uploadBuffer = await sharp(fileBuffer)
        .webp({ quality: 85, effort: 6 })
        .toBuffer();
      contentType = 'image/webp';

      const savings = ((1 - uploadBuffer.length / fileBuffer.length) * 100).toFixed(1);
      console.log(`  💾 ${(fileBuffer.length / 1024).toFixed(1)}KB → ${(uploadBuffer.length / 1024).toFixed(1)}KB (${savings}%)`);
    }

    // Gerar nome do arquivo
    const filename = destinationName || `blog-local/${path.basename(localPath).replace(/\.(jpg|jpeg|png)$/i, '.webp')}`;

    // Upload
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, uploadBuffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true
      });

    if (error) {
      console.error(`❌ Erro: ${error.message}`);
      return null;
    }

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    console.log(`✅ URL: ${publicUrlData.publicUrl}\n`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`❌ Erro ao processar ${localPath}:`, error);
    return null;
  }
}

// Uso:
// NODE_ENV=production npx ts-node src/scripts/uploadLocalImage.ts /caminho/para/imagem.jpg [nome-destino.webp]

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📤 Upload de Imagem Local para Supabase

Uso:
  NODE_ENV=production npx ts-node src/scripts/uploadLocalImage.ts <caminho-local> [nome-destino]

Exemplos:
  npx ts-node src/scripts/uploadLocalImage.ts ./public/blog/articles/2025/outubro/imagem.jpg
  npx ts-node src/scripts/uploadLocalImage.ts ./imagem.jpg blog-local/minha-imagem.webp

A imagem será convertida para WebP automaticamente.
    `);
    process.exit(0);
  }

  const localPath = args[0];
  const destinationName = args[1];

  if (!fs.existsSync(localPath)) {
    console.error(`❌ Arquivo não encontrado: ${localPath}`);
    process.exit(1);
  }

  const url = await uploadLocalImage(localPath, destinationName);

  if (url) {
    console.log(`\n🎉 Sucesso! Use esta URL no seu artigo:\n${url}`);
  } else {
    console.error(`\n❌ Falha no upload`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { uploadLocalImage };

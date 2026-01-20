/// <reference types="node" />
// Script para migrar imagens locais mantendo a estrutura de pastas
import './scripts-helper';

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.BLOG_DATABASE_URL
    }
  }
});

const SUPABASE_URL = process.env.SUPABASE_BLOG_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_BLOG_SERVICE_KEY || '';
const BUCKET_NAME = 'movie-images';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Article {
  id: number;
  title: string;
  content: string;
}

// Função para extrair caminhos de imagens locais
function extractLocalImagePaths(html: string): string[] {
  // Regex para capturar: /images/blog/articles/... ou blog/articles/...
  const regex = /<img[^>]+src="(\/images\/blog\/articles\/[^"]+|blog\/articles\/[^"]+)"/gi;
  const paths: string[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    paths.push(match[1]);
  }

  return paths;
}

// Função para fazer upload mantendo estrutura de pastas
async function uploadLocalImage(
  localPath: string,
  frontendBasePath: string
): Promise<string | null> {
  try {
    // Remover /images/ do início se existir
    const cleanPath = localPath.replace(/^\/images\//, '');

    // Caminho completo no filesystem
    const fullPath = path.join(frontendBasePath, localPath.replace(/^\//, ''));

    console.log(`  📥 Lendo: ${fullPath}`);

    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ Arquivo não encontrado: ${fullPath}`);
      return null;
    }

    // Ler arquivo
    const fileBuffer = fs.readFileSync(fullPath);

    // Converter para WebP
    console.log(`  🎨 Convertendo para WebP...`);
    const webpBuffer = await sharp(fileBuffer)
      .webp({ quality: 85, effort: 6 })
      .toBuffer();

    const savings = ((1 - webpBuffer.length / fileBuffer.length) * 100).toFixed(1);
    console.log(`  💾 ${(fileBuffer.length / 1024).toFixed(1)}KB → ${(webpBuffer.length / 1024).toFixed(1)}KB (${savings}%)`);

    // Manter estrutura de pastas, mas trocar extensão para .webp
    const supabasePath = cleanPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');

    console.log(`  📤 Upload: ${supabasePath}`);

    // Upload
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(supabasePath, webpBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true
      });

    if (error) {
      console.error(`  ❌ Erro: ${error.message}`);
      return null;
    }

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(supabasePath);

    console.log(`  ✅ URL: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`  ❌ Erro ao processar ${localPath}:`, error);
    return null;
  }
}

// Função para migrar imagens locais de um artigo
async function migrateLocalImages(
  article: Article,
  frontendBasePath: string
): Promise<void> {
  console.log(`\n📝 Processando: ${article.title}`);

  const localPaths = extractLocalImagePaths(article.content);

  if (localPaths.length === 0) {
    console.log(`  ℹ️  Nenhuma imagem local encontrada`);
    return;
  }

  console.log(`  🖼️  Encontradas ${localPaths.length} imagem(ns) local(is)`);

  let updatedContent = article.content;
  let successCount = 0;

  for (const localPath of localPaths) {
    console.log(`\n  Processando: ${localPath}`);

    const newUrl = await uploadLocalImage(localPath, frontendBasePath);

    if (newUrl) {
      // Substituir a URL antiga pela nova
      updatedContent = updatedContent.replace(
        new RegExp(localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        newUrl
      );
      successCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (successCount > 0) {
    await prisma.$executeRaw`
      UPDATE "Article"
      SET content = ${updatedContent}
      WHERE id = ${article.id}
    `;
    console.log(`\n  ✅ Artigo atualizado: ${successCount} imagem(ns) migrada(s)`);
  }
}

async function main() {
  try {
    console.log('🚀 === MIGRAÇÃO DE IMAGENS LOCAIS ===\n');

    const args = process.argv.slice(2);
    const frontendPathArg = args.find(a => a.startsWith('--frontend='));
    const articleIdArg = args.find(a => a.startsWith('--article='));

    if (!frontendPathArg) {
      console.log(`
❌ Erro: Caminho do frontend não especificado

Uso:
  NODE_ENV=production npx ts-node src/scripts/migrateLocalImages.ts --frontend=/caminho/para/moviesf_front [--article=123]

Exemplo:
  NODE_ENV=production npx ts-node src/scripts/migrateLocalImages.ts --frontend=/home/cabrazil/newprojs/fav_movies/moviesf_front

Isso vai:
  1. Buscar imagens em /images/blog/articles/ ou blog/articles/
  2. Fazer upload mantendo a estrutura de pastas
  3. Converter para WebP
  4. Substituir as URLs no HTML
      `);
      process.exit(1);
    }

    const frontendBasePath = frontendPathArg.split('=')[1];
    const articleId = articleIdArg ? parseInt(articleIdArg.split('=')[1]) : undefined;

    if (!fs.existsSync(frontendBasePath)) {
      console.error(`❌ Caminho do frontend não existe: ${frontendBasePath}`);
      process.exit(1);
    }

    // Buscar artigos com imagens locais
    let query = `
      SELECT id, title, content
      FROM "Article"
      WHERE (content LIKE '%/images/blog/articles/%' OR content LIKE '%blog/articles/%')
    `;

    if (articleId) {
      query += ` AND id = ${articleId}`;
    }

    const articles = await prisma.$queryRawUnsafe<Article[]>(query);

    console.log(`📊 Encontrados ${articles.length} artigo(s) com imagens locais\n`);

    for (const article of articles) {
      await migrateLocalImages(article, frontendBasePath);
    }

    console.log('\n📊 === RESUMO ===');
    console.log(`📝 Artigos processados: ${articles.length}`);
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    console.log(`🌐 Estrutura mantida: blog/articles/YYYY/mes/arquivo.webp`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { migrateLocalImages };

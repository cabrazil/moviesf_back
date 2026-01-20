/// <reference types="node" />
// Script para migrar imagens do TMDB dentro do conteúdo HTML dos artigos
import './scripts-helper';

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import sharp from 'sharp';

// Usar o Prisma Client com a URL do banco de blog
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.BLOG_DATABASE_URL
    }
  }
});

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_BLOG_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_BLOG_SERVICE_KEY || '';
const BUCKET_NAME = 'movie-images';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
}

// Função para baixar imagem
async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error(`❌ Erro ao baixar imagem: ${url}`, error);
    throw error;
  }
}

// Função para fazer upload da imagem para o Supabase
async function uploadToSupabase(
  buffer: Buffer,
  filename: string,
  contentType: string = 'image/webp'
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType,
        cacheControl: '31536000', // 1 ano
        upsert: true
      });

    if (error) {
      console.error(`❌ Erro ao fazer upload: ${filename}`, error);
      return null;
    }

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`❌ Erro no upload: ${filename}`, error);
    return null;
  }
}

// Função para processar uma imagem
async function processImage(
  tmdbUrl: string,
  articleSlug: string,
  imageIndex: number
): Promise<string | null> {
  try {
    console.log(`    📥 Baixando: ${tmdbUrl.substring(0, 80)}...`);

    // Baixar imagem
    const imageBuffer = await downloadImage(tmdbUrl);

    // Converter para WebP
    const webpBuffer = await sharp(imageBuffer)
      .webp({ quality: 85, effort: 6 })
      .toBuffer();

    // Calcular economia
    const originalSize = imageBuffer.length;
    const webpSize = webpBuffer.length;
    const savings = ((1 - webpSize / originalSize) * 100).toFixed(1);
    console.log(`    💾 ${(originalSize / 1024).toFixed(1)}KB → ${(webpSize / 1024).toFixed(1)}KB (${savings}%)`);

    // Gerar nome do arquivo
    const timestamp = Date.now();
    const filename = `blog-content/${articleSlug}_img${imageIndex}_${timestamp}.webp`;

    // Upload para Supabase
    const supabaseUrl = await uploadToSupabase(webpBuffer, filename);

    if (supabaseUrl) {
      console.log(`    ✅ Upload: ${supabaseUrl.substring(0, 80)}...`);
      return supabaseUrl;
    }

    return null;
  } catch (error) {
    console.error(`    ❌ Erro ao processar imagem:`, error);
    return null;
  }
}

// Função para extrair URLs de imagens do TMDB do HTML
function extractTmdbImageUrls(html: string): string[] {
  const regex = /<img[^>]+src="(https:\/\/media\.themoviedb\.org\/[^"]+)"/gi;
  const urls: string[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

// Função para migrar imagens de um artigo
async function migrateArticleContentImages(article: Article): Promise<void> {
  console.log(`\n📝 Processando: ${article.title}`);

  // Extrair URLs de imagens do TMDB
  const tmdbUrls = extractTmdbImageUrls(article.content);

  if (tmdbUrls.length === 0) {
    console.log(`  ℹ️  Nenhuma imagem do TMDB encontrada no conteúdo`);
    return;
  }

  console.log(`  🖼️  Encontradas ${tmdbUrls.length} imagem(ns) do TMDB`);

  let updatedContent = article.content;
  let successCount = 0;
  let errorCount = 0;

  // Processar cada imagem
  for (let i = 0; i < tmdbUrls.length; i++) {
    const tmdbUrl = tmdbUrls[i];
    console.log(`  \n  [${i + 1}/${tmdbUrls.length}]`);

    try {
      const newUrl = await processImage(tmdbUrl, article.slug, i + 1);

      if (newUrl) {
        // Substituir a URL antiga pela nova no HTML
        updatedContent = updatedContent.replace(tmdbUrl, newUrl);
        successCount++;
      } else {
        console.log(`    ⚠️  Falha ao migrar, mantendo URL original`);
        errorCount++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`    ❌ Erro ao processar imagem ${i + 1}:`, error);
      errorCount++;
    }
  }

  // Atualizar banco de dados se houve mudanças
  if (successCount > 0) {
    await prisma.$executeRaw`
      UPDATE "Article"
      SET content = ${updatedContent}
      WHERE id = ${article.id}
    `;
    console.log(`\n  ✅ Artigo atualizado: ${successCount} imagem(ns) migrada(s), ${errorCount} erro(s)`);
  } else {
    console.log(`\n  ⚠️  Nenhuma imagem foi migrada`);
  }
}

// Função principal
async function main(): Promise<void> {
  try {
    console.log('🚀 === MIGRAÇÃO DE IMAGENS DO CONTEÚDO DOS ARTIGOS ===\n');

    // Buscar argumentos
    const args = process.argv.slice(2);
    const limitArg = args.find(a => a.startsWith('--limit='));
    const articleIdArg = args.find(a => a.startsWith('--article='));
    const testMode = args.includes('--test');

    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : (testMode ? 3 : undefined);
    const articleId = articleIdArg ? parseInt(articleIdArg.split('=')[1]) : undefined;

    // Buscar artigos com imagens do TMDB no conteúdo
    let query = `
      SELECT id, title, slug, content
      FROM "Article"
      WHERE "blogId" = 3
        AND published = true
        AND content LIKE '%media.themoviedb.org%'
    `;

    if (articleId) {
      query += ` AND id = ${articleId}`;
    }

    query += ` ORDER BY "createdAt" DESC`;

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const articles = await prisma.$queryRawUnsafe<Article[]>(query);

    console.log(`📊 Encontrados ${articles.length} artigo(s) com imagens do TMDB no conteúdo\n`);

    if (testMode) {
      console.log('🧪 MODO DE TESTE - Processando apenas os primeiros 3 artigos\n');
    }

    let totalSuccess = 0;
    let totalErrors = 0;
    let totalImages = 0;

    for (const article of articles) {
      try {
        const imagesBefore = extractTmdbImageUrls(article.content).length;
        await migrateArticleContentImages(article);
        totalImages += imagesBefore;
      } catch (error) {
        console.error(`❌ Erro ao processar artigo ${article.title}:`, error);
        totalErrors++;
      }
    }

    console.log('\n📊 === RESUMO ===');
    console.log(`📝 Artigos processados: ${articles.length}`);
    console.log(`🖼️  Total de imagens encontradas: ${totalImages}`);
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    console.log(`🌐 URL Base: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/blog-content/`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export { migrateArticleContentImages };

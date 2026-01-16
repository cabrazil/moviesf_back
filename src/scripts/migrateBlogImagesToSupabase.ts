/// <reference types="node" />
// Script para migrar imagens de artigos do blog do TMDB para o Supabase Storage
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
  imageUrl: string | null;
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

// Função para processar uma imagem de artigo
async function processArticleImage(
  tmdbUrl: string,
  articleSlug: string
): Promise<string | null> {
  try {
    console.log(`  📥 Baixando imagem: ${tmdbUrl}`);

    // Baixar imagem
    const imageBuffer = await downloadImage(tmdbUrl);

    // Converter para WebP
    console.log(`  🎨 Convertendo para WebP...`);
    const webpBuffer = await sharp(imageBuffer)
      .webp({ quality: 85, effort: 6 })
      .toBuffer();

    // Calcular economia
    const originalSize = imageBuffer.length;
    const webpSize = webpBuffer.length;
    const savings = ((1 - webpSize / originalSize) * 100).toFixed(1);
    console.log(`  💾 Tamanho: ${(originalSize / 1024).toFixed(1)}KB → ${(webpSize / 1024).toFixed(1)}KB (economia de ${savings}%)`);

    // Gerar nome do arquivo
    const timestamp = Date.now();
    const filename = `blog-articles/${articleSlug}_${timestamp}.webp`;

    // Upload para Supabase
    console.log(`  📤 Fazendo upload: ${filename}`);
    const supabaseUrl = await uploadToSupabase(webpBuffer, filename);

    if (supabaseUrl) {
      console.log(`  ✅ Upload concluído: ${supabaseUrl}`);
      return supabaseUrl;
    }

    return null;
  } catch (error) {
    console.error(`  ❌ Erro ao processar imagem:`, error);
    return null;
  }
}

// Função para migrar imagens de um artigo
async function migrateArticleImage(article: Article): Promise<void> {
  console.log(`\n📝 Processando: ${article.title}`);

  if (!article.imageUrl) {
    console.log(`  ⚠️  Sem imagem`);
    return;
  }

  // Verificar se é uma URL do TMDB
  if (!article.imageUrl.includes('media.themoviedb.org')) {
    console.log(`  ℹ️  Imagem não é do TMDB, pulando: ${article.imageUrl}`);
    return;
  }

  // Processar imagem
  const newImageUrl = await processArticleImage(article.imageUrl, article.slug);

  if (newImageUrl) {
    // Atualizar banco de dados usando SQL direto
    await prisma.$executeRaw`
      UPDATE "Article"
      SET "imageUrl" = ${newImageUrl}
      WHERE id = ${article.id}
    `;
    console.log(`✅ Banco de dados atualizado para: ${article.title}`);
  } else {
    console.log(`⚠️  Falha ao migrar imagem, mantendo URL original`);
  }

  // Rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Função principal
async function main(): Promise<void> {
  try {
    console.log('🚀 === MIGRAÇÃO DE IMAGENS DE ARTIGOS PARA SUPABASE ===\n');

    // Buscar argumentos
    const args = process.argv.slice(2);
    const limitArg = args.find(a => a.startsWith('--limit='));
    const testMode = args.includes('--test');

    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : (testMode ? 5 : undefined);

    // Buscar artigos com imagens do TMDB usando SQL direto
    // Usar $queryRawUnsafe para poder usar LIMIT dinâmico
    const query = `
      SELECT id, title, slug, "imageUrl"
      FROM "Article"
      WHERE "blogId" = 3
        AND published = true
        AND "imageUrl" LIKE '%media.themoviedb.org%'
      ORDER BY "createdAt" DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `;

    const articles = await prisma.$queryRawUnsafe<Article[]>(query);

    console.log(`📊 Encontrados ${articles.length} artigos com imagens do TMDB\n`);

    if (testMode) {
      console.log('🧪 MODO DE TESTE - Processando apenas os primeiros 5 artigos\n');
    }

    let successCount = 0;
    let errorCount = 0;

    for (const article of articles) {
      try {
        await migrateArticleImage(article);
        successCount++;
      } catch (error) {
        console.error(`❌ Erro ao processar ${article.title}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 === RESUMO ===');
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    console.log(`🌐 URL Base: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/blog-articles/`);

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

export { migrateArticleImage };

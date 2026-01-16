/// <reference types="node" />
// Script para migrar imagens do TMDB para o Supabase Storage
import './scripts-helper';

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import sharp from 'sharp';

const prisma = new PrismaClient();

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_BLOG_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_BLOG_SERVICE_KEY || '';
const BUCKET_NAME = 'movie-images';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Movie {
  id: string;
  title: string;
  year: number | null;
  thumbnail: string | null;
}

// Função para baixar imagem do TMDB
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
  contentType: string = 'image/jpeg'
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

// Função para extrair o nome do arquivo da URL do TMDB
function extractFilename(tmdbUrl: string): string {
  const parts = tmdbUrl.split('/');
  return parts[parts.length - 1];
}

// Função para processar uma imagem
async function processImage(
  tmdbUrl: string,
  movieId: string,
  imageType: 'thumbnail' | 'backdrop'
): Promise<string | null> {
  try {
    console.log(`  📥 Baixando ${imageType}: ${tmdbUrl}`);

    // Baixar imagem
    const imageBuffer = await downloadImage(tmdbUrl);

    // Converter para WebP para melhor compressão
    console.log(`  🎨 Convertendo para WebP...`);
    const webpBuffer = await sharp(imageBuffer)
      .webp({ quality: 85, effort: 6 }) // 85% qualidade, esforço 6 (bom balanço)
      .toBuffer();

    // Calcular economia
    const originalSize = imageBuffer.length;
    const webpSize = webpBuffer.length;
    const savings = ((1 - webpSize / originalSize) * 100).toFixed(1);
    console.log(`  💾 Tamanho: ${(originalSize / 1024).toFixed(1)}KB → ${(webpSize / 1024).toFixed(1)}KB (economia de ${savings}%)`);

    // Gerar nome do arquivo (substituir extensão por .webp)
    const originalFilename = extractFilename(tmdbUrl).replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const filename = `${imageType}s/${movieId}_${originalFilename}`;

    // Upload para Supabase
    console.log(`  📤 Fazendo upload: ${filename}`);
    const supabaseUrl = await uploadToSupabase(webpBuffer, filename, 'image/webp');

    if (supabaseUrl) {
      console.log(`  ✅ Upload concluído: ${supabaseUrl}`);
      return supabaseUrl;
    }

    return null;
  } catch (error) {
    console.error(`  ❌ Erro ao processar ${imageType}:`, error);
    return null;
  }
}

// Função para migrar imagens de um filme
async function migrateMovieImages(movie: Movie): Promise<void> {
  console.log(`\n🎬 Processando: ${movie.title} (${movie.year})`);

  const updates: any = {};
  let hasUpdates = false;

  // Processar thumbnail
  if (movie.thumbnail && movie.thumbnail.includes('image.tmdb.org')) {
    const newThumbnailUrl = await processImage(movie.thumbnail, movie.id, 'thumbnail');
    if (newThumbnailUrl) {
      updates.thumbnail = newThumbnailUrl;
      hasUpdates = true;
    }
  }



  // Atualizar banco de dados
  if (hasUpdates) {
    await prisma.movie.update({
      where: { id: movie.id },
      data: updates
    });
    console.log(`✅ Banco de dados atualizado para: ${movie.title}`);
  } else {
    console.log(`⚠️  Nenhuma atualização necessária para: ${movie.title}`);
  }

  // Rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Função principal
async function main(): Promise<void> {
  try {
    console.log('🚀 === MIGRAÇÃO DE IMAGENS PARA SUPABASE ===\n');

    // Verificar se o bucket existe
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (!bucketExists) {
      console.log(`📦 Criando bucket: ${BUCKET_NAME}`);
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });

      if (error) {
        console.error('❌ Erro ao criar bucket:', error);
        return;
      }
      console.log('✅ Bucket criado com sucesso!\n');
    }

    // Buscar argumentos
    const args = process.argv.slice(2);
    const limitArg = args.find(a => a.startsWith('--limit='));
    const startsWithArg = args.find(a => a.startsWith('--startsWith='));
    const movieArg = args.find(a => a.startsWith('--movie='));
    const yearArg = args.find(a => a.startsWith('--year='));
    const testMode = args.includes('--test');

    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : (testMode ? 5 : undefined);
    const startsWith = startsWithArg ? startsWithArg.split('=')[1] : undefined;
    const movieTitle = movieArg ? movieArg.split('=')[1] : undefined;
    const year = yearArg ? parseInt(yearArg.split('=')[1]) : undefined;

    // Buscar filmes com imagens do TMDB
    const where: any = {
      thumbnail: { contains: 'image.tmdb.org' }
    };

    if (movieTitle) {
      where.title = { contains: movieTitle, mode: 'insensitive' };
      if (year) {
        where.year = year;
      }
    } else if (startsWith) {
      where.title = { startsWith, mode: 'insensitive' };
    }

    const movies = await prisma.movie.findMany({
      where,
      select: {
        id: true,
        title: true,
        year: true,
        thumbnail: true
      },
      take: limit,
      orderBy: { title: 'asc' }
    });

    console.log(`📊 Encontrados ${movies.length} filmes para processar\n`);

    if (testMode) {
      console.log('🧪 MODO DE TESTE - Processando apenas os primeiros 5 filmes\n');
    }

    let successCount = 0;
    let errorCount = 0;

    for (const movie of movies) {
      try {
        await migrateMovieImages(movie);
        successCount++;
      } catch (error) {
        console.error(`❌ Erro ao processar ${movie.title}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 === RESUMO ===');
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📦 Bucket: ${BUCKET_NAME}`);
    console.log(`🌐 URL Base: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`);

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

export { migrateMovieImages };

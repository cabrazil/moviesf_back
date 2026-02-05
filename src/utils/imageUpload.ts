// Helper para fazer upload de imagens do TMDB para o Supabase Storage
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import sharp from 'sharp';

const SUPABASE_URL = process.env.SUPABASE_BLOG_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_BLOG_SERVICE_KEY || '';
const BUCKET_NAME = 'movie-images';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Faz upload de uma imagem do TMDB para o Supabase Storage
 * @param tmdbPosterPath - Caminho do poster no TMDB (ex: /abc123.jpg)
 * @param movieId - ID do filme no banco de dados
 * @returns URL da imagem no Supabase ou null se falhar
 */
export async function uploadTmdbImageToSupabase(
  tmdbPosterPath: string,
  movieId: string
): Promise<string | null> {
  try {
    // URL completa da imagem no TMDB
    const tmdbUrl = `https://image.tmdb.org/t/p/w500${tmdbPosterPath}`;

    console.log(`  📥 Baixando imagem do TMDB...`);

    // Baixar imagem
    const response = await axios.get<ArrayBuffer>(tmdbUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    const imageBuffer = Buffer.from(response.data as ArrayBuffer);

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
    const filename = `thumbnails/${movieId}_${tmdbPosterPath.split('/').pop()?.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`;

    // Converter para Blob (Correção para fetch failed no Node 18+)
    // @ts-ignore - Blob is global in Node 18+ but TS might not know
    const blob = new Blob([webpBuffer], { type: 'image/webp' });

    // Upload para Supabase
    console.log(`  📤 Fazendo upload para Supabase...`);
    // @ts-ignore - supabase-js typos
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, blob, {
        contentType: 'image/webp',
        cacheControl: '31536000', // 1 ano
        upsert: true,
        duplex: 'half' // Importante para fetch no Node
      });

    if (error) {
      console.error(`  ❌ Erro ao fazer upload: ${error.message}`);
      return null;
    }

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    console.log(`  ✅ Upload concluído: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`  ❌ Erro ao processar imagem:`, error);
    return null;
  }
}

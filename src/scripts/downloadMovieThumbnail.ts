import './scripts-helper';
// @ts-ignore
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obter chaves do ambiente
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = 'https://api.themoviedb.org/3';

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]/g, '-')     // substitui não alfanuméricos por hifen
    .replace(/-+/g, '-')             // remove hifens duplicados
    .replace(/^-|-$/g, '');          // remove hifens no início ou fim
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  const writer = fs.createWriteStream(filepath);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  (response.data as any).pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function downloadMovieThumbnail(params: { title?: string; year?: number; tmdbId?: number }) {
  if (!TMDB_API_KEY) {
    console.error('❌ Erro: TMDB_API_KEY não configurada no arquivo .env');
    await prisma.$disconnect();
    process.exit(1);
  }

  let finalTmdbId: number | undefined = params.tmdbId;

  try {
    // 1. Tentar obter o TMDB ID pelo banco local se as informações textuais forem fornecidas e tmdbId não for explícito
    if (!finalTmdbId && params.title) {
      console.log(`🔍 Procurando filme no banco local: "${params.title}"${params.year ? ` (${params.year})` : ''}...`);
      
      const localMovie = await prisma.movie.findFirst({
        where: {
          title: {
            equals: params.title,
            mode: 'insensitive'
          },
          ...(params.year ? { year: params.year } : {})
        },
        select: {
          tmdbId: true,
          title: true,
          year: true
        }
      });

      if (localMovie && localMovie.tmdbId) {
        finalTmdbId = localMovie.tmdbId;
        console.log(`🎯 Filme localizado no banco de dados local! TMDB ID correspondente: ${finalTmdbId} ("${localMovie.title}" - ${localMovie.year})`);
      } else {
        console.log(`ℹ️ Filme não cadastrado no banco local ou sem TMDB ID. Buscando na API do TMDB...`);
      }
    }

    let posterPath: string | null = null;
    let movieTitle = '';
    let movieYear = '';
    let movieOriginalTitle = '';

    // 2. Se temos o TMDB ID (seja fornecido ou encontrado no banco local)
    if (finalTmdbId) {
      console.log(`📡 Buscando detalhes do filme na API do TMDB pelo ID: ${finalTmdbId}...`);
      const response: any = await axios.get(`${TMDB_API_URL}/movie/${finalTmdbId}`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'pt-BR'
        }
      });

      const details = response.data;
      movieTitle = details.title;
      movieOriginalTitle = details.original_title;
      movieYear = details.release_date ? details.release_date.substring(0, 4) : 'N/A';
      posterPath = details.poster_path;

      console.log(`\n🎯 Filme encontrado (via TMDB ID):`);
      console.log(`   Título: ${movieTitle} (${movieYear})`);
      console.log(`   Título Original: ${movieOriginalTitle}`);
      console.log(`   Nota Média: ${details.vote_average}`);
    } else if (params.title) {
      // 3. Fallback: Busca textual na API do TMDB
      console.log(`📡 Realizando busca textual na API do TMDB para: "${params.title}"...`);
      const searchParams: any = {
        api_key: TMDB_API_KEY,
        query: params.title,
        language: 'pt-BR',
        page: 1
      };

      if (params.year) {
        searchParams.year = params.year;
      }

      const response: any = await axios.get(`${TMDB_API_URL}/search/movie`, { params: searchParams });
      const results = response.data.results;

      if (!results || results.length === 0) {
        console.log(`❌ Nenhum filme encontrado na API do TMDB para "${params.title}"${params.year ? ` (${params.year})` : ''}`);
        return;
      }

      const movie = results[0];
      movieTitle = movie.title;
      movieOriginalTitle = movie.original_title;
      movieYear = movie.release_date ? movie.release_date.substring(0, 4) : 'N/A';
      posterPath = movie.poster_path;
      finalTmdbId = movie.id;

      console.log(`\n🎯 Filme encontrado (via Busca Textual):`);
      console.log(`   Título: ${movieTitle} (${movieYear})`);
      console.log(`   Título Original: ${movieOriginalTitle}`);
      console.log(`   TMDB ID: ${finalTmdbId}`);
      console.log(`   Nota Média: ${movie.vote_average}`);

      if (results.length > 1 && !params.year) {
        console.log(`\n💡 Dica: Foram encontrados outros resultados. Caso este não seja o filme correto, tente especificar o ano com --year.`);
      }
    } else {
      console.log('❌ Título ou TMDB ID deve ser fornecido.');
      return;
    }

    if (!posterPath) {
      console.log(`\n❌ Este filme não possui um poster_path cadastrado no TMDB.`);
      return;
    }

    // Definir URL de download (tamanho w500)
    const thumbnailUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;

    // Sanitizar o nome do arquivo
    const sanitizedTitle = sanitizeFilename(movieTitle);
    const filename = `${sanitizedTitle}-${movieYear}.jpg`;
    
    // Pasta de destino
    const tempDir = path.resolve(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const outputPath = path.join(tempDir, filename);

    console.log(`\n📥 Baixando thumbnail (tamanho w500)...`);
    console.log(`   URL de origem: ${thumbnailUrl}`);
    console.log(`   Destino: ${outputPath}`);

    await downloadImage(thumbnailUrl, outputPath);
    console.log(`\n✅ Thumbnail salva com sucesso em: ${outputPath}`);

  } catch (error: any) {
    console.error('❌ Ocorreu um erro durante a busca ou download:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

// Processar os argumentos
function main() {
  const args = process.argv.slice(2);
  let title: string | undefined;
  let year: number | undefined;
  let tmdbId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--title=')) {
      title = args[i].split('=')[1].replace(/^["']|["']$/g, '');
    } else if (args[i].startsWith('--year=')) {
      year = parseInt(args[i].split('=')[1], 10);
    } else if (args[i].startsWith('--tmdbId=')) {
      tmdbId = parseInt(args[i].split('=')[1], 10);
    }
  }

  // Fallback para caso passem argumentos posicionais simples sem as flags --title, --year ou --tmdbId
  if (!title && !tmdbId && args.length > 0) {
    // Se passar apenas um argumento numérico curto/médio, pode ser o tmdbId ou ano
    if (args.length === 1 && !isNaN(Number(args[0]))) {
      const val = parseInt(args[0], 10);
      if (val > 1900 && val < 2100) {
        // Provavelmente um ano sozinho (inválido por si só, precisa de título)
        title = args[0];
      } else {
        tmdbId = val;
      }
    } else {
      const lastArg = args[args.length - 1];
      if (args.length > 1 && /^\d{4}$/.test(lastArg)) {
        year = parseInt(lastArg, 10);
        title = args.slice(0, -1).join(' ').replace(/^["']|["']$/g, '');
      } else if (args.length > 1 && !isNaN(Number(lastArg)) && lastArg.length > 4) {
        // Se for um número longo no final, pode ser tmdbId
        tmdbId = parseInt(lastArg, 10);
        title = args.slice(0, -1).join(' ').replace(/^["']|["']$/g, '');
      } else {
        title = args.join(' ').replace(/^["']|["']$/g, '');
      }
    }
  }

  if (!title && !tmdbId) {
    console.log(`
📥 DOWNLOAD DE THUMBNAIL DO TMDB
================================

Uso:
  npx ts-node src/scripts/downloadMovieThumbnail.ts --title="Nome do Filme" [--year=Ano]
  npx ts-node src/scripts/downloadMovieThumbnail.ts --tmdbId=ID_DO_TMDB

Ou formato simplificado:
  npx ts-node src/scripts/downloadMovieThumbnail.ts "Nome do Filme" [Ano]
  npx ts-node src/scripts/downloadMovieThumbnail.ts [ID_DO_TMDB]

Exemplos:
  npx ts-node src/scripts/downloadMovieThumbnail.ts --title="Se Beber, Não Case!" --year=2009
  npx ts-node src/scripts/downloadMovieThumbnail.ts "Jurassic Park" 1993
  npx ts-node src/scripts/downloadMovieThumbnail.ts --tmdbId=18785
  npx ts-node src/scripts/downloadMovieThumbnail.ts 18785
`);
    process.exit(1);
  }

  downloadMovieThumbnail({ title, year, tmdbId });
}

main();

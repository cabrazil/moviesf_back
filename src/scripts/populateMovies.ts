import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// Configurar o Prisma Client da forma mais simples possível
const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

interface TMDBMovie {
  title: string;
  original_title: string;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  overview: string;
}

interface TMDBResponse {
  results: TMDBMovie[];
}

interface Movie {
  id: string;
  title: string;
}

const titleMapping: { [key: string]: string } = {
  'Como Perder um Cara em Dez Dias': 'How to Lose a Guy in 10 Days',
  // Adicione mais mapeamentos conforme necessário
};

async function searchMovie(title: string): Promise<TMDBMovie | null> {
  try {
    console.log(`Buscando filme no TMDB: ${title}`);
    // Tentar primeiro com o título original
    let response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR',
        query: title,
        page: 1
      }
    });

    // Se não encontrar e existir um mapeamento, tentar com o título em inglês
    if (response.data.results.length === 0 && titleMapping[title]) {
      console.log(`Tentando buscar com o título em inglês: ${titleMapping[title]}`);
      response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'pt-BR',
          query: titleMapping[title],
          page: 1
        }
      });
    }

    if (response.data.results.length > 0) {
      return response.data.results[0];
    }
    return null;
  } catch (error) {
    console.error(`Erro ao buscar filme ${title}:`, error);
    return null;
  }
}

async function updateExistingMoviesThumbnails() {
  try {
    console.log('\n=== Iniciando atualização de thumbnails ===');
    
    // Verificar conexão com o banco
    console.log('Verificando conexão com o banco de dados...');
    console.log('Tentando buscar filmes...');
    
    // Usar uma consulta SQL direta para buscar apenas os campos necessários
    const movies = await prisma.$queryRaw<Movie[]>`
      SELECT id, title FROM "Movie"
    `;
    
    console.log(`✅ Conexão com o banco estabelecida com sucesso`);
    console.log(`Total de filmes encontrados: ${movies.length}`);

    if (movies.length === 0) {
      console.log('Nenhum filme encontrado no banco de dados');
      return;
    }

    console.log('\n=== Lista de filmes encontrados ===');
    movies.forEach(movie => {
      console.log(`- ${movie.title} (ID: ${movie.id})`);
    });

    for (const movie of movies) {
      console.log(`\n=== Processando filme: ${movie.title} ===`);
      
      try {
        const tmdbMovie = await searchMovie(movie.title);
        
        if (tmdbMovie) {
          console.log(`Filme encontrado no TMDB: ${tmdbMovie.title} (${tmdbMovie.release_date})`);
          console.log(`Título original: ${tmdbMovie.original_title}`);
          
          if (tmdbMovie.poster_path) {
            const thumbnailUrl = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`;
            console.log('URL da thumbnail:', thumbnailUrl);
            
            // Atualizar o filme usando o Prisma Client
            console.log('Atualizando banco de dados...');
            await prisma.movie.update({
              where: {
                id: movie.id
              },
              data: {
                thumbnail: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : null,
                description: tmdbMovie.overview || null,
                original_title: tmdbMovie.original_title || null,
                year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.split('-')[0]) : null
              }
            });
            console.log(`✅ Filme atualizado: ${movie.title}`);
          } else {
            // Mesmo sem thumbnail, atualizar o título original
            await prisma.movie.update({
              where: {
                id: movie.id
              },
              data: {
                description: tmdbMovie.overview || null,
                original_title: tmdbMovie.original_title || null,
                year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.split('-')[0]) : null
              }
            });
            console.log(`✅ Filme atualizado (sem thumbnail): ${movie.title}`);
          }
        } else {
          console.log(`❌ Filme não encontrado no TMDB: ${movie.title}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar filme ${movie.title}:`, error);
      }
    }

    console.log('\n=== Processo de atualização concluído! ===');
  } catch (error) {
    console.error('❌ Erro ao atualizar thumbnails:', error);
  } finally {
    console.log('\nEncerrando conexão com o banco de dados...');
    await prisma.$disconnect();
    console.log('Conexão encerrada');
  }
}

// Processar argumentos da linha de comando
const args = process.argv.slice(2);
if (args.length === 0 || args[0] !== '--update-thumbnails') {
  console.log(`
Uso: 
  npx ts-node src/scripts/populateMovies.ts --update-thumbnails
  `);
  process.exit(1);
}

// Executar atualização de thumbnails
updateExistingMoviesThumbnails(); 
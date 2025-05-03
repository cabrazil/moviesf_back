import 'dotenv/config';
import axios from 'axios';

interface TMDBMovie {
  title: string;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
}

interface TMDBResponse {
  results: TMDBMovie[];
}

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

async function testTMDBConnection() {
  try {
    console.log('=== Testando conexão com TMDB ===');
    console.log('API URL:', TMDB_API_URL);
    console.log('API Key:', TMDB_API_KEY ? '✅ Configurada' : '❌ Não configurada');

    if (!TMDB_API_KEY) {
      throw new Error('API Key do TMDB não configurada no arquivo .env');
    }

    // Buscar filmes populares
    console.log('\nBuscando filmes populares...');
    const response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/movie/popular`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR',
        page: 1
      }
    });

    const movies = response.data.results;
    console.log(`\n✅ Encontrados ${movies.length} filmes populares:`);
    
    movies.slice(0, 5).forEach((movie) => {
      console.log('\n---');
      console.log(`Título: ${movie.title}`);
      console.log(`Data de lançamento: ${movie.release_date}`);
      console.log(`Nota: ${movie.vote_average}`);
      console.log(`Thumbnail: ${movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'N/A'}`);
    });

  } catch (error: any) {
    console.error('\n❌ Erro ao testar conexão com TMDB:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data?.status_message || error.message);
    } else {
      console.error('Erro:', error.message);
    }
  }
}

// Executar o teste
testTMDBConnection(); 
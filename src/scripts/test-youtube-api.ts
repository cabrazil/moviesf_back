import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../.env') });

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      channelTitle: string;
    };
  }>;
}

interface YouTubeVideoResponse {
  items: Array<{
    snippet: {
      title: string;
    };
    statistics: {
      viewCount?: string;
      likeCount?: string;
    };
  }>;
}

async function testYouTubeAPI() {
  console.log('🔍 Testando acesso à API do YouTube...\n');

  // Verificar se a chave está configurada
  if (!YOUTUBE_API_KEY) {
    console.error('❌ Erro: YOUTUBE_API_KEY não encontrada no arquivo .env');
    console.log('💡 Certifique-se de que a chave está configurada em: moviesf_back/.env');
    process.exit(1);
  }

  console.log(`✅ Chave da API encontrada: ${YOUTUBE_API_KEY.substring(0, 10)}...`);
  console.log('📡 Fazendo requisição de teste...\n');

  try {
    // Teste 1: Buscar vídeos populares (endpoint simples)
    console.log('Teste 1: Buscando vídeos populares...');
    const searchResponse = await axios.get<YouTubeSearchResponse>(`${YOUTUBE_BASE_URL}/search`, {
      params: {
        key: YOUTUBE_API_KEY,
        part: 'snippet',
        q: 'test',
        maxResults: 5,
        type: 'video'
      }
    });

    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      console.log('✅ Sucesso! API do YouTube está acessível.');
      console.log(`📊 Encontrados ${searchResponse.data.items.length} resultados\n`);
      
      // Mostrar alguns resultados
      console.log('Primeiros resultados:');
      searchResponse.data.items.slice(0, 3).forEach((item, index: number) => {
        console.log(`\n${index + 1}. ${item.snippet.title}`);
        console.log(`   Canal: ${item.snippet.channelTitle}`);
        console.log(`   ID: ${item.id.videoId}`);
      });
    } else {
      console.log('⚠️  API respondeu, mas não retornou resultados');
    }

    // Teste 2: Verificar informações de um vídeo específico
    console.log('\n\nTeste 2: Buscando informações de um vídeo específico...');
    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      const videoId = searchResponse.data.items[0].id.videoId;
      const videoResponse = await axios.get<YouTubeVideoResponse>(`${YOUTUBE_BASE_URL}/videos`, {
        params: {
          key: YOUTUBE_API_KEY,
          part: 'snippet,statistics',
          id: videoId
        }
      });

      if (videoResponse.data.items && videoResponse.data.items.length > 0) {
        const video = videoResponse.data.items[0];
        console.log('✅ Informações do vídeo obtidas com sucesso!');
        console.log(`\n📹 Título: ${video.snippet.title}`);
        console.log(`👁️  Visualizações: ${video.statistics.viewCount || 'N/A'}`);
        console.log(`👍 Curtidas: ${video.statistics.likeCount || 'N/A'}`);
      }
    }

    console.log('\n\n✅ Todos os testes passaram! A API do YouTube está funcionando corretamente.');
    
  } catch (error: any) {
    console.error('\n❌ Erro ao acessar a API do YouTube:');
    
    if (error.response) {
      // Erro da API
      const status = error.response.status;
      const data = error.response.data;
      
      console.error(`Status HTTP: ${status}`);
      console.error(`Erro: ${JSON.stringify(data, null, 2)}`);
      
      if (status === 403) {
        console.error('\n💡 Possíveis causas:');
        console.error('   - Chave da API inválida ou expirada');
        console.error('   - API não habilitada no Google Cloud Console');
        console.error('   - Cota da API excedida');
      } else if (status === 400) {
        console.error('\n💡 Possíveis causas:');
        console.error('   - Parâmetros inválidos na requisição');
        console.error('   - Formato da chave incorreto');
      }
    } else if (error.request) {
      // Erro de rede
      console.error('Erro de rede: Não foi possível conectar à API');
      console.error('Verifique sua conexão com a internet');
    } else {
      // Outro erro
      console.error('Erro:', error.message);
    }
    
    process.exit(1);
  }
}

// Executar o teste
testYouTubeAPI();


import 'dotenv/config'; // Garante o carregamento das variáveis do .env
import { YouTubeSearchService } from '../services/youtube-search.service';

async function testYouTubeSearch() {
  try {
    const youtubeSearchService = new YouTubeSearchService();
    
    // Lista de filmes para testar
    const filmes = [
      "De Repente 30",
      "Como Perder um Cara em 10 Dias",
      "10 Coisas que Eu Odeio em Você",
      "Diário de uma Paixão",
      "Simplesmente Amor",
      "O Diabo Veste Prada",
      "Legalmente Loira",
      "O Senhor dos Anéis: A Sociedade do Anel",
      "Harry Potter e a Pedra Filosofal",
      "O Poderoso Chefão"
    ];

    console.log('=== Testando busca de títulos originais no YouTube ===\n');

    for (const filme of filmes) {
      console.log(`\nBuscando título original para: "${filme}"`);
      const originalTitle = await youtubeSearchService.searchOriginalTitle(filme);
      
      if (originalTitle) {
        console.log(`✅ Título original encontrado: "${originalTitle}"`);
      } else {
        console.log(`❌ Não foi possível encontrar o título original`);
      }
      
      // Aguardar 1 segundo entre as requisições para respeitar limites da API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('❌ Erro ao testar YouTube Search:', error);
  }
}

// Executar o teste
testYouTubeSearch(); 
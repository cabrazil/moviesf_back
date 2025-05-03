import { TMDBService } from '../services/tmdb.service';

async function testTMDB() {
  try {
    const tmdbService = new TMDBService();
    
    // Testar busca de filmes em português
    const filmes = [
      "Como Perder um Cara em 10 Dias",
      "De Repente 30",
      "10 Coisas que Eu Odeio em Você",
      "Diário de uma Paixão",
      "Simplesmente Amor"
    ];

    for (const filme of filmes) {
      console.log(`\n=== Buscando "${filme}" ===`);
      const searchResults = await tmdbService.searchMovies(filme);
      
      if (searchResults.results.length > 0) {
        console.log('\n=== Resultados da busca ===');
        searchResults.results.slice(0, 3).forEach((result, index) => {
          console.log(`\n${index + 1}. ${result.title} (${result.release_date})`);
          console.log(`   ID: ${result.id}`);
          console.log(`   Descrição: ${result.overview}`);
        });
      } else {
        console.log('❌ Nenhum filme encontrado');
      }
    }

  } catch (error) {
    console.error('❌ Erro ao testar TMDB:', error);
  }
}

// Executar o teste
testTMDB(); 
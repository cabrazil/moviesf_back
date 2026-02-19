const axios = require('axios');
require('dotenv').config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

async function getProviders() {
  try {
    const response = await axios.get(`${TMDB_API_URL}/watch/providers/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        watch_region: 'BR'
      }
    });

    const providers = response.data.results;
    console.log('Total de provedores no Brasil:', providers.length);

    const targetProviders = [
      "Netflix", "Amazon Prime Video", "Disney Plus", "HBO Max", "Apple TV Plus",
      "Paramount Plus", "Star Plus", "Globoplay", "Max", "Claro Video",
      "Telecine", "Looke", "Oldflix", "MUBI", "Apple TV", "Google Play Movies"
    ];

    console.log('\n--- IDs dos Provedores Alvo ---');
    targetProviders.forEach(target => {
      const found = providers.find((p) =>
        p.provider_name.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(p.provider_name.toLowerCase())
      );
      if (found) {
        console.log(`${target}: ${found.provider_id} (Nome oficial: ${found.provider_name})`);
      } else {
        console.log(`${target}: NÃO ENCONTRADO`);
      }
    });

    console.log('\n--- Todos os Provedores (Top 50 por prioridade) ---');
    providers.sort((a, b) => a.display_priority - b.display_priority);
    providers.slice(0, 50).forEach((p) => {
      console.log(`ID: ${p.provider_id} | Nome: ${p.provider_name} | Prioridade: ${p.display_priority}`);
    });

  } catch (error) {
    console.error('Erro ao buscar provedores:', error);
  }
}

getProviders();

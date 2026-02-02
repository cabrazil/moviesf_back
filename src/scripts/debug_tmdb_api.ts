// Carregar variáveis de ambiente (tentativa manual ou dotenv)
import 'dotenv/config';
import axios from 'axios';

// Self-contained main to avoid project deps
async function main() {
  const query = "Flow";
  const year = 2024;

  const apiKey = process.env.TMDB_API_KEY;
  const accessToken = process.env.TMDB_ACCESS_TOKEN;

  if (!accessToken && !apiKey) {
    console.error('❌ Credenciais TMDB não encontradas no .env');
    return;
  }

  const headers = {
    accept: 'application/json',
    Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${apiKey}`
  };

  console.log(`🔍 Buscando "${query}" (${year}) no TMDB (Standalone)...`);

  // 1. Search
  try {
    const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&year=${year}&language=pt-BR`;
    const searchRes = await axios.get(searchUrl, { headers });

    // Sort by popularity or release date
    const results = searchRes.data.results;
    if (!results || results.length === 0) {
      console.log('❌ Nenhum resultado encontrado.');
      return;
    }

    const movie = results[0];
    console.log(`✅ Filme encontrado: ${movie.title} (ID: ${movie.id})`);
    console.log(`   Original: ${movie.original_title}`);
    console.log(`   Release: ${movie.release_date}`);

    // 2. Details
    console.log(`\n📥 Fetching full details...`);
    // Includes keywords, genres, credits
    const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}?language=pt-BR&append_to_response=keywords,credits,release_dates`;

    const detailsRes = await axios.get(detailsUrl, { headers });
    const data = detailsRes.data;

    console.log('\n📦 RAW DATA DUMP:');
    console.log(JSON.stringify({
      title: data.title,
      genres: data.genres,
      overview: data.overview,
      keywords: data.keywords,
      runtime: data.runtime,
      production: data.production_companies
    }, null, 2));

    const keywords = data.keywords && data.keywords.keywords ? data.keywords.keywords : [];
    console.log(`\n🔑 Keywords Count: ${keywords.length}`);
    if (keywords.length === 0) console.log('⚠️ AVISO: Lista de keywords vazia!');

  } catch (error: any) {
    console.error('❌ Erro na requisição:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data));
    }
  }
}

main();

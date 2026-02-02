require('dotenv').config();
const axios = require('axios');

async function main() {
  const query = "Flow";
  const year = 2024;

  const apiKey = process.env.TMDB_API_KEY;
  const accessToken = process.env.TMDB_ACCESS_TOKEN;
  const headers = { Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${apiKey}` };

  console.log(`🔍 Buscando "${query}" (${year}) no TMDB...`);

  try {
    const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&year=${year}&language=pt-BR`;
    const searchRes = await axios.get(searchUrl, { headers });

    const results = searchRes.data.results;
    if (!results || results.length === 0) {
      console.log('❌ Nenhum resultado.');
      return;
    }

    console.log(`📋 Encontrados ${results.length} filmes. Listando Top 5:`);
    results.slice(0, 5).forEach((m, i) => {
      console.log(`${i + 1}. ${m.title} (Orig: ${m.original_title}) - ID: ${m.id} - Data: ${m.release_date || 'N/A'}`);
      console.log(`   Overview: ${m.overview ? m.overview.slice(0, 50) + '...' : '(Vazio)'}`);
    });

    // Tentar identificar o "Flow" correto (Straume?)
    // O ID do filme do Gints Zilbalodis é 823219 (segundo Google rápido, mas vamos ver na lista).
    // Vou pegar o ID do segundo resultado se o primeiro for o tal "curta" (1281775).

    let targetMovie = results.find(m => m.original_title.includes('Straume') || m.id === 823219);

    if (!targetMovie) {
      // Se não achar por Straume, pega o que não é o curta ID 1281775 se houver
      targetMovie = results.find(m => m.id !== 1281775);
    }

    if (!targetMovie) {
      console.log('\n⚠️ Não consegui distinguir automaticamente. Usando o primeiro da lista.');
      targetMovie = results[0];
    } else {
      console.log(`\n🎯 Selecionado provável Feature Film: ${targetMovie.title} (ID: ${targetMovie.id})`);
    }

    // 2. Details
    console.log(`\n📥 Detalhes de ID ${targetMovie.id}...`);
    const detailsUrl = `https://api.themoviedb.org/3/movie/${targetMovie.id}?language=pt-BR&append_to_response=keywords,credits,release_dates`;

    const detailsRes = await axios.get(detailsUrl, { headers });
    const data = detailsRes.data;

    console.log('\n📦 RAW DATA DUMP:');
    console.log(JSON.stringify({
      title: data.title,
      original_title: data.original_title,
      genres: data.genres,
      overview: data.overview,
      keywords: data.keywords,
      runtime: data.runtime,
      production: data.production_companies
    }, null, 2));

    const keywords = data.keywords && data.keywords.keywords ? data.keywords.keywords : [];
    console.log(`\n🔑 Keywords Count: ${keywords.length}`);

    if (keywords.length === 0) {
      console.log('⚠️ AVISO: Keywords PT-BR vazias. Checando EN-US...');
      const enRes = await axios.get(`https://api.themoviedb.org/3/movie/${targetMovie.id}?language=en-US&append_to_response=keywords`, { headers });
      const enKw = enRes.data.keywords?.keywords || [];
      console.log(`🔑 English Keywords Count: ${enKw.length}`);
      if (enKw.length > 0) console.log('   (Ex: ' + enKw.slice(0, 3).map(k => k.name).join(', ') + ')');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();

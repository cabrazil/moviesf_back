import 'dotenv/config'; // Garante o carregamento das variáveis do .env
import { PrismaClient } from '@prisma/client';
import { TMDBService } from '../services/tmdb.service';
import { YouTubeSearchService } from '../services/youtube-search.service';

const prisma = new PrismaClient();
const tmdbService = new TMDBService();
const youtubeSearchService = new YouTubeSearchService();

interface MovieInput {
  title: string;
  tmdbId?: number; // ID do filme no TMDB (opcional)
  journeyOptionFlowId: number; // ID da opção que leva à sugestão
  reason?: string;
}

async function searchMovie(title: string): Promise<number | undefined> {
  try {
    // Primeiro, tentar encontrar o título original em inglês
    const originalTitle = await youtubeSearchService.searchOriginalTitle(title);
    const searchTitle = originalTitle || title;

    console.log(`Buscando filme no TMDB com título: ${searchTitle}`);
    const searchResults = await tmdbService.searchMovies(searchTitle);
    
    if (searchResults.results.length > 0) {
      const movie = searchResults.results[0];
      console.log(`Filme encontrado: ${movie.title} (${movie.id})`);
      return movie.id;
    }
    
    console.log(`Nenhum filme encontrado para: ${searchTitle}`);
    return undefined;
  } catch (error) {
    console.error('Erro ao buscar filme:', error);
    return undefined;
  }
}

async function populateMovies(movies: MovieInput[]) {
  try {
    for (const movie of movies) {
      console.log(`\nProcessando filme: ${movie.title}`);
      
      // Se não tiver ID do TMDB, buscar pelo título
      let tmdbId = movie.tmdbId;
      if (!tmdbId) {
        console.log(`Buscando filme no TMDB: ${movie.title}`);
        tmdbId = await searchMovie(movie.title);
        
        if (!tmdbId) {
          console.log(`❌ Filme não encontrado no TMDB: ${movie.title}`);
          continue;
        }
      }

      // Buscar detalhes do filme usando o ID do TMDB
      const movieDetails = await tmdbService.getMovieDetails(tmdbId);
      console.log(`✅ Detalhes do filme obtidos: ${movieDetails.title} (${movieDetails.release_date})`);

      // Criar ou atualizar o filme no banco
      const movieRecord = await prisma.movie.upsert({
        where: {
          title: movie.title // Usar o título em português para o banco
        },
        update: {
          title: movie.title,
          year: parseInt(movieDetails.release_date.split('-')[0]),
          description: movieDetails.overview,
          genres: [], // Será preenchido posteriormente se necessário
          streamingPlatforms: [] // Será preenchido posteriormente se necessário
        },
        create: {
          title: movie.title,
          year: parseInt(movieDetails.release_date.split('-')[0]),
          description: movieDetails.overview,
          genres: [],
          streamingPlatforms: []
        }
      });
      console.log(`✅ Filme salvo/atualizado no banco: ${movieRecord.title}`);

      // Criar a sugestão de filme
      const movieSuggestion = await prisma.movieSuggestionFlow.create({
        data: {
          journeyOptionFlowId: movie.journeyOptionFlowId,
          movieId: movieRecord.id,
          reason: movie.reason || `Filme recomendado baseado na sua escolha`
        }
      });
      console.log(`✅ Sugestão de filme criada para a opção ${movie.journeyOptionFlowId}`);
    }

    console.log('\n✅ Processo concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao popular filmes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Processar argumentos da linha de comando
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
Uso: npx ts-node src/scripts/populateMovies.ts <filme1> <optionId1> [razao1] [<filme2> <optionId2> [razao2] ...]

Exemplos:
  npx ts-node src/scripts/populateMovies.ts "Simplesmente Amor" 23 "Um filme romântico perfeito para o Natal"
  npx ts-node src/scripts/populateMovies.ts "Diário de uma Paixão" 23 "Uma história de amor emocionante" "Simplesmente Amor" 23 "Um filme romântico perfeito para o Natal"
  `);
  process.exit(1);
}

// Converter argumentos em MovieInput[]
const movies: MovieInput[] = [];
for (let i = 0; i < args.length; i += 3) {
  const title = args[i];
  const journeyOptionFlowId = parseInt(args[i + 1]);
  const reason = args[i + 2];

  if (!title || isNaN(journeyOptionFlowId)) {
    console.error('❌ Argumentos inválidos');
    process.exit(1);
  }

  movies.push({
    title,
    journeyOptionFlowId,
    reason
  });
}

// Executar o script
populateMovies(movies); 
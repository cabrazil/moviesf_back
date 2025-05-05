import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Configurar o Prisma Client da forma mais simples possível
const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  overview: string;
  genres: { id: number; name: string }[];
  genre_ids?: number[];
  director?: string | null;
}

interface TMDBMovieDetails {
  id: number;
  genres: { id: number; name: string }[];
  keywords: { id: number; name: string }[];
}

interface TMDBResponse {
  results: TMDBMovie[];
}

interface MovieInput {
  title: string;
  journeyOptionFlowId: number;
  year?: number; // Ano opcional para ajudar na busca
}

interface TMDBWatchProvidersResponse {
  results: {
    BR?: {
      flatrate?: Array<{
        provider_name: string;
      }>;
    };
  };
}

interface TMDBKeywordsResponse {
  keywords: Array<{
    id: number;
    name: string;
  }>;
}

interface TMDBMovieCredits {
  crew: Array<{
    id: number;
    name: string;
    job: string;
  }>;
}

const titleMapping: { [key: string]: string } = {
  'Como Perder um Cara em Dez Dias': 'How to Lose a Guy in 10 Days',
  'De Volta para o Futuro': 'Back to the Future',
  'Curtindo a Vida Adoidado': 'Ferris Bueller\'s Day Off',
  'As Patricinhas de Beverly Hills': 'Clueless',
  'O Clube dos Cinco': 'The Breakfast Club',
  'Dirty Dancing: Ritmo Quente': 'Dirty Dancing',
  'Menina de Ouro': 'Million Dollar Baby',
  'Um Sonho Possível': 'The Blind Side',
  'Karatê Kid': 'The Karate Kid',
  'O Homem que Mudou o Jogo': 'Moneyball',
  'Soul': 'Soul 2020'
};

// Mapeamento de gêneros para reflexões
const genreReflections: { [key: string]: string } = {
  'Drama': 'Explora as complexidades da condição humana e as relações interpessoais.',
  'Comédia': 'Mostra como o humor pode ser uma ferramenta poderosa para lidar com desafios.',
  'Ação': 'Demonstra a importância da coragem e da determinação na superação de obstáculos.',
  'Aventura': 'Inspira a busca por novos horizontes e a superação de limites.',
  'Romance': 'Explora o poder transformador do amor e das conexões humanas.',
  'Ficção Científica': 'Provoca reflexões sobre o futuro da humanidade e nossa relação com a tecnologia.',
  'Fantasia': 'Mostra como a imaginação pode nos ajudar a lidar com questões complexas da vida.',
  'Terror': 'Explora nossos medos mais profundos e como enfrentá-los.',
  'Suspense': 'Demonstra como a incerteza pode nos levar a descobrir nossa verdadeira força.',
  'Documentário': 'Oferece insights valiosos sobre a realidade e diferentes perspectivas de vida.',
  'Animação': 'Usa a criatividade para transmitir mensagens profundas de forma acessível.',
  'Crime': 'Explora as consequências de nossas escolhas e a busca por justiça.',
  'Mistério': 'Mostra como a busca pela verdade pode transformar vidas.',
  'Musical': 'Demonstra como a arte e a expressão podem curar e unir pessoas.',
  'Família': 'Destaca a importância dos laços familiares e do apoio mútuo.',
  'Guerra': 'Explora os impactos do conflito na humanidade e a busca pela paz.',
  'História': 'Oferece lições valiosas do passado para entender o presente.',
  'Esporte': 'Mostra como a disciplina e o trabalho em equipe levam ao sucesso.',
  'Biografia': 'Inspira através das histórias reais de superação e conquista.',
  'Western': 'Explora temas de justiça, honra e o conflito entre civilização e natureza.'
};

// Mapeamento de plataformas de streaming
const streamingPlatforms: { [key: string]: string[] } = {
  'Netflix': ['Netflix'],
  'Amazon Prime Video': ['Amazon Prime Video'],
  'Disney+': ['Disney+'],
  'HBO Max': ['HBO Max'],
  'Apple TV+': ['Apple TV+'],
  'Paramount+': ['Paramount+'],
  'Peacock': ['Peacock'],
  'Hulu': ['Hulu'],
  'YouTube': ['YouTube'],
  'Google Play Movies': ['Google Play Movies'],
  'Apple iTunes': ['Apple iTunes'],
  'Vudu': ['Vudu'],
  'Microsoft Store': ['Microsoft Store']
};

async function getMovieStreamingInfo(movieId: number): Promise<string[]> {
  try {
    const response = await axios.get<TMDBWatchProvidersResponse>(`${TMDB_API_URL}/movie/${movieId}/watch/providers`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });

    const providers = response.data.results?.BR?.flatrate || [];
    return providers.map(provider => provider.provider_name);
  } catch (error) {
    console.error(`Erro ao buscar informações de streaming: ${error}`);
    return [];
  }
}

function generateReflection(movie: TMDBMovie, keywords: string[]): string {
  try {
    const genreReflectionsList = movie.genres
      .map(genre => genreReflections[genre.name])
      .filter(Boolean);

    const reflectionParts = [
      ...genreReflectionsList,
      ...keywords.map(keyword => `Explora temas relacionados a ${keyword.toLowerCase()}.`)
    ];

    // Limitar a reflexão às 3 primeiras linhas
    const limitedReflection = reflectionParts.slice(0, 3).join(' ');

    return limitedReflection || `Filme sugerido baseado em ${movie.title}`;
  } catch (error) {
    console.error(`Erro ao gerar reflexão para ${movie.title}:`, error);
    return `Filme sugerido baseado em ${movie.title}`;
  }
}

async function getMovieDirector(movieId: number): Promise<string | null> {
  try {
    const response = await axios.get<TMDBMovieCredits>(`${TMDB_API_URL}/movie/${movieId}/credits`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR'
      }
    });

    const director = response.data.crew.find(person => person.job === 'Director');
    return director ? director.name : null;
  } catch (error) {
    console.error(`Erro ao buscar diretor do filme ID ${movieId}:`, error);
    return null;
  }
}

async function searchMovie(title: string, year?: number): Promise<{ movie: TMDBMovie; reflection: string; platforms: string[]; director: string | null } | null> {
  try {
    console.log(`Buscando filme no TMDB: ${title}${year ? ` (${year})` : ''}`);
    
    // Remover o ano do título se existir
    const cleanTitle = title.replace(/\s*\d{4}$/, '').trim();
    
    // Tentar primeiro com o título e ano como parâmetros separados
    let response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR',
        query: cleanTitle,
        year: year,
        page: 1
      }
    });

    // Se não encontrar, tentar com o título em inglês
    if (response.data.results.length === 0 && titleMapping[cleanTitle]) {
      console.log(`Tentando buscar com o título em inglês: ${titleMapping[cleanTitle]}`);
      response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'pt-BR',
          query: titleMapping[cleanTitle],
          year: year,
          page: 1
        }
      });
    }

    if (response.data.results.length === 0) {
      console.log(`Nenhum resultado encontrado para: ${title}`);
      return null;
    }

    // Verificar se encontramos o filme correto
    const movie = response.data.results.find(m => {
      const releaseYear = m.release_date ? parseInt(m.release_date.split('-')[0]) : null;
      
      // Verificar se o ano corresponde
      if (year && releaseYear !== year) {
        return false;
      }

      // Verificar se o título corresponde (ignorando maiúsculas/minúsculas)
      const titleMatch = m.title.toLowerCase() === cleanTitle.toLowerCase() || 
                        m.original_title.toLowerCase() === cleanTitle.toLowerCase() ||
                        (titleMapping[cleanTitle] && m.original_title.toLowerCase() === titleMapping[cleanTitle].toLowerCase());

      // Verificar se é um filme de animação (para o caso do Soul)
      const isAnimation = m.genre_ids?.includes(16); // 16 é o ID do gênero Animação no TMDB

      return titleMatch && (!year || releaseYear === year) && (cleanTitle.toLowerCase() === 'soul' ? isAnimation : true);
    });

    if (!movie) {
      console.log(`Filme exato não encontrado para: ${title}`);
      return null;
    }

    console.log(`Filme encontrado: ${movie.title} (ID: ${movie.id})`);
    
    // Buscar detalhes completos do filme
    const details = await axios.get<TMDBMovieDetails>(`${TMDB_API_URL}/movie/${movie.id}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR'
      }
    });

    if (!details.data) {
      console.log(`Detalhes do filme não encontrados para: ${movie.title}`);
      return null;
    }

    // Buscar o diretor
    const director = await getMovieDirector(movie.id);
    if (director) {
      console.log(`Diretor encontrado: ${director}`);
    }

    // Buscar palavras-chave
    const keywordsResponse = await axios.get<TMDBKeywordsResponse>(`${TMDB_API_URL}/movie/${movie.id}/keywords`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });

    const keywords = keywordsResponse.data?.keywords?.map(k => k.name) || [];
    
    // Buscar informações de streaming
    const platforms = await getMovieStreamingInfo(movie.id);
    
    // Gerar reflexão
    const reflection = generateReflection({ ...movie, genres: details.data.genres }, keywords);

    return {
      movie: { ...movie, genres: details.data.genres },
      reflection,
      platforms,
      director: director || null
    };
  } catch (error) {
    console.error(`Erro ao buscar filme ${title}:`, error);
    return null;
  }
}

async function processMoviesFromFile(filePath: string) {
  try {
    console.log('\n=== Iniciando processamento de filmes ===');
    console.log(`Arquivo de entrada: ${filePath}`);

    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    // Ler o arquivo linha por linha
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const processedTitles = new Set<string>();

    for await (const line of rl) {
      lineNumber++;
      
      // Pular cabeçalho se existir
      if (lineNumber === 1 && line.toLowerCase().includes('movie title')) {
        continue;
      }

      const [title, journeyOptionFlowId, year] = line.split(',').map(item => item.trim());
      
      if (!title || !journeyOptionFlowId) {
        console.error(`❌ Linha ${lineNumber}: Formato inválido - ${line}`);
        errorCount++;
        continue;
      }

      // Validar o ano se fornecido
      let parsedYear: number | undefined;
      if (year) {
        parsedYear = parseInt(year);
        if (isNaN(parsedYear) || parsedYear < 1888 || parsedYear > new Date().getFullYear() + 1) {
          console.error(`❌ Linha ${lineNumber}: Ano inválido - ${year}`);
          errorCount++;
          continue;
        }
      }

      // Validar o journeyOptionFlowId
      const parsedJourneyOptionFlowId = parseInt(journeyOptionFlowId);
      if (isNaN(parsedJourneyOptionFlowId) || parsedJourneyOptionFlowId <= 0) {
        console.error(`❌ Linha ${lineNumber}: ID de JourneyOptionFlow inválido - ${journeyOptionFlowId}`);
        errorCount++;
        continue;
      }

      // Verificar duplicata no arquivo
      if (processedTitles.has(title)) {
        console.log(`⚠️ Linha ${lineNumber}: Título duplicado no arquivo - ${title}`);
        duplicateCount++;
        continue;
      }
      processedTitles.add(title);

      console.log(`\n=== Processando filme ${lineNumber}: ${title}${parsedYear ? ` (${parsedYear})` : ''} ===`);
      
      try {
        const result = await searchMovie(title, parsedYear);
        
        if (result) {
          const { movie, reflection, platforms, director } = result;
          console.log(`Filme encontrado no TMDB: ${movie.title} (${movie.release_date})`);
          console.log(`Título original: ${movie.original_title}`);
          console.log(`Diretor: ${director || 'Não encontrado'}`);
          console.log(`Reflexão gerada: ${reflection}`);
          console.log(`Plataformas encontradas: ${platforms.join(', ')}`);
          
          // Verificar se o filme já existe no banco
          const existingMovie = await prisma.movie.findFirst({
            where: {
              OR: [
                { 
                  AND: [
                    { title: movie.title },
                    { original_title: movie.original_title }
                  ]
                },
                { 
                  AND: [
                    { original_title: movie.original_title },
                    { year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null }
                  ]
                }
              ]
            }
          });

          if (existingMovie) {
            console.log(`⚠️ Filme já existe no banco: ${existingMovie.title} (ID: ${existingMovie.id})`);
            duplicateCount++;
            
            // Verificar se já existe a sugestão para este JourneyOptionFlow
            const existingSuggestion = await prisma.movieSuggestionFlow.findUnique({
              where: {
                journeyOptionFlowId_movieId: {
                  journeyOptionFlowId: parsedJourneyOptionFlowId,
                  movieId: existingMovie.id
                }
              }
            });

            if (!existingSuggestion) {
              // Criar a sugestão se não existir
              await prisma.movieSuggestionFlow.create({
                data: {
                  journeyOptionFlowId: parsedJourneyOptionFlowId,
                  movieId: existingMovie.id,
                  reason: reflection,
                  relevance: 1
                }
              });
              console.log(`✅ Sugestão criada para filme existente: ${existingMovie.title}`);
              successCount++;
            } else {
              console.log(`ℹ️ Sugestão já existe para este filme e JourneyOptionFlow`);
            }
            continue;
          }

          // Preparar dados para inserção
          const movieData = {
            title: movie.title,
            original_title: movie.original_title,
            year: movie.release_date ? parseInt(movie.release_date.split('-')[0]) : null,
            description: movie.overview || null,
            thumbnail: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
            genres: movie.genres.map(genre => genre.name),
            streamingPlatforms: platforms,
            director: director || null
          };

          // Criar novo filme
          const newMovie = await prisma.movie.create({
            data: movieData
          });
          console.log(`✅ Filme criado: ${movie.title}`);

          // Criar MovieSuggestionFlow
          await prisma.movieSuggestionFlow.create({
            data: {
              journeyOptionFlowId: parsedJourneyOptionFlowId,
              movieId: newMovie.id,
              reason: reflection,
              relevance: 1
            }
          });

          successCount++;
        } else {
          console.log(`❌ Filme não encontrado no TMDB: ${title}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Erro ao processar filme ${title}:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Resumo do Processamento ===');
    console.log(`Total de linhas processadas: ${lineNumber}`);
    console.log(`Sucessos: ${successCount}`);
    console.log(`Erros: ${errorCount}`);
    console.log(`Duplicatas: ${duplicateCount}`);

  } catch (error) {
    console.error('❌ Erro ao processar arquivo:', error);
  } finally {
    console.log('\nEncerrando conexão com o banco de dados...');
    await prisma.$disconnect();
    console.log('Conexão encerrada');
  }
}

// Processar argumentos da linha de comando
const args = process.argv.slice(2);
if (args.length === 0 || !args[0].startsWith('--file=')) {
  console.log(`
Uso: 
  npx ts-node src/scripts/populateMovies.ts --file=caminho/para/arquivo.csv
  `);
  process.exit(1);
}

const filePath = args[0].split('=')[1];
processMoviesFromFile(filePath); 
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
  vote_count: number;
  adult: boolean;
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
  release_dates: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{
        certification: string;
        type: number;
      }>;
    }>;
  };
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
      rent?: Array<{
        provider_name: string;
      }>;
      buy?: Array<{
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

interface GoogleTranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
    }>;
  };
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
  'Soul': 'Soul 2020',
  'Fora de Rumo': 'Off the Map',
  'O Homem das Trevas': 'The Dark Man'
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

// Mapeamento de plataformas do TMDB para nosso padrão
const platformMapping: { [key: string]: string } = {
  'Netflix': 'Netflix',
  'Prime Video': 'Prime Video',
  'Amazon Prime Video': 'Prime Video',
  'Amazon Video': 'Prime Video',
  'Disney Plus': 'Disney+',
  'Disney+': 'Disney+',
  'HBO Max': 'Max',
  'Max': 'Max',
  'Max Amazon Channel': 'Max',
  'Apple TV Plus': 'Apple TV+',
  'Apple TV+': 'Apple TV+',
  'Paramount Plus': 'Paramount+',
  'Paramount+': 'Paramount+',
  'Peacock': 'Peacock',
  'Hulu': 'Hulu',
  'YouTube': 'YouTube',
  'Google Play Movies': 'Google Play',
  'Google Play': 'Google Play',
  'Apple iTunes': 'Apple iTunes',
  'Vudu': 'Vudu',
  'Microsoft Store': 'Microsoft Store'
};

async function getMovieStreamingInfo(movieId: number): Promise<string[]> {
  try {
    const response = await axios.get<TMDBWatchProvidersResponse>(`${TMDB_API_URL}/movie/${movieId}/watch/providers`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });

    // Log para debug
    // console.log('Provedores TMDB:', JSON.stringify(response.data.results?.BR, null, 2));

    // Pegar todos os tipos de provedores (flatrate, rent, buy)
    const allProviders = [
      ...(response.data.results?.BR?.flatrate || []),
      ...(response.data.results?.BR?.rent || [])
    ];

    // Mapear e filtrar provedores únicos
    const mappedProviders = allProviders
      .map(provider => {
        // Log para debug
        console.log(`Mapeando provedor: ${provider.provider_name}`);
        return platformMapping[provider.provider_name];
      })
      .filter(Boolean);

    // Remover duplicatas
    return [...new Set(mappedProviders)];
  } catch (error) {
    console.error(`Erro ao buscar informações de streaming: ${error}`);
    return [];
  }
}

// function generateReflection(movie: TMDBMovie, keywords: string[]): string {
//   try {
//     const genreReflectionsList = movie.genres
//       .map(genre => genreReflections[genre.name])
//       .filter(Boolean);

//     const reflectionParts = [
//       ...genreReflectionsList,
//       ...keywords.map(keyword => `Explora temas relacionados a ${keyword.toLowerCase()}.`)
//     ];

//     // Limitar a reflexão às 3 primeiras linhas
//     const limitedReflection = reflectionParts.slice(0, 3).join(' ');

//     return limitedReflection || `Filme sugerido baseado em ${movie.title}`;
//   } catch (error) {
//     console.error(`Erro ao gerar reflexão para ${movie.title}:`, error);
//     return `Filme sugerido baseado em ${movie.title}`;
//   }
// }

async function generateReflectionWithOpenAI(movie: TMDBMovie, keywords: string[]): Promise<string> {
  const prompt = `
Sinopse: ${movie.overview}
Gêneros: ${movie.genres.map(g => g.name).join(', ')}
Palavras-chave: ${keywords.join(', ')}

Com base nessas informações, escreva uma reflexão curta, inspiradora e única sobre o filme, conectando os temas principais e o impacto emocional da história. 
A reflexão deve ter no máximo 30 palavras e terminar com um ponto final.
Não repita o nome do filme.
`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Log para depuração
    // console.log('Resposta da OpenAI:', JSON.stringify(response.data, null, 2));

    const data = response.data as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      return content.trim();
    } else {
      console.error('Formato inesperado da resposta da OpenAI:', response.data);
      return `Filme sugerido baseado em ${movie.title}`;
    }
  } catch (error) {
    console.error('Erro ao gerar reflexão com OpenAI:', error);
    return `Filme sugerido baseado em ${movie.title}`;
  }
}

async function getMovieDirectors(movieId: number): Promise<string | null> {
  try {
    const response = await axios.get<TMDBMovieCredits>(`${TMDB_API_URL}/movie/${movieId}/credits`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR'
      }
    });

    // Pegar todos os diretores
    const directors = response.data.crew
      .filter(person => person.job === 'Director')
      .map(person => person.name);

    // Se não encontrar diretores, retorna null
    if (directors.length === 0) {
      return null;
    }

    // Retorna os diretores separados por vírgula
    return directors.join(', ');
  } catch (error) {
    console.error(`Erro ao buscar diretores do filme ID ${movieId}:`, error);
    return null;
  }
}

async function getBrazilianCertification(movieId: number): Promise<string | null> {
  try {
    const response = await axios.get<TMDBMovieDetails>(`${TMDB_API_URL}/movie/${movieId}`, {
      params: {
        api_key: TMDB_API_KEY,
        append_to_response: 'release_dates',
        language: 'pt-BR'
      }
    });

    const brazilRelease = response.data.release_dates.results.find(
      release => release.iso_3166_1 === 'BR'
    );

    if (!brazilRelease || !brazilRelease.release_dates.length) {
      return null;
    }

    // Priorizar certificação do cinema (type: 3)
    const cinemaRelease = brazilRelease.release_dates.find(
      release => release.type === 3
    );

    // Se não encontrar certificação do cinema, usar a primeira disponível
    const certification = cinemaRelease?.certification || brazilRelease.release_dates[0].certification;

    return certification || null;
  } catch (error) {
    console.error(`Erro ao buscar certificação para o filme ID ${movieId}:`, error);
    return null;
  }
}

async function translateText(text: string): Promise<string> {
  try {
    const response = await axios.post<GoogleTranslateResponse>(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
      {
        q: text,
        source: 'en',
        target: 'pt',
        format: 'text'
      }
    );

    return response.data.data.translations[0].translatedText;
  } catch (error) {
    console.error(`Erro ao traduzir texto "${text}":`, error);
    return text; // Retorna o texto original em caso de erro
  }
}

async function getMovieKeywords(movieId: number): Promise<string[]> {
  try {
    const response = await axios.get<TMDBKeywordsResponse>(`${TMDB_API_URL}/movie/${movieId}/keywords`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });

    // Obter as palavras-chave em inglês
    const englishKeywords = response.data.keywords.map(keyword => keyword.name);

    // Traduzir cada palavra-chave para português
    const translatedKeywords = await Promise.all(
      englishKeywords.map(async (keyword) => {
        try {
          const translated = await translateText(keyword);
          // console.log(`Traduzindo: "${keyword}" -> "${translated}"`);
          return translated;
        } catch (error) {
          console.error(`Erro ao traduzir palavra-chave "${keyword}":`, error);
          return keyword;
        }
      })
    );

    return translatedKeywords;
  } catch (error) {
    console.error(`Erro ao buscar palavras-chave para o filme ID ${movieId}:`, error);
    return [];
  }
}

async function searchMovie(title: string, year?: number): Promise<{ movie: TMDBMovie; reflection: string; platforms: string[]; director: string | null; certification: string | null; keywords: string[] } | null> {
  try {
    console.log(`Buscando filme no TMDB: ${title}${year ? ` (${year})` : ''}`);
    
    // Remover o ano do título se existir
    const cleanTitle = title.replace(/\s*\d{4}$/, '').trim();
    
    // Tentar primeiro com o título em português
    let response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR',
        query: cleanTitle,
        year: year,
        page: 1
      }
    });

    // Se não encontrar, traduzir para inglês e tentar novamente
    if (response.data.results.length === 0) {
      console.log(`Traduzindo título para inglês...`);
      const translatedTitle = await translateText(cleanTitle);
      console.log(`Título traduzido: ${translatedTitle}`);
      
      response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'pt-BR',
          query: translatedTitle,
          year: year,
          page: 1
        }
      });
    }

    // Se ainda não encontrar, tentar uma busca mais flexível
    if (response.data.results.length === 0) {
      console.log(`Tentando busca mais flexível para: ${cleanTitle}`);
      response = await axios.get<TMDBResponse>(`${TMDB_API_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'pt-BR',
          query: cleanTitle,
          page: 1
        }
      });
    }

    if (response.data.results.length === 0) {
      console.log(`Nenhum resultado encontrado para: ${title}`);
      return null;
    }

    // Mostrar resultados encontrados
    console.log('\nResultados encontrados:');
    response.data.results.slice(0, 5).forEach((movie, index) => {
      const releaseYear = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 'N/A';
      console.log(`${index + 1}. ${movie.title} (${movie.original_title}) - ${releaseYear}`);
    });

    // Função para calcular similaridade entre strings
    function calculateSimilarity(str1: string, str2: string): number {
      const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
      const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Se uma string contém a outra, retorna alta similaridade
      if (s1.includes(s2) || s2.includes(s1)) {
        return 0.8;
      }
      
      // Contar palavras em comum
      const words1 = s1.split(/\s+/);
      const words2 = s2.split(/\s+/);
      const commonWords = words1.filter(word => words2.includes(word));
      
      return commonWords.length / Math.max(words1.length, words2.length);
    }

    // Verificar se encontramos o filme correto
    const movie = response.data.results.find(m => {
      const releaseYear = m.release_date ? parseInt(m.release_date.split('-')[0]) : null;
      
      // Verificar se o ano corresponde
      if (year && releaseYear !== year) {
        return false;
      }

      // Calcular similaridade entre os títulos
      const titleSimilarity = calculateSimilarity(cleanTitle, m.title);
      const originalTitleSimilarity = calculateSimilarity(cleanTitle, m.original_title);
      
      // Se a similaridade for alta o suficiente, considera como match
      const isMatch = titleSimilarity > 0.6 || originalTitleSimilarity > 0.6;
      
      if (isMatch) {
        console.log(`Match encontrado: ${m.title} (similaridade: ${Math.max(titleSimilarity, originalTitleSimilarity).toFixed(2)})`);
      }

      return isMatch;
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

    // Buscar os diretores
    const directors = await getMovieDirectors(movie.id);
    if (directors) {
      console.log(`Diretores encontrados: ${directors}`);
    }

    // Buscar palavras-chave
    const keywords = await getMovieKeywords(movie.id);
    console.log(`Palavras-chave encontradas: ${keywords.join(', ')}`);
    
    // Buscar informações de streaming
    const platforms = await getMovieStreamingInfo(movie.id);
    
    // Buscar certificação brasileira
    const certification = await getBrazilianCertification(movie.id);
    
    // Gerar reflexão
    const reflection = await generateReflectionWithOpenAI({ ...movie, genres: details.data.genres }, keywords);

    return {
      movie: { ...movie, genres: details.data.genres },
      reflection,
      platforms,
      director: directors || null,
      certification,
      keywords
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

      // Ignorar linhas em branco ou comentários
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }
      
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
          const { movie, reflection, platforms, director, certification, keywords } = result;
          console.log(`Filme encontrado no TMDB: ${movie.title} (${movie.release_date})`);
          console.log(`Título original: ${movie.original_title}`);
          console.log(`Diretores: ${director || 'Não encontrado'}`);
          console.log(`Reflexão gerada: ${reflection}`);
          console.log(`Plataformas encontradas: ${platforms.join(', ')}`);
          console.log(`Certificação: ${certification || 'Não disponível'}`);
          console.log(`Palavras-chave: ${keywords.join(', ')}`);
          console.log(`Média de votos: ${movie.vote_average}`);
          console.log(`Total de votos: ${movie.vote_count}`);
          console.log(`Adulto: ${movie.adult}`);
          
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
            const existingSuggestion = await prisma.movieSuggestionFlow.findFirst({
              where: {
                AND: [
                  { journeyOptionFlowId: parsedJourneyOptionFlowId },
                  { movieId: existingMovie.id }
                ]
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
            director: director || null,
            vote_average: movie.vote_average,
            vote_count: movie.vote_count,
            adult: movie.adult,
            certification: certification,
            keywords: keywords
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
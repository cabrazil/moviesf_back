import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { searchMovie } from './populateMovies';
import natural from 'natural';

const prisma = new PrismaClient();
const tokenizer = new natural.AggressiveTokenizer();
const TfIdf = natural.TfIdf;

// Stopwords em português
const stopwords = [
  'da', 'de', 'do', 'das', 'dos', 'e', 'é', 'um', 'uma', 'o', 'a',
  'as', 'os', 'no', 'na', 'nos', 'nas', 'pelo', 'pela', 'pelos', 'pelas',
  'com', 'sem', 'por', 'para', 'em', 'entre', 'até', 'após', 'antes',
  'durante', 'contra', 'sobre', 'sob', 'ante', 'após', 'até', 'com',
  'contra', 'de', 'desde', 'em', 'entre', 'para', 'perante', 'por',
  'sem', 'sob', 'sobre', 'trás'
];

// Palavras que devem ser mantidas mesmo que não sejam adjetivos/substantivos
const keepWords = [
  'pobre', 'rico', 'forte', 'fraco', 'bom', 'mau', 'feliz', 'triste',
  'alegre', 'triste', 'corajoso', 'covarde', 'honesto', 'mentiroso',
  'sincero', 'falso', 'justo', 'injusto', 'humilde', 'orgulhoso'
];

interface KeywordMatch {
  keyword: string;
  subSentiment: string;
  genre: string;
  score: number;
}

interface TMDBMovieResponse {
  overview: string;
  [key: string]: any;
}

// Função para normalizar texto
function normalizeText(text: string): string {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, ' '); // Remove pontuação
}

// Função para verificar se uma palavra é um adjetivo ou substantivo
function isRelevantWord(word: string): boolean {
  // Palavras que sabemos que são relevantes
  if (keepWords.includes(word)) {
    return true;
  }

  // Sufixos comuns de adjetivos em português
  const adjectiveSuffixes = [
    'oso', 'osa', 'oso', 'osa', // corajoso, mentiroso
    'vel', 'vel', // possível, incrível
    'al', 'al', // natural, especial
    'ico', 'ica', // mágico, cómico
    'ivo', 'iva', // ativo, passivo
    'ante', 'ente', // importante, diferente
    'oso', 'osa', // perigoso, maravilhoso
    'al', 'al', // natural, especial
    'ar', 'ar', // particular, singular
    'il', 'il', // fácil, difícil
    'vel', 'vel', // possível, incrível
    'ico', 'ica', // mágico, cómico
    'ivo', 'iva', // ativo, passivo
    'ante', 'ente', // importante, diferente
    'oso', 'osa', // perigoso, maravilhoso
    'al', 'al', // natural, especial
    'ar', 'ar', // particular, singular
    'il', 'il', // fácil, difícil
  ];

  // Sufixos comuns de substantivos em português
  const nounSuffixes = [
    'ção', 'são', // ação, emoção
    'dade', 'tude', // liberdade, atitude
    'ismo', 'ismo', // realismo, idealismo
    'agem', 'agem', // coragem, viagem
    'or', 'or', // amor, valor
    'or', 'or', // amor, valor
    'or', 'or', // amor, valor
    'or', 'or', // amor, valor
    'or', 'or', // amor, valor
    'or', 'or', // amor, valor
  ];

  // Verificar se a palavra termina com algum dos sufixos
  return adjectiveSuffixes.some(suffix => word.endsWith(suffix)) ||
         nounSuffixes.some(suffix => word.endsWith(suffix));
}

// Função para verificar relevância da keyword
function isKeywordRelevant(keyword: string, genre: string, subSentiment: string): boolean {
  // Palavras-chave específicas por gênero/SubSentiment
  const relevantKeywords: Record<string, Record<string, string[]>> = {
    'Comédia': {
      'Leveza e Diversão': ['diversão', 'alegria', 'humor', 'descontração', 'aventura', 'engraçado', 'divertido'],
      'Sátira e Crítica Social': ['sátira', 'crítica', 'ironia', 'paródia', 'mentiroso', 'enganar', 'covarde', 'pobre', 'desigualdade']
    },
    'Drama': {
      'Contemplação e Reflexão': ['reflexão', 'contemplação', 'introspecção', 'humanidade', 'emoção', 'sentimento'],
      'Superação e Crescimento': ['superação', 'crescimento', 'transformação', 'desafio', 'luta', 'conquista']
    },
    'Fantasia': {
      'Magia e Sobrenatural': ['magia', 'sobrenatural', 'milagre', 'aparição', 'divino', 'salvação'],
      'Mundo Imaginário': ['imaginário', 'fantasia', 'sonho', 'ilusão', 'realidade alternativa']
    }
  };

  const genreKeywords = relevantKeywords[genre]?.[subSentiment] || [];
  return genreKeywords.some((k: string) => keyword.includes(k) || k.includes(keyword));
}

async function extractKeywordsFromSynopsis(movieTitle: string, year?: number) {
  try {
    console.log(`\n=== Extraindo keywords da sinopse de ${movieTitle} ===`);

    // 1. Buscar filme no TMDB
    const movieResult = await searchMovie(movieTitle, year);
    if (!movieResult) {
      console.error('❌ Filme não encontrado no TMDB');
      return;
    }

    const { movie } = movieResult;
    console.log(`\nFilme encontrado: ${movie.title}`);
    console.log(`Gêneros: ${movie.genres.map(g => g.name).join(', ')}`);

    // 2. Buscar sinopse do filme
    const tmdbResponse = await axios.get<TMDBMovieResponse>(
      `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`
    );

    const synopsis = tmdbResponse.data.overview;
    console.log('\nSinopse:', synopsis);

    // 3. Tokenizar e normalizar o texto
    const normalizedSynopsis = normalizeText(synopsis);
    const tokens = tokenizer.tokenize(normalizedSynopsis)
      .filter(token => 
        !stopwords.includes(token) && 
        token.length > 2 &&
        isRelevantWord(token)
      );
    
    console.log('\nTokens encontrados:', tokens);

    // 4. Buscar SubSentiments existentes
    const subSentiments = await prisma.subSentiment.findMany({
      include: {
        genres: {
          include: {
            genre: true
          }
        },
        mainSentiment: true
      }
    });

    // 5. Filtrar SubSentiments apenas dos gêneros do filme
    const movieGenreNames = movie.genres.map(g => g.name);
    const relevantSubSentiments = subSentiments.filter(ss => 
      ss.genres.some(g => movieGenreNames.includes(g.genre.name))
    );

    // 6. Criar TF-IDF para análise
    const tfidf = new TfIdf();
    tfidf.addDocument(normalizedSynopsis);

    // 7. Analisar matches com keywords existentes
    const matches: KeywordMatch[] = [];
    const newKeywords: Set<string> = new Set();

    for (const subSentiment of relevantSubSentiments) {
      for (const keyword of subSentiment.keywords) {
        const normalizedKeyword = normalizeText(keyword);
        const keywordTokens = tokenizer.tokenize(normalizedKeyword)
          .filter(token => 
            !stopwords.includes(token) && 
            token.length > 2 &&
            isRelevantWord(token)
          );
        
        // Verificar se a keyword está na sinopse
        if (keywordTokens.some(token => tokens.includes(token))) {
          // Adicionar match para cada gênero do SubSentiment
          for (const genreRelation of subSentiment.genres) {
            if (movieGenreNames.includes(genreRelation.genre.name)) {
              matches.push({
                keyword,
                subSentiment: subSentiment.name,
                genre: genreRelation.genre.name,
                score: 1.0
              });
            }
          }
        }
      }
    }

    // 8. Identificar novas keywords potenciais
    const tfidfScores = tfidf.listTerms(0);
    for (const term of tfidfScores) {
      if (term.tfidf > 0.1 && 
          !stopwords.includes(term.term) && 
          term.term.length > 2 &&
          isRelevantWord(term.term)) {
        newKeywords.add(term.term);
      }
    }

    // 9. Exibir resultados
    console.log('\n=== Matches encontrados ===');
    for (const match of matches) {
      console.log(`\n- ${match.genre} > ${match.subSentiment}:`);
      console.log(`  Keyword: ${match.keyword}`);
      console.log(`  Score: ${match.score}`);
    }

    console.log('\n=== Novas keywords potenciais ===');
    console.log(Array.from(newKeywords).join(', '));

    // 10. Propor atualizações
    if (newKeywords.size > 0) {
      console.log('\n=== Sugestões de atualização ===');
      for (const subSentiment of relevantSubSentiments) {
        for (const genreRelation of subSentiment.genres) {
          if (movieGenreNames.includes(genreRelation.genre.name)) {
            const relevantNewKeywords = Array.from(newKeywords).filter(keyword => 
              isKeywordRelevant(keyword, genreRelation.genre.name, subSentiment.name)
            );

            if (relevantNewKeywords.length > 0) {
              console.log(`\nPara ${genreRelation.genre.name} > ${subSentiment.name}:`);
              console.log(relevantNewKeywords.join(', '));
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro ao extrair keywords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
if (require.main === module) {
  const movieTitle = process.argv[2];
  const year = process.argv[3] ? parseInt(process.argv[3]) : undefined;

  if (!movieTitle) {
    console.error('❌ Uso: ts-node extractKeywordsFromSynopsis.ts <movieTitle> [year]');
    process.exit(1);
  }

  extractKeywordsFromSynopsis(movieTitle, year);
} 
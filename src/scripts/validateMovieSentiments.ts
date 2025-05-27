import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { searchMovie } from './populateMovies';
import natural from 'natural';

const prisma = new PrismaClient();
const tokenizer = new natural.AggressiveTokenizer();
const TfIdf = natural.TfIdf;

// Tipos de fluxo disponíveis
type UserFlow = 'trending' | 'genre' | 'visual' | 'quick';

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

// Dicionário de sinônimos e variações
const synonyms: Record<string, string[]> = {
  'divertido': ['diversão', 'humor', 'alegria', 'descontração', 'leveza'],
  'pobre': ['desigualdade', 'injustiça', 'miséria', 'fome', 'necessidade'],
  'mentiroso': ['engano', 'trapaça', 'crítica', 'hipocrisia', 'falsidade'],
  'covarde': ['medo', 'fraqueza', 'crítica', 'preconceito'],
  'nordestino': ['sertão', 'nordeste', 'regional', 'tradição', 'cultura'],
  'sertanejo': ['nordeste', 'sertão', 'regional', 'tradição'],
  'vilarejo': ['cidade pequena', 'interior', 'comunidade', 'sociedade'],
  'salvação': ['religião', 'fé', 'espiritual', 'milagre', 'divino'],
  'engano': ['mentira', 'trapaça', 'crítica', 'sátira'],
  'luta': ['superação', 'desafio', 'conquista', 'vitória'],
  'pão': ['fome', 'necessidade', 'sobrevivência', 'pobreza'],
  'sertão': ['nordeste', 'regional', 'tradição', 'cultura'],
  'pequeno': ['humilde', 'simples', 'pobre'],
  'aparição': ['religião', 'fé', 'espiritual', 'divino'],
  'adaptação': ['arte', 'cultura', 'literatura', 'teatro']
};

interface ValidateMovieParams {
  mainSentiment: string;
  movieTitle: string;
  year?: number;
  flow: UserFlow;
  genre?: string;
  director?: string;
}

interface MatchResult {
  score: number;
  matchedKeywords: string[];
  relatedKeywords: string[];
}

interface KeywordWithWeight {
  keyword: string;
  weight: number;
  relatedKeywords: string[];
}

interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  genres: { id: number; name: string }[];
  runtime: number;
  popularity: number;
}

interface TMDBMovieResponse {
  overview: string;
  runtime: number;
  popularity: number;
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
  ];

  // Sufixos comuns de substantivos em português
  const nounSuffixes = [
    'ção', 'são', // ação, emoção
    'dade', 'tude', // liberdade, atitude
    'ismo', 'ismo', // realismo, idealismo
    'agem', 'agem', // coragem, viagem
    'or', 'or', // amor, valor
  ];

  // Verificar se a palavra termina com algum dos sufixos
  return adjectiveSuffixes.some(suffix => word.endsWith(suffix)) ||
         nounSuffixes.some(suffix => word.endsWith(suffix));
}

// Função para encontrar palavras similares
function findSimilarWords(word: string, targetWords: string[]): string[] {
  const normalizedWord = normalizeText(word);
  const matches: string[] = [];

  // Verificar sinônimos diretos
  if (synonyms[normalizedWord]) {
    matches.push(...synonyms[normalizedWord]);
  }

  // Verificar se a palavra é similar a alguma das palavras alvo
  for (const target of targetWords) {
    const normalizedTarget = normalizeText(target);
    
    // Match exato
    if (normalizedWord === normalizedTarget) {
      matches.push(target);
      continue;
    }

    // Match parcial (uma palavra contém a outra)
    if (normalizedWord.includes(normalizedTarget) || normalizedTarget.includes(normalizedWord)) {
      matches.push(target);
      continue;
    }

    // Verificar sinônimos das palavras alvo
    if (synonyms[normalizedTarget]?.some(syn => normalizedWord.includes(syn) || syn.includes(normalizedWord))) {
      matches.push(target);
    }

    // Verificar palavras relacionadas semanticamente
    const relatedWords = getSemanticallyRelatedWords(normalizedWord);
    if (relatedWords.some(related => normalizedTarget.includes(related) || related.includes(normalizedTarget))) {
      matches.push(target);
    }
  }

  return [...new Set(matches)];
}

// Função para obter palavras semanticamente relacionadas
function getSemanticallyRelatedWords(word: string): string[] {
  const relatedWords: string[] = [];
  
  // Mapeamento de palavras relacionadas semanticamente
  const semanticMap: Record<string, string[]> = {
    'triste': ['melancólico', 'deprimido', 'abatido', 'desanimado', 'desolado'],
    'solidão': ['isolamento', 'abandono', 'desamparo', 'solitário', 'sozinho'],
    'dor': ['sofrimento', 'angústia', 'aflição', 'tristeza', 'pesar'],
    'perda': ['luto', 'saudade', 'falta', 'ausência', 'privação'],
    'abandono': ['desamparo', 'isolamento', 'solidão', 'rejeição', 'desprezo'],
    'violência': ['agressão', 'abuso', 'crueldade', 'brutalidade', 'opressão'],
    'injustiça': ['opressão', 'discriminação', 'preconceito', 'desigualdade', 'exploração'],
    'esperança': ['fé', 'confiança', 'otimismo', 'perseverança', 'resistência'],
    'superação': ['resiliência', 'força', 'coragem', 'determinação', 'luta'],
    'amor': ['afeto', 'carinho', 'ternura', 'dedicação', 'apego']
  };

  // Adicionar palavras relacionadas do mapa semântico
  for (const [key, values] of Object.entries(semanticMap)) {
    if (word.includes(key) || key.includes(word)) {
      relatedWords.push(...values);
    }
  }

  return [...new Set(relatedWords)];
}

// Função para extrair keywords da sinopse
async function extractKeywordsFromSynopsis(synopsis: string): Promise<string[]> {
  const words = synopsis.toLowerCase().split(/\s+/);
  const keywords = new Set<string>();
  
  // Extrair palavras emocionais
  words.forEach(word => {
    if (isEmotionalWord(word)) {
      keywords.add(word);
    }
  });

  // Extrair frases emocionais
  const emotionalPhrases = extractEmotionalPhrases(synopsis);
  emotionalPhrases.forEach(phrase => {
    keywords.add(phrase);
  });

  return Array.from(keywords);
}

// Função para verificar se uma palavra tem carga emocional
function isEmotionalWord(word: string): boolean {
  const emotionalWords = [
    'triste', 'solitário', 'calado', 'violento', 'abusivo',
    'separado', 'escravo', 'compartilhar', 'carta', 'filhos',
    'mãe', 'pai', 'marido', 'companheira', 'tristeza'
  ];
  return emotionalWords.some(emotionalWord => 
    word.toLowerCase().includes(emotionalWord.toLowerCase())
  );
}

// Função para extrair frases emocionais da sinopse
function extractEmotionalPhrases(synopsis: string): string[] {
  const emotionalPatterns = [
    /cada vez mais calada e solitária/i,
    /compartilhar sua tristeza/i,
    /violentada pelo próprio pai/i,
    /trata como companheira e escrava/i,
    /separada dos filhos/i,
    /torna-se mãe/i,
    /passa a compartilhar/i,
    /cada vez mais/i,
    /tristeza em carta/i
  ];

  const phrases: string[] = [];
  emotionalPatterns.forEach(pattern => {
    const match = synopsis.match(pattern);
    if (match) {
      phrases.push(match[0]);
    }
  });

  return phrases;
}

function calculateMatchScore(keywords: string[], sentimentKeywords: KeywordWithWeight[]): MatchResult {
  const matchedKeywords: string[] = [];
  const relatedKeywords: string[] = [];
  let totalScore = 0;
  let matchCount = 0;

  console.log('\nDebug - Keywords do filme:', keywords);
  console.log('Debug - Keywords dos SubSentiments:', sentimentKeywords.map(k => k.keyword));

  for (const movieKeyword of keywords) {
    const normalizedMovieKeyword = movieKeyword.toLowerCase().trim();
    console.log(`\nDebug - Comparando keyword do filme: "${normalizedMovieKeyword}"`);
    
    // Encontrar palavras similares para a keyword do filme
    const similarWords = findSimilarWords(normalizedMovieKeyword, sentimentKeywords.map(k => k.keyword));
    
    if (similarWords.length > 0) {
      console.log(`Debug - ✅ Palavras similares encontradas: ${similarWords.join(', ')}`);
      
      for (const similarWord of similarWords) {
        const sentimentKeyword = sentimentKeywords.find(k => k.keyword === similarWord);
        if (sentimentKeyword) {
          matchedKeywords.push(movieKeyword);
          totalScore += sentimentKeyword.weight;
          matchCount++;
        }
      }
    }
    
    // Verificar matches relacionados
    for (const sentimentKeyword of sentimentKeywords) {
      const relatedWords = findSimilarWords(normalizedMovieKeyword, sentimentKeyword.relatedKeywords);
      if (relatedWords.length > 0) {
        console.log(`Debug - ✅ Palavras relacionadas encontradas: ${relatedWords.join(', ')}`);
        relatedKeywords.push(movieKeyword);
        totalScore += sentimentKeyword.weight * 0.5; // Peso menor para keywords relacionadas
        matchCount++;
      }
    }
  }

  const finalScore = matchCount > 0 ? totalScore / matchCount : 0;
  console.log(`\nDebug - Score final: ${finalScore}`);
  console.log('Debug - Keywords correspondentes:', matchedKeywords);
  console.log('Debug - Keywords relacionadas:', relatedKeywords);
  
  return {
    score: finalScore,
    matchedKeywords: [...new Set(matchedKeywords)],
    relatedKeywords: [...new Set(relatedKeywords)]
  };
}

export async function validateMovieSentiments(params: ValidateMovieParams) {
  try {
    console.log(`\n=== Validando filme para ${params.mainSentiment} ===`);
    console.log(`Filme: ${params.movieTitle}${params.year ? ` (${params.year})` : ''}`);
    console.log(`Fluxo: ${params.flow}`);
    if (params.genre) {
      console.log(`Gênero: ${params.genre}`);
    }
    if (params.director) {
      console.log(`Diretor: ${params.director}`);
    }

    // 1. Buscar o filme no TMDB
    const movieResult = await searchMovie(params.movieTitle, params.year);
    if (!movieResult) {
      console.error('❌ Filme não encontrado no TMDB');
      return { success: false };
    }

    const { movie, keywords: tmdbKeywords } = movieResult;
    console.log(`\nFilme encontrado: ${movie.title}`);
    console.log(`Gêneros: ${movie.genres.map(g => g.name).join(', ')}`);
    console.log(`Keywords do TMDB: ${tmdbKeywords.join(', ')}`);

    // 2. Extrair keywords da sinopse
    const synopsisKeywords = await extractKeywordsFromSynopsis(movie.overview);
    
    // 3. Combinar keywords do TMDB com as extraídas da sinopse
    const allKeywords = [...new Set([...tmdbKeywords, ...synopsisKeywords])];
    console.log('\nKeywords combinadas:', allKeywords);

    // 4. Validar o filme de acordo com o fluxo escolhido
    let isValidForFlow = false;
    switch (params.flow) {
      case 'genre':
        if (!params.genre) {
          console.error('❌ Gênero é obrigatório para o fluxo de gênero');
          return { success: false };
        }
        isValidForFlow = movie.genres.some(g => g.name.toLowerCase() === params.genre?.toLowerCase());
        if (!isValidForFlow) {
          console.log(`\n❌ O filme não pertence ao gênero ${params.genre}`);
          return { success: false };
        }
        console.log(`\n✅ Gênero ${params.genre} confirmado`);
        break;

      case 'visual':
        // Verificar se o filme tem elementos visuais interessantes
        const visualKeywords = ['cinematografia', 'direção', 'fotografia', 'arte', 'design', 'visual'];
        const hasVisualElements = allKeywords.some(k => visualKeywords.some(vk => k.includes(vk)));
        if (!hasVisualElements) {
          console.log('\n❌ O filme não parece ter elementos visuais significativos');
          return { success: false };
        }
        console.log('\n✅ Elementos visuais encontrados');
        break;

      case 'quick':
        // Verificar se o filme é curto (menos de 100 minutos)
        const movieDetails = await axios.get<TMDBMovieResponse>(
          `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`
        );
        if (movieDetails.data.runtime > 100) {
          console.log('\n❌ O filme é muito longo para o fluxo de filme rápido');
          return { success: false };
        }
        console.log('\n✅ Duração adequada para filme rápido');
        break;

      case 'trending':
        // Verificar se o filme está em alta (baseado em popularidade do TMDB)
        const trendingDetails = await axios.get<TMDBMovieResponse>(
          `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${process.env.TMDB_API_KEY}&language=pt-BR`
        );
        if (trendingDetails.data.popularity < 50) {
          console.log('\n❌ O filme não está em alta no momento');
          return { success: false };
        }
        console.log('\n✅ Filme está em alta');
        break;
    }

    // 5. Buscar MainSentiment
    const mainSentiment = await prisma.mainSentiment.findFirst({
      where: { name: params.mainSentiment }
    });

    if (!mainSentiment) {
      console.error(`❌ MainSentiment "${params.mainSentiment}" não encontrado`);
      return { success: false };
    }

    console.log(`\nMainSentiment: ${mainSentiment.name}`);

    // 6. Buscar gêneros do filme no banco
    const movieGenres = await prisma.genre.findMany({
      where: {
        OR: movie.genres.map(g => ({
          name: {
            equals: g.name,
            mode: 'insensitive'
          }
        }))
      }
    });

    console.log('\nGêneros encontrados no banco:', movieGenres.map(g => g.name));

    // 7. Buscar SubSentiments relacionados aos gêneros do filme
    const genreSubSentiments = await prisma.genreSubSentiment.findMany({
      where: {
        genreId: {
          in: movieGenres.map(g => g.id)
        },
        subSentiment: {
          mainSentimentId: mainSentiment.id
        }
      },
      include: {
        subSentiment: true,
        genre: true
      }
    });

    console.log('\nSubSentiments encontrados por gênero:');
    if (genreSubSentiments.length === 0) {
      console.log('❌ Nenhum SubSentiment encontrado para os gêneros do filme');
      return { success: false };
    } else {
      for (const gs of genreSubSentiments) {
        console.log(`\n- ${gs.genre.name}: ${gs.subSentiment.name}`);
        console.log(`  Keywords: ${gs.subSentiment.keywords.join(', ')}`);
      }
    }

    // 8. Calcular scores para os SubSentiments
    const subSentimentScores = new Map<number, MatchResult>();
    
    for (const gs of genreSubSentiments) {
      const subSentiment = gs.subSentiment;
      console.log(`\nCalculando score para ${gs.genre.name} > ${subSentiment.name}`);
      console.log(`Keywords do SubSentiment: ${subSentiment.keywords.join(', ')}`);
      
      const subSentimentKeywords = subSentiment.keywords.map(k => ({
        keyword: k,
        weight: 1.0,
        relatedKeywords: []
      }));

      const score = calculateMatchScore(allKeywords, subSentimentKeywords);
      console.log(`Score calculado: ${score.score}`);
      console.log(`Keywords correspondentes: ${score.matchedKeywords.join(', ')}`);
      console.log(`Keywords relacionadas: ${score.relatedKeywords.join(', ')}`);
      
      if (score.score > 0) {
        subSentimentScores.set(subSentiment.id, score);
      }
    }

    // 9. Exibir resultados
    if (subSentimentScores.size > 0) {
      console.log('\n✅ Matches encontrados:');
      
      console.log('\nSubSentiments por gênero:');
      for (const [subId, result] of subSentimentScores) {
        const gs = genreSubSentiments.find(gs => gs.subSentiment.id === subId);
        if (gs) {
          console.log(`\n- ${gs.genre.name} > ${gs.subSentiment.name}:`);
          console.log(`  Score: ${result.score.toFixed(2)}`);
          if (result.matchedKeywords.length > 0) {
            console.log(`  Keywords correspondentes: ${result.matchedKeywords.join(', ')}`);
          }
          if (result.relatedKeywords.length > 0) {
            console.log(`  Keywords relacionadas: ${result.relatedKeywords.join(', ')}`);
          }
        }
      }

      // 10. Verificar se o filme já existe no banco
      const movieYear = new Date(movie.release_date).getFullYear();
      const existingMovie = await prisma.movie.findFirst({
        where: {
          title: movie.title,
          year: movieYear
        }
      });

      if (!existingMovie) {
        console.log('\n❌ Filme não encontrado no banco de dados. Execute primeiro o script de população de filmes.');
        return { success: false };
      }

      // 11. Criar registros na MovieSentiment
      for (const [subId, result] of subSentimentScores) {
        // Verificar se o registro já existe
        const existingSentiment = await prisma.movieSentiment.findFirst({
          where: {
            movieId: existingMovie.id,
            mainSentimentId: mainSentiment.id,
            subSentimentId: subId
          }
        });

        if (!existingSentiment) {
          await prisma.movieSentiment.create({
            data: {
              movieId: existingMovie.id,
              mainSentimentId: mainSentiment.id,
              subSentimentId: subId
            }
          });
        } else {
          console.log(`\nRegistro já existe para o SubSentiment ID: ${subId}`);
        }
      }
      console.log('\n✅ Registros criados com sucesso!');
      return { success: true, score: Array.from(subSentimentScores.values()).reduce((acc, curr) => acc + curr.score, 0) / subSentimentScores.size, matchedKeywords: Array.from(subSentimentScores.values()).flatMap(s => s.matchedKeywords), relatedKeywords: Array.from(subSentimentScores.values()).flatMap(s => s.relatedKeywords) };
    } else {
      console.log('\n❌ Nenhum match encontrado para este filme');
      return { success: false };
    }

  } catch (error) {
    console.error('❌ Erro ao validar filme:', error);
    return { success: false };
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
if (require.main === module) {
  const mainSentiment = process.argv[2];
  const movieTitle = process.argv[3];
  const year = process.argv[4] ? parseInt(process.argv[4]) : undefined;
  const flow = process.argv[5] as UserFlow;
  const genre = process.argv[6];
  const director = process.argv[7];

  if (!mainSentiment || !movieTitle || !flow) {
    console.error('❌ Uso: ts-node validateMovieSentiments.ts <mainSentiment> <movieTitle> [year] <flow> [genre] [director]');
    console.error('Fluxos disponíveis: trending, genre, visual, quick');
    process.exit(1);
  }

  validateMovieSentiments({ mainSentiment, movieTitle, year, flow, genre, director });
} 
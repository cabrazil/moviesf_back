// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

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
  'divórcio': ['separação', 'rompimento', 'dissolução', 'fim do casamento', 'término'],
  'família': ['parentesco', 'relacionamento familiar', 'laços familiares', 'parentes'],
  'abandono': ['desamparo', 'isolamento', 'solidão', 'rejeição', 'desprezo'],
  'custódia': ['guarda', 'responsabilidade', 'cuidado', 'proteção', 'tutela'],
  'filhos': ['crianças', 'prole', 'descendentes', 'menores'],
  'casamento': ['união', 'relacionamento', 'vida a dois', 'matrimônio'],
  'relacionamento': ['vínculo', 'conexão', 'laço', 'união'],
  'drama': ['dramático', 'emocional', 'intenso', 'profundo'],
  'superação': ['resiliência', 'força', 'coragem', 'determinação'],
  'crescimento': ['desenvolvimento', 'evolução', 'mudança', 'transformação'],
  'reflexão': ['contemplação', 'introspecção', 'análise', 'pensamento'],
  'emoção': ['sentimento', 'afeto', 'paixão', 'sensibilidade'],
  'humanidade': ['natureza humana', 'condição humana', 'essência', 'existência'],
  'experiência': ['vivência', 'aprendizado', 'conhecimento', 'sabedoria'],
  'desafio': ['obstáculo', 'dificuldade', 'provação', 'teste'],
  'conquista': ['vitória', 'realização', 'sucesso', 'alcançar'],
  'transformação': ['mudança', 'evolução', 'metamorfose', 'transição'],
  'desenvolvimento': ['crescimento', 'progresso', 'avanço', 'evolução'],
  'aprendizado': ['conhecimento', 'sabedoria', 'experiência', 'ensino'],
  'vitória': ['sucesso', 'conquista', 'triunfo', 'realização'],
  // Novos sinônimos para termos técnicos e científicos
  'matemático': ['matemática', 'cálculo', 'lógica', 'raciocínio', 'análise'],
  'gênio': ['inteligente', 'brilhante', 'excepcional', 'extraordinário', 'notável'],
  'criptografia': ['código', 'criptografia', 'encriptação', 'segurança', 'proteção'],
  'códigos': ['código', 'criptografia', 'encriptação', 'segurança', 'proteção'],
  'lógico': ['racional', 'analítico', 'sistemático', 'metódico', 'científico'],
  'análise': ['estudo', 'investigação', 'pesquisa', 'exame', 'observação'],
  'investigação': ['pesquisa', 'estudo', 'análise', 'exame', 'observação'],
  'ciência': ['científico', 'tecnologia', 'pesquisa', 'estudo', 'análise'],
  'tecnologia': ['técnico', 'científico', 'inovação', 'avanço', 'progresso'],
  'inteligência': ['inteligente', 'brilhante', 'genial', 'excepcional', 'extraordinário'],
  'segunda guerra mundial': ['guerra', 'conflito', 'histórico', 'militar', 'batalha'],
  'biografia': ['história', 'vida', 'trajetória', 'jornada', 'experiência'],
  'homossexualidade': ['orientação', 'identidade', 'diversidade', 'aceitação', 'respeito'],
  'lgbt': ['diversidade', 'orientação', 'identidade', 'aceitação', 'respeito'],
  'quebra de código': ['criptografia', 'encriptação', 'segurança', 'proteção', 'código', 'mistério'],
  'gênio da matemática': ['matemático', 'inteligente', 'brilhante', 'excepcional', 'extraordinário'],
  // Novos sinônimos para filmes românticos e dramas independentes
  'cadeira': ['móvel', 'assento', 'conforto', 'descanso', 'repouso'],
  'alfândega': ['imigração', 'fronteira', 'burocracia', 'documentos', 'visto'],
  'visto de estudante': ['estudante', 'educação', 'aprendizado', 'universidade', 'faculdade'],
  'pais': ['família', 'parentes', 'parentesco', 'relacionamento familiar', 'laços familiares'],
  'blogueiro': ['escritor', 'comunicador', 'internet', 'mídia', 'comunicação'],
  'apaixonam': ['amor', 'paixão', 'romance', 'relacionamento', 'afeto'],
  'amor': ['paixão', 'romance', 'afeto', 'carinho', 'sentimento'],
  'paixão': ['amor', 'romance', 'afeto', 'sentimento', 'emoção'],
  'romance': ['amor', 'paixão', 'relacionamento', 'afeto', 'sentimento'],
  'separação': ['distância', 'afastamento', 'ruptura', 'divórcio', 'desunião'],
  'distância': ['separação', 'afastamento', 'longe', 'distante', 'isolamento'],
  'imigração': ['fronteira', 'visto', 'documentos', 'burocracia', 'adaptação'],
  'estudante': ['educação', 'aprendizado', 'universidade', 'faculdade', 'conhecimento'],
  'educação': ['aprendizado', 'conhecimento', 'estudo', 'desenvolvimento', 'crescimento'],
  'comunicação': ['diálogo', 'conversa', 'expressão', 'linguagem', 'interação'],
  'internet': ['tecnologia', 'comunicação', 'mídia', 'digital', 'moderno'],
  'mídia': ['comunicação', 'informação', 'tecnologia', 'digital', 'moderno'],
  'burocracia': ['documentos', 'papelada', 'formalidade', 'procedimento', 'regulamento'],
  'documentos': ['papelada', 'burocracia', 'formalidade', 'procedimento', 'regulamento'],
  'fronteira': ['limite', 'separação', 'divisão', 'imigração', 'visto'],
  'adaptação': ['mudança', 'transformação', 'evolução', 'ajuste', 'flexibilidade'],
  'isolamento': ['solidão', 'separação', 'afastamento', 'distância', 'isolamento'],
  'solidão': ['isolamento', 'sozinho', 'solitário', 'afastamento', 'distância']
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

// Adicionar interfaces para as relações
interface GenreSubSentimentWithRelations {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  subSentimentId: number;
  genreId: number;
  subSentiment: {
    id: number;
    name: string;
    keywords: string[];
  };
  genre: {
    id: number;
    name: string;
  };
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
    if (synonyms[normalizedTarget]) {
      const targetSynonyms = synonyms[normalizedTarget];
      if (targetSynonyms.some(syn => normalizedWord.includes(syn) || syn.includes(normalizedWord))) {
        matches.push(target);
      }
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
    'divórcio': ['separação', 'rompimento', 'dissolução', 'fim do casamento', 'término', 'desunião'],
    'família': ['parentesco', 'relacionamento familiar', 'laços familiares', 'parentes', 'casa', 'lar'],
    'abandono': ['desamparo', 'isolamento', 'solidão', 'rejeição', 'desprezo', 'desamparo'],
    'custódia': ['guarda', 'responsabilidade', 'cuidado', 'proteção', 'tutela', 'zelo'],
    'filhos': ['crianças', 'prole', 'descendentes', 'menores', 'herdeiros'],
    'casamento': ['união', 'relacionamento', 'vida a dois', 'matrimônio', 'aliança'],
    'relacionamento': ['vínculo', 'conexão', 'laço', 'união', 'afeto'],
    'drama': ['dramático', 'emocional', 'intenso', 'profundo', 'sentimental'],
    'superação': ['resiliência', 'força', 'coragem', 'determinação', 'persistência'],
    'crescimento': ['desenvolvimento', 'evolução', 'mudança', 'transformação', 'progresso'],
    'reflexão': ['contemplação', 'introspecção', 'análise', 'pensamento', 'meditação'],
    'emoção': ['sentimento', 'afeto', 'paixão', 'sensibilidade', 'sentimental'],
    'humanidade': ['natureza humana', 'condição humana', 'essência', 'existência', 'alma'],
    'experiência': ['vivência', 'aprendizado', 'conhecimento', 'sabedoria', 'vivencia'],
    'desafio': ['obstáculo', 'dificuldade', 'provação', 'teste', 'prova'],
    'conquista': ['vitória', 'realização', 'sucesso', 'alcançar', 'triunfo'],
    'transformação': ['mudança', 'evolução', 'metamorfose', 'transição', 'mutação'],
    'desenvolvimento': ['crescimento', 'progresso', 'avanço', 'evolução', 'melhoria'],
    'aprendizado': ['conhecimento', 'sabedoria', 'experiência', 'ensino', 'educação'],
    'vitória': ['sucesso', 'conquista', 'triunfo', 'realização', 'alcançar'],
    // Novas palavras relacionadas para termos técnicos e científicos
    'matemático': ['análise', 'lógica', 'raciocínio', 'cálculo', 'sistemático', 'metódico'],
    'gênio': ['inteligente', 'brilhante', 'excepcional', 'extraordinário', 'notável', 'genial'],
    'criptografia': ['segurança', 'proteção', 'código', 'encriptação', 'segredo', 'mistério'],
    'códigos': ['segurança', 'proteção', 'criptografia', 'encriptação', 'segredo', 'mistério'],
    'lógico': ['racional', 'analítico', 'sistemático', 'metódico', 'científico', 'preciso'],
    'análise': ['estudo', 'investigação', 'pesquisa', 'exame', 'observação', 'reflexão'],
    'investigação': ['pesquisa', 'estudo', 'análise', 'exame', 'observação', 'descoberta'],
    'ciência': ['científico', 'tecnologia', 'pesquisa', 'estudo', 'análise', 'descoberta'],
    'tecnologia': ['técnico', 'científico', 'inovação', 'avanço', 'progresso', 'moderno'],
    'inteligência': ['inteligente', 'brilhante', 'genial', 'excepcional', 'extraordinário', 'notável'],
    'segunda guerra mundial': ['guerra', 'conflito', 'histórico', 'militar', 'batalha', 'história'],
    'biografia': ['história', 'vida', 'trajetória', 'jornada', 'experiência', 'vida real'],
    'homossexualidade': ['orientação', 'identidade', 'diversidade', 'aceitação', 'respeito', 'tolerância'],
    'lgbt': ['diversidade', 'orientação', 'identidade', 'aceitação', 'respeito', 'tolerância'],
    'quebra de código': ['criptografia', 'encriptação', 'segurança', 'proteção', 'código', 'mistério'],
    'gênio da matemática': ['matemático', 'inteligente', 'brilhante', 'excepcional', 'extraordinário'],
    // Novas palavras relacionadas para filmes românticos e dramas independentes
    'cadeira': ['móvel', 'assento', 'conforto', 'descanso', 'repouso'],
    'alfândega': ['imigração', 'fronteira', 'burocracia', 'documentos', 'visto'],
    'visto de estudante': ['estudante', 'educação', 'aprendizado', 'universidade', 'faculdade'],
    'pais': ['família', 'parentes', 'parentesco', 'relacionamento familiar', 'laços familiares'],
    'blogueiro': ['escritor', 'comunicador', 'internet', 'mídia', 'comunicação'],
    'apaixonam': ['amor', 'paixão', 'romance', 'relacionamento', 'afeto'],
    'amor': ['paixão', 'romance', 'afeto', 'carinho', 'sentimento'],
    'paixão': ['amor', 'romance', 'afeto', 'sentimento', 'emoção'],
    'romance': ['amor', 'paixão', 'relacionamento', 'afeto', 'sentimento'],
    'separação': ['distância', 'afastamento', 'ruptura', 'divórcio', 'desunião'],
    'distância': ['separação', 'afastamento', 'longe', 'distante', 'isolamento'],
    'imigração': ['fronteira', 'visto', 'documentos', 'burocracia', 'adaptação'],
    'estudante': ['educação', 'aprendizado', 'universidade', 'faculdade', 'conhecimento'],
    'educação': ['aprendizado', 'conhecimento', 'estudo', 'desenvolvimento', 'crescimento'],
    'comunicação': ['diálogo', 'conversa', 'expressão', 'linguagem', 'interação'],
    'internet': ['tecnologia', 'comunicação', 'mídia', 'digital', 'moderno'],
    'mídia': ['comunicação', 'informação', 'tecnologia', 'digital', 'moderno'],
    'burocracia': ['documentos', 'papelada', 'formalidade', 'procedimento', 'regulamento'],
    'documentos': ['papelada', 'burocracia', 'formalidade', 'procedimento', 'regulamento'],
    'fronteira': ['limite', 'separação', 'divisão', 'imigração', 'visto'],
    'adaptação': ['mudança', 'transformação', 'evolução', 'ajuste', 'flexibilidade'],
    'isolamento': ['solidão', 'separação', 'afastamento', 'distância', 'isolamento'],
    'solidão': ['isolamento', 'sozinho', 'solitário', 'afastamento', 'distância']
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

function calculateMatchScore(keywords: string[], sentimentKeywords: KeywordWithWeight[], params: ValidateMovieParams): MatchResult {
  const matchedKeywords: string[] = [];
  const relatedKeywords: string[] = [];
  let totalScore = 0;
  let matchCount = 0;

  // console.log('\nDebug - Keywords do filme:', keywords);
  // console.log('Debug - Keywords dos SubSentiments:', sentimentKeywords.map(k => k.keyword));

  for (const movieKeyword of keywords) {
    const normalizedMovieKeyword = movieKeyword.toLowerCase().trim();
    
    // console.log(`\nDebug - Comparando keyword do filme: "${normalizedMovieKeyword}"`);

    // Verificar palavras similares
    const similarWords = sentimentKeywords.filter(k => 
      k.keyword.toLowerCase().trim() === normalizedMovieKeyword
    ).map(k => k.keyword);

    if (similarWords.length > 0) {
      // console.log(`Debug - ✅ Palavras similares encontradas: ${similarWords.join(', ')}`);
      matchedKeywords.push(...similarWords);
      totalScore += 1.0;
    }

    // Verificar palavras relacionadas
    const relatedWords = sentimentKeywords.filter(k => {
      const normalizedKeyword = k.keyword.toLowerCase().trim();
      return normalizedKeyword.includes(normalizedMovieKeyword) || 
             normalizedMovieKeyword.includes(normalizedKeyword) ||
             normalizedKeyword.split(' ').some(word => 
               normalizedMovieKeyword.includes(word) || word.includes(normalizedMovieKeyword)
             );
    }).map(k => k.keyword);

    if (relatedWords.length > 0) {
      // console.log(`Debug - ✅ Palavras relacionadas encontradas: ${relatedWords.join(', ')}`);
      relatedKeywords.push(...relatedWords);
      totalScore += 0.5;
    }
  }

  // console.log(`\nDebug - Score final: ${totalScore}`);
  // console.log('Debug - Keywords correspondentes:', matchedKeywords);
  // console.log('Debug - Keywords relacionadas:', relatedKeywords);
  
  return {
    score: totalScore,
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
        // Dividir os gêneros e verificar cada um
        const requestedGenres = params.genre.split(',').map(g => g.trim().toLowerCase());
        isValidForFlow = requestedGenres.every(requestedGenre => 
          movie.genres.some(g => g.name.toLowerCase() === requestedGenre)
        );
        if (!isValidForFlow) {
          console.log(`\n❌ O filme não pertence a todos os gêneros solicitados: ${params.genre}`);
          return { success: false };
        }
        console.log(`\n✅ Gêneros ${params.genre} confirmados`);
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
    const genreSubSentiments = await prisma.$queryRaw<GenreSubSentimentWithRelations[]>`
      SELECT 
        gs.id,
        gs."createdAt",
        gs."updatedAt",
        gs."subSentimentId",
        gs."genreId",
        json_build_object(
          'id', ss.id,
          'name', ss.name,
          'keywords', ss.keywords
        ) as "subSentiment",
        json_build_object(
          'id', g.id,
          'name', g.name
        ) as "genre"
      FROM "GenreSubSentiment" gs
      JOIN "SubSentiment" ss ON ss.id = gs."subSentimentId"
      JOIN "Genre" g ON g.id = gs."genreId"
      WHERE ss."mainSentimentId" = ${mainSentiment.id}
    `;

    // console.log('\nDebug - Resultado da consulta:', JSON.stringify(genreSubSentiments, null, 2));

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
        relatedKeywords: [
          // Palavras relacionadas ao sentimento neutro
          'clássico',
          'cult',
          'histórico',
          'importante',
          'relevante',
          'significativo',
          'marcante',
          'influente',
          'referência',
          'fundamental',
          'essencial',
          'crucial',
          'determinante',
          'decisivo',
          'básico',
          'elementar',
          // Novas palavras relacionadas ao sentimento neutro
          'amizade',
          'relacionamento',
          'conexão',
          'vínculo',
          'união',
          'empatia',
          'compreensão',
          'aceitação',
          'respeito',
          'tolerância',
          'convivência',
          'harmonia',
          'equilíbrio',
          'estabilidade',
          'serenidade',
          'tranquilidade',
          'paz',
          'calma',
          'contemplação',
          'observação',
          'reflexão',
          'introspecção',
          'autoconhecimento',
          'crescimento pessoal',
          'desenvolvimento',
          'evolução',
          'transformação',
          'mudança',
          'adaptação',
          'flexibilidade',
          'resiliência',
          'superação',
          'desafio',
          'conquista',
          'realização',
          'satisfação',
          'plenitude',
          'completude',
          'integridade',
          'autenticidade',
          'verdade',
          'honestidade',
          'sinceridade',
          'transparência',
          'clareza',
          'lucidez',
          'consciência',
          'percepção',
          'entendimento',
          'compreensão',
          'sabedoria',
          'experiência',
          'vivência',
          'aprendizado',
          'conhecimento',
          'descoberta',
          'exploração',
          'investigação',
          'análise',
          'estudo',
          'pesquisa',
          'busca',
          'procura',
          'encontro',
          'descoberta',
          'revelação',
          'despertar',
          'despertamento',
          'consciência',
          'atenção',
          'presença',
          'momento',
          'presente',
          'agora',
          'atual',
          'contemporâneo',
          'moderno',
          'atualizado',
          'inovador',
          'criativo',
          'original',
          'único',
          'especial',
          'diferente',
          'distinto',
          'particular',
          'singular',
          'excepcional',
          'extraordinário',
          'impressionante',
          'impactante',
          'marcante',
          'memorável',
          'inesquecível',
          'eterno',
          'permanente',
          'duradouro',
          'sustentável',
          'consistente',
          'constante',
          'regular',
          'equilibrado',
          'harmonioso',
          'integrado',
          'conectado',
          'relacionado',
          'associado',
          'vinculado',
          'ligado',
          'unido',
          'junto',
          'próximo',
          'perto',
          'distante',
          'longe',
          'separado',
          'dividido',
          'partido',
          'quebrado',
          'rompido',
          'cortado',
          'interrompido',
          'pausado',
          'parado',
          'estagnado',
          'estático',
          'imóvel',
          'fixo',
          'firme',
          'estável',
          'seguro',
          'protegido',
          'cuidado',
          'zelado',
          'preservado',
          'conservado',
          'mantido',
          'sustentado',
          'apoiado',
          'auxiliado',
          'ajudado',
          'assistido',
          'acompanhado',
          'guiado',
          'orientado',
          'direcionado',
          'conduzido',
          'levado',
          'trazido',
          'carregado',
          'suportado',
          'sustentado',
          'mantido',
          'preservado',
          'conservado',
          'protegido',
          'cuidado',
          'zelado',
          'respeitado',
          'valorizado',
          'reconhecido',
          'apreciado',
          'estimado',
          'considerado',
          'levado em conta',
          'levado em consideração',
          'levado em conta',
          'levado em consideração',
          'levado em conta',
          'levado em consideração'
        ]
      }));

      const score = calculateMatchScore(allKeywords, subSentimentKeywords, params);
      console.log(`Score calculado: ${score.score}`);
      console.log(`Keywords correspondentes: ${score.matchedKeywords.join(', ')}`);
      console.log(`Keywords relacionadas: ${score.relatedKeywords.join(', ')}`);
      
      // Ajustando o threshold baseado no sentimento principal
      const threshold = params.mainSentiment.toLowerCase().includes('neutro') ? 0.3 : 0.5;
      if (score.score > threshold) {
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
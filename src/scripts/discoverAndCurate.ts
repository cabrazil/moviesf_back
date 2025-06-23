import { PrismaClient } from '@prisma/client';
import { searchMovie } from './populateMovies';
import { validateMovieSentiments } from './validateMovieSentiments';
import axios from 'axios';
import * as readline from 'readline';

const prisma = new PrismaClient();

interface JourneyPath {
  mainSentimentId: number;
  mainSentimentName: string;
  journeyFlowId: number;
  steps: Array<{
    stepId: number;
    optionId: number;
  }>;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface SentimentAnalysisResult {
  success: boolean;
  mainSentiment?: string;
  subSentiments?: Array<{
    name: string;
    score: number;
  }>;
  message?: string;
}

// ===== MAPEAMENTO TEMÁTICO INTEGRADO =====
interface ThemeConfig {
  required: Array<{
    name: string;
    minWeight: number;
  }>;
  common: string[];
}

interface ThemeDictionary {
  [key: string]: ThemeConfig;
}

// Dicionário de SubSentiments por gênero/tema (integrado do analyzeMovieSentiments.ts)
const SUB_SENTIMENTS_BY_THEME: ThemeDictionary = {
  drama: {
    required: [
      { name: "Emotivo(a) (Triste)", minWeight: 0.7 },
      { name: "Drama Familiar", minWeight: 0.6 }
    ],
    common: ["Superação e Crescimento", "Reflexão Filosófica"]
  },
  superacao: {
    required: [
      { name: "Superação e Crescimento", minWeight: 0.8 },
      { name: "Inspiração / Motivação para Agir", minWeight: 0.7 }
    ],
    common: ["Emotivo(a) (Triste)", "Drama Familiar"]
  },
  luto: {
    required: [
      { name: "Emotivo(a) (Triste)", minWeight: 0.8 },
      { name: "Vazio(a)", minWeight: 0.7 }
    ],
    common: ["Superação e Crescimento", "Reflexão Filosófica"]
  },
  familia: {
    required: [
      { name: "Drama Familiar", minWeight: 0.8 },
      { name: "Conforto / Aconchego Emocional", minWeight: 0.6 }
    ],
    common: ["Emotivo(a) (Triste)", "Superação e Crescimento"]
  },
  historico: {
    required: [
      { name: "Reflexão Filosófica", minWeight: 0.8 },
      { name: "Consequências e Justiça", minWeight: 0.7 }
    ],
    common: ["Emotivo(a) (Triste)", "Drama Familiar", "Superação e Crescimento"]
  },
  comedia: {
    required: [
      { name: "Humor / Comédia", minWeight: 0.6 },
      { name: "Conforto / Aconchego Emocional", minWeight: 0.6 }
    ],
    common: ["Inspiração / Motivação para Agir", "Drama Familiar"]
  },
  acao: {
    required: [
      { name: "Empolgado(a) / Energético(a)", minWeight: 0.7 },
      { name: "Ação / Aventura", minWeight: 0.6 }
    ],
    common: ["Superação e Crescimento", "Inspiração / Motivação para Agir"]
  },
  romance: {
    required: [
      { name: "Romântico(a)", minWeight: 0.7 },
      { name: "Emotivo(a) (Feliz)", minWeight: 0.6 }
    ],
    common: ["Drama Familiar", "Conforto / Aconchego Emocional"]
  },
  thriller: {
    required: [
      { name: "Tenso(a) / Ansioso(a)", minWeight: 0.7 },
      { name: "Suspense / Mistério", minWeight: 0.6 }
    ],
    common: ["Reflexão Filosófica", "Consequências e Justiça"]
  },
  animacao: {
    required: [
      { name: "Conforto / Aconchego Emocional", minWeight: 0.6 },
      { name: "Drama Familiar", minWeight: 0.6 }
    ],
    common: ["Superação e Crescimento", "Inspiração / Motivação para Agir"]
  }
};

// Função para identificar temas do filme
function identifyThemes(movie: any, keywords: string[]): string[] {
  const themes: string[] = [];
  const synopsis = movie.overview.toLowerCase();
  const genres = movie.genres.map((g: any) => g.name.toLowerCase());
  const keywordsLower = keywords.map(k => k.toLowerCase());

  console.log(`\n🔍 Analisando temas:`);
  console.log(`Sinopse: ${synopsis.substring(0, 100)}...`);
  console.log(`Gêneros: ${genres.join(', ')}`);
  console.log(`Keywords: ${keywordsLower.slice(0, 10).join(', ')}...`);

  // Identificar temas baseado em palavras-chave e gêneros
  if (synopsis.includes('superação') || synopsis.includes('superar') || 
      synopsis.includes('crescimento') || synopsis.includes('desenvolvimento') ||
      synopsis.includes('evolução') || synopsis.includes('transformação') ||
      keywordsLower.includes('superação') || keywordsLower.includes('inspiração') ||
      keywordsLower.includes('crescimento') || keywordsLower.includes('desenvolvimento')) {
    themes.push('superacao');
    console.log(`✅ Tema identificado: superacao`);
  }

  if (synopsis.includes('família') || synopsis.includes('pai') || synopsis.includes('mãe') || 
      synopsis.includes('filho') || synopsis.includes('filha') ||
      synopsis.includes('amizade') || synopsis.includes('amigo') ||
      synopsis.includes('relacionamento') || synopsis.includes('vínculo') ||
      keywordsLower.includes('família') || keywordsLower.includes('pai solteiro') ||
      keywordsLower.includes('amizade') || keywordsLower.includes('amigo')) {
    themes.push('familia');
    console.log(`✅ Tema identificado: familia`);
  }

  if (synopsis.includes('morte') || synopsis.includes('perda') || synopsis.includes('luto') ||
      keywordsLower.includes('morte') || keywordsLower.includes('luto')) {
    themes.push('luto');
    console.log(`✅ Tema identificado: luto`);
  }

  if (genres.includes('drama')) {
    themes.push('drama');
    console.log(`✅ Tema identificado: drama (gênero)`);
  }

  if (genres.includes('comédia') || genres.includes('comedia')) {
    themes.push('comedia');
    console.log(`✅ Tema identificado: comedia (gênero)`);
  }

  if (genres.includes('ação') || genres.includes('acao') || genres.includes('aventura')) {
    themes.push('acao');
    console.log(`✅ Tema identificado: acao (gênero)`);
  }

  if (genres.includes('romance')) {
    themes.push('romance');
    console.log(`✅ Tema identificado: romance (gênero)`);
  }

  if (genres.includes('thriller') || genres.includes('suspense')) {
    themes.push('thriller');
    console.log(`✅ Tema identificado: thriller (gênero)`);
  }

  if (genres.includes('animação') || genres.includes('animacao')) {
    themes.push('animacao');
    console.log(`✅ Tema identificado: animacao (gênero)`);
  }

  // Identificar tema histórico
  if (synopsis.includes('guerra') || synopsis.includes('histórico') || 
      keywordsLower.includes('guerra') || keywordsLower.includes('histórico') ||
      keywordsLower.includes('segunda guerra mundial') || keywordsLower.includes('nazista')) {
    themes.push('historico');
    console.log(`✅ Tema identificado: historico`);
  }

  // Detecção adicional baseada em keywords específicas
  if (keywordsLower.includes('brinquedo') || keywordsLower.includes('toy') ||
      keywordsLower.includes('boneco') || keywordsLower.includes('jogo')) {
    if (!themes.includes('familia')) {
      themes.push('familia');
      console.log(`✅ Tema identificado: familia (via keywords de brinquedos)`);
    }
  }

  if (keywordsLower.includes('amizade') || keywordsLower.includes('amigo') ||
      keywordsLower.includes('companheirismo') || keywordsLower.includes('lealdade')) {
    if (!themes.includes('familia')) {
      themes.push('familia');
      console.log(`✅ Tema identificado: familia (via keywords de amizade)`);
    }
  }

  if (keywordsLower.includes('aventura') || keywordsLower.includes('descoberta') ||
      keywordsLower.includes('exploração') || keywordsLower.includes('jornada')) {
    if (!themes.includes('superacao')) {
      themes.push('superacao');
      console.log(`✅ Tema identificado: superacao (via keywords de aventura)`);
    }
  }

  const uniqueThemes = [...new Set(themes)]; // Remove duplicatas
  console.log(`\n🎯 Temas finais identificados: ${uniqueThemes.join(', ')}`);
  
  return uniqueThemes;
}

// Função para análise contextual com OpenAI
async function analyzeMovieWithOpenAI(movie: any, keywords: string[], availableSubSentiments: string[]): Promise<{
  suggestedSubSentiments: Array<{
    name: string;
    relevance: number;
    explanation: string;
  }>;
}> {
  // Identificar temas do filme
  const themes = identifyThemes(movie, keywords);
  const requiredSubSentiments = themes.flatMap(theme => 
    SUB_SENTIMENTS_BY_THEME[theme]?.required || []
  );
  const commonSubSentiments = themes.flatMap(theme => 
    SUB_SENTIMENTS_BY_THEME[theme]?.common || []
  );

  const prompt = `
Sinopse: ${movie.overview}
Gêneros: ${movie.genres.map((g: any) => g.name).join(', ')}
Palavras-chave: ${keywords.join(', ')}

Temas identificados: ${themes.join(', ')}

SubSentiments disponíveis:
${availableSubSentiments.join('\n')}

SubSentiments obrigatórios para os temas identificados:
${requiredSubSentiments.map(ss => `- ${ss.name} (peso mínimo: ${ss.minWeight})`).join('\n')}

SubSentiments comuns para os temas:
${commonSubSentiments.join('\n')}

Analise o filme e sugira os 3 SubSentiments mais relevantes da lista acima, considerando:
1. Temas emocionais principais
2. Arcos de personagens
3. Mensagens centrais
4. Tom e atmosfera

IMPORTANTE: 
- Escolha apenas SubSentiments da lista fornecida e use exatamente o mesmo nome
- Considere os SubSentiments obrigatórios para os temas identificados
- Respeite os pesos mínimos indicados para cada SubSentiment obrigatório
- Considere também os SubSentiments comuns para os temas

Para cada SubSentiment sugerido, forneça:
1. Nome exato do SubSentiment (deve ser um dos listados acima)
2. Relevância (0.1 a 1.0, respeitando os pesos mínimos)
3. Explicação breve da conexão

Formato esperado (JSON válido):
{
  "suggestedSubSentiments": [
    {
      "name": "Nome do SubSentiment (exatamente como listado)",
      "relevance": 0.8,
      "explanation": "Explicação da conexão"
    }
  ]
}
`;

  try {
    const response = await axios.post<OpenAIResponse>(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de filmes, focado em aspectos emocionais e sentimentais. Você DEVE escolher apenas SubSentiments da lista fornecida e retornar um JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    console.log('\nResposta do OpenAI:');
    console.log(content);

    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', parseError);
      return { suggestedSubSentiments: [] };
    }
  } catch (error) {
    console.error('Erro ao analisar filme:', error);
    return { suggestedSubSentiments: [] };
  }
}

// Interface para leitura de input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

// ===== FASE 1: DESCOBRIMENTO DO FILME =====
async function discoverMovie(movieTitle: string, movieYear: number) {
  console.log(`\n🎬 === FASE 1: DESCOBRIMENTO DO FILME ===`);
  console.log(`🔍 Buscando filme: "${movieTitle}" (${movieYear})...`);
  
  // Buscar filme no banco
  const movie = await prisma.movie.findFirst({
    where: {
      title: { contains: movieTitle, mode: 'insensitive' },
      year: movieYear
    }
  });

  if (movie) {
    console.log(`✅ Filme encontrado no banco: "${movie.title}" (ID: ${movie.id})`);
    return movie;
  }

  console.log(`❌ Filme "${movieTitle}" (${movieYear}) não encontrado no banco`);
  const addMovie = await question("Deseja adicionar o filme ao banco? (s/n): ");
  
  if (addMovie.toLowerCase() === 's') {
    console.log("🔄 Adicionando filme ao banco...");
    
    // Buscar no TMDB (versão silenciosa)
    console.log("🔍 Buscando no TMDB...");
    const tmdbMovie = await searchMovieSilent(movieTitle, movieYear);
    if (!tmdbMovie) {
      throw new Error("Filme não encontrado no TMDB");
    }

    console.log(`✅ Filme encontrado no TMDB: "${tmdbMovie.movie.title}"`);

    // Criar filme no banco com todos os dados do TMDB
    const newMovie = await prisma.movie.create({
      data: {
        title: tmdbMovie.movie.title,
        year: parseInt(tmdbMovie.movie.release_date?.split('-')[0] || movieYear.toString()),
        director: tmdbMovie.director,
        genres: tmdbMovie.movie.genres?.map((g: any) => g.name) || [],
        runtime: tmdbMovie.movie.runtime || 0,
        vote_average: tmdbMovie.movie.vote_average || 0,
        vote_count: tmdbMovie.movie.vote_count || 0,
        keywords: tmdbMovie.keywords || [],
        streamingPlatforms: tmdbMovie.platforms || [],
        description: tmdbMovie.movie.overview,
        thumbnail: tmdbMovie.movie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.movie.poster_path}` : null,
        original_title: tmdbMovie.movie.original_title,
        certification: tmdbMovie.certification,
        adult: tmdbMovie.movie.adult || false,
        genreIds: tmdbMovie.movie.genres?.map((g: any) => g.id) || []
      }
    });

    console.log(`✅ Filme adicionado: "${newMovie.title}" (ID: ${newMovie.id})`);
    console.log(`📊 Dados salvos:`);
    // console.log(`   - Director: ${newMovie.director || 'Não informado'}`);
    // console.log(`   - Description: ${newMovie.description ? 'Sim' : 'Não'}`);
    // console.log(`   - Thumbnail: ${newMovie.thumbnail ? 'Sim' : 'Não'}`);
    // console.log(`   - Original Title: ${newMovie.original_title || 'Não informado'}`);
    // console.log(`   - Certification: ${newMovie.certification || 'Não informado'}`);
    // console.log(`   - Keywords: ${newMovie.keywords.length} keywords`);
    // console.log(`   - Streaming Platforms: ${newMovie.streamingPlatforms.length} plataformas`);
    // console.log(`   - Genre IDs: ${newMovie.genreIds ? newMovie.genreIds.length : 0} IDs`);
    
    return newMovie;
  }

  throw new Error("Filme não encontrado e não foi adicionado");
}

// Função auxiliar para buscar no TMDB de forma silenciosa
async function searchMovieSilent(movieTitle: string, movieYear?: number) {
  // Temporariamente suprimir logs do console
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = () => {}; // Suprimir logs
  console.error = () => {}; // Suprimir erros
  
  try {
    const result = await searchMovie(movieTitle, movieYear);
    return result;
  } finally {
    // Restaurar logs
    console.log = originalLog;
    console.error = originalError;
  }
}

// ===== FASE 2: ANÁLISE DE SENTIMENTOS =====
async function analyzeMovieSentiments(movieId: string, targetSentimentId?: number): Promise<SentimentAnalysisResult> {
  console.log(`\n🧠 === FASE 2: ANÁLISE DE SENTIMENTOS ===`);
  console.log(`📊 Analisando sentimentos para: "${movieId}"`);
  
  try {
    // 1. Buscar filme no banco
    const movie = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (!movie) {
      throw new Error(`Filme não encontrado: ${movieId}`);
    }

    console.log(`🎭 Gêneros: ${movie.genres.join(', ')}`);

    // 2. Verificar se já tem análise de sentimentos
    const existingSentiments = await prisma.movieSentiment.findMany({
      where: { movieId: movieId },
      include: {
        subSentiment: true,
        mainSentiment: true
      }
    });

    if (existingSentiments.length > 0) {
      console.log(`✅ Filme já possui análise de sentimentos:`);
      const mainSentimentGroups = existingSentiments.reduce((acc, ms) => {
        if (!acc[ms.mainSentiment.name]) {
          acc[ms.mainSentiment.name] = [];
        }
        acc[ms.mainSentiment.name].push(ms);
        return acc;
      }, {} as Record<string, typeof existingSentiments>);

      Object.entries(mainSentimentGroups).forEach(([mainName, sentiments]) => {
        console.log(`   📍 ${mainName}:`);
        sentiments.forEach(ms => {
          console.log(`      - ${ms.subSentiment.name}: N/A`);
        });
      });

      // Se há um sentimento alvo específico, verificar se já está presente
      if (targetSentimentId) {
        const targetMainSentiment = await prisma.mainSentiment.findUnique({
          where: { id: targetSentimentId }
        });
        
        if (targetMainSentiment && mainSentimentGroups[targetMainSentiment.name]) {
          console.log(`\n🎯 Sentimento alvo "${targetMainSentiment.name}" já está presente.`);
          return {
            success: true,
            mainSentiment: targetMainSentiment.name,
            subSentiments: mainSentimentGroups[targetMainSentiment.name].map(ms => ({
              name: ms.subSentiment.name,
              score: 1.0
            }))
          };
        }
      }

      // Se não há sentimento alvo ou não está presente, retornar o primeiro
      const firstMainSentiment = existingSentiments[0].mainSentiment;
      return {
        success: true,
        mainSentiment: firstMainSentiment.name,
        subSentiments: mainSentimentGroups[firstMainSentiment.name].map(ms => ({
          name: ms.subSentiment.name,
          score: 1.0
        }))
      };
    }

    console.log(`🔄 Executando análise de sentimentos...`);
    
    // 3. Buscar no TMDB
    const tmdbMovie = await searchMovie(movie.title, movie.year || undefined);
    if (!tmdbMovie) {
      throw new Error("Filme não encontrado no TMDB");
    }

    // 4. Preparar keywords
    const keywords = [
      ...(tmdbMovie.movie as any).keywords?.map((k: any) => k.name) || [],
      ...(tmdbMovie.movie as any).genres?.map((g: any) => g.name) || [],
      ...movie.keywords || []
    ];

    // 5. Identificar temas
    const themes = identifyThemes(tmdbMovie.movie, keywords);
    
    // 6. Buscar SubSentiments disponíveis (todos, não apenas do sentimento alvo)
    const availableSubSentiments = await prisma.subSentiment.findMany();
    const subSentimentNames = availableSubSentiments.map(ss => ss.name);

    // 7. Filtrar SubSentiments temáticos apenas para os disponíveis
    const requiredSubSentiments = themes.flatMap(theme => 
      SUB_SENTIMENTS_BY_THEME[theme]?.required || []
    ).filter(required => 
      availableSubSentiments.some(ss => ss.name === required.name)
    );

    const commonSubSentiments = themes.flatMap(theme => 
      SUB_SENTIMENTS_BY_THEME[theme]?.common || []
    ).filter(common => 
      availableSubSentiments.some(ss => ss.name === common)
    );

    console.log(`\n📊 SubSentiments temáticos filtrados:`);
    console.log(`Obrigatórios (disponíveis): ${requiredSubSentiments.length}`);
    console.log(`Comuns (disponíveis): ${commonSubSentiments.length}`);

    // 8. Executar análise contextual com OpenAI (focada nos temas identificados)
    console.log('\n🤖 Analisando filme com OpenAI (análise temática)...');
    const contextualAnalysis = await analyzeMovieWithOpenAI(tmdbMovie.movie, keywords, subSentimentNames);

    console.log(`\n📊 Resultado da análise OpenAI:`);
    console.log(`SubSentiments sugeridos: ${contextualAnalysis.suggestedSubSentiments.length}`);
    contextualAnalysis.suggestedSubSentiments.forEach(ss => {
      console.log(`- ${ss.name} (relevância: ${ss.relevance})`);
    });

    // 9. Combinar análise contextual com mapeamento temático
    const finalSubSentiments: Array<{ name: string; score: number; source: string }> = [];

    // Adicionar SubSentiments obrigatórios dos temas (PRIORIDADE MÁXIMA)
    for (const required of requiredSubSentiments) {
      const subSentiment = availableSubSentiments.find(ss => ss.name === required.name);
      if (subSentiment) {
        finalSubSentiments.push({
          name: required.name,
          score: required.minWeight,
          source: 'tema_obrigatorio'
        });
        console.log(`✅ Adicionado obrigatório: ${required.name} (score: ${required.minWeight})`);
      } else {
        console.log(`⚠️ SubSentiment obrigatório não encontrado no banco: ${required.name}`);
      }
    }

    // Adicionar SubSentiments sugeridos pela IA (se não estiverem já incluídos)
    for (const suggestion of contextualAnalysis.suggestedSubSentiments) {
      const alreadyIncluded = finalSubSentiments.some(ss => ss.name === suggestion.name);
      if (!alreadyIncluded) {
        finalSubSentiments.push({
          name: suggestion.name,
          score: suggestion.relevance,
          source: 'ia_contextual'
        });
        console.log(`✅ Adicionado da IA: ${suggestion.name} (score: ${suggestion.relevance})`);
      } else {
        console.log(`ℹ️ Já incluído: ${suggestion.name}`);
      }
    }

    // Adicionar SubSentiments comuns dos temas (se não estiverem já incluídos e se a IA sugeriu)
    for (const common of commonSubSentiments) {
      const alreadyIncluded = finalSubSentiments.some(ss => ss.name === common);
      const suggestedByAI = contextualAnalysis.suggestedSubSentiments.some(ss => ss.name === common);
      if (!alreadyIncluded && suggestedByAI) {
        finalSubSentiments.push({
          name: common,
          score: 0.6, // Score padrão para SubSentiments comuns
          source: 'tema_comum'
        });
        console.log(`✅ Adicionado comum: ${common} (score: 0.6)`);
      }
    }

    console.log(`\n📊 Total de SubSentiments finais: ${finalSubSentiments.length}`);
    if (finalSubSentiments.length > 0) {
      console.log('\n✅ Análise temática concluída:');
      finalSubSentiments.forEach(suggestion => {
        console.log(`\n- ${suggestion.name} (Score: ${suggestion.score}, Fonte: ${suggestion.source})`);
      });

      // 10. Criar registros na MovieSentiment
      const createdSubSentiments: Array<{ name: string; score: number }> = [];
      const mainSentimentIds = new Set<number>();
      
      for (const suggestion of finalSubSentiments) {
        const subSentiment = availableSubSentiments.find(ss => ss.name === suggestion.name);
        if (subSentiment) {
          mainSentimentIds.add(subSentiment.mainSentimentId);

          // Verificar se o registro já existe
          const existingSentiment = await prisma.movieSentiment.findFirst({
            where: {
              movieId: movieId,
              mainSentimentId: subSentiment.mainSentimentId,
              subSentimentId: subSentiment.id
            }
          });

          if (!existingSentiment) {
            await prisma.movieSentiment.create({
              data: {
                movieId: movieId,
                mainSentimentId: subSentiment.mainSentimentId,
                subSentimentId: subSentiment.id
              }
            });
            console.log(`✅ Criado: ${suggestion.name}`);
          } else {
            console.log(`ℹ️ Já existe: ${suggestion.name}`);
          }

          createdSubSentiments.push({
            name: suggestion.name,
            score: suggestion.score
          });
        }
      }

      // 11. Determinar o MainSentiment principal
      const mainSentimentId = Array.from(mainSentimentIds)[0];
      const mainSentiment = await prisma.mainSentiment.findUnique({
        where: { id: mainSentimentId }
      });

      if (mainSentiment) {
        console.log(`\n🎯 MainSentiment determinado: ${mainSentiment.name} (ID: ${mainSentiment.id})`);
        return {
          success: true,
          mainSentiment: mainSentiment.name,
          subSentiments: createdSubSentiments
        };
      }
    }

    // Fallback para análise tradicional se a análise temática falhar
    console.log('\n⚠️ Análise temática não retornou resultados, usando análise tradicional...');
    return await performTraditionalAnalysis(movie);

  } catch (error) {
    console.error('Erro na análise de sentimentos:', error);
    return { success: false, message: `Erro: ${error}` };
  }
}

// Função de fallback para análise tradicional
async function performTraditionalAnalysis(movie: any): Promise<SentimentAnalysisResult> {
  console.log(`🔄 Executando análise tradicional...`);
  const mainSentiments = await prisma.mainSentiment.findMany();
  let bestMatch: SentimentAnalysisResult = { success: false, message: "Nenhuma correspondência encontrada" };

  for (const mainSentiment of mainSentiments) {
    const result = await validateMovieSentiments({
      mainSentiment: mainSentiment.name,
      movieTitle: movie.title,
      year: movie.year || undefined,
      flow: 'genre',
      genre: movie.genres.join(', ')
    });

    if (result.success) {
      console.log(`✅ Correspondência encontrada: ${mainSentiment.name}`);
      bestMatch = {
        success: true,
        mainSentiment: mainSentiment.name,
        subSentiments: [] // A função validateMovieSentiments não retorna subSentiments
      };
      break;
    }
  }

  if (bestMatch.success) {
    console.log(`🎯 Melhor correspondência: ${bestMatch.mainSentiment}`);
    bestMatch.subSentiments?.forEach(ss => {
      console.log(`   - ${ss.name}: ${ss.score.toFixed(2)}`);
    });
  } else {
    console.log(`❌ Nenhuma correspondência de sentimentos encontrada`);
  }

  return bestMatch;
}

// ===== FASE 3: CURADORIA E VALIDAÇÃO DA JORNADA =====
async function curateAndValidateJourney(movieId: string, sentimentAnalysis: SentimentAnalysisResult): Promise<{ success: boolean; journeyPath?: JourneyPath; message?: string }> {
  console.log(`\n🎯 === FASE 3: CURADORIA E VALIDAÇÃO DA JORNADA ===`);
  
  try {
    // 1. Escolher jornada baseada no sentimento
    let mainSentimentId: number;
    
    if (sentimentAnalysis.mainSentiment) {
      const mainSentiment = await prisma.mainSentiment.findFirst({
        where: { name: sentimentAnalysis.mainSentiment }
      });
      
      if (mainSentiment) {
        mainSentimentId = mainSentiment.id;
        console.log(`🎭 Usando sentimento detectado: ${sentimentAnalysis.mainSentiment} (ID: ${mainSentimentId})`);
      } else {
        throw new Error(`Sentimento "${sentimentAnalysis.mainSentiment}" não encontrado no banco`);
      }
    } else {
      // Escolha manual se não foi detectado
      console.log("\n📋 Escolha o sentimento principal:");
      const mainSentiments = await prisma.mainSentiment.findMany({ orderBy: { id: 'asc' } });
      
      mainSentiments.forEach((sentiment, index) => {
        console.log(`${index + 1}. ${sentiment.name} - ID: ${sentiment.id}`);
      });

      const choice = await question("\nDigite o número da opção: ");
      const selectedIndex = parseInt(choice) - 1;
      
      if (selectedIndex < 0 || selectedIndex >= mainSentiments.length) {
        throw new Error("Opção inválida");
      }

      mainSentimentId = mainSentiments[selectedIndex].id;
    }

    // 2. Descobrir jornada
    const journeyPath = await discoverJourneySteps(mainSentimentId);
    
    // 3. Validar última opção da jornada
    const lastStep = journeyPath.steps[journeyPath.steps.length - 1];
    const option = await prisma.journeyOptionFlow.findUnique({
      where: { id: lastStep.optionId }
    });

    if (!option) {
      throw new Error(`Opção não encontrada: ${lastStep.optionId}`);
    }

    console.log(`\n🔍 Validando última opção: "${option.text}"`);

    // 3.1. VALIDAÇÃO CONTEXTUAL (NOVA)
    const movieDetails = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (movieDetails) {
      const contextualValidation = await validateContextualCompatibility(
        movieDetails, 
        lastStep.optionId, 
        option.text
      );

      if (!contextualValidation.compatible) {
        console.log(`❌ Validação contextual falhou: ${contextualValidation.reason}`);
        return { 
          success: false, 
          message: `Incompatibilidade contextual: ${contextualValidation.reason}` 
        };
      }
    }

    // 4. Buscar SubSentiments da opção
    const optionSubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
      where: { journeyOptionFlowId: lastStep.optionId }
    });

    console.log(`📊 SubSentiments associados à opção: ${optionSubSentiments.length}`);

    // 5. Buscar SubSentiments do filme
    const movieSubSentiments = await prisma.movieSentiment.findMany({
      where: { movieId: movieId },
      include: { 
        subSentiment: {
          include: {
            mainSentiment: true
          }
        }
      }
    });

    console.log(`📊 SubSentiments do filme: ${movieSubSentiments.length}`);

    // 6. Verificar compatibilidade
    const compatibleSubSentiments = movieSubSentiments.filter(mss => 
      optionSubSentiments.some(jofss => jofss.subSentimentId === mss.subSentimentId)
    );

    // LÓGICA ESPECIAL PARA SENTIMENTO "INDIFERENTE"
    const indiferenteSentiment = await prisma.mainSentiment.findFirst({
      where: { name: "Indiferente" }
    });
    
    if (indiferenteSentiment && mainSentimentId === indiferenteSentiment.id) {
      console.log(`\n🎭 Sentimento "Indiferente" detectado - aplicando lógica especial`);
      console.log(`💡 Para o estado inicial "Indiferente", qualquer subsentimento é válido`);
      
      if (movieSubSentiments.length > 0) {
        console.log(`✅ Filme possui ${movieSubSentiments.length} subsentimentos - válido para jornada "Indiferente"`);
        movieSubSentiments.forEach(mss => {
          console.log(`   - ${mss.subSentiment.name} (${mss.subSentiment.mainSentiment.name})`);
        });
        
        // Associar automaticamente os subsentimentos do filme à opção se não estiverem associados
        for (const mss of movieSubSentiments) {
          const existingAssociation = await prisma.journeyOptionFlowSubSentiment.findFirst({
            where: {
              journeyOptionFlowId: lastStep.optionId,
              subSentimentId: mss.subSentimentId
            }
          });

          if (!existingAssociation) {
            await prisma.journeyOptionFlowSubSentiment.create({
              data: {
                journeyOptionFlowId: lastStep.optionId,
                subSentimentId: mss.subSentimentId,
                weight: 1.0,
                updatedAt: new Date()
              }
            });
            console.log(`   🔗 Associado automaticamente: ${mss.subSentiment.name}`);
          }
        }
        
        return { success: true, journeyPath };
      } else {
        console.log(`❌ Filme não possui subsentimentos - inválido para jornada`);
        return { success: false, message: "Filme sem subsentimentos para jornada Indiferente" };
      }
    }

    // LÓGICA NORMAL PARA OUTROS SENTIMENTOS
    if (compatibleSubSentiments.length === 0) {
      console.log(`❌ Nenhum SubSentiment compatível encontrado`);
      
      // 7. RESOLUÇÃO AUTOMÁTICA: Associar SubSentiments do filme à opção
      const shouldAssociate = await question(
        `\n💡 Deseja associar os SubSentiments do filme à opção "${option.text}"? (s/n): `
      );

      if (shouldAssociate.toLowerCase() === 's') {
        console.log(`🔄 Associando SubSentiments à opção...`);
        
        for (const mss of movieSubSentiments) {
          // Verificar se já existe associação
          const existingAssociation = await prisma.journeyOptionFlowSubSentiment.findFirst({
            where: {
              journeyOptionFlowId: lastStep.optionId,
              subSentimentId: mss.subSentimentId
            }
          });

          if (!existingAssociation) {
            await prisma.journeyOptionFlowSubSentiment.create({
              data: {
                journeyOptionFlowId: lastStep.optionId,
                subSentimentId: mss.subSentimentId,
                weight: 1.0, // Peso padrão
                updatedAt: new Date()
              }
            });
            console.log(`   ✅ Associado: ${mss.subSentiment.name}`);
          } else {
            console.log(`   ⏭️ Já associado: ${mss.subSentiment.name}`);
          }
        }

        // Recarregar associações
        const updatedOptionSubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
          where: { journeyOptionFlowId: lastStep.optionId }
        });

        console.log(`✅ Total de associações após atualização: ${updatedOptionSubSentiments.length}`);
        
        return { success: true, journeyPath };
      } else {
        return { success: false, message: "Associação de SubSentiments rejeitada" };
      }
    }

    console.log(`✅ SubSentiments compatíveis encontrados: ${compatibleSubSentiments.length}`);
    compatibleSubSentiments.forEach(css => {
      console.log(`   - ${css.subSentiment.name} (score: 1.0)`);
    });

    return { success: true, journeyPath };

  } catch (error) {
    console.error('Erro na curadoria da jornada:', error);
    return { success: false, message: `Erro: ${error}` };
  }
}

async function discoverJourneySteps(mainSentimentId: number): Promise<JourneyPath> {
  console.log(`\n🎯 Descobrindo jornada para o sentimento ID: ${mainSentimentId}...`);
  
  // Buscar JourneyFlow
  const journeyFlow = await prisma.journeyFlow.findFirst({
    where: { mainSentimentId }
  });

  if (!journeyFlow) {
    throw new Error("JourneyFlow não encontrado para este sentimento");
  }

  // Buscar Steps
  const steps = await prisma.journeyStepFlow.findMany({
    where: { journeyFlowId: journeyFlow.id },
    orderBy: { order: 'asc' }
  });

  const selectedSteps: Array<{ stepId: number; optionId: number }> = [];

  // Começar com o primeiro step (ordem 1)
  let currentStep = steps.find(s => s.order === 1);
  
  while (currentStep) {
    console.log(`\n📝 Passo: ${currentStep.question}`);
    
    // Buscar opções do step atual
    const options = await prisma.journeyOptionFlow.findMany({
      where: { journeyStepFlowId: currentStep.id },
      orderBy: { id: 'asc' }
    });

    options.forEach((option, index) => {
      const finalIndicator = option.isEndState ? " ✅ FINAL" : "";
      console.log(`${index + 1}. ${option.text} (ID: ${option.id})${finalIndicator}`);
    });

    const choice = await question("\nDigite o número da opção: ");
    const selectedIndex = parseInt(choice) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= options.length) {
      throw new Error("Opção inválida");
    }

    const selectedOption = options[selectedIndex];
    selectedSteps.push({
      stepId: currentStep.id,
      optionId: selectedOption.id
    });

    // Se é estado final, parar
    if (selectedOption.isEndState) {
      break;
    }

    // Buscar o próximo step baseado no nextStepId da opção escolhida
    if (selectedOption.nextStepId) {
      currentStep = steps.find(s => s.stepId === selectedOption.nextStepId);
      if (!currentStep) {
        console.log(`⚠️ Próximo step não encontrado para nextStepId: ${selectedOption.nextStepId}`);
        break;
      }
    } else {
      // Se não há nextStepId, buscar o próximo step por ordem
      currentStep = steps.find(s => s.order === currentStep!.order + 1);
      if (!currentStep) {
        console.log("⚠️ Não há mais steps na jornada");
        break;
      }
    }
  }

  return {
    mainSentimentId,
    mainSentimentName: (await prisma.mainSentiment.findUnique({ where: { id: mainSentimentId } }))?.name || "",
    journeyFlowId: journeyFlow.id,
    steps: selectedSteps
  };
}

// ===== FASE 4: POPULAÇÃO DA SUGESTÃO =====
async function populateSuggestion(movieId: string, journeyPath: JourneyPath): Promise<boolean> {
  console.log(`\n🎬 === FASE 4: POPULAÇÃO DA SUGESTÃO ===`);
  
  try {
    // 1. Buscar detalhes do filme
    const movieDetails = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        movieSentiments: {
          include: {
            subSentiment: true
          }
        }
      }
    });

    if (!movieDetails) {
      console.log('❌ Detalhes do filme não encontrados');
      return false;
    }

    // 2. Buscar filme no TMDB para obter sinopse
    const tmdbMovie = await searchMovieSilent(movieDetails.title, movieDetails.year || undefined);
    if (!tmdbMovie) {
      console.log('❌ Filme não encontrado no TMDB');
      return false;
    }

    // 3. Gerar reflexão usando OpenAI
    const keywords = movieDetails.movieSentiments
      .flatMap(ms => ms.subSentiment.keywords)
      .filter((value, index, self) => self.indexOf(value) === index);

    console.log(`🔄 Gerando reflexão inspiradora...`);
    const reason = await generateReflectionWithOpenAI(tmdbMovie.movie, keywords);

    // 4. Criar entrada na MovieSuggestionFlow
    const lastStep = journeyPath.steps[journeyPath.steps.length - 1];
    
    await prisma.movieSuggestionFlow.create({
      data: {
        movieId: movieId,
        journeyOptionFlowId: lastStep.optionId,
        reason: reason,
        relevance: 1
      }
    });

    console.log(`✅ Sugestão criada com sucesso!`);
    console.log(`📝 Reflexão: "${reason}"`);
    
    return true;

  } catch (error) {
    console.error('Erro ao popular sugestão:', error);
    return false;
  }
}

async function generateReflectionWithOpenAI(movie: any, keywords: string[]): Promise<string> {
  const prompt = `
Sinopse: ${movie.overview}
Gêneros: ${movie.genres.map((g: any) => g.name).join(', ')}
Palavras-chave: ${keywords.join(', ')}

Com base nessas informações, escreva uma reflexão curta, inspiradora e única sobre o filme, conectando os temas principais e o impacto emocional da história. 
A reflexão deve ter no máximo 30 palavras e terminar com um ponto final.
Não repita o nome do filme.
`;

  try {
    const response = await axios.post<OpenAIResponse>(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um crítico de cinema especializado em análise emocional de filmes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro ao gerar reflexão:', error);
    return 'Filme que explora temas profundos e emocionais.';
  }
}

// Função para validar compatibilidade contextual entre filme e opção
async function validateContextualCompatibility(
  movie: any, 
  optionId: number, 
  optionText: string
): Promise<{ compatible: boolean; reason?: string }> {
  
  // Buscar detalhes da opção
  const option = await prisma.journeyOptionFlow.findUnique({
    where: { id: optionId }
  });

  if (!option) {
    return { compatible: false, reason: "Opção não encontrada" };
  }

  const movieGenres = movie.genres.map((g: any) => g.name.toLowerCase());
  const movieKeywords = movie.keywords?.map((k: string) => k.toLowerCase()) || [];
  const optionTextLower = optionText.toLowerCase();

  console.log(`\n🔍 Validando compatibilidade contextual:`);
  console.log(`Filme: ${movie.title} (${movie.year})`);
  console.log(`Gêneros: ${movieGenres.join(', ')}`);
  console.log(`Opção: ${optionText}`);
  console.log(`Keywords do filme: ${movieKeywords.slice(0, 10).join(', ')}...`);

  // Regras de incompatibilidade
  const incompatibilityRules = [
    {
      optionKeywords: ['animação', 'animacao', 'divertida', 'colorida', 'leve', 'bobinha', 'comédia', 'comedia'],
      incompatibleGenres: ['drama', 'guerra', 'thriller', 'terror', 'crime', 'biografia'],
      incompatibleKeywords: ['holocausto', 'nazista', 'guerra', 'morte', 'tragédia', 'tragedia', 'violência', 'violencia', 'perseguição', 'perseguicao'],
      reason: "Filme sério/dramático não compatível com opção de entretenimento leve"
    },
    {
      optionKeywords: ['ação', 'acao', 'aventura', 'empolgante', 'energético', 'energetico'],
      incompatibleGenres: ['romance', 'comédia', 'comedia', 'drama'],
      incompatibleKeywords: ['romântico', 'romantico', 'amor', 'casamento', 'família', 'familia'],
      reason: "Filme romântico/familiar não compatível com opção de ação/aventura"
    },
    {
      optionKeywords: ['reflexão', 'reflexao', 'filosófica', 'filosofica', 'profunda', 'contemplação', 'contemplacao'],
      incompatibleGenres: ['comédia', 'comedia', 'ação', 'acao', 'aventura'],
      incompatibleKeywords: ['divertido', 'engraçado', 'engracado', 'ação', 'acao', 'aventura'],
      reason: "Filme de entretenimento não compatível com opção de reflexão profunda"
    }
  ];

  // Verificar regras de incompatibilidade
  for (const rule of incompatibilityRules) {
    const hasIncompatibleOption = rule.optionKeywords.some(keyword => 
      optionTextLower.includes(keyword)
    );
    
    const hasIncompatibleGenre = movieGenres.some((genre: string) => 
      rule.incompatibleGenres.includes(genre)
    );
    
    const hasIncompatibleKeyword = movieKeywords.some((keyword: string) => 
      rule.incompatibleKeywords.some(incompatible => 
        keyword.includes(incompatible)
      )
    );

    if (hasIncompatibleOption && (hasIncompatibleGenre || hasIncompatibleKeyword)) {
      console.log(`❌ Incompatibilidade detectada: ${rule.reason}`);
      return { 
        compatible: false, 
        reason: rule.reason 
      };
    }
  }

  console.log(`✅ Compatibilidade contextual validada`);
  return { compatible: true };
}

// ===== FUNÇÃO PRINCIPAL =====
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log("🎬 === SISTEMA DE CURAÇÃO AUTOMÁTICA DE FILMES ===");
      console.log("Uso: npx ts-node discoverAndCurate.ts \"Nome do Filme\" ano [sentimentoId]");
      console.log("Exemplo: npx ts-node discoverAndCurate.ts \"Imperdoável\" 2021 14");
      console.log("\nEste script irá:");
      console.log("1. Descobrir/adicionar o filme ao banco");
      console.log("2. Analisar sentimentos automaticamente (ou apenas o sentimento especificado)");
      console.log("3. Curar e validar a jornada (com resolução automática de problemas)");
      console.log("4. Popular a sugestão final");
      return;
    }

    const movieTitle = args[0];
    const movieYear = parseInt(args[1]);
    const targetSentimentId = args[2] ? parseInt(args[2]) : undefined;

    console.log("🎬 === SISTEMA DE CURAÇÃO AUTOMÁTICA DE FILMES ===");
    console.log(`🎯 Objetivo: Adicionar "${movieTitle}" (${movieYear}) como sugestão de filme`);
    if (targetSentimentId) {
      console.log(`🎭 Sentimento alvo: ID ${targetSentimentId}`);
    }
    console.log();

    // FASE 1: Descobrimento do filme
    const movie = await discoverMovie(movieTitle, movieYear);

    // FASE 2: Análise de sentimentos
    const sentimentAnalysis = await analyzeMovieSentiments(movie.id, targetSentimentId);
    
    if (!sentimentAnalysis.success) {
      console.log(`❌ Análise de sentimentos falhou: ${sentimentAnalysis.message}`);
      return;
    }

    // FASE 3: Curadoria e validação da jornada
    const curationResult = await curateAndValidateJourney(movie.id, sentimentAnalysis);
    
    if (!curationResult.success) {
      console.log(`❌ Curadoria falhou: ${curationResult.message}`);
      return;
    }

    // FASE 4: População da sugestão
    const success = await populateSuggestion(movie.id, curationResult.journeyPath!);

    if (success) {
      console.log("\n🎉 === CURADORIA CONCLUÍDA COM SUCESSO! ===");
      console.log(`✅ Filme: ${movie.title} (${movie.year})`);
      console.log(`✅ Sentimento: ${sentimentAnalysis.mainSentiment}`);
      console.log(`✅ Jornada: ${curationResult.journeyPath!.mainSentimentName}`);
      console.log(`✅ UUID: ${movie.id}`);
    } else {
      console.log("\n❌ === CURADORIA FALHOU NA FASE FINAL ===");
    }

  } catch (error) {
    console.error('❌ Erro durante a curadoria:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();

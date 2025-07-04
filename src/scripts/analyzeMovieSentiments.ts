import { PrismaClient } from '@prisma/client';
import { searchMovie } from './populateMovies';
import axios from 'axios';

const prisma = new PrismaClient();

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

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

// Dicionário de SubSentiments por gênero/tema
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
  }
};

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

function identifyThemes(movie: any, keywords: string[]): string[] {
  const themes: string[] = [];
  const synopsis = movie.overview.toLowerCase();
  const genres = movie.genres.map((g: any) => g.name.toLowerCase());
  const keywordsLower = keywords.map(k => k.toLowerCase());

  // Identificar temas baseado em palavras-chave e gêneros
  if (synopsis.includes('superação') || synopsis.includes('superar') || 
      keywordsLower.includes('superação') || keywordsLower.includes('inspiração')) {
    themes.push('superacao');
  }

  if (synopsis.includes('família') || synopsis.includes('pai') || synopsis.includes('mãe') || 
      synopsis.includes('filho') || synopsis.includes('filha') ||
      keywordsLower.includes('família') || keywordsLower.includes('pai solteiro')) {
    themes.push('familia');
  }

  if (synopsis.includes('morte') || synopsis.includes('perda') || synopsis.includes('luto') ||
      keywordsLower.includes('morte') || keywordsLower.includes('luto')) {
    themes.push('luto');
  }

  if (genres.includes('drama')) {
    themes.push('drama');
  }

  // Identificar tema histórico
  if (synopsis.includes('guerra') || synopsis.includes('histórico') || 
      keywordsLower.includes('guerra') || keywordsLower.includes('histórico') ||
      keywordsLower.includes('segunda guerra mundial') || keywordsLower.includes('nazista')) {
    themes.push('historico');
  }

  return [...new Set(themes)]; // Remove duplicatas
}

interface JourneyOptionFlowSubSentiment {
  subSentimentId: number;
  weight: number;
  subSentiment: {
    name: string;
  };
}

interface JourneyOptionFlow {
  id: number;
  text: string;
  journeyOptionFlowSubSentiments: JourneyOptionFlowSubSentiment[];
}

interface RawSubSentiment {
  subSentimentId: number;
  weight: number;
  subSentimentName: string;
}

async function getJourneyOptionFlow(journeyOptionFlowId: number) {
  try {
    // Buscar a opção
    const option = await prisma.journeyOptionFlow.findUnique({
      where: { id: journeyOptionFlowId }
    });

    if (!option) {
      console.log(`❌ Opção de jornada não encontrada: ${journeyOptionFlowId}`);
      return null;
    }

    // Buscar os SubSentiments associados
    const subSentiments = await prisma.$queryRaw<RawSubSentiment[]>`
      SELECT jofss."subSentimentId", jofss.weight, ss.name as "subSentimentName"
      FROM "JourneyOptionFlowSubSentiment" jofss
      JOIN "SubSentiment" ss ON ss.id = jofss."subSentimentId"
      WHERE jofss."journeyOptionFlowId" = ${journeyOptionFlowId}
    `;

    console.log(`\nOpção de jornada: ${option.text}`);
    console.log('SubSentiments associados:');
    subSentiments.forEach(ss => {
      console.log(`- ${ss.subSentimentName} (peso: ${ss.weight})`);
    });

    return {
      option,
      subSentiments
    };
  } catch (error) {
    console.error('Erro ao buscar opção de jornada:', error);
    return null;
  }
}

async function main() {
  try {
    // Aceitar movieId, journeyOptionFlowId e mainSentimentId como argumentos
    const args = process.argv.slice(2);
    const movieId = args[0];
    const journeyOptionFlowId = args[1] ? parseInt(args[1]) : 159;
    const mainSentimentId = args[2] ? parseInt(args[2]) : null;
    
    if (!movieId) {
      console.log('❌ ID do filme não fornecido');
      return;
    }

    if (!mainSentimentId) {
      console.log('❌ ID do MainSentiment não fornecido');
      return;
    }

    // Buscar filme no banco
    const movie = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (!movie) {
      console.log(`❌ Filme não encontrado no banco: ${movieId}`);
      return;
    }
    
    console.log(`\n=== Analisando filme: ${movie.title} (${movie.year}) ===\n`);
    
    // Buscar opção de jornada para contexto
    const journeyOption = await getJourneyOptionFlow(journeyOptionFlowId);
    if (!journeyOption) {
      return;
    }

    const tmdbMovie = await searchMovie(movie.title, movie.year || undefined);
    if (!tmdbMovie) {
      console.log('❌ Filme não encontrado no TMDB');
      return;
    }

    // 2. Buscar SubSentiments disponíveis
    const availableSubSentiments = await prisma.subSentiment.findMany();
    const subSentimentNames = availableSubSentiments.map(ss => ss.name);

    console.log('\nSubSentiments disponíveis:');
    availableSubSentiments.forEach(ss => {
      console.log(`\n- ${ss.name}`);
    });

    // 3. Analisar filme com OpenAI
    const keywords = [
      ...(tmdbMovie.movie as any).keywords?.map((k: any) => k.name) || [],
      ...(tmdbMovie.movie as any).genres?.map((g: any) => g.name) || []
    ];

    console.log('\nAnalisando filme com OpenAI...');
    const analysis = await analyzeMovieWithOpenAI(tmdbMovie.movie, keywords, subSentimentNames);

    // 4. Validar e filtrar sugestões da IA
    console.log('\n🔍 Validando sugestões da IA com o sentimento de destino...');
    const validatedSubSentiments = analysis.suggestedSubSentiments.filter(suggestion => {
      const subSentiment = availableSubSentiments.find(ss => ss.name === suggestion.name);
      if (!subSentiment) {
        console.log(`⚠️ Subsentimento "${suggestion.name}" sugerido pela IA não foi encontrado no banco. Ignorando.`);
        return false;
      }
      
      if (subSentiment.mainSentimentId === mainSentimentId) {
        console.log(`✅ Mantido: "${suggestion.name}" (pertence ao sentimento de destino)`);
        return true;
      } else {
        console.log(`❌ Descartado: "${suggestion.name}" (não pertence ao sentimento de destino ID ${mainSentimentId})`);
        return false;
      }
    });

    // 5. Mostrar sugestões validadas
    console.log('\nSugestões de SubSentiments (após validação):');
    if (validatedSubSentiments.length === 0) {
      console.log('Nenhuma sugestão da IA foi compatível com o sentimento de destino.');
    } else {
      validatedSubSentiments.forEach(suggestion => {
        console.log(`\n- ${suggestion.name} (Relevância: ${suggestion.relevance})`);
        console.log(`  Explicação: ${suggestion.explanation}`);
      });
    }

    // 6. Sugerir MovieSentiments
    console.log('\n=== SUGESTÃO DE INSERTS ===');
    if (validatedSubSentiments.length > 0) {
      console.log('\n-- MovieSentiment:');
      validatedSubSentiments.forEach(suggestion => {
        const subSentiment = availableSubSentiments.find(ss => ss.name === suggestion.name);
        if (subSentiment) {
          console.log(`\nINSERT INTO "MovieSentiment" ("movieId", "mainSentimentId", "subSentimentId", "createdAt", "updatedAt")`);
          console.log(`VALUES ('${movieId}', ${mainSentimentId}, ${subSentiment.id}, NOW(), NOW());`);
        }
      });

      // 7. Sugerir JourneyOptionFlowSubSentiments
      console.log('\n-- JourneyOptionFlowSubSentiment:');
      validatedSubSentiments.forEach(suggestion => {
        const subSentiment = availableSubSentiments.find(ss => ss.name === suggestion.name);
        if (subSentiment) {
          console.log(`\nINSERT INTO "JourneyOptionFlowSubSentiment" ("journeyOptionFlowId", "subSentimentId", "weight", "createdAt", "updatedAt")`);
          console.log(`VALUES (${journeyOptionFlowId}, ${subSentiment.id}, ${suggestion.relevance}, NOW(), NOW());`);
        }
      });
    } else {
      console.log('\nNenhum INSERT gerado pois não houve subsentimentos validados.');
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
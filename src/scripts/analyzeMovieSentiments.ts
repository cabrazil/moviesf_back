import { PrismaClient, SubSentiment } from '@prisma/client';
import { searchMovie } from './populateMovies';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Determinar provedor de IA baseado em argumentos ou variável de ambiente
function getAIProvider(): AIProvider {
  const args = process.argv.slice(2);
  const providerArg = args.find(arg => arg.startsWith('--ai-provider='));
  const provider = providerArg ? providerArg.split('=')[1] as AIProvider : process.env.AI_PROVIDER as AIProvider;
  
  return provider === 'gemini' ? 'gemini' : 'openai';
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

interface TMDBMovie {
  id: string;
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
  runtime?: number;
  popularity?: number;
}

interface TMDBKeywordsResponse {
  keywords: Array<{
    id: number;
    name: string;
  }>;
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

// Funções de Análise e Lógica de Match
async function analyzeMovieWithAI(
  movie: any,
  keywords: string[],
  journeyOptionText: string,
  mainSentimentId: number,
  mainSentimentName: string
): Promise<{
  suggestedSubSentiments: Array<{
    name: string;
    relevance: number;
    explanation: string;
    isNew?: boolean;
  }>;
}> {
  // 1. Buscar subsentimentos existentes para o mainSentimentId de destino (com keywords)
  const existingSubSentiments = await prisma.subSentiment.findMany({
    where: { mainSentimentId: mainSentimentId },
  });
  
  // 2. Construir lista formatada com nomes e keywords para melhor contexto
  const existingSubSentimentsFormatted = existingSubSentiments.map(ss => {
    const keywordsStr = ss.keywords && ss.keywords.length > 0 
      ? ` (keywords: ${ss.keywords.slice(0, 5).join(', ')})` 
      : '';
    return `- ${ss.name}${keywordsStr}`;
  });

  // 3. Construir o prompt aprimorado com instruções mais enfáticas
  const prompt = `
Você é um especialista em análise de filmes com foco em emoções. Sua tarefa é analisar o filme "${movie.title}" para a jornada emocional: "${journeyOptionText}".

**Filme:** ${movie.title} (${movie.year})
**Sinopse:** ${movie.overview}
**Gêneros:** ${movie.genres.map((g: any) => g.name).join(', ')}
**Palavras-chave:** ${keywords.join(', ')}

**Análise Solicitada:**
Avalie se o filme se encaixa na opção de jornada: "${journeyOptionText}".

**Subsentimentos de "${mainSentimentName}" já existentes:**
${existingSubSentimentsFormatted.length > 0 ? existingSubSentimentsFormatted.join('\n') : 'Nenhum subsentimento cadastrado para esta categoria.'}

**INSTRUÇÕES CRÍTICAS (LEIA COM ATENÇÃO):**

⚠️ **REGRA ABSOLUTA:** Você DEVE SEMPRE tentar reutilizar um subsentimento existente da lista acima antes de sugerir um novo. Subsentimentos muito específicos (como "Angústia Sob Vigilância") NÃO devem ser criados se já existem subsentimentos mais genéricos que podem cobrir a mesma emoção (como "Ansiedade", "Tensão", "Conflito", etc.).

1. **PRIORIDADE MÁXIMA - REUTILIZAR EXISTENTES:** 
   - Analise CADA subsentimento existente da lista acima
   - Se algum deles captura a essência emocional do filme (mesmo que não seja 100% específico), USE-O
   - Subsentimentos genéricos são MELHORES que específicos demais
   - Exemplo: Se existe "Ansiedade" e você pensa em "Ansiedade Sob Vigilância", USE "Ansiedade"

2. **MATCHING SEMÂNTICO:**
   - Compare palavras-chave e conceitos, não apenas nomes exatos
   - Se a explicação de um subsentimento existente se alinha com o filme, USE-O
   - Palavras relacionadas contam: "angústia" ≈ "ansiedade" ≈ "tensão" ≈ "conflito"

3. **CRIAR NOVO APENAS SE REALMENTE NECESSÁRIO:**
   - Só sugira um novo subsentimento se NENHUM dos existentes capturar a emoção
   - Novos subsentimentos devem ser GENÉRICOS e REUTILIZÁVEIS (2-3 palavras)
   - Evite criar subsentimentos muito específicos que só servem para um filme
   - Marque com "isNew": true APENAS quando realmente necessário

4. **Seja Relevante:** Sugira até 3 subsentimentos que sejam **fortemente** relevantes.

5. **Justifique:** Forneça uma explicação clara e concisa para cada sugestão, conectando o filme à jornada.

**Formato de Saída (JSON VÁLIDO):**
{
  "suggestedSubSentiments": [
    {
      "name": "Nome do Subsentimento (Existente ou Novo)",
      "relevance": 0.9,
      "explanation": "Explicação concisa da sua escolha.",
      "isNew": false
    }
  ]
}
`;

  try {
    const provider = getAIProvider();
    const config = getDefaultConfig(provider);
    const aiProvider = createAIProvider(config);
    
    const systemPrompt = 'Você é um especialista em análise de filmes, focado em aspectos emocionais e sentimentais. Sua tarefa é avaliar filmes para jornadas emocionais específicas e retornar um JSON válido.';
    
    const response = await aiProvider.generateResponse(systemPrompt, prompt, {
      temperature: 0.5,
      maxTokens: 600
    });

    if (!response.success) {
      console.error(`Erro na API ${provider}:`, response.error);
      return { suggestedSubSentiments: [] };
    }

    const content = response.content;
    console.log(`\nResposta do ${provider.toUpperCase()}:`);
    console.log(content);

    try {
      // Regex para extrair o JSON de dentro de um bloco de código Markdown
      const jsonRegex = /```json\n([\s\S]*?)\n```/;
      const match = content.match(jsonRegex);

      if (match && match[1]) {
        return JSON.parse(match[1]);
      } else {
        // Se não houver markdown, tenta fazer o parse do conteúdo inteiro
        return JSON.parse(content);
      }
    } catch (jsonError) {
      console.error(`Erro ao fazer parse da resposta JSON da ${provider}:`, jsonError);
      console.error('Resposta recebida:', content);
      return { suggestedSubSentiments: [] };
    }
  } catch (error) {
    console.error(`Erro ao analisar filme com ${getAIProvider()}:`, error);
    return { suggestedSubSentiments: [] };
  }
}

function identifyThemes(movie: any, keywords: string[]): string[] {
  const themes: string[] = [];
  const synopsis = movie.overview.toLowerCase();
  const genres = movie.genres.map((g: any) => g.name.toLowerCase());
  const keywordsLower = keywords.map(k => k.toLowerCase());

  if (synopsis.includes('superação') || synopsis.includes('superar') || keywordsLower.includes('superação') || keywordsLower.includes('inspiração')) themes.push('superacao');
  if (synopsis.includes('família') || synopsis.includes('pai') || synopsis.includes('mãe') || synopsis.includes('filho') || synopsis.includes('filha') || keywordsLower.includes('família') || keywordsLower.includes('pai solteiro')) themes.push('familia');
  if (synopsis.includes('morte') || synopsis.includes('perda') || synopsis.includes('luto') || keywordsLower.includes('morte') || keywordsLower.includes('luto')) themes.push('luto');
  if (genres.includes('drama')) themes.push('drama');
  if (synopsis.includes('guerra') || synopsis.includes('histórico') || keywordsLower.includes('guerra') || keywordsLower.includes('histórico') || keywordsLower.includes('segunda guerra mundial') || keywordsLower.includes('nazista')) themes.push('historico');

  return [...new Set(themes)];
}

function findBestMatch(
  suggestion: { name: string; explanation: string },
  dbSubSentiments: SubSentiment[]
): SubSentiment | null {
  const suggestionName = suggestion.name.toLowerCase().trim();
  const suggestionExplanation = suggestion.explanation.toLowerCase().trim();
  const suggestionText = `${suggestionName} ${suggestionExplanation}`;
  let bestMatch: SubSentiment | null = null;
  let maxScore = 0;

  // Dicionário de sinônimos para matching semântico
  const synonyms: { [key: string]: string[] } = {
    'angustia': ['ansiedade', 'tensão', 'ansioso', 'angustiado', 'preocupação'],
    'ansiedade': ['angústia', 'tensão', 'nervosismo', 'preocupação', 'inquietação'],
    'vigilancia': ['monitoramento', 'observação', 'controle', 'supervisão'],
    'conflito': ['tensão', 'disputa', 'oposição', 'luta', 'guerra'],
    'sobrevivencia': ['sobreviver', 'resistência', 'persistência', 'luta'],
    'psicologico': ['mental', 'emocional', 'psique', 'cognitivo'],
    'complexidade': ['complexo', 'complicado', 'intrincado', 'sofisticado']
  };

  for (const dbSub of dbSubSentiments) {
    let currentScore = 0;
    const dbSubName = dbSub.name.toLowerCase().trim();
    
    // 1. MATCH EXATO DE NOME (peso máximo)
    if (suggestionName === dbSubName) {
      currentScore += 50;
    }
    
    // 2. MATCH PARCIAL DE NOME (uma contém a outra)
    if (suggestionName.includes(dbSubName) || dbSubName.includes(suggestionName)) {
      currentScore += 8;
    }
    
    // 3. MATCH POR PALAVRAS COMUNS NO NOME
    const nameWords = dbSubName.split(/[^a-zA-Z0-9áàâãéêíóôõúç]+/).filter(w => w.length > 2);
    const suggestionNameWords = suggestionName.split(/[^a-zA-Z0-9áàâãéêíóôõúç]+/).filter(w => w.length > 2);
    
    let commonNameWords = 0;
    for (const dbWord of nameWords) {
      // Verificar match direto
      if (suggestionNameWords.some(sugWord => sugWord === dbWord || sugWord.includes(dbWord) || dbWord.includes(sugWord))) {
        commonNameWords++;
        continue;
      }
      // Verificar sinônimos
      for (const [key, synList] of Object.entries(synonyms)) {
        if (synList.includes(dbWord) && suggestionNameWords.some(sugWord => synList.includes(sugWord))) {
          commonNameWords++;
          break;
        }
      }
    }
    
    if (nameWords.length > 0) {
      currentScore += (commonNameWords / Math.max(nameWords.length, suggestionNameWords.length)) * 10;
    }

    // 4. MATCH POR KEYWORDS (peso médio)
    for (const keyword of dbSub.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (suggestionText.includes(keywordLower)) {
        currentScore += 3;
      }
      // Verificar sinônimos das keywords
      for (const [key, synList] of Object.entries(synonyms)) {
        if (synList.includes(keywordLower) && synList.some(syn => suggestionText.includes(syn))) {
          currentScore += 2;
          break;
        }
      }
    }

    // 5. MATCH SEMÂNTICO NA EXPLICAÇÃO
    for (const dbWord of nameWords) {
      if (suggestionExplanation.includes(dbWord)) {
        currentScore += 2;
      }
      // Verificar sinônimos
      for (const [key, synList] of Object.entries(synonyms)) {
        if (synList.includes(dbWord) && synList.some(syn => suggestionExplanation.includes(syn))) {
          currentScore += 1;
          break;
        }
      }
    }

    if (currentScore > maxScore) {
      maxScore = currentScore;
      bestMatch = dbSub;
    }
  }

  // Threshold reduzido para ser mais tolerante (aceita matches mais fracos)
  if (maxScore >= 3) {
    console.log(`\n  -> Match encontrado para "${suggestion.name}": "${bestMatch?.name}" com score ${maxScore.toFixed(2)}`);
    return bestMatch;
  }
  
  console.log(`\n  -> Nenhum match adequado encontrado para "${suggestion.name}" (melhor score: ${maxScore.toFixed(2)}, threshold: 3.0)`);
  return null;
}

async function getJourneyOptionFlow(journeyOptionFlowId: number) {
  try {
    const option = await prisma.journeyOptionFlow.findUnique({ where: { id: journeyOptionFlowId } });
    if (!option) {
      console.log(`❌ Opção de jornada não encontrada: ${journeyOptionFlowId}`);
      return null;
    }

    const subSentiments = await prisma.$queryRaw<RawSubSentiment[]>`
      SELECT jofss."subSentimentId", jofss.weight, ss.name as "subSentimentName"
      FROM "JourneyOptionFlowSubSentiment" jofss
      JOIN "SubSentiment" ss ON ss.id = jofss."subSentimentId"
      WHERE jofss."journeyOptionFlowId" = ${journeyOptionFlowId}
    `;

    console.log(`\nOpção de jornada: ${option.text}`);
    console.log('SubSentiments associados:');
    subSentiments.forEach(ss => console.log(`- ${ss.subSentimentName} (peso: ${ss.weight})`));

    return { option, subSentiments };
  } catch (error) {
    console.error('Erro ao buscar opção de jornada:', error);
    return null;
  }
}

// Função Principal
async function main() {
  try {
    const args = process.argv.slice(2);
    const tmdbId = args[0] ? parseInt(args[0]) : null;
    const journeyOptionFlowId = args[1] ? parseInt(args[1]) : 159;
    const mainSentimentId = args[2] ? parseInt(args[2]) : null;

    if (!tmdbId || !mainSentimentId) {
      console.log('❌ Uso: ts-node analyzeMovieSentiments.ts <tmdbId> <journeyOptionFlowId> <mainSentimentId>');
      return;
    }

    // Find the movie in the database by TMDB ID
    const movie = await prisma.movie.findUnique({
      where: {
        tmdbId: tmdbId,
      },
    });

    if (!movie) {
      console.log(`❌ Filme com TMDB ID "${tmdbId}" não encontrado no banco de dados.`);
      return;
    }

    // --- Nova verificação de imdbRating ---
    if (movie.imdbRating === null || movie.imdbRating.toNumber() < 5.6) {
      console.log(`❌ Filme "${movie.title}" (IMDb Rating: ${movie.imdbRating || 'N/A'}) não atende ao requisito de rating mínimo (5.6). Processo interrompido.`);
      return;
    }
    // --- Fim da nova verificação ---

    

    console.log(`\n=== Analisando filme: ${movie.title} (${movie.year}) ===`);
    console.log(`TMDB ID: ${movie.tmdbId} | UUID: ${movie.id}\n`);
    const journeyOption = await getJourneyOptionFlow(journeyOptionFlowId);
    if (!journeyOption) return;

    const tmdbMovie = await searchMovie(undefined, undefined, movie.tmdbId || undefined, true); // skipStreaming: true - não precisa verificar streaming na análise de sentimentos
    if (!tmdbMovie) {
      console.log('❌ Filme não encontrado no TMDB');
      return;
    }

    const keywords = [...(tmdbMovie.movie as any).keywords?.map((k: any) => k.name) || [], ...(tmdbMovie.movie as any).genres?.map((g: any) => g.name) || []];
    const mainSentiment = await prisma.mainSentiment.findUnique({ where: { id: mainSentimentId } });
    if (!mainSentiment) {
      console.log(`❌ MainSentiment com ID ${mainSentimentId} não encontrado.`);
      return;
    }

    const analysis = await analyzeMovieWithAI(tmdbMovie.movie, keywords, journeyOption.option.text, mainSentimentId, mainSentiment.name);

    console.log('\n🔍 Validando sugestões da IA com o sentimento de destino (Lógica Inteligente)...');
    const validatedSubSentiments: { suggestion: any; dbMatch: SubSentiment | null }[] = [];

    const allSubSentiments = await prisma.subSentiment.findMany({ where: { mainSentimentId: mainSentimentId } }); // Needed for matching

    for (const suggestion of analysis.suggestedSubSentiments) {
      // MELHORIA: SEMPRE tentar matching primeiro, mesmo quando isNew=true
      // A IA pode marcar como novo incorretamente, então validamos sempre
      console.log(`\n🔍 Validando sugestão: "${suggestion.name}" (IA marcou como ${suggestion.isNew ? 'NOVO' : 'EXISTENTE'})`);
      
      const bestMatch = findBestMatch(suggestion, allSubSentiments);
      
      if (bestMatch) {
        if (bestMatch.mainSentimentId === mainSentimentId) {
          console.log(`✅ Match encontrado: IA "${suggestion.name}" -> BD "${bestMatch.name}" (ID: ${bestMatch.id})`);
          // SEMPRE usar o match encontrado, ignorando a flag isNew da IA
          validatedSubSentiments.push({ suggestion, dbMatch: bestMatch });
        } else {
          console.log(`❌ Descartado: Match "${bestMatch.name}" pertence a outro sentimento (ID: ${bestMatch.mainSentimentId})`);
          // Se não encontrou match no sentimento correto, tratar como novo apenas se realmente necessário
          validatedSubSentiments.push({ suggestion, dbMatch: null });
        }
      } else {
        // Se não encontrou match, tentar matching mais agressivo antes de criar novo
        console.log(`⚠️ Match inicial não encontrado para "${suggestion.name}". Tentando matching semântico mais agressivo...`);
        
        // Matching agressivo: verificar se alguma palavra principal do nome existe em algum subsentimento
        const suggestionWords = suggestion.name.toLowerCase().split(/[^a-zA-Z0-9áàâãéêíóôõúç]+/).filter(w => w.length > 3);
        let aggressiveMatch: SubSentiment | null = null;
        
        for (const dbSub of allSubSentiments) {
          const dbSubName = dbSub.name.toLowerCase();
          const dbSubText = `${dbSubName} ${dbSub.keywords.join(' ')}`;
          
          // Verificar se pelo menos 1 palavra principal está presente
          const matchingWords = suggestionWords.filter(word => 
            dbSubText.includes(word) || 
            dbSub.keywords.some(kw => kw.toLowerCase().includes(word))
          );
          
          if (matchingWords.length > 0 && dbSub.mainSentimentId === mainSentimentId) {
            aggressiveMatch = dbSub;
            console.log(`✅ Match semântico agressivo encontrado: "${suggestion.name}" -> "${dbSub.name}" (palavras comuns: ${matchingWords.join(', ')})`);
            break;
          }
        }
        
        if (aggressiveMatch) {
          validatedSubSentiments.push({ suggestion, dbMatch: aggressiveMatch });
        } else {
          console.log(`⚠️ Nenhum match encontrado mesmo com busca agressiva para "${suggestion.name}".`);
          // Só criar novo se realmente não encontrou nenhum match
          validatedSubSentiments.push({ suggestion, dbMatch: null });
        }
      }
    }

    console.log('\nSugestões de SubSentiments (após validação):');
    if (validatedSubSentiments.length === 0) {
      console.log('Nenhuma sugestão da IA foi compatível com o sentimento de destino.');
    } else {
      validatedSubSentiments.forEach(({ suggestion, dbMatch }) => {
        if (dbMatch) {
          console.log(`\n- ${dbMatch.name} (Relevância: ${suggestion.relevance})`);
          console.log(`  (Match para "${suggestion.name}")`);
        } else {
          console.log(`\n- ${suggestion.name} (Relevância: ${suggestion.relevance}) [NOVO]`);
        }
        console.log(`  Explicação IA: ${suggestion.explanation}`);
      });
    }

    console.log('\n=== GERANDO INSERTS SQL ===');
    let sqlInserts: string[] = [];
    const newSubSentimentsForApproval: any[] = [];

    if (validatedSubSentiments.length > 0) {
      // Coletar novos subsentimentos para aprovação
      validatedSubSentiments.forEach(({ suggestion, dbMatch }) => {
        if (!dbMatch) {
          newSubSentimentsForApproval.push(suggestion);
        }
      });

      // Se houver novos subsentimentos, imprimir o sinal para o orquestrador
      if (newSubSentimentsForApproval.length > 0) {
        console.log(`CURATOR_APPROVAL_NEEDED: ${JSON.stringify(newSubSentimentsForApproval)}`);
      }

      // Gerar inserts para subsentimentos existentes
      validatedSubSentiments.forEach(({ suggestion, dbMatch }) => {
        if (dbMatch) {
          // Escapar caracteres problemáticos para SQL
          const explanation = suggestion.explanation
            .replace(/'/g, "''")           // Escapar aspas simples 
            .replace(/\\/g, "\\\\")        // Escapar barras invertidas
            .replace(/\n/g, "\\n")         // Escapar quebras de linha
            .replace(/\r/g, "\\r")         // Escapar retorno de carro
            .replace(/\t/g, "\\t");        // Escapar tabs
          
          sqlInserts.push(
            `-- Match: IA "${suggestion.name}" -> BD "${dbMatch.name}"`,
            `INSERT INTO "MovieSentiment" ("movieId", "mainSentimentId", "subSentimentId", "relevance", "explanation", "createdAt", "updatedAt") VALUES ('${movie.id}', ${mainSentimentId}, ${dbMatch.id}, ${suggestion.relevance.toFixed(3)}, '${explanation}', NOW(), NOW()) ON CONFLICT ("movieId", "mainSentimentId", "subSentimentId") DO UPDATE SET "relevance" = EXCLUDED."relevance", "explanation" = EXCLUDED."explanation", "updatedAt" = NOW();`,
            `INSERT INTO "JourneyOptionFlowSubSentiment" ("journeyOptionFlowId", "subSentimentId", "weight", "createdAt", "updatedAt") VALUES (${journeyOptionFlowId}, ${dbMatch.id}, ${suggestion.relevance.toFixed(2)}, NOW(), NOW()) ON CONFLICT ("journeyOptionFlowId", "subSentimentId") DO UPDATE SET "weight" = EXCLUDED."weight", "updatedAt" = NOW();`
          );
        }
      });

      // Gerar inserts para novos subsentimentos
      validatedSubSentiments.forEach(({ suggestion, dbMatch }) => {
        if (!dbMatch) {
          const subSentimentName = suggestion.name.replace(/'/g, "''"); // Escapar aspas simples
          
          // Escapar caracteres problemáticos para SQL
          const explanation = suggestion.explanation
            .replace(/'/g, "''")           // Escapar aspas simples 
            .replace(/\\/g, "\\\\")        // Escapar barras invertidas
            .replace(/\n/g, "\\n")         // Escapar quebras de linha
            .replace(/\r/g, "\\r")         // Escapar retorno de carro
            .replace(/\t/g, "\\t");        // Escapar tabs
          sqlInserts.push(
            `-- Novo SubSentiment: "${suggestion.name}"`,
            `WITH new_sub AS (`,
            `  INSERT INTO "SubSentiment" ("name", "mainSentimentId", "keywords", "createdAt", "updatedAt")`,
            `  VALUES ('${subSentimentName}', ${mainSentimentId}, ARRAY['${subSentimentName.toLowerCase()}'], NOW(), NOW())`,
            `  RETURNING id`,
            `)`,
            `INSERT INTO "MovieSentiment" ("movieId", "mainSentimentId", "subSentimentId", "relevance", "explanation", "createdAt", "updatedAt")`,
            `SELECT '${movie.id}', ${mainSentimentId}, id, ${suggestion.relevance.toFixed(3)}, '${explanation}', NOW(), NOW() FROM new_sub;`,
            ``,
            `WITH new_sub AS (`,
            `  SELECT id FROM "SubSentiment" WHERE name = '${subSentimentName}' AND "mainSentimentId" = ${mainSentimentId} LIMIT 1`,
            `)`,
            `INSERT INTO "JourneyOptionFlowSubSentiment" ("journeyOptionFlowId", "subSentimentId", "weight", "createdAt", "updatedAt")`,
            `SELECT ${journeyOptionFlowId}, id, ${suggestion.relevance.toFixed(2)}, NOW(), NOW() FROM new_sub;`
          );
        }
      });

      if (sqlInserts.length > 0) {
        const insertFilePath = path.join(__dirname, '../../inserts.sql');
        // Usamos appendFileSync para adicionar ao arquivo. O orquestrador deve limpar o arquivo antes.
        fs.writeFileSync(insertFilePath, sqlInserts.join('\n') + '\n');
        console.log(`\n✅ ${sqlInserts.length} comandos SQL foram gerados e salvos em inserts.sql`);
      } else {
        console.log('\nNenhum INSERT gerado.');
      }

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
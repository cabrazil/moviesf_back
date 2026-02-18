// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient, SubSentiment } from '@prisma/client';
import { searchMovie } from './populateMovies';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Escapa uma string para uso seguro em SQL
 * Remove caracteres problemáticos e garante que aspas simples estejam balanceadas
 */
function escapeSQLString(text: string, maxLength: number = 500): string {
  // Truncar antes de escapar para evitar cortar sequências de escape no meio e garantir integridade
  const truncated = (text || '').substring(0, maxLength);

  return truncated
    .replace(/\\/g, '')              // Remover barras invertidas
    .replace(/"/g, '')               // Remover aspas duplas
    .replace(/'/g, "''")             // Escapar aspas simples (SQL padrão)
    .replace(/`/g, '')               // Remover backticks
    .replace(/\n/g, " ")             // Substituir quebras de linha por espaço
    .replace(/\r/g, "")              // Remover retorno de carro
    .replace(/\t/g, " ")             // Substituir tabs por espaço
    .replace(/;/g, ",")              // Substituir ponto-e-vírgula por vírgula para não quebrar o split do executor
    .replace(/\0/g, "")              // Remover caracteres nulos
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remover caracteres de controle
}


// Determinar provedor de IA baseado em argumentos ou variável de ambiente
function getAIProvider(): AIProvider {
  const args = process.argv.slice(2);
  const providerArg = args.find(arg => arg.startsWith('--ai-provider='));
  const provider = providerArg ? providerArg.split('=')[1] as AIProvider : process.env.AI_PROVIDER as AIProvider;

  // Validar e retornar apenas openai, deepseek ou gemini (padrão: openai)
  if (provider === 'deepseek' || provider === 'openai' || provider === 'gemini') {
    return provider;
  }

  // Fallback para openai se provider inválido ou não especificado
  return 'openai';
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
  mainSentimentName: string,
  mainSentimentKeywords: string[], // ← NOVO PARÂMETRO
  journeyOptionFlowId: number
): Promise<{
  matches: Array<{
    id?: number;
    name: string;
    relevance: number;
    explanation: string;
    type: 'OFFICIAL' | 'SUGGESTION';
    isNew?: boolean;
  }>;
  suggestedSubSentiments?: Array<{  // Compatibilidade
    name: string;
    id?: number;
    relevance: number;
    explanation: string;
    isNew?: boolean;
  }>;
}> {
  // 1. Buscar SubSentiments OFICIAIS da JOF (Lista 1)
  const officialJofRels = await prisma.journeyOptionFlowSubSentiment.findMany({
    where: { journeyOptionFlowId: journeyOptionFlowId },
    orderBy: { weight: 'desc' }
  });

  const officialIds = officialJofRels.map(rel => rel.subSentimentId);

  // Buscar TODOS os SubSentiments da JOF, independente do MainSentiment
  const officialSubSentiments = await prisma.subSentiment.findMany({
    where: { id: { in: officialIds } },
    include: {
      mainSentiment: true  // Incluir para mostrar origem no prompt
    }
  });

  // 2. Buscar SubSentiments da BIBLIOTECA DA LENTE (Lista 2) - excluindo os oficiais
  const librarySubSentiments = await prisma.subSentiment.findMany({
    where: {
      mainSentimentId: mainSentimentId,
      id: { notIn: officialIds }
    }
  });

  // 3. Formatar Lista Oficial (com MainSentiment de origem)
  const officialListFormatted = officialJofRels.map(rel => {
    const subSentiment = officialSubSentiments.find(ss => ss.id === rel.subSentimentId);
    if (!subSentiment) return '';

    // Mostrar MainSentiment de origem para contexto
    const mainSentimentInfo = (subSentiment as any).mainSentiment
      ? ` (${(subSentiment as any).mainSentiment.name})`
      : '';

    const keywordsStr = subSentiment.keywords && subSentiment.keywords.length > 0
      ? ` (keywords: ${subSentiment.keywords.slice(0, 3).join(', ')})`
      : '';

    return `- ${subSentiment.name}${mainSentimentInfo} (ID: ${subSentiment.id}, Peso: ${rel.weight.toFixed(2)})${keywordsStr}`;
  }).filter(s => s !== '');

  // 4. Formatar Biblioteca da Lente
  const libraryListFormatted = librarySubSentiments.map(ss => {
    const keywordsStr = ss.keywords && ss.keywords.length > 0
      ? ` (keywords: ${ss.keywords.slice(0, 3).join(', ')})`
      : '';
    return `- ${ss.name} (ID: ${ss.id})${keywordsStr}`;
  });

  // 5. Construir o NOVO prompt com foco em TODOS os conceitos da JOF
  const prompt = `
Você é um especialista em análise cinematográfica focado em psicologia das emoções. Sua tarefa é avaliar o filme "${movie.title}" para a jornada: "${journeyOptionText}".

**CONTEXTO DO FILME:**
- Título: ${movie.title} (${movie.year})
- Sinopse: ${movie.overview}
- Gêneros: ${movie.genres.map((g: any) => g.name).join(', ')}
- Keywords: ${keywords.join(', ')}

**LENTE DE ANÁLISE PRINCIPAL:** ${mainSentimentName} (ID: ${mainSentimentId})
**DEFINIÇÃO DA LENTE (KEYWORDS):** ${mainSentimentKeywords.length > 0 ? mainSentimentKeywords.join(', ') : 'Nenhuma keyword definida'}

**IMPORTANTE:** Como a lente é "${mainSentimentName}" definido por [${mainSentimentKeywords.slice(0, 5).join(', ')}...], você deve buscar nuances que correspondam a essa definição específica.

**IMPORTANTE:** Embora a lente principal seja "${mainSentimentName}", você deve identificar ESPECIFICAMENTE se o filme possui os seguintes conceitos emocionais, INDEPENDENTEMENTE da categoria emocional a que pertencem (Triste, Ansioso, Cansado, Calmo, Animado, etc.).

---

### LISTA OFICIAL DA JORNADA (Conceitos Esperados)

Identifique se o filme possui estes conceitos. Note que cada conceito pode pertencer a uma categoria emocional diferente (indicada como "categoria"):


**ATENÇÃO:** Ao retornar os matches, use APENAS o nome do conceito (ex: "Superação e Resiliência"), NÃO inclua a categoria no nome.

### 🚫 REGRA DE OURO (STRICT MATCH)
Você DEVE usar estritamente os nomes listados em "LISTA OFICIAL DA JORNADA" para itens do tipo "OFFICIAL".
- NÃO INVENTE novos nomes de sentimentos se eles já existirem com outro nome na lista (ex: use "Desintegração Psicológica" em vez de criar "Colapso Mental").
- Se identificar um tema forte (ex: "Masculinidade Tóxica") que não está na lista, TENTE PRIMEIRO mapear para o conceito mais próximo disponível na lista oficial.
- O campo "name" deve ser idêntico (copiar/colar) ao nome fornecido na lista.

${officialListFormatted.length > 0 ? officialListFormatted.join('\n') : 'Nenhum subsentimento oficial configurado para esta jornada.'}

---

### 🛠️ DIRETRIZES DE ANCORAGEM SEMÂNTICA

1. **Tradução de Contexto:** Converta keywords concretas (lugares, objetos, profissões) em estados emocionais.
   - Pergunte-se: "Como esta keyword [X] amplifica o subsentimento [Y] neste filme específico?"
   - Exemplo: "bateria" em Whiplash → instrumento da obsessão e pressão extrema → amplifica "Suspense Crescente"

2. **Validação de Intensidade:** Keywords que descrevem o tom (ex: "sombrio", "frenético", "melancólico", "intenso", "tensão") devem atuar como multiplicadores.
   - Se o DNA pede "Suspense" e existe a keyword "tensão" ou "intenso", a relevância deve ser >= 0.90.

3. **Hierarquia de Relevância:**
   - Keywords **tonais/emocionais** (obsessão, medo, alegria, tensão) → Peso ALTO (0.85-1.0)
   - Keywords **contextuais** (profissão, lugar, objeto) → Peso MÉDIO (0.60-0.85) se conectadas ao sentimento
   - Keywords **neutras** (ano, gênero) → Ignorar para análise emocional

---

**INSTRUÇÕES DE ANÁLISE:**

1. **ANÁLISE ABRANGENTE:** Analise o filme com foco principal em "${mainSentimentName}", MAS identifique TODOS os conceitos da lista acima que estão presentes no filme, mesmo que pertençam a outras categorias emocionais.

2. **NÃO SE LIMITE À LENTE:** Não restrinja sua análise apenas a "${mainSentimentName}". Se o filme possui "Superação e Resiliência [Triste]", identifique-o mesmo que a lente seja "Animado".

3. **PRIORIZE A LISTA OFICIAL:** Foque em encontrar matches na lista acima. Esses são os conceitos que definem o "DNA" desta jornada.

4. **RELEVÂNCIA (0.0 a 1.0):** Atribua a força do sentimento no filme.

7. **EXPLICAÇÕES CONCISAS:** Mantenha cada explicação com entre 2-3 frases (máximo 300 caracteres).

5. **MÁXIMO 10 MATCHES:** Você pode retornar até 10 matches (em vez de 3) para capturar toda a riqueza emocional do filme.

6. **BIBLIOTECA DA LENTE (Opcional):** Se você encontrar um conceito de "${mainSentimentName}" que NÃO está na lista oficial mas é muito relevante, pode sugerir:
${libraryListFormatted.length > 0 ? libraryListFormatted.slice(0, 5).join('\n') : 'Nenhum outro subsentimento disponível.'}

**FORMATO DE SAÍDA (JSON VÁLIDO):**

8. **LEI ANTI-CLICHÊ (CRÍTICO)**:
   - **PROIBIDO**: "alquimia silenciosa", "cura silenciosa", "dança sutil", "testamento de", "ode à".
   - **PROIBIDO**: Repetir a palavra "silenciosa" ou "silêncio" se ela não for literal (do som).
   - **PREFERÊNCIA**: Use verbos ativos e imagens concretas. Em vez de "a cura silenciosa", use "cicatrizar feridas antigas sem dizer uma palavra".
{
  "matches": [
    {
      "id": 123,
      "name": "Nome do SubSentiment",
      "relevance": 0.95,
      "explanation": "Por que se encaixa neste filme?",
      "type": "OFFICIAL"
    }
  ]
}

**REGRAS PARA O CAMPO "type":**
- Use "OFFICIAL" se o ID está na Lista Oficial da Jornada
- Use "SUGGESTION" se for da Biblioteca da Lente OU se for um conceito totalmente novo
`;

  try {
    let provider = getAIProvider();

    // Estratégia híbrida: Gemini tem limitações de quota na FASE 2 (análise de sentimentos)
    // Usar DeepSeek automaticamente para análise de sentimentos quando provider = gemini
    if (provider === 'gemini') {
      console.log('ℹ️ Usando DeepSeek para análise de sentimentos (Gemini tem limitações de quota nesta fase)');
      provider = 'deepseek';
    }

    const config = getDefaultConfig(provider);
    const aiProvider = createAIProvider(config);

    const systemPrompt = 'Você é um especialista em análise de filmes, focado em aspectos emocionais e sentimentais. Sua tarefa é avaliar filmes para jornadas emocionais específicas e retornar um JSON válido.';

    const response = await aiProvider.generateResponse(systemPrompt, prompt, {
      temperature: 0.5,
      maxTokens: 2000  // Aumentado para 2000 para evitar JSON truncado em respostas longas
    });

    if (!response.success) {
      console.error(`Erro na API ${provider}:`, response.error);
      return { matches: [], suggestedSubSentiments: [] };
    }

    const content = response.content;
    console.log(`\nResposta do ${provider.toUpperCase()}:`);
    console.log(`📊 Tamanho da resposta: ${content.length} caracteres`);
    console.log(content);

    // Verificar se a resposta parece estar truncada
    const seemsTruncated = !content.trim().endsWith('}') && !content.trim().endsWith('```');
    if (seemsTruncated) {
      console.log('⚠️ ALERTA: A resposta parece estar truncada (não termina com } ou ```)!');
    }

    /**
     * Tenta reparar JSON truncado fechando chaves e colchetes abertos
     */
    function repairTruncatedJSON(jsonString: string): string {
      let repaired = jsonString.trim();

      // Remover markdown se presente
      const markdownMatch = repaired.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch) {
        repaired = markdownMatch[1].trim();
      }

      // Encontrar o início do JSON (primeira {)
      const jsonStart = repaired.indexOf('{');
      if (jsonStart === -1) {
        return repaired; // Não é JSON válido
      }
      repaired = repaired.substring(jsonStart);

      // Contar chaves e colchetes abertos vs fechados
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') openBraces++;
          if (char === '}') openBraces--;
          if (char === '[') openBrackets++;
          if (char === ']') openBrackets--;
        }
      }

      // Fechar strings abertas (se houver)
      if (inString) {
        repaired += '"';
      }

      // Fechar colchetes abertos
      while (openBrackets > 0) {
        repaired += ']';
        openBrackets--;
      }

      // Fechar chaves abertas
      while (openBraces > 0) {
        repaired += '}';
        openBraces--;
      }

      return repaired;
    }

    try {
      // PASSO 1: Remover blocos de código markdown primeiro (mais robusto)
      let cleanedContent = content.trim();

      // Remover ```json ou ``` do início e fim
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

      // PASSO 2: Encontrar o início do JSON (primeira {)
      const jsonStart = cleanedContent.indexOf('{');
      let jsonString: string;

      if (jsonStart !== -1) {
        jsonString = cleanedContent.substring(jsonStart).trim();
        console.log(`📝 JSON extraído (${jsonString.length} chars)`);
      } else {
        // Fallback: usar conteúdo inteiro se não encontrar {
        jsonString = cleanedContent;
        console.log('⚠️ Nenhum { encontrado, usando conteúdo completo');
      }

      // Tentar parse direto primeiro
      try {
        const parsedResponse = JSON.parse(jsonString);

        // COMPATIBILIDADE: Converter novo formato (matches) para formato antigo (suggestedSubSentiments)
        if (parsedResponse.matches && Array.isArray(parsedResponse.matches)) {
          // Filtrar apenas OFFICIAL para gravação automática
          const officialMatches = parsedResponse.matches.filter((m: any) => m.type === 'OFFICIAL');
          const suggestions = parsedResponse.matches.filter((m: any) => m.type === 'SUGGESTION');

          // Converter OFFICIAL para formato antigo
          parsedResponse.suggestedSubSentiments = officialMatches.map((m: any) => ({
            name: m.name,
            id: m.id,
            relevance: m.relevance,
            explanation: m.explanation,
            isNew: m.isNew || false
          }));

          // Logar SUGGESTIONS separadamente (não serão gravadas)
          if (suggestions.length > 0) {
            console.log(`\n💡 SUGESTÕES DA BIBLIOTECA (não serão gravadas automaticamente):`);
            suggestions.forEach((s: any) => {
              console.log(`   - ${s.name} (Relevância: ${s.relevance.toFixed(2)}): ${s.explanation}`);
            });
          }
        }

        return parsedResponse;
      } catch (directParseError) {
        // Se falhar, tentar reparar JSON truncado
        console.log('⚠️ JSON pode estar truncado, tentando reparar...');
        const repaired = repairTruncatedJSON(jsonString);

        try {
          return JSON.parse(repaired);
        } catch (repairedParseError) {
          // Se ainda falhar, logar erro detalhado
          console.error(`Erro ao fazer parse da resposta JSON da ${provider}:`, directParseError);
          console.error('JSON original:', jsonString.substring(0, 500) + (jsonString.length > 500 ? '...' : ''));
          console.error('JSON reparado:', repaired.substring(0, 500) + (repaired.length > 500 ? '...' : ''));
          throw repairedParseError;
        }
      }
    } catch (jsonError) {
      console.error(`Erro ao fazer parse da resposta JSON da ${provider}:`, jsonError);
      console.error('Resposta recebida (primeiros 500 chars):', content.substring(0, 500) + (content.length > 500 ? '...' : ''));
      return { matches: [], suggestedSubSentiments: [] };
    }
  } catch (error) {
    console.error(`Erro ao analisar filme com ${getAIProvider()}:`, error);
    return { matches: [], suggestedSubSentiments: [] };
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
    // --- Nova verificação de imdbRating ---
    // Usar o maior rating entre IMDb e TMDB para ser mais justo
    const imdbRating = movie.imdbRating ? Number(movie.imdbRating) : 0;
    const tmdbRating = Number(movie.vote_average || 0);
    const rating = Math.max(imdbRating, tmdbRating);

    if (rating < 5.6) {
      console.log(`❌ Filme "${movie.title}" (Melhor Rating: ${rating.toFixed(1)}) não atende ao requisito de rating mínimo (5.6). Processo interrompido.`);
      console.log(`   (IMDb: ${movie.imdbRating || 'N/A'}, TMDB: ${movie.vote_average || 'N/A'})`);
      return;
    }
    // --- Fim da nova verificação ---
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

    const analysis = await analyzeMovieWithAI(
      tmdbMovie.movie,
      keywords,
      journeyOption.option.text,
      mainSentimentId,
      mainSentiment.name,
      mainSentiment.keywords || [], // Passando as keywords do MainSentiment
      journeyOption.option.id
    );

    console.log('🔍 Validando subsentimentos da IA...');
    const validatedSubSentiments: { suggestion: any; dbMatch: SubSentiment | null }[] = [];

    // Buscar TODOS os SubSentiments para validação (não apenas do analysisLens)
    const allSubSentiments = await prisma.subSentiment.findMany();

    for (const suggestion of (analysis.suggestedSubSentiments || [])) {
      let bestMatch: SubSentiment | null = null;

      // Se a IA retornou um ID (match OFFICIAL), confiar nele
      if (suggestion.id) {
        bestMatch = allSubSentiments.find(ss => ss.id === suggestion.id) || null;

        if (!bestMatch) {
          console.log(`⚠️ ID ${suggestion.id} não encontrado para "${suggestion.name}". Tentando matching semântico...`);
        }
      }

      // Se não tem ID ou ID não encontrado, fazer matching semântico
      if (!bestMatch) {
        bestMatch = findBestMatch(suggestion, allSubSentiments);
      }

      if (!bestMatch) {
        // Matching agressivo
        const suggestionWords = suggestion.name.toLowerCase().split(/[^a-zA-Z0-9áàâãéêíóôõúç]+/).filter((w: string) => w.length > 3);

        for (const dbSub of allSubSentiments) {
          const dbSubText = `${dbSub.name.toLowerCase()} ${dbSub.keywords.join(' ')}`;
          const matchingWords = suggestionWords.filter((word: string) =>
            dbSubText.includes(word) ||
            dbSub.keywords.some(kw => kw.toLowerCase().includes(word))
          );
          if (matchingWords.length > 0) {
            bestMatch = dbSub;
            break;
          }
        }

        if (!bestMatch) {
          console.log(`⚠️ Nenhum match encontrado para "${suggestion.name}" (será criado novo).`);
        }
      }

      validatedSubSentiments.push({ suggestion, dbMatch: bestMatch });
    }

    const matchCount = validatedSubSentiments.filter(v => v.dbMatch).length;
    const newCount = validatedSubSentiments.filter(v => !v.dbMatch).length;
    console.log(`✅ Matches OFICIAIS para gravação: ${matchCount}${newCount > 0 ? ` | 🆕 Novos: ${newCount}` : ''}`);

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
          // Escapar explanation para SQL
          const explanation = escapeSQLString(suggestion.explanation);


          const subSentimentName = dbMatch.name.replace(/'/g, "''"); // Escapar nome para SQL

          sqlInserts.push(
            `-- Match: IA "${suggestion.name}" -> BD "${dbMatch.name}"`,
            `-- Verificação de Unicidade Semântica: Remove duplicatas com menor relevância`,
            `DELETE FROM "MovieSentiment" ms USING "SubSentiment" ss WHERE ms."subSentimentId" = ss.id AND ms."movieId" = '${movie.id}' AND ss.name = '${subSentimentName}' AND ms.relevance < ${suggestion.relevance.toFixed(3)};`,
            `-- Insere apenas se não existir conceito com relevância igual ou maior`,
            `INSERT INTO "MovieSentiment" ("movieId", "mainSentimentId", "subSentimentId", "relevance", "explanation", "createdAt", "updatedAt") SELECT '${movie.id}', ${mainSentimentId}, ${dbMatch.id}, ${suggestion.relevance.toFixed(3)}, '${explanation}', NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM "MovieSentiment" ms JOIN "SubSentiment" ss ON ms."subSentimentId" = ss.id WHERE ms."movieId" = '${movie.id}' AND ss.name = '${subSentimentName}');`
            // ⚠️ REMOVIDO: Não modificar JourneyOptionFlowSubSentiment durante curadoria
            // A configuração da jornada (DNA) deve ser definida manualmente, não pela IA
          );
        }
      });


      // Gerar inserts para novos subsentimentos
      validatedSubSentiments.forEach(({ suggestion, dbMatch }) => {
        if (!dbMatch) {
          const subSentimentName = suggestion.name.replace(/'/g, "''"); // Escapar aspas simples

          // Escapar explanation para SQL
          const explanation = escapeSQLString(suggestion.explanation);
          sqlInserts.push(
            `-- Novo SubSentiment: "${suggestion.name}"`,
            `-- Criar SubSentiment se não existir`,
            `INSERT INTO "SubSentiment" ("name", "mainSentimentId", "keywords", "createdAt", "updatedAt") VALUES ('${subSentimentName}', ${mainSentimentId}, ARRAY['${subSentimentName.toLowerCase()}'], NOW(), NOW()) ON CONFLICT ("name", "mainSentimentId") DO NOTHING;`,
            `-- Verificação de Unicidade Semântica: Remove duplicatas com menor relevância`,
            `DELETE FROM "MovieSentiment" ms USING "SubSentiment" ss WHERE ms."subSentimentId" = ss.id AND ms."movieId" = '${movie.id}' AND ss.name = '${subSentimentName}' AND ms.relevance < ${suggestion.relevance.toFixed(3)};`,
            `-- Insere apenas se não existir conceito com relevância igual ou maior`,
            `INSERT INTO "MovieSentiment" ("movieId", "mainSentimentId", "subSentimentId", "relevance", "explanation", "createdAt", "updatedAt") SELECT '${movie.id}', ${mainSentimentId}, ss.id, ${suggestion.relevance.toFixed(3)}, '${explanation}', NOW(), NOW() FROM "SubSentiment" ss WHERE ss.name = '${subSentimentName}' AND ss."mainSentimentId" = ${mainSentimentId} AND NOT EXISTS (SELECT 1 FROM "MovieSentiment" ms2 JOIN "SubSentiment" ss2 ON ms2."subSentimentId" = ss2.id WHERE ms2."movieId" = '${movie.id}' AND ss2.name = '${subSentimentName}');`
            // ⚠️ REMOVIDO: Não modificar JourneyOptionFlowSubSentiment durante curadoria
            // A configuração da jornada (DNA) deve ser definida manualmente, não pela IA
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
// Carregar variáveis de ambiente
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';

const prisma = new PrismaClient();

interface ReprocessOptions {
  jofId?: number;
  movieId?: string;
  movieTitle?: string;
  movieYear?: number;
  dryRun?: boolean;
  aiProvider?: AIProvider;
  batchSize?: number;
  maxScore?: number;
}

interface AuditResult {
  matches: Array<{
    subSentimentName: string;
    relevance: number;
    explanation: string;
  }>;
  reflection: string;
}

/**
 * Script para reprocessar sentimentos de filmes já existentes no banco
 * Usa dados do banco (sinopse, keywords) em vez de buscar no TMDB
 * Otimizado para processamento em massa
 */
async function reprocessMovieSentiments(options: ReprocessOptions) {
  const {
    jofId,
    movieId,
    movieTitle,
    movieYear,
    dryRun = false,
    aiProvider = 'deepseek',
    batchSize = 10,
    maxScore
  } = options;

  console.log('🔄 === REPROCESSAMENTO DE SENTIMENTOS DE FILMES ===');
  console.log(`🤖 Provider: ${aiProvider}`);
  console.log(`📊 Modo: ${dryRun ? 'DRY-RUN (não grava)' : 'PRODUÇÃO (grava no banco)'}`);
  console.log(`📦 Batch size: ${batchSize} filmes por vez\n`);

  // PASSO 1: Buscar filmes para reprocessar
  let moviesToProcess: Array<{
    id: string;
    title: string;
    year: number | null;
    description: string | null;
    keywords: string[];
  }> = [];

  if (movieId) {
    // Reprocessar filme específico
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: {
        id: true,
        title: true,
        year: true,
        description: true,
        keywords: true
      }
    });

    if (!movie) {
      console.log(`❌ Filme não encontrado: ${movieId}`);
      return;
    }

    moviesToProcess = [movie];
  } else if (movieTitle && movieYear) {
    // Buscar por título e ano
    const movie = await prisma.movie.findFirst({
      where: {
        title: movieTitle,
        year: movieYear
      },
      select: {
        id: true,
        title: true,
        year: true,
        description: true,
        keywords: true
      }
    });

    if (!movie) {
      console.log(`❌ Filme não encontrado: ${movieTitle} (${movieYear})`);
      return;
    }

    moviesToProcess = [movie];
  } else if (jofId) {
    // Buscar todos os filmes de uma jornada
    const suggestions = await prisma.movieSuggestionFlow.findMany({
      where: {
        journeyOptionFlowId: jofId
      },
      select: {
        movie: {
          select: {
            id: true,
            title: true,
            year: true,
            description: true,
            keywords: true
          }
        }
      }
    });

    moviesToProcess = suggestions.map(s => s.movie);
    console.log(`📋 Encontrados ${moviesToProcess.length} filmes na JOF ${jofId}\n`);
  } else {
    console.log('❌ Especifique --jofId, --movieId ou --title + --year');
    return;
  }

  // PASSO 2: Buscar DNA e Contexto da jornada
  let dnaSubSentiments: Array<{
    id: number;
    name: string;
    keywords: string[];
    weight: number;
    mainSentimentId?: number;
  }> = [];

  let userSentimentContext = "lidar com suas emoções";

  if (jofId) {
    // 2.1 Buscar Contexto Emocional
    const jof = await prisma.journeyOptionFlow.findUnique({
      where: { id: jofId },
      include: {
        journeyStepFlow: {
          include: {
            emotionalIntentionJourneySteps: {
              include: {
                emotionalIntention: {
                  include: {
                    mainSentiment: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const emotionalIntention = jof?.journeyStepFlow?.emotionalIntentionJourneySteps?.[0]?.emotionalIntention;
    if (emotionalIntention?.mainSentiment?.name) {
      userSentimentContext = emotionalIntention.mainSentiment.name.toLowerCase();
      console.log(`🎭 Contexto Emocional: ${userSentimentContext}`);
    }

    // 2.2 Buscar DNA
    const jofRels = await prisma.journeyOptionFlowSubSentiment.findMany({
      where: { journeyOptionFlowId: jofId },
      orderBy: { weight: 'desc' }
    });

    const subSentimentIds = jofRels.map(rel => rel.subSentimentId);

    const subSentiments = await prisma.subSentiment.findMany({
      where: { id: { in: subSentimentIds } },
      include: {
        mainSentiment: true
      }
    });

    dnaSubSentiments = jofRels.map(rel => {
      const ss = subSentiments.find(s => s.id === rel.subSentimentId);
      if (!ss) return null;
      return {
        id: ss.id,
        name: ss.name,
        keywords: ss.keywords || [],
        weight: Number(rel.weight),
        mainSentimentId: ss.mainSentimentId
      };
    }).filter(Boolean) as typeof dnaSubSentiments;

    console.log(`🧬 DNA da JOF ${jofId}: ${dnaSubSentiments.length} SubSentiments\n`);
  }

  // PASSO 3: Processar filmes em batches
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < moviesToProcess.length; i += batchSize) {
    const batch = moviesToProcess.slice(i, i + batchSize);

    console.log(`\n📦 Processando batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(moviesToProcess.length / batchSize)}`);
    console.log(`   Filmes ${i + 1} a ${Math.min(i + batchSize, moviesToProcess.length)} de ${moviesToProcess.length}\n`);

    for (const movie of batch) {
      processedCount++;
      // Checagem extra de maxScore se estivermos processando por JOF
      if (jofId && maxScore !== null) {
        const currentSuggestion = await prisma.movieSuggestionFlow.findFirst({
          where: { movieId: movie.id, journeyOptionFlowId: jofId }
        });
        if (currentSuggestion && maxScore !== undefined && Number(currentSuggestion.relevanceScore || 0) > maxScore) {
          console.log(`⏭️  PULADO: ${movie.title} (Score ${currentSuggestion.relevanceScore?.toFixed(2)} > ${maxScore})`);
          continue;
        }
      }
      try {
        console.log(`🎬 ${movie.title} (${movie.year})`);

        // Auditar filme com IA (Gera verbos)
        const auditResult = await auditMovieWithAI(movie, dnaSubSentiments, aiProvider, userSentimentContext);

        // CORREÇÃO: Aplicar Rephraser para transformar Verbo -> Frase Nominal
        if (auditResult && auditResult.reflection) {
          // console.log(`   📝 Reflexão Original (Verbo): "${auditResult.reflection}"`);
          // Passar o provider escolhido (variable aiProvider from options)
          const rephrased = await rephraseReasonWithAI(auditResult.reflection, aiProvider);
          auditResult.reflection = rephrased;
          // console.log(`   ✨ Reflexão Corrigida: "${auditResult.reflection}"`);
        }

        if (!auditResult || auditResult.matches.length === 0) {
          console.log(`⚠️  Nenhum match encontrado\n`);
          continue;
        }

        console.log(`✅ ${auditResult.matches.length} matches encontrados:`);

        // Filtrar e validar matches
        const validMatches = auditResult.matches.filter(m => {
          if (!m.subSentimentName) {
            console.warn(`   ⚠️ Match sem nome ignorado: ${JSON.stringify(m)}`);
            return false;
          }
          return true;
        });

        // Exibir detalhes dos matches válidos
        validMatches.forEach(m => {
          console.log(`   🔸 ${m.subSentimentName.padEnd(35)} | Rel: ${m.relevance.toFixed(2)} | ${m.explanation.length > 60 ? m.explanation.substring(0, 57) + '...' : m.explanation}`);
        });

        // Calcular e exibir score previsto (Simulado ou Real)
        if (jofId && dnaSubSentiments.length > 0) {
          const predictedScore = calculateScoreFromMatches(validMatches, dnaSubSentiments);
          console.log(`
   📊 Score Calculado: ${predictedScore.toFixed(3)} (${dryRun ? 'Simulado' : 'Previsto para salvar'})`);

          console.log(`   ✨ Reflexão gerada (Preview): "${auditResult.reflection}"`);
        }

        if (!dryRun) {
          console.log('\n   💾 Gravando no banco...');
          // Gravar no banco (apenas matches válidos)
          await saveMovieSentiments(movie.id, validMatches, dnaSubSentiments);

          // Recalcular score se jofId especificado (Confirmação oficial do banco)
          if (jofId) {
            const score = await calculateAndUpdateScore(movie.id, jofId);
            console.log(`   ✅ Score gravado no banco: ${score?.toFixed(3) || 'N/A'}`);

            // Gerar nova reflexão se score >= 5.5 (Bronze, Prata ou Ouro)
            if (score && score >= 5.5 && auditResult.reflection) {
              await updateReflection(movie.id, jofId, auditResult.reflection);
              console.log(`   📝 Reflexão atualizada no banco`);
            }
          }
        } else {
          console.log('\n   🚫 Dry-run: Nada gravado no banco.');
        }

        successCount++;
        console.log('');

      } catch (error) {
        console.error(`❌ Erro ao processar ${movie.title}:`, error);
        errorCount++;
      }

    }

    // Pequena pausa entre batches para não sobrecarregar API
    if (i + batchSize < moviesToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // PASSO 4: Resumo
  console.log('\n=== RESUMO DO REPROCESSAMENTO ===');
  console.log(`Total processados: ${processedCount}`);
  console.log(`Sucesso: ${successCount}`);
  console.log(`Erros: ${errorCount}`);
  console.log(`Modo: ${dryRun ? 'DRY-RUN (nada foi gravado)' : 'PRODUÇÃO'}`);
}

/**
 * Audita um filme usando IA focada
 */
async function auditMovieWithAI(
  movie: {
    title: string;
    year: number | null;
    description: string | null;
    keywords: string[];
  },
  dnaSubSentiments: Array<{
    id: number;
    name: string;
    keywords: string[];
    weight: number;
  }>,
  provider: AIProvider,
  userSentimentContext: string
): Promise<AuditResult | null> {

  // Formatar DNA com detalhes técnicos
  const dnaWithDetails = dnaSubSentiments.map(ss =>
    `- **${ss.name}** (Peso: ${ss.weight.toFixed(2)})\n  Referências Técnicas: ${ss.keywords.join(', ')}`
  ).join('\n');

  const prompt = `
Você é um curador especialista em psicologia cinematográfica do "vibesfilm".
Sua tarefa é auditar se o filme abaixo se encaixa nos conceitos específicos da LISTA DE DNA.

### 🎬 DADOS DO FILME (FONTE A)
- Título: ${movie.title} (${movie.year})
- Sinopse: ${movie.description || "Sem sinopse"}
- Keywords do Filme: ${movie.keywords.join(', ')}

### 🧬 LISTA DE DNA - CONCEITOS ALVO (FONTE B)
Você deve verificar a presença destes itens. Use as "Referências Técnicas" para guiar seu julgamento:

${dnaWithDetails}

### � REGRA DE OURO (STRICT MATCH)
Você DEVE usar estritamente os nomes listados em "LISTA DE DNA".
- NÃO INVENTE novos nomes de sentimentos.
- Se identificar um tema forte (ex: "Masculinidade Tóxica") que não está na lista, faça o mapeamento para o conceito mais próximo disponível na lista (ex: "Desintegração Psicológica", "Isolamento" ou "Conflito").
- O campo "subSentimentName" deve ser idêntico (copiar/colar) ao nome fornecido na lista acima.

### �🛠️ DIRETRIZES DE ANCORAGEM SEMÂNTICA

1. **Tradução de Contexto:** Converta keywords concretas (lugares, objetos, profissões) em estados emocionais.
   - Pergunte-se: "Como esta keyword [X] amplifica o subsentimento [Y] neste filme específico?"
   - Exemplo: "bateria" em Whiplash → instrumento da obsessão e pressão extrema → amplifica "Suspense Crescente"

2. **Validação de Intensidade:** Keywords que descrevem o tom (ex: "sombrio", "frenético", "melancólico", "intenso", "tensão") devem atuar como multiplicadores.
   - Se o DNA pede "Suspense" e existe a keyword "tensão" ou "intenso", a relevância deve ser >= 0.90.

3. **Hierarquia de Relevância:**
   - Keywords **tonais/emocionais** (obsessão, medo, alegria, tensão) → Peso ALTO (0.85-1.0)
   - Keywords **contextuais** (profissão, lugar, objeto) → Peso MÉDIO (0.60-0.85) se conectadas ao sentimento
   - Keywords **neutras** (ano, gênero) → Ignorar para análise emocional

### 🎯 MISSÃO 1: ANÁLISE PROFUNDA (EXPLANATION DE ELITE)
Para cada match, escreva uma "explanation" que sirva de base para um artigo crítico de cinema.
1. **PROIBIDO**: "A sinopse e keywords mostram...", "O filme aborda...", "Justificado por...".
2. **COMO FAZER**: Descreva a CENA, o GESTO ou a DINÂMICA específica que encarna o sentimento.
3. **OBJETIVO**: Quem ler a explicação deve entender exatamente *como* o sentimento se manifesta na tela.
4. **ESTILO MICROCONTO**: Máx. 160 caracteres. Escreva como um mestre do Haicai: cada palavra deve ter peso imenso. Se disser em 120, não use 160.
5. **RELEVÂNCIA**: Retorne APENAS matches com relevância >= 0.6.

Exemplo Ruim: "O filme mostra solidão através da viagem da personagem."
Exemplo Bom: "A solidão se materializa no silêncio da van estacionada em pátios vazios, onde Fern celebra o Ano Novo com apenas uma fita estalando."

### 🎯 MISSÃO 2: O COMPLEMENTO PERFEITO (CONTINUAÇÃO DE FRASE)
O frontend exibe: "Este filme é perfeito para quem busca..."
Sua tarefa é escrever APENAS o restante da frase (o complemento).

1. **FORMATO**: Comece com letra MINÚSCULA.
   - **MENU DE VERBOS (VARIEDADE)**: Alterne o uso destes verbos. NÃO use apenas um:
     * "descobrir..."
     * "testemunhar..."
     * "vivenciar..."
     * "sentir..."
     * "acompanhar..."
     * "contemplar..."
     * "confrontar..."
     * "examinar..."
     * "decifrar..."
     * "reconhecer..."
     * "atravessar..."
     * "desvendar..."
     * "habitar..."
     * "percorrer..."
     * "sondar..."
   - **PROIBIDO EXTENSIVO**: O verbo "mergulhar" está sendo usado em excesso. USE-O COM EXTREMA PARCIMÔNIA (máximo 5% das vezes). Prefira "adentrar", "imersão", "penetrar" ou os verbos acima.
   - **REGRA DE OURO**: Use o verbo que melhor descreve a AÇÃO do filme. Se é um filme de viagem, "acompanhar/atravessar". Se é introspectivo, "contemplar/examinar". Se é aprendizado, "aprender/entender".
   - Opção Secundária (Substantivos): "uma experiência de...", "uma jornada por...". Use apenas se o verbo não encaixar bem.
2. **CONTEÚDO**: Conecte a essência do filme ao desejo profundo do usuário.
3. **PROIBIDO**: NÃO repita "para quem busca". NÃO use ponto final se possível (mas aceitável).
4. **ESTILO**: Fluido, elegante e direto.
5. **TAMANHO OBRIGATÓRIO**: Entre 15 e 24 PALAVRAS. (Ideal: 20).
6. **RESTRIÇÃO**: Evite "QUE/ONDE" em excesso. Use no máximo UMA oração subordinada.
7. **ESTRUTURA**: Sujeito + Verbo + Predicado poético.

Exemplos Bons:
- (busca) "aprender que o silêncio não é um vazio, mas uma nova frequência para reencontrar a própria voz."
- (busca) "uma experiência de suspense psicológico intenso que desafia os limites do medo."
- (busca) "entender que a verdadeira coragem reside na aceitação da própria vulnerabilidade."

### FORMATO JSON STRICT (RIGOROSO)
IMPORTANTE: Use APENAS aspas duplas (") para todas as chaves e valores string. JAMAIS use aspas simples.
Exemplo Válido: {"chave": "valor"}
Exemplo INVÁLIDO: {'chave': 'valor'}

{
  "matches": [
    {
      "subSentimentName": "Nome Exato da Lista",
      "relevance": 0.95,
      "explanation": "A solidão se materializa no silêncio da van estacionada em pátios vazios..."
    }
  ],
  "reflection": "Texto de elite seguindo as regras..."
}
`;

  try {
    const config = getDefaultConfig(provider);
    const ai = createAIProvider(config);
    const response = await ai.generateResponse("Você é um curador especialista em psicologia cinematográfica.", prompt, { temperature: 0.7 });

    // Extrair JSON
    let jsonString = response.content.trim();
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    let result: AuditResult;

    try {
      result = JSON.parse(jsonString) as AuditResult;
    } catch (e) {
      console.warn('⚠️ JSON estrito falhou. Tentando fallback para objeto JS (aspas simples)...');
      try {
        // Fallback para aceitar aspas simples ou formatos relaxados da IA
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        result = new Function('return ' + jsonString)() as AuditResult;
      } catch (e2) {
        throw e; // Lança erro original se ambos falharem
      }
    }

    // Normalização de chaves (Robustez contra alucinações de casing da IA)
    if (result && Array.isArray(result.matches)) {
      result.matches = result.matches.map((m: any) => ({
        ...m,
        // Aceita várias formas de escrita
        subSentimentName: m.subSentimentName || m.subsentimentName || m.SubSentimentName || m.sub_sentiment_name,
        relevance: (typeof m.relevance === 'number' && !isNaN(m.relevance)) ? m.relevance : (parseFloat(m.relevance) || 0) // Garante que é número válido
      }));
    }

    return result;

  } catch (error) {
    console.error('Erro ao auditar com IA:', error);
    return null;
  }
}

async function rephraseReasonWithAI(originalReason: string, forcedProvider?: AIProvider): Promise<string> {
  try {
    const provider = forcedProvider || 'openai'; // Usar provider forçado ou default (openai)
    const config = getDefaultConfig(provider);
    const aiProvider = createAIProvider(config);

    const prompt = `
Tarefa: Transformar a frase abaixo em uma Frase Nominal curta, poética e direta, removendo o verbo inicial e proibindo terminantemente o uso de rótulos como "Um testemunho de", "Uma crônica de", "Um estudo sobre" ou "Um retrato de".

EXEMPLOS DE REFERÊNCIA (Siga esta cadência):

"A quieta revelação de que a centelha da vida não é um destino a conquistar, mas o sopro que já habita cada momento comum."

"A liberdade que habita no desapego e a profunda conexão humana que floresce nos espaços entre um lugar e outro."

"A beleza serena que habita o limiar entre a vida e a morte, onde o último cuidado é também o primeiro ato de autoconhecimento."

"A trajetória de um homem comum que atravessa o mundo para, finalmente, encontrar-se no instante em que para de sonhar e começa a viver."

"A beleza rude de um sonho que floresce nos pântanos, onde a amizade improvável se torna a única lei e a liberdade a única vitória."

REGRAS DE OURO:

IMPACTO IMEDIATO: Comece diretamente pelo tema central (Amor, Dor, Resiliência, Obsessão).

LIMITE ESTRITO: Máximo de 24 palavras. Seja econômico e denso.

NOMINALIZAÇÃO: Transforme o verbo inicial em substantivo se necessário, mas mantenha a fluidez (ex: em vez de "Testemunhar a dor", use "A dor visceral...").

ESTÉTICA: Mantenha os adjetivos que dão textura à frase.

Frase Original: "${originalReason}" Responda APENAS com a nova frase.
`;

    const response = await aiProvider.generateResponse(
      'Você é um editor de texto especializado em gramática e estilo.',
      prompt,
      { temperature: 0.3, maxTokens: 200 }
    );

    if (response.success) {
      return response.content.replace(/^"|"$/g, '').trim();
    }
    return originalReason;
  } catch (error) {
    console.error('Erro ao reescrever reflexão:', error);
    return originalReason;
  }
}

/**
 * Salva sentimentos no banco
 */
async function saveMovieSentiments(
  movieId: string,
  matches: Array<{ subSentimentName: string; relevance: number; explanation: string }>,
  dnaSubSentiments: Array<{ id: number; name: string; mainSentimentId?: number }>
) {
  for (const match of matches) {
    // Encontrar SubSentiment por nome exato
    const subSentiment = dnaSubSentiments.find(ss => ss.name === match.subSentimentName);

    if (!subSentiment) {
      console.log(`⚠️  SubSentiment não encontrado no DNA: ${match.subSentimentName}`);
      continue;
    }

    // Buscar registro existente para comparar
    const existing = await prisma.movieSentiment.findFirst({
      where: {
        movieId: movieId,
        subSentimentId: subSentiment.id
      }
    });

    // Decidir se deve atualizar
    const shouldUpdate = !existing ||
      match.relevance > Number(existing.relevance) ||
      match.explanation.length > (existing.explanation?.length || 0);

    if (!existing) {
      // Criar novo
      // Se não existe, usamos o mainSentimentId do subSentiment ou default 18
      const mainId = subSentiment.mainSentimentId || 18;

      await prisma.movieSentiment.create({
        data: {
          movieId: movieId,
          mainSentimentId: mainId,
          subSentimentId: subSentiment.id,
          relevance: match.relevance,
          explanation: match.explanation
        }
      });
      console.log(`   ✅ Criado: ${match.subSentimentName} (${match.relevance.toFixed(2)})`);
    } else if (shouldUpdate) {
      // Atualizar se nova análise for melhor
      // Usamos existing.mainSentimentId para garantir que encontramos o registro certo para o update
      await prisma.movieSentiment.update({
        where: {
          movieId_mainSentimentId_subSentimentId: {
            movieId: movieId,
            mainSentimentId: existing.mainSentimentId,
            subSentimentId: subSentiment.id
          }
        },
        data: {
          relevance: match.relevance,
          explanation: match.explanation,
          updatedAt: new Date()
        }
      });
      console.log(`   🔄 Atualizado: ${match.subSentimentName} (${Number(existing.relevance).toFixed(2)} → ${match.relevance.toFixed(2)})`);
    } else {
      console.log(`   ⏭️  Mantido: ${match.subSentimentName} (existente é melhor)`);
    }
  }
}

async function calculateAndUpdateScore(movieId: string, jofId: number): Promise<number | null> {
  try {
    // Buscar SubSentiments esperados da JOF
    const expectedSubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
      where: { journeyOptionFlowId: jofId },
      select: { subSentimentId: true }
    });

    const subSentimentIds = expectedSubSentiments.map(item => item.subSentimentId);

    if (subSentimentIds.length === 0) {
      return 0;
    }

    // Buscar nomes dos SubSentiments
    const subSentiments = await prisma.subSentiment.findMany({
      where: { id: { in: subSentimentIds } },
      select: { id: true, name: true }
    });

    const uniqueExpectedNames = new Set<string>();
    subSentiments.forEach(ss => uniqueExpectedNames.add(ss.name));
    const totalUniqueExpected = uniqueExpectedNames.size;

    // Buscar sentimentos do filme
    const allMovieSentiments = await prisma.movieSentiment.findMany({
      where: { movieId: movieId },
      include: { subSentiment: true }
    });

    const movieSentiments = allMovieSentiments.filter(ms =>
      uniqueExpectedNames.has(ms.subSentiment.name)
    );

    // Manter apenas maior relevância por nome
    const uniqueMatches = new Map<string, number>();
    movieSentiments.forEach(ms => {
      const name = ms.subSentiment.name;
      const relevance = Number(ms.relevance);
      if (!uniqueMatches.has(name) || uniqueMatches.get(name)! < relevance) {
        uniqueMatches.set(name, relevance);
      }
    });

    if (uniqueMatches.size === 0 || totalUniqueExpected === 0) {
      return 0;
    }

    // Calcular score com fórmula de patamares
    const matchCount = uniqueMatches.size;
    const relevances = Array.from(uniqueMatches.values());
    const average = relevances.reduce((sum, r) => sum + r, 0) / matchCount;

    const intensity = Math.pow(average, 1.5) * 10;
    const coverageRatio = matchCount / totalUniqueExpected;
    const sqrtCoverage = Math.sqrt(coverageRatio);

    let score = intensity * sqrtCoverage;

    // Bônus por patamares
    let bonus = 0;
    if (coverageRatio >= 0.75) {
      bonus = 0.6;
    } else if (coverageRatio >= 0.65) {
      bonus = 0.4;
    } else if (coverageRatio >= 0.50) {
      bonus = 0.2;
    }

    if (bonus > 0) {
      score += bonus;
    }

    score = Math.min(score, 10.0);
    const relevanceScore = Math.round(score * 1000) / 1000;

    // Atualizar no banco
    await prisma.movieSuggestionFlow.updateMany({
      where: {
        movieId: movieId,
        journeyOptionFlowId: jofId
      },
      data: {
        relevanceScore: relevanceScore
      }
    });

    return relevanceScore;

  } catch (error) {
    console.error('Erro ao calcular score:', error);
    return null;
  }
}

/**
 * Atualiza reflexão
 */
async function updateReflection(movieId: string, jofId: number, reflection: string) {
  await prisma.movieSuggestionFlow.updateMany({
    where: {
      movieId: movieId,
      journeyOptionFlowId: jofId
    },
    data: {
      reason: reflection
    } as any
  });
}


/**
 * Calcula score em memória para preview/dry-run
 */

/**
 * Calcula score em memória para preview/dry-run com logs detalhados
 */
function calculateScoreFromMatches(
  matches: Array<{ subSentimentName: string; relevance: number }>,
  dnaSubSentiments: Array<{ name: string }>
): number {
  const uniqueExpectedNames = new Set(dnaSubSentiments.map(s => s.name));
  const totalUniqueExpected = uniqueExpectedNames.size;

  if (totalUniqueExpected === 0) return 0;

  // Matches válidos (que estão no DNA)
  const validMatches = matches.filter(m => uniqueExpectedNames.has(m.subSentimentName));

  // Mapa de únicos com maior relevância
  const uniqueMatches = new Map<string, number>();
  validMatches.forEach(m => {
    const name = m.subSentimentName;
    const rel = Number(m.relevance);
    if (!uniqueMatches.has(name) || uniqueMatches.get(name)! < rel) {
      uniqueMatches.set(name, rel);
    }
  });

  if (uniqueMatches.size === 0) {
    console.log('   ⚠️ Nenhum match válido para cálculo de score.');
    return 0;
  }

  const matchCount = uniqueMatches.size;
  const relevances = Array.from(uniqueMatches.values());
  const average = relevances.reduce((a, b) => a + b, 0) / matchCount;

  // Intensidade: (Média)^1.5 × 10
  const intensity = Math.pow(average, 1.5) * 10;

  // Abrangência: Raiz quadrada da razão de cobertura
  const coverageRatio = matchCount / totalUniqueExpected;
  const sqrtCoverage = Math.sqrt(coverageRatio);

  let score = intensity * sqrtCoverage;

  // Bônus por Patamares
  let bonus = 0;
  let tier = '';

  if (coverageRatio >= 0.75) {
    bonus = 0.6;
    tier = 'Ouro';
  } else if (coverageRatio >= 0.65) {
    bonus = 0.4;
    tier = 'Prata';
  } else if (coverageRatio >= 0.50) {
    bonus = 0.2;
    tier = 'Bronze';
  }

  if (bonus > 0) score += bonus;

  const finalScore = Math.min(score, 10.0);

  // Logs Detalhados
  console.log(`\n   📊 Detalhes do Score (Simulado):`);
  console.log(`      Relevance Score: ${finalScore.toFixed(3)}`);
  console.log(`      Matches: ${matchCount}/${totalUniqueExpected} nomes únicos | Cobertura: ${(coverageRatio * 100).toFixed(1)}%`);
  console.log(`      Intensidade: ${intensity.toFixed(3)} × √Cobertura: ${sqrtCoverage.toFixed(3)}${bonus > 0 ? ` + Bônus: ${bonus} (${tier})` : ''}`);
  console.log(`      Média Relevância: ${average.toFixed(3)}`);

  return finalScore;
}

// CLI

async function main() {
  const args = process.argv.slice(2);

  const options: ReprocessOptions = {
    dryRun: args.includes('--dry-run'),
    batchSize: 10
  };

  // Parse arguments
  args.forEach((arg, i) => {
    if (arg.startsWith('--jofId=')) options.jofId = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--movieId=')) options.movieId = arg.split('=')[1];
    if (arg.startsWith('--title=')) options.movieTitle = arg.split('=')[1];
    if (arg.startsWith('--year=')) options.movieYear = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--ai-provider=')) options.aiProvider = arg.split('=')[1] as AIProvider;
    if (arg.startsWith('--batch=')) options.batchSize = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--max-score=')) options.maxScore = parseFloat(arg.split('=')[1]);
  });

  await reprocessMovieSentiments(options);
  await prisma.$disconnect();
}

main().catch(console.error);

/// <reference types="node" />
import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';

const prisma = new PrismaClient();

// Interface para argumentos CLI
interface CLIArgs {
  title: string;
  year?: number;
  aiProvider?: 'openai' | 'deepseek' | 'gemini';
  model?: string;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = { title: '' };

  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--title=')) {
      args.title = arg.split('=')[1].replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--year=')) {
      args.year = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--ai-provider=')) {
      args.aiProvider = arg.split('=')[1] as any;
    } else if (arg.startsWith('--model=')) {
      args.model = arg.split('=')[1];
    }
  });

  return args;
}

async function generateBlogArticle() {
  const args = parseArgs();

  if (!args.title) {
    console.error('❌ Erro: Título é obrigatório. Use --title="Nome do Filme"');
    process.exit(1);
  }

  console.log(`🎬 Iniciando gerador de artigo para: "${args.title}" ${args.year ? `(${args.year})` : ''}`);

  try {
    // 1. Buscar o filme no banco de dados
    const movie = await prisma.movie.findFirst({
      where: {
        title: { contains: args.title, mode: 'insensitive' },
        ...(args.year ? { year: args.year } : {})
      },
      include: {
        movieSentiments: {
          include: {
            subSentiment: true,
            mainSentiment: true
          },
          orderBy: { relevance: 'desc' }
        },
        movieSuggestionFlows: {
          include: {
            journeyOptionFlow: {
              include: {
                journeyStepFlow: {
                  include: {
                    journeyFlow: {
                      include: {
                        mainSentiment: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { relevanceScore: 'desc' }
        },
        platforms: {
          include: {
            streamingPlatform: true
          }
        },
        cast: {
          include: {
            actor: true
          },
          orderBy: {
            order: 'asc'
          },
          take: 3
        }
      }
    });

    if (!movie) {
      console.error('❌ Filme não encontrado no banco de dados.');
      console.log('💡 Dica: Execute o orchestrator.ts primeiro para popular os dados.');
      process.exit(1);
    }

    console.log(`✅ Filme encontrado: ${movie.title} (${movie.year})`);

    // 2. Preparar contexto para a IA

    // Lista de Sentimentos Principais e SubSentimentos
    const sentimentsList = movie.movieSentiments.map(ms =>
      `- ${ms.mainSentiment.name} -> ${ms.subSentiment.name} (Relevância: ${ms.relevance}): ${ms.explanation || 'Sem explicação'}`
    ).join('\n');

    // Agrupar "Jornadas" (Opções que levam a este filme)
    // Isso nos diz "Para quem" ou "Para qual momento" o filme serve
    const journeys = movie.movieSuggestionFlows.map(flow => {
      const sentiment = flow.journeyOptionFlow.journeyStepFlow.journeyFlow.mainSentiment.name;
      const question = flow.journeyOptionFlow.journeyStepFlow.question;
      const choice = flow.journeyOptionFlow.text;
      const reason = flow.reason;
      return `### Jornada: Sentindo-se ${sentiment}\n- **Contexto (Pergunta)**: "${question}"\n- **Escolha do Usuário**: "${choice}"\n- **Por que recomendamos (Hook)**: "${reason}"`;
    }).slice(0, 5).join('\n\n'); // Pegar as top 5 jornadas mais relevantes

    const platforms = movie.platforms.map(p => p.streamingPlatform.name).join(', ');
    const castNames = movie.cast.map(c => c.actor.name).join(', ');

    // Prompt RICO e ESTRUTURADO - ESTILO "CORRA!" / VIBESFILM EDITORIAL
    const prompt = `
Você é um redator sênior do blog "Vibesfilm", especializado em crítica de cinema com foco em ANÁLISE EMOCIONAL e SEMÂNTICA.
Sua tarefa é escrever um artigo de blog profundo, envolvente e otimizado para SEO sobre o filme: "${movie.title}" (${movie.year}).

**REFERÊNCIA DE ESTILO (CRUCIAL):**
O tom deve ser **empático, direto e conversacional**. Escreva como se estivesse recomendando o filme para um amigo próximo, olho no olho.
Evite o estilo "crítico de cinema acadêmico". Busque a conexão emocional real. Use frases mais curtas e diretas.
Inspire-se em cronistas que falam sobre sentimentos do cotidiano, com simplicidade e profundidade.

**REGRAS DE OURO:**
1. **EVITE HIPÉRBOLES:** Corte adjetivos vazios como "magistral", "sublime". Descreva a emoção real.
2. **LINGUAGEM ACESSÍVEL (ZERO JARGÃO):** PROIBIDO usar termos como "exaustão existencial", "resiliência do espírito humano", "figura enigmática", "juxtaposição", "onírico".
   - Em vez de "exaustão existencial", diga "aquele cansaço de quem não aguenta mais".
   - Em vez de "resiliência", diga "a força para continuar".
   - Fale a língua das pessoas comuns. Seja humano, não um dicionário.
3. **VOCABULÁRIO VARIADO:** Não repita a palavra "Vibe" excessivamente.

**DADOS DO FILME:**
- Diretor: ${movie.director || 'Não informado'}
- Elenco Principal: ${castNames || 'Não informado'}
- Sinopse: ${movie.description}
- Gêneros: ${movie.genres.join(', ')}
- Onde assistir: ${platforms || 'Verifique disponibilidade local'}
- Hook Landing Page: "${movie.landingPageHook || ''}"
- Alertas: "${movie.contentWarnings || ''}"

**ANÁLISE DE SENTIMENTOS (IA VIBESFILM):**
${sentimentsList}

**JORNADAS EMOCIONAIS (QUANDO ASSISTIR):**
${journeys}

**ESTRUTURA OBRIGATÓRIA DO ARTIGO (MARKDOWN H2/H3):**

**METADADOS SEO (Inicie o arquivo com este bloco YAML):**
---
seo_title: "[Nome do Filme]: [Foco Emocional] | Vibesfilm (Tente manter < 60 chars)"
meta_description: "[Resumo atrativo para Google | Max 160 chars]"
excerpt_1: "[Opção 1 de resumo curto para cards]"
excerpt_2: "[Opção 2 de resumo curto com foco diferente]"
---

# [Título Criativo: Nome do Filme + Subtítulo Emocional (ex: Terror Social e Paranoia Contemporânea)]

## Introdução
Comece com um gancho forte que defina a premissa central e o impacto imediato do filme.
Mencione obrigatoriamente o diretor ${movie.director} e o elenco principal (${castNames}).
Termine este parágrafo definindo a "Vibe" geral da obra com uma frase de impacto (ex: "No Vibesfilm, este não é apenas um filme de terror — é uma imersão emocional...").

<h3>⚠️Alertas e Cuidados: ${movie.title} (${movie.year})</h3>
<p>Um parágrafo empático contextualizando os alertas ("${movie.contentWarnings}").</p>
⚠️ IMPORTANTE: Se o filme for sutil ou introspectivo (como dramas psicológicos), EVITE tom clínico, pathologizante ou excessivamente alarmista. Foque na carga emocional e na intensidade dos sentimentos, não apenas em "gatilhos", a menos que haja violência gráfica ou abuso explícito.

## O Que Torna "${movie.title}" Tão [Adjetivo Dinâmico]?
**IMPORTANTE:** Escolha um adjetivo que defina o filme no título desta seção (ex: "Impactante", "Contemplativo", "Perturbador", "Especial").
Nesta seção, faça a **Análise Conceitual e Semântica**.
- Não use tópicos (bullets). Escreva 2 a 3 parágrafos fluídos.
- Analise a direção, fotografia, som e roteiro. Como esses elementos técnicos constroem a emoção?
- Discuta metáforas visuais e temas profundos.
- Explique por que a obra se destaca no seu gênero.

## A Atmosfera Dominante [Use variações: "O Clima", "A Emoção Central", "A Vibe"]
Comece com um parágrafo introdutório (2-3 frases) que descreva a sensação geral que permeia o filme, destacando qual é a emoção primária (ex: Melancolia, Tensão, Euforia).
SOMENTE DEPOIS deste parágrafo, pule uma linha e escreva a frase exata: "Tags Emocionais Chave que definem esta experiência são:"

Depois, liste 3 **Tags Emocionais Chave** em formato HTML usando <ul> e <li>:
⚠️ **REGRA CRÍTICA:** Você **OBRIGATORIAMENTE** deve escolher essas tags da lista fornecida na seção "ANÁLISE DE SENTIMENTOS (IA VIBESFILM)". **NÃO INVENTE** novos nomes de sentimentos. Use *exatamente* o nome do SubSentimento fornecido (ex: "Nostalgia Positiva").

Exemplo de formato para as tags:
<ul>
<li><strong>[Nome do SubSentimento EXATO (ex: Nostalgia Positiva)]</strong>: [Parágrafo explicando como essa emoção se manifesta no filme, citando momentos ou sensações específicas].</li>
<li><strong>[Nome do SubSentimento 2]</strong>: [Explicação...].</li>
<li><strong>[Nome do SubSentimento 3]</strong>: [Explicação...].</li>
</ul>

## Quando Escolher "${movie.title}"? (Sua Jornada Emocional no Vibesfilm)
Escreva um parágrafo introdutório convidando o leitor a essa experiência.

Em seguida, escolha 2 ou 3 das "Jornadas Emocionais" fornecidas nos dados e transforme-as em mini-ensaios usando formato HTML <ul> e <li>:

<ul>
<li><strong>Para quem busca [Nome da Intenção/Sentimento]</strong>: [Escreva um parágrafo profundo explicando POR QUE o filme atende a essa busca. Evite listas. Diga algo como "Este filme é um mergulho em...", "É a escolha ideal para quem quer explorar..."].</li>
<li><strong>Para quem busca [Nome da Intenção 2]</strong>: [Explicação...].</li>
</ul>

## Sua Vibe Encontra o Filme Certo no Vibesfilm
Conclusão emocional. Reforce que o Vibesfilm entende que cinema é mais que entretenimento.
Feche com: "Quer saber onde assistir, ver o elenco completo e mais detalhes? Confira nosso guia completo de [Link para /onde-assistir/${movie.title} com texto '${movie.title} (${movie.year})']."

**Rodapé:**
<hr>
<p>Qual é a sua vibe hoje? Descubra seu filme perfeito no <a href="/app">Vibesfilm App!</a></p>
`;

    // 3. Chamar a IA
    const providerStr = args.aiProvider || 'openai'; // Default

    // Configurar provider com modelo customizado se solicitado
    const aiConfig = getDefaultConfig(providerStr as any);
    if (args.model) {
      console.log(`✨ Usando modelo customizado: ${args.model}`);
      aiConfig.model = args.model;
    }

    const aiProvider = createAIProvider(aiConfig);

    console.log(`🤖 Gerando artigo com ${providerStr.toUpperCase()}... (Isso pode levar alguns segundos)`);

    const response = await aiProvider.generateResponse(
      "Você é um redator sênior do blog Vibesfilm, especialista em cinema e psicologia.",
      prompt,
      { maxTokens: 4000, temperature: 0.7 }
    );

    if (!response.success) {
      throw new Error(`Erro na IA: ${response.error}`);
    }

    // 4. Salvar o arquivo
    const outputDir = path.join(__dirname, '../../generated_articles');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const safeTitle = movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}_${movie.year}.md`;
    const filePath = path.join(outputDir, filename);

    writeFileSync(filePath, response.content);

    console.log(`\n📄 Artigo gerado com sucesso!`);
    console.log(`📂 Local: ${filePath}`);
    console.log(`\n--- PREVIEW DO TÍTULO ---`);
    console.log(response.content.split('\n')[0]); // Mostrar a primeira linha (provável título)

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateBlogArticle();

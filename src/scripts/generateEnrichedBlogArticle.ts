/// <reference types="node" />
import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createAIProvider, getDefaultConfig } from '../utils/aiProvider';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const prisma = new PrismaClient();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_BLOG_URL!,
  process.env.SUPABASE_BLOG_SERVICE_KEY!
);

interface CLIArgs {
  title: string;
  year?: number;
  aiProvider?: 'openai' | 'deepseek' | 'gemini';
  model?: string;
  skipImages?: boolean;
}

interface TMDBImage {
  file_path: string;
  vote_average: number;
  width: number;
  height: number;
}

interface ProcessedImage {
  url: string;
  alt: string;
  originalUrl: string;
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
    } else if (arg === '--skip-images') {
      args.skipImages = true;
    }
  });

  return args;
}

async function fetchTMDBImages(movieId: number): Promise<{ backdrops: TMDBImage[], stills: TMDBImage[] }> {
  const API_KEY = process.env.TMDB_API_KEY;

  try {
    const response = await axios.get<{ backdrops: TMDBImage[], stills: TMDBImage[] }>(
      `https://api.themoviedb.org/3/movie/${movieId}/images?api_key=${API_KEY}`
    );

    return {
      backdrops: response.data.backdrops || [],
      stills: response.data.stills || []
    };
  } catch (error) {
    console.warn('⚠️  Erro ao buscar imagens do TMDB:', error);
    return { backdrops: [], stills: [] };
  }
}

async function downloadAndConvertImage(imageUrl: string, outputPath: string): Promise<void> {
  const response = await axios.get<ArrayBuffer>(imageUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  await sharp(buffer)
    .webp({ quality: 85 })
    .toFile(outputPath);
}

async function uploadToSupabase(localPath: string, remotePath: string): Promise<string | null> {
  try {
    const fileBuffer = require('fs').readFileSync(localPath);

    const { data, error } = await supabase.storage
      .from('movie-images')
      .upload(remotePath, fileBuffer, {
        contentType: 'image/webp',
        upsert: true
      });

    if (error) {
      console.error('❌ Erro no upload Supabase:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('movie-images')
      .getPublicUrl(remotePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    return null;
  }
}

async function generateImageAlt(
  movieTitle: string,
  movieYear: number,
  imageType: 'backdrop' | 'still',
  actorNames: string[],
  aiProvider: any
): Promise<string> {
  const prompt = `Gere um texto ALT descritivo e acessível para uma imagem de ${imageType === 'backdrop' ? 'fundo/cena panorâmica' : 'cena'} do filme "${movieTitle}" (${movieYear}).

Atores principais: ${actorNames.join(', ')}

REGRAS:
- Máximo 120 caracteres
- Seja específico e descritivo
- Mencione atores se relevante
- Evite palavras genéricas como "imagem de"
- Use formato: "[Atores] em cena de [Filme]" ou "[Descrição da cena] em [Filme]"

Retorne APENAS o texto ALT, sem aspas ou formatação.`;

  const response = await aiProvider.generateResponse(
    "Você é um especialista em acessibilidade web.",
    prompt,
    { maxTokens: 100, temperature: 0.3 }
  );

  if (!response.success) {
    return `Cena do filme ${movieTitle} (${movieYear})`;
  }

  return response.content.trim().replace(/^["']|["']$/g, '');
}

async function fetchIMDbIds(movieId: number): Promise<{ [key: string]: string }> {
  const API_KEY = process.env.TMDB_API_KEY;
  const imdbIds: { [key: string]: string } = {};

  try {
    const creditsResponse = await axios.get<{ cast: any[], crew: any[] }>(
      `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${API_KEY}`
    );

    const cast = creditsResponse.data.cast.slice(0, 3);
    const crew = creditsResponse.data.crew.filter((c: any) => c.job === 'Director')[0];

    for (const person of [...cast, crew].filter(Boolean)) {
      try {
        const personResponse = await axios.get<{ imdb_id?: string }>(
          `https://api.themoviedb.org/3/person/${person.id}/external_ids?api_key=${API_KEY}`
        );

        if (personResponse.data.imdb_id) {
          imdbIds[person.name] = `https://www.imdb.com/name/${personResponse.data.imdb_id}/`;
        }
      } catch (error) {
        console.warn(`⚠️  Não foi possível buscar IMDb ID para ${person.name}`);
      }
    }

  } catch (error) {
    console.warn('⚠️  Erro ao buscar IMDb IDs:', error);
  }

  return imdbIds;
}

async function processImages(
  movie: any,
  aiProvider: any
): Promise<ProcessedImage[]> {
  console.log('\n📸 Processando imagens do TMDB...');

  if (!movie.tmdbId) {
    console.log('⚠️  Filme não tem TMDB ID.');
    return [];
  }

  const images = await fetchTMDBImages(movie.tmdbId);

  if (images.backdrops.length === 0 && images.stills.length === 0) {
    console.log('⚠️  Nenhuma imagem encontrada no TMDB.');
    return [];
  }

  const bestBackdrop = images.backdrops.sort((a, b) => b.vote_average - a.vote_average)[0];
  const bestStill = images.stills.sort((a, b) => b.vote_average - a.vote_average)[0];

  const selectedImages = [
    { type: 'backdrop' as const, data: bestBackdrop },
    { type: 'still' as const, data: bestStill }
  ].filter(img => img.data);

  const processedImages: ProcessedImage[] = [];
  const actorNames = movie.cast.map((c: any) => c.actor.name);

  for (let i = 0; i < selectedImages.length; i++) {
    const { type, data } = selectedImages[i];
    const imageNum = i + 1;

    console.log(`  [${imageNum}/${selectedImages.length}] Processando ${type}...`);

    const tmdbImageUrl = `https://image.tmdb.org/t/p/original${data.file_path}`;
    const tempPath = `/tmp/tmdb_${movie.tmdbId}_${type}.webp`;

    await downloadAndConvertImage(tmdbImageUrl, tempPath);
    console.log(`    ✓ Download e conversão WebP`);

    const safeTitle = movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const remotePath = `blog-articles/${safeTitle}_${movie.year}_${imageNum}.webp`;

    const publicUrl = await uploadToSupabase(tempPath, remotePath);

    if (!publicUrl) {
      console.log(`    ✗ Falha no upload`);
      continue;
    }

    console.log(`    ✓ Upload Supabase`);

    const alt = await generateImageAlt(movie.title, movie.year, type, actorNames, aiProvider);
    console.log(`    ✓ ALT gerado: "${alt}"`);

    processedImages.push({
      url: publicUrl,
      alt,
      originalUrl: tmdbImageUrl
    });

    require('fs').unlinkSync(tempPath);
  }

  console.log(`✅ ${processedImages.length} imagem(ns) processada(s)\n`);

  return processedImages;
}

async function generateBlogArticle() {
  const args = parseArgs();

  if (!args.title) {
    console.error('❌ Erro: Título é obrigatório. Use --title="Nome do Filme"');
    process.exit(1);
  }

  console.log(`🎬 Gerando artigo enriquecido para: "${args.title}" ${args.year ? `(${args.year})` : ''}`);

  try {
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
      console.log('💡 Dica: Execute o orchestrator.ts primeiro.');
      process.exit(1);
    }

    console.log(`✅ Filme encontrado: ${movie.title} (${movie.year})`);

    const providerStr = args.aiProvider || 'openai';
    const aiConfig = getDefaultConfig(providerStr as any);
    if (args.model) {
      aiConfig.model = args.model;
    }
    const aiProvider = createAIProvider(aiConfig);

    let processedImages: ProcessedImage[] = [];
    if (!args.skipImages) {
      processedImages = await processImages(movie, aiProvider);
    }

    console.log('🔗 Buscando links IMDb...');
    const imdbIds = movie.tmdbId ? await fetchIMDbIds(movie.tmdbId) : {};
    console.log(`✅ ${Object.keys(imdbIds).length} link(s) IMDb encontrado(s)\n`);

    const sentimentsList = movie.movieSentiments.map(ms =>
      `- ${ms.mainSentiment.name} -> ${ms.subSentiment.name} (Relevância: ${ms.relevance}): ${ms.explanation || 'Sem explicação'}`
    ).join('\n');

    const journeys = movie.movieSuggestionFlows.map(flow => {
      const sentiment = flow.journeyOptionFlow.journeyStepFlow.journeyFlow.mainSentiment.name;
      const question = flow.journeyOptionFlow.journeyStepFlow.question;
      const choice = flow.journeyOptionFlow.text;
      const reason = flow.reason;
      return `### Jornada: Sentindo-se ${sentiment}\n- **Contexto**: "${question}"\n- **Escolha**: "${choice}"\n- **Hook**: "${reason}"`;
    }).slice(0, 5).join('\n\n');

    const platforms = movie.platforms.map(p => p.streamingPlatform.name).join(', ');
    const castNames = movie.cast.map(c => c.actor.name).join(', ');

    let imdbLinksSection = '';
    if (Object.keys(imdbIds).length > 0) {
      imdbLinksSection = '\n\n**LINKS IMDb (INSIRA NO TEXTO):**\n';
      for (const [name, url] of Object.entries(imdbIds)) {
        imdbLinksSection += `- ${name}: <a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>\n`;
      }
    }

    let imagesSection = '';
    if (processedImages.length > 0) {
      imagesSection = '\n\n**IMAGENS PROCESSADAS (INSIRA NO ARTIGO):**\n';
      processedImages.forEach((img, idx) => {
        imagesSection += `\nImagem ${idx + 1}:\n<p><img src="${img.url}" alt="${img.alt}"></p>\n`;
      });
    }

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
${imdbLinksSection}
${imagesSection}

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

    console.log(`🤖 Gerando artigo com ${providerStr.toUpperCase()}...`);

    const response = await aiProvider.generateResponse(
      "Você é um redator do blog Vibesfilm.",
      prompt,
      { maxTokens: 4000, temperature: 0.7 }
    );

    if (!response.success) {
      throw new Error(`Erro na IA: ${response.error}`);
    }

    // Enriquecer artigo com imagens e links
    let enrichedContent = response.content;

    // 1. Inserir primeira imagem logo após ## Introdução
    if (processedImages.length > 0) {
      const introEndRegex = /(<\/h3>\s*<\/p>)/;
      if (introEndRegex.test(enrichedContent)) {
        const imageHtml = `\n\n<p><img src="${processedImages[0].url}" alt="${processedImages[0].alt}"></p>\n`;
        enrichedContent = enrichedContent.replace(introEndRegex, `$1${imageHtml}`);
        console.log('  ✓ Imagem 1 inserida após alertas');
      }
    }

    // 2. Inserir segunda imagem antes da conclusão (se houver)
    if (processedImages.length > 1) {
      const conclusionRegex = /(## Sua Vibe Encontra o Filme Certo no Vibesfilm)/;
      if (conclusionRegex.test(enrichedContent)) {
        const imageHtml = `\n<p><img src="${processedImages[1].url}" alt="${processedImages[1].alt}"></p>\n\n`;
        enrichedContent = enrichedContent.replace(conclusionRegex, `${imageHtml}$1`);
        console.log('  ✓ Imagem 2 inserida antes da conclusão');
      }
    }

    // 3. Inserir links IMDb nos nomes
    if (Object.keys(imdbIds).length > 0) {
      let linksInserted = 0;
      for (const [name, url] of Object.entries(imdbIds)) {
        // Buscar padrão: **Nome** ou Nome ( evitando links duplicados)
        const patterns = [
          new RegExp(`\\*\\*${name}\\*\\*(?!<)`, 'g'),
          new RegExp(`\\b${name}\\b(?![^<]*>|[^<]*<\/a>)`, 'g')
        ];

        for (const pattern of patterns) {
          if (pattern.test(enrichedContent)) {
            enrichedContent = enrichedContent.replace(
              pattern,
              `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`
            );
            linksInserted++;
            break; // Evita dupla substituição
          }
        }
      }
      console.log(`  ✓ ${linksInserted} link(s) IMDb inserido(s)`);
    }

    const outputDir = path.join(__dirname, '../../generated_articles');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const safeTitle = movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}_${movie.year}_enriched.md`;
    const filePath = path.join(outputDir, filename);

    writeFileSync(filePath, enrichedContent);

    console.log(`\n✅ Artigo gerado e enriquecido!`);
    console.log(`📂 ${filePath}`);
    console.log(`📸 Imagens: ${processedImages.length}`);
    console.log(`🔗 Links IMDb: ${Object.keys(imdbIds).length}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateBlogArticle();

/// <reference types="node" />
import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { prismaBlog } from '../prisma';
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'fs';
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
  insertDb?: boolean;
  blogId?: number;
  published?: boolean;
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
  const args: CLIArgs = { title: '', blogId: 3 };

  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--title=')) {
      args.title = arg.substring(arg.indexOf('=') + 1).replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--year=')) {
      args.year = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--ai-provider=')) {
      args.aiProvider = arg.split('=')[1] as any;
    } else if (arg.startsWith('--model=')) {
      args.model = arg.split('=')[1];
    } else if (arg === '--skip-images') {
      args.skipImages = true;
    } else if (arg === '--insert-db') {
      args.insertDb = true;
    } else if (arg.startsWith('--blog-id=')) {
      args.blogId = parseInt(arg.split('=')[1]);
    } else if (arg === '--publish') {
      args.published = true;
    }
  });

  return args;
}

function parseYaml(yamlString: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = yamlString.split('\n');
  lines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      value = value.replace(/^["']|["']$/g, '').trim();
      result[key] = value;
    }
  });
  return result;
}

async function getOrCreateAuthor(blogId: number): Promise<number> {
  let author = await prismaBlog.author.findFirst({
    where: { blogId, isAi: true }
  });

  if (!author) {
    author = await prismaBlog.author.findFirst({
      where: { blogId }
    });
  }

  if (!author) {
    author = await prismaBlog.author.create({
      data: {
        name: 'Vibesfilm AI',
        role: 'Crítico de Cinema Inteligente',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
        bio: 'Inteligência Artificial especializada em decodificar as vibes e emoções contidas no cinema.',
        isAi: true,
        blogId
      }
    });
    console.log(`  ✓ Autor padrão criado (ID: ${author.id})`);
  }

  return author.id;
}

async function getOrCreateCategory(blogId: number): Promise<number> {
  const preferredSlug = 'analises';
  let category = await prismaBlog.category.findFirst({
    where: { blogId, slug: preferredSlug }
  });

  if (!category) {
    category = await prismaBlog.category.findFirst({
      where: { blogId }
    });
  }

  if (!category) {
    category = await prismaBlog.category.create({
      data: {
        title: 'Análises',
        slug: preferredSlug,
        description: 'Análises emocionais e conceituais de grandes obras do cinema.',
        blogId
      }
    });
    console.log(`  ✓ Categoria padrão criada (ID: ${category.id})`);
  }

  return category.id;
}

function extractResonanceTags(bodyPart: string, fallbackSentiments: string[]): string[] {
  const extractedTags: string[] = [];

  // Localizar a seção "O que ressoa nesta experiência:"
  const sectionRegex = /###\s*O que ressoa nesta experi[êe]ncia:?([\s\S]*?)(?=##|$)/i;
  const match = bodyPart.match(sectionRegex);

  if (match) {
    const sectionText = match[1];

    // Padrão HTML: <li><strong>Nome</strong> ou <strong>Nome:</strong>
    const strongRegex = /<strong>([^<:]+)(?::|<\/strong>)/gi;
    let m;
    while ((m = strongRegex.exec(sectionText)) !== null) {
      const tag = m[1].trim().replace(/^["']|["']$/g, '').trim();
      if (tag && !extractedTags.includes(tag)) {
        extractedTags.push(tag);
      }
    }

    // Padrão Markdown alternativo: - **Nome**:
    if (extractedTags.length === 0) {
      const mdRegex = /(?:^|\n)\s*[-*]\s*\*\*([^*:]+)\*\*/gi;
      let mdMatch;
      while ((mdMatch = mdRegex.exec(sectionText)) !== null) {
        const tag = mdMatch[1].trim().replace(/^["']|["']$/g, '').trim();
        if (tag && !extractedTags.includes(tag)) {
          extractedTags.push(tag);
        }
      }
    }
  }

  // Se extraiu menos de 3 tags, completa usando a lista de SubSentimentos do filme
  for (const fallback of fallbackSentiments) {
    if (extractedTags.length >= 3) break;
    const cleanFallback = fallback.trim();
    if (cleanFallback && !extractedTags.includes(cleanFallback)) {
      extractedTags.push(cleanFallback);
    }
  }

  return extractedTags.slice(0, 3);
}

async function getOrCreateTags(blogId: number, tagNames: string[]): Promise<number[]> {
  const tagIds: number[] = [];
  // Restringir estritamente para apenas 3 tags
  const uniqueTags = [...new Set(tagNames.map(t => t.trim()))].filter(Boolean).slice(0, 3);

  for (const name of uniqueTags) {
    const slug = name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
      
    if (!slug) continue;

    let tag = await prismaBlog.tag.findFirst({
      where: { blogId, slug }
    });

    if (!tag) {
      tag = await prismaBlog.tag.create({
        data: {
          name,
          slug,
          aiRelated: true,
          blogId
        }
      });
    }

    tagIds.push(tag.id);
  }

  return tagIds;
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
    .webp({ quality: 92, smartSubsample: true }) // Reduz compressão excessiva (lavagem)
    .toFile(outputPath);
}

async function uploadToSupabase(localPath: string, remotePath: string): Promise<string | null> {
  try {
    const fileBuffer = readFileSync(localPath);

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

    // Retorna a URL pública servida pela CDN Cloudflare images.vibesfilm.com
    const cdnUrl = `https://images.vibesfilm.com/${remotePath}`;
    return cdnUrl;
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    return null;
  }
}

async function generateImageAlt(
  movieTitle: string,
  movieYear: number,
  imageType: 'backdrop' | 'still',
  castWithCharacters: { actor: string; character?: string | null }[],
  imageNum: number,
  aiProvider: any
): Promise<string> {
  const top2 = castWithCharacters.slice(0, 2);
  let actorsDesc = '';
  if (top2.length >= 2) {
    const p1 = top2[0].character ? `${top2[0].actor} como ${top2[0].character}` : top2[0].actor;
    const p2 = top2[1].character ? `${top2[1].actor} como ${top2[1].character}` : top2[1].actor;
    actorsDesc = `${p1} e ${p2}`;
  } else if (top2.length === 1) {
    actorsDesc = top2[0].character ? `${top2[0].actor} como ${top2[0].character}` : top2[0].actor;
  }

  const defaultAdjective = imageNum === 1 ? 'dramática' : 'reflexiva';
  const fallbackAlt = actorsDesc
    ? `${actorsDesc} em cena ${defaultAdjective} do filme ${movieTitle} (${movieYear}).`
    : `Cena ${defaultAdjective} do filme ${movieTitle} (${movieYear}).`;

  if (!actorsDesc) {
    return fallbackAlt;
  }

  const prompt = `Gere um texto ALT para a imagem ${imageNum} (${imageType === 'backdrop' ? 'cena panorâmica/aberta' : 'frame/cena de atuação'}) do filme "${movieTitle}" (${movieYear}).

Protagonistas e personagens principais: ${actorsDesc}

FORMATO OBRIGATÓRIO (siga exatamente este padrão):
"${actorsDesc} em cena [adjetivo da cena adequado ao filme, ex: dramática, reflexiva, contemplativa, intensa ou emocionante] do filme ${movieTitle} (${movieYear})."

Exemplo:
"Frances McDormand como Fern e David Strathairn como Dave em cena dramática do filme Nomadland (2021)."

REGRAS:
- Deve conter obrigatoriamente: "${actorsDesc}"
- Adicione um adjetivo coerente com a cena (ex: dramática, reflexiva, contemplativa, intensa, marcante)
- Termine exatamente com "do filme ${movieTitle} (${movieYear})."
- Mantenha em uma única linha, sem aspas adicionais, sem markdown.

Retorne APENAS o texto ALT final.`;

  try {
    const response = await aiProvider.generateResponse(
      "Você é um especialista em acessibilidade web e cinema.",
      prompt,
      { maxTokens: 80, temperature: 0.3 }
    );

    if (response.success && response.content) {
      const cleanAlt = response.content.trim().replace(/^["']|["']$/g, '').trim();
      if (cleanAlt.length > 25 && cleanAlt.includes(movieTitle)) {
        return cleanAlt;
      }
    }
  } catch (err) {
    console.warn(`⚠️  Falha ao gerar ALT com IA, usando padrão estruturado`);
  }

  return fallbackAlt;
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
          // Padrão canônico internacional de URL de pessoas no IMDb
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

  // Fiscal de Qualidade: Largura >= 1200px
  const highResBackdrops = images.backdrops.filter(img => img.width >= 1200);
  const highResStills = images.stills.filter(img => img.width >= 1200);

  if (highResBackdrops.length === 0 && images.backdrops.length > 0) {
    console.warn(`⚠️  Aviso de Qualidade: Nenhuma cena de fundo (backdrop) atingiu 1200px. Usando a de maior média.`);
  }
  if (highResStills.length === 0 && images.stills.length > 0) {
    console.warn(`⚠️  Aviso de Qualidade: Nenhum frame (still) atingiu 1200px. Usando o de maior média.`);
  }

  const sortedBackdrops = (highResBackdrops.length > 0 ? highResBackdrops : images.backdrops)
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

  const selectedImages: { type: 'backdrop' | 'still'; data: TMDBImage }[] = [];
  if (sortedBackdrops[0]) {
    selectedImages.push({ type: 'backdrop', data: sortedBackdrops[0] });
  }
  // Se houver stills no TMDB usa still; caso contrário usa o 2º melhor backdrop para garantir sempre 2 imagens
  if (highResStills.length > 0 || images.stills.length > 0) {
    const stillPool = highResStills.length > 0 ? highResStills : images.stills;
    const bestStill = stillPool.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))[0];
    selectedImages.push({ type: 'still', data: bestStill });
  } else if (sortedBackdrops[1]) {
    selectedImages.push({ type: 'still', data: sortedBackdrops[1] });
  }

  const processedImages: ProcessedImage[] = [];
  const castWithCharacters: { actor: string; character?: string | null }[] = (movie.cast || []).map((c: any) => ({
    actor: c.actor?.name || '',
    character: c.characterName || null
  })).filter((c: any) => Boolean(c.actor));

  // Pasta temporária dentro do workspace para conformidade higiênica e evitar uso do /tmp global
  const tempDir = path.join(__dirname, '../temp');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  for (let i = 0; i < selectedImages.length; i++) {
    const { type, data } = selectedImages[i];
    const imageNum = i + 1;

    console.log(`  [${imageNum}/${selectedImages.length}] Processando ${type}...`);

    const tmdbImageUrl = `https://image.tmdb.org/t/p/original${data.file_path}`;
    const tempPath = path.join(tempDir, `tmdb_${movie.tmdbId}_${type}.webp`);

    await downloadAndConvertImage(tmdbImageUrl, tempPath);
    console.log(`    ✓ Download e conversão WebP`);

    const safeTitle = movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const remotePath = `blog-content/${safeTitle}_${movie.year}_${imageNum}.webp`;

    const publicUrl = await uploadToSupabase(tempPath, remotePath);

    if (!publicUrl) {
      console.log(`    ✗ Falha no upload`);
      continue;
    }

    console.log(`    ✓ Upload Supabase`);

    const alt = await generateImageAlt(movie.title, movie.year, type, castWithCharacters, imageNum, aiProvider);
    console.log(`    ✓ ALT gerado: "${alt}"`);

    processedImages.push({
      url: publicUrl,
      alt,
      originalUrl: tmdbImageUrl
    });

    unlinkSync(tempPath);
  }

  console.log(`✅ ${processedImages.length} imagem(ns) processada(s)\n`);

  return processedImages;
}

function cleanAndValidateSEO(frontmatter: string): string {
  let newFrontmatter = frontmatter;

  const titleMatch = frontmatter.match(/seo_title:\s*(.*)/);
  if (titleMatch) {
    let titleVal = titleMatch[1].trim().replace(/^["']|["']$/g, '').trim();
    if (titleVal.length > 60) {
      console.warn(`⚠️  SEO Title excede 60 caracteres (${titleVal.length} chars). Truncando...`);
      const brand = " | Vibesfilm";
      if (titleVal.endsWith(brand)) {
        const maxTextLen = 60 - brand.length;
        titleVal = titleVal.substring(0, maxTextLen).trim() + brand;
      } else {
        titleVal = titleVal.substring(0, 60);
      }
      newFrontmatter = newFrontmatter.replace(/seo_title:\s*(.*)/, `seo_title: "${titleVal.replace(/"/g, '\\"')}"`);
    }
  }

  const descMatch = frontmatter.match(/meta_description:\s*(.*)/);
  if (descMatch) {
    let descVal = descMatch[1].trim().replace(/^["']|["']$/g, '').trim();
    if (descVal.length > 160) {
      console.warn(`⚠️  Meta Description excede 160 caracteres (${descVal.length} chars). Truncando...`);
      descVal = descVal.substring(0, 157).trim() + "...";
      newFrontmatter = newFrontmatter.replace(/meta_description:\s*(.*)/, `meta_description: "${descVal.replace(/"/g, '\\"')}"`);
    }
  }

  return newFrontmatter;
}

async function generateBlogArticle() {
  const args = parseArgs();

  if (!args.title) {
    console.error('❌ Erro: Título é obrigatório. Use --title="Nome do Filme"');
    process.exit(1);
  }

  console.log(`🎬 Gerando artigo enriquecido para: "${args.title}" ${args.year ? `(${args.year})` : ''}`);

  try {
    // 1. Validar homônimos e duplicidade antes de iniciar processamentos caros
    const matchingMoviesCount = await prisma.movie.count({
      where: {
        title: { equals: args.title, mode: 'insensitive' }
      }
    });

    if (matchingMoviesCount > 1 && !args.year) {
      console.log(`⚠️  Atenção: Encontramos ${matchingMoviesCount} filmes com o título "${args.title}" no banco!`);
      const duplicates = await prisma.movie.findMany({
        where: { title: { equals: args.title, mode: 'insensitive' } },
        select: { title: true, year: true }
      });
      duplicates.forEach(d => console.log(`   - ${d.title} (${d.year})`));
      console.error(`❌ Erro: Especifique o ano do filme usando --year=AAAA para evitar ambiguidade.`);
      process.exit(1);
    }

    // Buscar dados do filme
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
          take: 5
        }
      }
    });

    if (!movie) {
      console.error('❌ Filme não encontrado no banco de dados.');
      console.log('💡 Dica: Execute o orchestrator.ts primeiro.');
      process.exit(1);
    }

    console.log(`✅ Filme encontrado: ${movie.title} (${movie.year})`);

    const providerStr = args.aiProvider || 'deepseek';
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
    const movieSlug = movie.slug || movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    let imdbLinksSection = '';
    if (Object.keys(imdbIds).length > 0) {
      imdbLinksSection = '\n\n**LINKS IMDb DISPONÍVEIS:**\n';
      for (const [name, url] of Object.entries(imdbIds)) {
        imdbLinksSection += `- ${name}: <a href="${url}" target="_blank" rel="noopener">${name}</a>\n`;
      }
      imdbLinksSection += `\n⚠️ REGRA CRÍTICA PARA CITAÇÕES DE DIRETORES E ATORES:
Nas citações de diretores e atores do filme, restrinja para no MÁXIMO 4 exibições com link no texto todo do artigo (exemplo: <a href="https://www.imdb.com/name/nm0000520/" target="_blank" rel="noopener">Michael Mann</a>). Se mencionar outros nomes além desses 4 ou repetir menções, cite apenas em texto puro, sem a tag <a>.\n`;
    }

    let imagesSection = '';
    if (processedImages.length > 0) {
      imagesSection = '\n\n**IMAGENS PROCESSADAS (POSIÇÕES OBRIGATÓRIAS):**\n';
      if (processedImages[0]) {
        imagesSection += `- Imagem 1 (Inserir OBRIGATORIAMENTE logo após o primeiro parágrafo da introdução):\n<p><img src="${processedImages[0].url}" alt="${processedImages[0].alt}"></p>\n`;
      }
      if (processedImages[1]) {
        imagesSection += `- Imagem 2 (Inserir OBRIGATORIAMENTE logo após o parágrafo introdutório de "## A Atmosfera Dominante...", antes de "### O que ressoa nesta experiência:"):\n<p><img src="${processedImages[1].url}" alt="${processedImages[1].alt}"></p>\n`;
      }
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
4. **USE SEU CONHECIMENTO PRÉVIO:** Você tem permissão para usar seu conhecimento geral sobre a obra completa (especialmente se for baseada em um livro/obra famosa) para enriquecer a análise. Você DEVE mencionar personagens cruciais do segundo ato (como aliados ou viradas na história) que compõem a verdadeira experiência emocional do filme, mas SEM dar spoilers graves do final.
5. **TERMOS CLICHÊS PROIBIDOS:** Está terminantemente proibido o uso das seguintes expressões (e suas variações ou sinônimos óbvios):
   - "soco no estômago" / "soco no estomago"
   - "não é para qualquer momento" / "não é para qualquer hora"
   - "não é apenas um filme" / "não se trata de apenas um filme"
   - "fica com você" / "fica com o espectador"
   - "a genialidade de"
   - "não saem com os créditos" / "não terminam com os créditos"
   - "filmes que ficam" / "daqueles que ficam"
   Busque descrições originais e sinceras sobre o impacto emocional do filme, sem recorrer a estas fórmulas prontas.
6. **LIMITES RÍGIDOS DE CARACTERES PARA METADADOS (CRÍTICO):**
   - O campo "seo_title" no bloco de metadados deve ter no MÁXIMO 60 caracteres (incluindo o nome do filme, o foco emocional e a marca " | Vibesfilm"). Planeje o texto para caber nesse limite.
   - O campo "meta_description" no bloco de metadados deve ter no MÁXIMO 160 caracteres. Resuma a essência do filme e a sua atração emocional de maneira concisa e cativante.

**DADOS DO FILME:**
- Título Original: ${movie.original_title || 'Não informado'}
- Diretor: ${movie.director || 'Não informado'}
- Elenco Principal: ${castNames || 'Não informado'}
- Sinopse: ${movie.description}
- Gêneros: ${movie.genres.join(', ')}
- Palavras-chave: ${movie.keywords.slice(0, 15).join(', ')}
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
seo_title: "[Nome do Filme]: [Foco Emocional] | Vibesfilm (MÁXIMO 60 caracteres)"
meta_description: "[Resumo atrativo para Google | MÁXIMO 160 caracteres. JAMAIS USE HTML OU MARKDOWN AQUI - TEXTO PURO]"
excerpt_1: "[Opção 1 de resumo curto para cards. TEXTO PURO, SEM HTML OU MARKDOWN]"
excerpt_2: "[Opção 2 de resumo curto com foco diferente. TEXTO PURO, SEM HTML OU MARKDOWN]"
---

# [Título Criativo: Nome do Filme + Subtítulo Emocional (ex: Terror Social e Paranoia Contemporânea)]

## [Subtítulo H2 Curto e Impactante]
[Escreva logo abaixo do subtítulo UMA ÚNICA FRASE ou parágrafo minúsculo (máx. 2 linhas) contendo um "gancho" que desperte curiosidade atraente sobre a emoção da obra. PROIBIDO citar nomes do elenco ou diretor nesta seção de Subtítulo]

[TEXTO INTRODUTÓRIO - REGRA CRÍTICA: NÃO crie o cabeçalho "## Introdução" nem "<h2>Introdução</h2>". Os parágrafos introdutórios devem começar diretamente abaixo do gancho]:
Desenvolva a introdução em **pelo menos 2 parágrafos** bem estruturados.
No primeiro parágrafo, defina a premissa central e o impacto imediato do filme. É OBRIGATÓRIO citar o diretor (${movie.director}) e o elenco principal (${castNames}) diretamente no corpo deste primeiro parágrafo da introdução.

Logo após este primeiro parágrafo, insira a Imagem 1:
${processedImages[0] ? `<p><img src="${processedImages[0].url}" alt="${processedImages[0].alt}"></p>` : ''}

No segundo parágrafo, aprofunde o tom da obra e prepare o leitor para o que sentirá, terminando com uma frase original que defina a vibe ou o tom emocional geral (por exemplo, conectando a atmosfera da história com uma sensação cotidiana, sem usar frases prontas ou o nome do blog).

<h3>⚠️ Nota de Curadoria: ${movie.title} (${movie.year})</h3>
<p>Com base no alerta a seguir, escreva no máximo 2 frases que preparem o leitor emocionalmente para o que vai encontrar no filme, sem usar termos clínicos, criminais ou explícitos.
Alerta original (use apenas como referência de contexto, não copie os termos): "${movie.contentWarnings}".

REGRAS OBRIGATÓRIAS para esta seção:
- PROIBIDO usar os termos: "abuso sexual", "estupro", "pedofilia", "assassinato", "homicídio", "violência sexual" ou qualquer linguagem de boletim policial.
- Em vez disso, use expressões focadas no impacto emocional e na trama. Exemplos de substituições:
  • "assassinato de uma criança" → "a perda trágica e violenta de uma criança"
  • "abuso sexual" → "violência profunda contra uma criança" ou "um crime que marca a história de forma irreparatível"
  • "estupro" → "uma violência que a trama não suaviza"
- O tom deve ser de um curador que avisa com respeito, não de um laudo médico ou notícia policial.
- Não invente conteúdo que não esteja no alerta original. Não dramatize.
- Termine com uma frase que sinalize preparo emocional, como: "A narrativa não poupa o leitor, mas tem um propósito claro." ou equivalente.
</p>

## O Que Torna "${movie.title}" Tão [Adjetivo Dinâmico]?
**IMPORTANTE:** Escolha um adjetivo que defina o filme no título desta seção (ex: "Impactante", "Contemplativo", "Perturbador", "Especial").
Nesta seção, faça a **Análise Conceitual e Semântica**.
- Não use tópicos (bullets). Escreva 2 a 3 parágrafos fluídos.
- Analise a direção, fotografia, som e roteiro. Como esses elementos técnicos constroem a emoção?
- Discuta metáforas visuais e temas profundos.
- Explique por que a obra se destaca no seu gênero.

## A Atmosfera Dominante [Use variações: "O Clima", "A Emoção Central", "A Vibe"]
Comece com um parágrafo introdutório (2-3 frases) que descreva a sensação geral que permeia o filme, destacando qual é a emoção primária (ex: Melancolia, Tensão, Euforia).

Logo após este parágrafo introdutório, insira a Imagem 2:
${processedImages[1] ? `<p><img src="${processedImages[1].url}" alt="${processedImages[1].alt}"></p>` : ''}

SOMENTE DEPOIS desta imagem, pule uma linha e escreva exatamente: "### O que ressoa nesta experiência:"

Depois, liste exatamente 3 **Tags Emocionais Chave** em formato HTML usando <ul> e <li>:
⚠️ **REGRA CRÍTICA PARA AS TAGS:** Você **OBRIGATORIAMENTE** deve escolher apenas 3 tags que reflitam a seção "O que ressoa nesta experiência:", selecionando-as da lista fornecida na seção "ANÁLISE DE SENTIMENTOS (IA VIBESFILM)". **NÃO INVENTE** novos nomes de sentimentos. Use *exatamente* o nome do SubSentimento fornecido (ex: "Nostalgia Positiva"). Estas 3 tags serão as tags oficiais do artigo.

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
Feche com: "Quer saber onde assistir, ver o elenco completo e mais detalhes? Confira nosso guia completo de [Link para /filme/${movieSlug} com texto '${movie.title} (${movie.year})']."

**Rodapé:**
<hr>
<p>Qual é a sua vibe hoje? Cada emoção tem um filme. Descubra seu filme perfeito no <a href="/app">Vibesfilm App!</a></p>
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

    // Separa o Frontmatter do restante do corpo para não injetar HTML no YAML SEO
    let frontmatter = '';
    let bodyPart = enrichedContent;

    const yamlRegex = /^---\n[\s\S]*?\n---\n/;
    const match = enrichedContent.match(yamlRegex);
    if (match) {
      frontmatter = match[0];
      bodyPart = enrichedContent.slice(frontmatter.length);
      
      // Validar e limpar seo_title e meta_description no frontmatter
      frontmatter = cleanAndValidateSEO(frontmatter);
    }

    // Remover <h2>Introdução</h2> ou ## Introdução se gerado pela IA
    bodyPart = bodyPart.replace(/<h[23]>\s*Introdu[çc][ãa]o\s*<\/h[23]>\s*/gi, '');
    bodyPart = bodyPart.replace(/^##\s*Introdu[çc][ãa]o\s*$/gmi, '');
    bodyPart = bodyPart.replace(/\n{3,}/g, '\n\n');

    // Limpar quaisquer imagens pré-existentes no corpo gerado para garantir posicionamento exato
    bodyPart = bodyPart.replace(/<p><img\s+[^>]*><\/p>\s*/gi, '');

    // 1. Inserir primeira imagem DEPOIS DO PRIMEIRO PARÁGRAFO da introdução
    if (processedImages.length > 0) {
      const imageHtml1 = `<p><img src="${processedImages[0].url}" alt="${processedImages[0].alt}"></p>`;
      
      const introMatch = bodyPart.match(/(##[^\n]+\n(?:[^\n]+\n)*?\n)([\s\S]*?)(<h3>\s*⚠️\s*Nota de Curadoria|##\s*O Que Torna)/i);
      let insertedImg1 = false;

      if (introMatch) {
        const introParagraphsText = introMatch[2];
        const paragraphs = introParagraphsText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        
        if (paragraphs.length >= 1) {
          let targetIndex = 0;
          if (paragraphs.length > 1 && paragraphs[0].length < 120) {
            targetIndex = 1;
          }
          const targetParagraph = paragraphs[targetIndex];
          bodyPart = bodyPart.replace(targetParagraph, `${targetParagraph}\n\n${imageHtml1}`);
          insertedImg1 = true;
          console.log('  ✓ Imagem 1 posicionada depois do primeiro parágrafo');
        }
      }

      if (!insertedImg1) {
        const fallbackRegex = /(## O Que Torna|<h3>\s*⚠️\s*Nota de Curadoria)/i;
        if (fallbackRegex.test(bodyPart)) {
          bodyPart = bodyPart.replace(fallbackRegex, `${imageHtml1}\n\n$1`);
          console.log('  ✓ Imagem 1 posicionada via fallback');
        }
      }
    }

    // 2. Inserir segunda imagem DEPOIS DO PARÁGRAFO DE "A Atmosfera Dominante" (antes de "O que ressoa...")
    if (processedImages.length > 1) {
      const imageHtml2 = `<p><img src="${processedImages[1].url}" alt="${processedImages[1].alt}"></p>`;
      const resonanceRegex = /(###\s*O que ressoa nesta experi[êe]ncia:?)/i;

      if (resonanceRegex.test(bodyPart)) {
        bodyPart = bodyPart.replace(resonanceRegex, `${imageHtml2}\n\n$1`);
        console.log('  ✓ Imagem 2 posicionada depois do parágrafo de "A Atmosfera Dominante"');
      } else {
        const fallbackRegex = /(## Sua Vibe Encontra o Filme Certo no Vibesfilm|## Quando Escolher)/i;
        if (fallbackRegex.test(bodyPart)) {
          bodyPart = bodyPart.replace(fallbackRegex, `${imageHtml2}\n\n$1`);
          console.log('  ✓ Imagem 2 posicionada via fallback');
        }
      }
    }

    // 3. Inserir links IMDb nos nomes (Apenas no Corpo do Artigo, máximo 4 exibições no total)
    const MAX_IMDB_LINKS = 4;
    if (Object.keys(imdbIds).length > 0) {
      let currentLinksCount = (bodyPart.match(/<a\s+[^>]*href=["']https:\/\/www\.imdb\.com\/name\/[^"']+["'][^>]*>/gi) || []).length;
      let linksInserted = 0;

      for (const [name, url] of Object.entries(imdbIds)) {
        if (currentLinksCount >= MAX_IMDB_LINKS) break;

        // Escapar caracteres especiais de regex e flexibilizar espaços/hífens
        // Ex: "Bong Joon Ho" aceitará "Bong Joon-ho", "Bong Joon Ho", "bong joon ho", etc.
        const flexibleNamePattern = name
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escapar símbolos de regex primeiro
          .replace(/[-\s]/g, '[-\\s]');          // Tornar hífens e espaços intercambiáveis

        const patterns = [
          new RegExp(`\\*\\*${flexibleNamePattern}\\*\\*(?!<)`, 'i'),
          new RegExp(`\\b${flexibleNamePattern}\\b(?![^<]*>|[^<]*<\/a>)`, 'i')
        ];

        for (const pattern of patterns) {
          if (currentLinksCount >= MAX_IMDB_LINKS) break;
          if (pattern.test(bodyPart)) {
            bodyPart = bodyPart.replace(pattern, (match) => {
              // Limpar a marcação de negrito mantendo a escrita exata do texto
              const cleanMatch = match.replace(/\*\*/g, '');
              return `<a href="${url}" target="_blank" rel="noopener">${cleanMatch}</a>`;
            });
            linksInserted++;
            currentLinksCount++;
            break; // Evita dupla substituição para o mesmo nome
          }
        }
      }
      if (linksInserted > 0) {
        console.log(`  ✓ ${linksInserted} link(s) IMDb inserido(s) via script`);
      }
    }

    // Fiscal estrito: Garantir que não existam mais de 4 links IMDb em todo o texto
    const imdbLinkRegex = /<a\s+[^>]*href=["']https:\/\/www\.imdb\.com\/name\/[^"']+["'][^>]*>(.*?)<\/a>/gi;
    let imdbOccurrence = 0;
    bodyPart = bodyPart.replace(imdbLinkRegex, (fullMatch, linkText) => {
      imdbOccurrence++;
      if (imdbOccurrence > MAX_IMDB_LINKS) {
        // Remove a tag <a> excedente mantendo apenas o nome do ator/diretor
        return linkText;
      }
      return fullMatch;
    });
    console.log(`  ✓ Total final de links IMDb no artigo: ${Math.min(imdbOccurrence, MAX_IMDB_LINKS)} (máximo permitido: ${MAX_IMDB_LINKS})`);

    // Extrair as 3 tags baseadas estritamente na seção "O que ressoa nesta experiência:"
    const subSentimentNames = movie.movieSentiments.map(ms => ms.subSentiment.name);
    const chosenTags = extractResonanceTags(bodyPart, subSentimentNames);

    // Reagrupar conteúdo com YAML protegido
    enrichedContent = frontmatter + bodyPart;

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
    console.log(`🏷️  Tags (O que ressoa nesta experiência): ${chosenTags.join(', ')}`);
    console.log(`🔗 Links IMDb: ${Math.min(imdbOccurrence, MAX_IMDB_LINKS)}`);

    // Inserção opcional no Banco de Dados do Blog
    if (args.insertDb) {
      console.log('\n📦 Inserindo artigo no banco de dados do blog...');
      const blogId = args.blogId || 3;
      const published = args.published || false;

      const yamlMetadata = parseYaml(frontmatter);
      
      let articleTitle = movie.title;
      const titleMatch = bodyPart.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        articleTitle = titleMatch[1].trim();
      }

      const postSlug = movie.slug || articleTitle.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const slugExists = await prismaBlog.article.findFirst({
        where: { slug: postSlug }
      });
      const finalSlug = slugExists ? `${postSlug}-${movie.year || Date.now()}` : postSlug;

      const authorId = await getOrCreateAuthor(blogId);
      const categoryId = await getOrCreateCategory(blogId);
      
      const tagIds = await getOrCreateTags(blogId, chosenTags);

      const rawImageUrl = processedImages[0]?.url || movie.thumbnail || '';
      const imageUrl = rawImageUrl.replace(
        'https://dadrodpfylduydjbdxpy.supabase.co/storage/v1/object/public/movie-images/',
        'https://images.vibesfilm.com/'
      );
      const imageAlt = processedImages[0]?.alt || `Cena do filme ${movie.title}`;

      const aiModelUsed = args.model || aiConfig.model;

      const { marked } = await (Function('return import("marked")')() as Promise<any>);
      const htmlContent = await marked.parse(bodyPart.trim());

      const newArticle = await prismaBlog.article.create({
        data: {
          title: articleTitle,
          content: htmlContent,
          description: yamlMetadata.excerpt_1 || yamlMetadata.meta_description || movie.landingPageHook || movie.title,
          imageUrl,
          imageAlt,
          blogId,
          authorId,
          categoryId,
          slug: finalSlug,
          published,
          aiGenerated: true,
          aiModel: aiModelUsed,
          aiPrompt: `Gerar artigo de crítica/análise para o filme ${movie.title} (${movie.year})`,
          type: 'analise',
          metadata: {
            seoTitle: yamlMetadata.seo_title || articleTitle,
            metaDescription: yamlMetadata.meta_description || ''
          },
          keywords: movie.keywords,
          tags: {
            connect: tagIds.map(id => ({ id }))
          }
        }
      });

      console.log(`✅ Artigo inserido com sucesso no banco do blog!`);
      console.log(`   - ID do Artigo: ${newArticle.id}`);
      console.log(`   - Slug: ${newArticle.slug}`);
      console.log(`   - Status: ${newArticle.published ? 'Publicado 🚀' : 'Rascunho 📝'}`);
      console.log(`   - Blog ID: ${newArticle.blogId}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
    await prismaBlog.$disconnect();
  }
}

if (require.main === module) {
  generateBlogArticle();
}

export { generateBlogArticle };

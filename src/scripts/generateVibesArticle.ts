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
  const args: CLIArgs = { title: '' };

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

async function getOrCreateTags(blogId: number, sentiments: string[], genres: string[]): Promise<number[]> {
  const tagIds: number[] = [];
  const tagNames = [...new Set([...sentiments, ...genres])].slice(0, 5);

  for (const name of tagNames) {
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

  const bestBackdropPool = highResBackdrops.length > 0 ? highResBackdrops : images.backdrops;
  const bestStillPool = highResStills.length > 0 ? highResStills : images.stills;

  const bestBackdrop = bestBackdropPool.sort((a, b) => b.vote_average - a.vote_average)[0];
  const bestStill = bestStillPool.sort((a, b) => b.vote_average - a.vote_average)[0];

  const selectedImages = [
    { type: 'backdrop' as const, data: bestBackdrop },
    { type: 'still' as const, data: bestStill }
  ].filter(img => img.data);

  const processedImages: ProcessedImage[] = [];
  const actorNames = movie.cast.map((c: any) => c.actor.name);

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
      `- SubSentimento: ${ms.subSentiment.name} | Sentimento Raiz: ${ms.mainSentiment.name} | Relevância: ${ms.relevance} | Contexto: ${ms.explanation || 'Sem explicação'}`
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
    }

    let imagesSection = '';
    if (processedImages.length > 0) {
      imagesSection = '\n\n**IMAGENS PROCESSADAS (INSIRA NO ARTIGO):**\n';
      processedImages.forEach((img, idx) => {
        imagesSection += `\nImagem ${idx + 1}:\n<p><img src="${img.url}" alt="${img.alt}"></p>\n`;
      });
    }

    const prompt = `
Você escreve para o blog Vibesfilm. Seu trabalho não é analisar filmes — é traduzir experiências.

Antes de escrever qualquer parágrafo, faça a si mesmo esta pergunta obrigatória:
"Estou falando sobre o filme ou sobre o que ele provoca em quem assiste?"
Se a resposta for "sobre o filme", REESCREVA. A cada 300 palavras, pare e repita essa checagem.

O leitor que terminar este artigo não deve pensar: "Entendi esse filme."
Ele deve pensar: "Esse talvez seja o filme que eu precisava assistir agora."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 PRINCÍPIO CENTRAL — IDENTIDADE VIBESFILM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Toda seção deve responder à mesma pergunta: "Qual experiência emocional isso oferece ao espectador?"

Não escreva: "A direção de ${movie.director} cria uma tensão visual crescente."
Escreva: "À medida que as cenas avançam, você começa a perceber que está prendendo a respiração sem saber quando foi que parou de soltá-la."

Não escreva sobre o protagonista — escreva sobre o leitor.
Não: "O personagem enfrenta uma crise moral profunda."
Sim: "Há um momento em que você vai perceber que está torcendo por alguém fazendo algo que normalmente reprovaria. E isso vai incomodar."

Não analise. Convide. A pergunta que você está respondendo o tempo todo é:
"Por que alguém deveria viver essa experiência hoje?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DADOS DO FILME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Título: "${movie.title}" (${movie.year})
- Título Original: ${movie.original_title || 'Não informado'}
- Diretor: ${movie.director || 'Não informado'}
- Elenco Principal: ${castNames || 'Não informado'}
- Sinopse: ${movie.description}
- Gêneros: ${movie.genres.join(', ')}
- Palavras-chave: ${movie.keywords.slice(0, 15).join(', ')}
- Onde assistir: ${platforms || 'Verifique disponibilidade local'}
- Hook: "${movie.landingPageHook || ''}"
- Alertas de conteúdo: "${movie.contentWarnings || ''}"

**SENTIMENTOS IDENTIFICADOS PELA IA VIBESFILM:**
${sentimentsList}

**JORNADAS EMOCIONAIS (em que momento assistir):**
${journeys}
${imdbLinksSection}
${imagesSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 REGRAS ABSOLUTAS (VIOLAÇÃO = REESCREVER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ZERO jargão cinematográfico como substantivo de valor:
   Proibido: "fotografia impecável", "roteiro denso", "direção magistral", "trilha evocativa", "onírico", "justaposição", "exaustão existencial".
   Permitido: dizer o que esses elementos fazem SENTIR. Ex.: "a luz amarelada cria aquela sensação de tarde que nunca acaba".

2. ZERO hipérboles vazias: "magistral", "sublime", "obra-prima", "genial".
   Descreva a emoção concreta, não o rótulo.

3. ZERO clichês de crítica:
   Banidos: "soco no estômago", "não é para qualquer momento", "não é apenas um filme",
   "fica com você", "a genialidade de", "não saem com os créditos", "filmes que ficam".

4. Não repita "Vibe" excessivamente. Varie.

5. LIMITES de metadados SEO:
   - seo_title: MÁXIMO 60 caracteres (com " | Vibesfilm" no final)
   - meta_description: MÁXIMO 160 caracteres. Texto puro, sem HTML.

6. USE seu conhecimento sobre o filme para mencionar personagens e momentos reais,
   mas SEM spoilers graves do final.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 ESTRUTURA OBRIGATÓRIA DO ARTIGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**BLOCO YAML (inicie o arquivo com isso):**
---
seo_title: "[MÁXIMO 60 chars com | Vibesfilm]"
meta_description: "[MÁXIMO 160 chars. Texto puro.]"
excerpt_1: "[Resumo curto para cards. Texto puro.]"
excerpt_2: "[Resumo alternativo com ângulo diferente. Texto puro.]"
---

# [Título criativo: nome do filme + o que ele desperta em quem assiste]

## [Uma pergunta ou provocação que faça o leitor se sentir visto — ex: "Você ainda consegue confiar na sua própria memória?"]
[UMA frase ou parágrafo curto (máx. 2 linhas) que amplie essa provocação. Sem nomes de elenco ou diretor aqui.]

## Por que assistir agora?
Escreva 2 parágrafos. O foco não é o que o filme é — é o que ele faz.
No primeiro parágrafo: apresente a experiência, não a obra. Cite ${movie.director} e ${castNames} apenas como âncora de contexto, não como objeto de análise.
No segundo parágrafo: conecte o tom do filme a um estado emocional que o leitor pode estar vivendo. Termine com uma frase que posicione o filme como uma resposta possível a algo que o leitor sente — sem prometer catarse fácil.

<h3>⚠️ Nota de Curadoria: ${movie.title} (${movie.year})</h3>
<p>Com base no alerta a seguir, escreva no máximo 2 frases que preparem o leitor emocionalmente para o que vai encontrar no filme, sem usar termos clínicos, criminais ou explícitos.
Alerta original (use apenas como referência de contexto, não copie os termos): "${movie.contentWarnings}".

REGRAS OBRIGATÓRIAS para esta seção:
- PROIBIDO usar os termos: "abuso sexual", "estupro", "pedofilia", "assassinato", "homicídio", "violência sexual" ou qualquer linguagem de boletim policial.
- Em vez disso, use expressões focadas no impacto emocional e na trama. Exemplos:
  • "assassinato de uma criança" → "a perda trágica e violenta de uma criança"
  • "abuso sexual" → "violência profunda contra uma criança" ou "um crime que marca a história de forma irreparatível"
  • "estupro" → "uma violência que a trama não suaviza"
- O tom deve ser de um curador que avisa com respeito, não de um laudo médico ou notícia policial.
- Não invente conteúdo que não esteja no alerta original. Não assuste; prepare.
- Termine com uma frase que sinalize preparo emocional, como: "A narrativa não poupa o leitor, mas tem um propósito claro." ou equivalente.
</p>

## Como esse filme faz você se sentir?
**ATENÇÃO:** O título desta seção deve ser reescrito para refletir a emoção central do filme.
Exemplos: "Como essa tensão faz você se sentir?", "O que esse silêncio desperta em você?", "Por que esse desconforto parece familiar?".
Nesta seção, NÃO analise técnicas cinematográficas como fim em si mesmas.
Explique apenas o que elementos visuais, sonoros e narrativos PROVOCAM no espectador.
Escreva 2 a 3 parágrafos fluídos. Sem tópicos. Fale com o leitor, não sobre o filme.

## O que você leva desse filme?
**ATENÇÃO:** O título desta seção deve ser reescrito como uma pergunta voltada ao leitor.
Exemplos: "O que fica depois dos créditos?", "O que esse filme deixa em aberto?", "Que sensação você carrega para casa?"

Escreva exatamente: "### O que você leva dessa experiência:"

Em seguida, use APENAS os 3 primeiros SubSentimentos da lista "SENTIMENTOS IDENTIFICADOS PELA IA VIBESFILM" (já ordenados por relevância decrescente).
⚠️ O nome do SubSentimento é o valor após "SubSentimento:" em cada linha. NÃO use o "Sentimento Raiz" como nome. Exemplo: em "SubSentimento: Suspense Crescente | Sentimento Raiz: Ansioso(a)", o nome correto é "Suspense Crescente".

⚠️ REGRA CRÍTICA — COMO DESENVOLVER CADA TÓPICO:
Exiba o nome do SubSentimento em negrito como título do item (<strong>).
Em seguida, escreva 2 a 3 linhas que traduzam o que permanece emocionalmente com o espectador após o filme.
NÃO descreva cenas, ações ou o comportamento do protagonista.
NÃO defina o subsentimento nem explique o que ele significa.
Escreva sobre a reflexão, a inquietação ou a mudança de perspectiva que essa experiência deixa no leitor.
Cada texto deve soar como algo que alguém poderia dizer alguns minutos depois dos créditos, ao tentar explicar por que aquele filme ainda continua dentro dele.

Exemplos do que NÃO fazer:
❌ "<strong>Desespero Crescente</strong>: Cada porta que se fecha empurra o personagem para uma decisão extrema." (descreve ação do protagonista)
❌ "<strong>Desintegração Psicológica</strong>: É quando a mente do protagonista começa a ceder sob pressão." (define o conceito + foca no personagem)

Exemplos do que FAZER:
✅ "<strong>Desespero Crescente</strong>: A sensação de que o desespero pode distorcer qualquer bússola moral — e o incômodo de perceber que você entendeu cada passo do caminho, mesmo sem querer."
✅ "<strong>Desintegração Psicológica</strong>: A inquietação de acompanhar alguém cruzando lentamente uma linha sem perceber. Não por fraqueza — mas porque as circunstâncias foram moldando o que parecia possível, uma escolha de cada vez."

Formato HTML obrigatório:
<ul>
<li><strong>[Nome Exato do SubSentimento 1]</strong>: [2 a 3 linhas — reflexão/inquietação que permanece, na voz de quem tenta explicar por que o filme ainda está dentro dele. Sem descrever cenas ou definir emoções.]</li>
<li><strong>[Nome Exato do SubSentimento 2]</strong>: [Idem]</li>
<li><strong>[Nome Exato do SubSentimento 3]</strong>: [Idem]</li>
</ul>

## Quando esse filme é para você? (Sua jornada no Vibesfilm)
Escreva 1 parágrafo curto reconhecendo que nem todo filme é para todo momento — e que o Vibesfilm existe para ajudar a encontrar o filme certo para o momento certo.

Escolha 2 ou 3 Jornadas Emocionais dos dados e transforme-as em mini-convites usando HTML <ul> e <li>:
<ul>
<li><strong>Se você está [estado emocional específico]</strong>: [Descreva a experiência que o filme oferece para alguém nesse estado. Fale com o leitor diretamente. Ex: "Se você está carregando algo pesado e não consegue nomear o que é, esse filme pode fazer isso por você."]</li>
<li><strong>Se você quer [desejo ou busca específica]</strong>: [Descrição de como o filme atende esse desejo, em linguagem de experiência, não de catálogo.]</li>
</ul>

## Esse filme é a resposta para o que você está sentindo?
Conclusão emocional. NÃO faça um resumo do artigo. Faça uma última pergunta ou afirmação que deixe o leitor com vontade de apertar play.
Feche com: "Quer saber onde assistir, ver o elenco completo e mais detalhes? Confira nosso guia completo de [Link para /onde-assistir/${movieSlug} com texto '${movie.title} (${movie.year})']."

**Rodapé:**
<hr>
<p>Qual é a sua vibe hoje? Cada emoção tem um filme. Descubra seu filme perfeito no <a href="/app">Vibesfilm App!</a></p>
`;

    console.log(`🤖 Gerando artigo com ${providerStr.toUpperCase()}...`);

    const response = await aiProvider.generateResponse(
      "Você escreve para o blog Vibesfilm. Seu trabalho é traduzir experiências emocionais, não analisar filmes. Fale sempre com o leitor, nunca sobre o filme.",
      prompt,
      { maxTokens: 4000, temperature: 0.75 }
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

    // 1. Inserir primeira imagem antes do 3º H2 do artigo (posicional — robusto contra reescrita de títulos pela IA)
    if (processedImages.length > 0 && !bodyPart.includes(processedImages[0].url)) {
      const allH2s = [...bodyPart.matchAll(/^## .+$/gm)];
      if (allH2s.length >= 3) {
        const targetH2 = allH2s[2][0]; // 3º H2 (índice 2)
        const imageHtml = `<p><img src="${processedImages[0].url}" alt="${processedImages[0].alt}"></p>\n\n`;
        bodyPart = bodyPart.replace(targetH2, `${imageHtml}${targetH2}`);
        console.log(`  ✓ Imagem 1 inserida antes de: "${targetH2}"`);
      } else {
        console.log('  ⚠️  Não foi possível inserir Imagem 1: menos de 3 seções H2 encontradas.');
      }
    }

    // 2. Inserir segunda imagem antes do penúltimo H2 do artigo (posicional)
    if (processedImages.length > 1 && !bodyPart.includes(processedImages[1].url)) {
      const allH2s = [...bodyPart.matchAll(/^## .+$/gm)];
      if (allH2s.length >= 2) {
        const targetH2 = allH2s[allH2s.length - 2][0]; // penúltimo H2
        const imageHtml = `<p><img src="${processedImages[1].url}" alt="${processedImages[1].alt}"></p>\n\n`;
        bodyPart = bodyPart.replace(targetH2, `${imageHtml}${targetH2}`);
        console.log(`  ✓ Imagem 2 inserida antes de: "${targetH2}"`);
      } else {
        console.log('  ⚠️  Não foi possível inserir Imagem 2: menos de 2 seções H2 encontradas.');
      }
    }

    // 3. Inserir links IMDb nos nomes (Apenas no Corpo do Artigo)
    if (Object.keys(imdbIds).length > 0) {
      let linksInserted = 0;
      for (const [name, url] of Object.entries(imdbIds)) {
        // Escapar caracteres especiais de regex e flexibilizar espaços/hífens
        // Ex: "Bong Joon Ho" aceitará "Bong Joon-ho", "Bong Joon Ho", "bong joon ho", etc.
        const flexibleNamePattern = name
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escapar símbolos de regex primeiro
          .replace(/[-\s]/g, '[-\\s]');          // Tornar hífens e espaços intercambiáveis

        const patterns = [
          new RegExp(`\\*\\*${flexibleNamePattern}\\*\\*(?!<)`, 'gi'),
          new RegExp(`\\b${flexibleNamePattern}\\b(?![^<]*>|[^<]*<\/a>)`, 'gi')
        ];

        for (const pattern of patterns) {
          if (pattern.test(bodyPart)) {
            bodyPart = bodyPart.replace(pattern, (match) => {
              // Limpar a marcação de negrito mantendo a escrita exata do texto
              const cleanMatch = match.replace(/\*\*/g, '');
              return `<a href="${url}" target="_blank" rel="noopener">${cleanMatch}</a>`;
            });
            linksInserted++;
            break; // Evita dupla substituição para o mesmo nome
          }
        }
      }
      console.log(`  ✓ ${linksInserted} link(s) IMDb inserido(s)`);
    }

    // Reagrupar conteúdo com YAML protegido
    enrichedContent = frontmatter + bodyPart;

    const outputDir = path.join(__dirname, '../../generated_articles');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const safeTitle = movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}_${movie.year}_vibes.md`;
    const filePath = path.join(outputDir, filename);

    writeFileSync(filePath, enrichedContent);

    console.log(`\n✅ Artigo gerado e enriquecido!`);
    console.log(`📂 ${filePath}`);
    console.log(`📸 Imagens: ${processedImages.length}`);
    console.log(`🔗 Links IMDb: ${Object.keys(imdbIds).length}`);

    // Inserção opcional no Banco de Dados do Blog
    if (args.insertDb) {
      console.log('\n📦 Inserindo artigo no banco de dados do blog...');
      const blogId = args.blogId || 1;
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
      
      const sentimentNames = movie.movieSentiments.map(ms => ms.subSentiment.name);
      const tagIds = await getOrCreateTags(blogId, sentimentNames, movie.genres);

      const imageUrl = processedImages[0]?.url || movie.thumbnail || '';
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

/// <reference types="node" />
import './scripts-helper';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createAIProvider, getDefaultConfig } from '../utils/aiProvider';
import axios from 'axios';
import { prismaApp as prisma, prismaBlog } from '../prisma';


// Interface para argumentos CLI
interface CLIArgs {
  title?: string;
  intention?: string;
  concept?: string;
  movies?: string[];
  aiProvider?: 'openai' | 'deepseek' | 'gemini';
  model?: string;
  insertDb?: boolean;
  blogId?: number;
  published?: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {
    movies: []
  };

  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--ai-provider=')) {
      args.aiProvider = arg.split('=')[1] as any;
    } else if (arg.startsWith('--model=')) {
      args.model = arg.split('=')[1];
    } else if (arg.startsWith('--title=')) {
      args.title = arg.substring(arg.indexOf('=') + 1).replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--intention=')) {
      args.intention = arg.substring(arg.indexOf('=') + 1).replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--concept=')) {
      args.concept = arg.substring(arg.indexOf('=') + 1).replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--movies=')) {
      const rawMovies = arg.substring(arg.indexOf('=') + 1).replace(/^["']|["']$/g, '');
      args.movies = rawMovies.split(',').map(m => m.trim()).filter(m => m.length > 0);
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
  const preferredSlug = 'listas';
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
        title: 'Listas',
        slug: preferredSlug,
        description: 'Listas temáticas e curadorias de filmes baseadas em sentimentos.',
        blogId
      }
    });
    console.log(`  ✓ Categoria padrão criada (ID: ${category.id})`);
  }

  return category.id;
}

async function getOrCreateTags(blogId: number, tagNames: string[]): Promise<number[]> {
  const tagIds: number[] = [];
  const uniqueTagNames = [...new Set(tagNames)].slice(0, 10);

  for (const name of uniqueTagNames) {
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

async function fetchIMDbIds(movieId: number): Promise<{ [key: string]: string }> {
  if (!movieId) return {};
  const API_KEY = process.env.TMDB_API_KEY;
  const imdbIds: { [key: string]: string } = {};

  try {
    const creditsResponse = await axios.get<{ cast: any[], crew: any[] }>(
      `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${API_KEY}`
    );

    const director = creditsResponse.data.crew.find((c: any) => c.job === 'Director');

    if (director) {
      try {
        const personResponse = await axios.get<{ imdb_id?: string }>(
          `https://api.themoviedb.org/3/person/${director.id}/external_ids?api_key=${API_KEY}`
        );

        if (personResponse.data.imdb_id) {
          imdbIds[director.name] = `https://www.imdb.com/name/${personResponse.data.imdb_id}/`;
        }
      } catch (error) {
        // Ignora silenciosamente
      }
    }
  } catch (error) {
    // Ignora silenciosamente
  }
  return imdbIds;
}

async function generatePillarArticle() {
  const args = parseArgs();
  const providerStr = args.aiProvider || 'openai';

  // Configurações padrão voltadas para a intenção de Aceitação/Impermanência
  const articleTitle = args.title || "4 filmes sobre a beleza da aceitação e a impermanência da vida";
  const intention = args.intention || "Encontrar serenidade e paz interior ao acolher a impermanência e as verdades inevitáveis da vida.";
  const concept = args.concept || "Esta curadoria reúne obras cinematográficas focadas na transição psicológica da negação ou da luta contra o inevitável para a profunda aceitação da realidade. São filmes que demonstram como a verdadeira força e libertação do protagonista não surgem de vencer um conflito externo, mas da coragem de abraçar o presente, as perdas e o fluxo natural do tempo como eles realmente são.";
  
  const movieTitles = args.movies && args.movies.length > 0
    ? args.movies
    : [
        "Touch (2024)"
      ];

  console.log(`🎬 Iniciando geração do Artigo Pilar: "${articleTitle}"`);
  console.log(`🎯 Intenção: "${intention}"`);
  console.log(`🤖 Usando Provider: ${providerStr.toUpperCase()}`);

  try {
    // 1. Buscar dados dos filmes e links IMDb
    const moviesData = [];
    let globalImdbLinks: { [key: string]: string } = {};

    for (const rawTitle of movieTitles) {
      let titleClean = rawTitle;
      let yearCondition = {};

      const yearMatch = rawTitle.match(/\s*\((\d{4})\)\s*$/);
      if (yearMatch) {
        titleClean = rawTitle.replace(yearMatch[0], '').trim();
        yearCondition = { year: parseInt(yearMatch[1], 10) };
      }

      const movie = await prisma.movie.findFirst({
        where: {
          title: { contains: titleClean, mode: 'insensitive' },
          ...yearCondition
        },
        include: {
          movieSentiments: {
            include: { subSentiment: true },
            orderBy: { relevance: 'desc' },
            take: 2
          },
          movieSuggestionFlows: {
            take: 1
          },
          cast: {
            include: { actor: true },
            orderBy: { order: 'asc' },
            take: 3
          }
        }
      });

      if (!movie) {
        console.warn(`⚠️ Aviso: Filme "${rawTitle}" não encontrado no banco.`);
        continue;
      }

      const topSentiment = movie.movieSentiments[0];
      const hook = movie.movieSuggestionFlows[0]?.reason || topSentiment?.explanation || movie.description;
      const castNames = movie.cast.map(c => c.actor.name).join(', ');

      const imdbLinks = movie.tmdbId ? await fetchIMDbIds(movie.tmdbId) : {};
      globalImdbLinks = { ...globalImdbLinks, ...imdbLinks };
      const safeTitle = movie.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const imageUrl = `https://dadrodpfylduydjbdxpy.supabase.co/storage/v1/object/public/movie-images/blog-articles/${safeTitle}_${movie.year}_1.webp`;

      // Tenta buscar o slug do artigo real já publicado no blog
      let articleSlug = movie.slug || movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      try {
        const movieSlugBase = movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const dbArticles = await prismaBlog.$queryRawUnsafe(`
          SELECT slug 
          FROM "Article" 
          WHERE "blogId" = 3 
            AND published = true 
            AND (slug LIKE $1 OR title ILIKE $2)
          LIMIT 1
        `, `%${movieSlugBase}%`, `%${movie.title}%`) as any[];

        if (dbArticles && dbArticles.length > 0) {
          articleSlug = dbArticles[0].slug;
          console.log(`🔗 Slug do blog encontrado para "${movie.title}": ${articleSlug}`);
        } else {
          console.log(`⚠️ Nenhum artigo do blog correspondente a "${movie.title}" foi encontrado. Usando slug padrão: ${articleSlug}`);
        }
      } catch (err) {
        console.warn(`⚠️ Erro ao consultar o banco de dados do blog:`, err);
      }

      moviesData.push({
        title: movie.title,
        year: movie.year,
        slug: articleSlug,
        vibe: topSentiment?.subSentiment?.name || 'Aceitação Profunda',
        hook: hook,
        synopsis: movie.description,
        director: movie.director || 'Não informado',
        cast: castNames,
        imdbLinks: imdbLinks,
        imageUrl: imageUrl,
        genres: movie.genres,
        keywords: movie.keywords,
        thumbnail: movie.thumbnail
      });
      console.log(`✅ Adicionado ao cluster: ${movie.title}`);
    }

    // Preparar lista formatada de links IMDb globais
    let imdbLinksContext = '';
    if (Object.keys(globalImdbLinks).length > 0) {
      imdbLinksContext = '\n**DIRETÓRIO DE LINKS IMDB (USE NO RESUMO EMOCIONAL ONDE OS NOMES APARECEREM):**\n';
      for (const [name, url] of Object.entries(globalImdbLinks)) {
        imdbLinksContext += `- **${name}**: <a href="${url}" target="_blank" rel="noopener">${name}</a>\n`;
      }
    }

    // 2. Preparar Contexto para IA
    const moviesContext = moviesData.map((m, i) => `
    --- INÍCIO DO FILME ${i + 1} ---
    **${m.title} (${m.year})**
    - Diretor: ${m.director}
    - Atores: ${m.cast}
    - Vibe Principal: ${m.vibe}
    - Hook Emocional (Banco de Dados): "${m.hook}"
    - Sinopse: ${m.synopsis}
    - Slug do Artigo Individual: "${m.slug}"
    - URL da Imagem Supabase: "${m.imageUrl}"
    --- FIM DO FILME ${i + 1} ---
    `).join('\n');

    const prompt = `
    Você é um redator sênior do blog "Vibesfilm". Um cinéfilo especializado em crítica de cinema com foco em ANÁLISE EMOCIONAL e SEMÂNTICA.
    Escreva um "Artigo Pilar" (Lista) com o título: **"${articleTitle}"**.

    **PROPÓSITO EMOCIONAL DO ARTIGO:**
    - Intenção Emocional: "${intention}"
    - Conceito Curatorial: "${concept}"

    **ESTRUTURA OBRIGATÓRIA (LEIA COM MUITA ATENÇÃO):**

    **METADADOS SEO DO ARTIGO PRINCIPAL (Inicie o arquivo com este bloco YAML OBRIGATORIAMENTE):**
    ---
    seo_title: "[Título Focado no Impacto da Aceitação] | Vibesfilm (Max 60 chars)"
    meta_description: "[Resumo do artigo pilar para o Google | Max 160 chars. JAMAIS USE HTML AQUI]"
    excerpt_1: "[Resumo curto para chamadas em destaque. TEXTO PURO, SEM HTML]"
    excerpt_2: "[Resumo alternativo focado na proposta de valor. TEXTO PURO, SEM HTML]"
    ---

    # ${articleTitle}

    **Introdução** (2-3 parágrafos)
    - Escreva de forma empática, profunda e conversacional. 
    - Fale sobre como a vida nos impõe transformações e perdas que não podemos evitar, e como a verdadeira paz surge no momento em que paramos de lutar contra o fluxo da realidade.
    - Apresente a premissa desta curadoria com base na intenção: "${intention}".
    - Atenção: NÃO use termos médicos, psiquiátricos ou clínicos como "cura", "ansiedade", "terapia", "tratamento" ou "depressão". Foque no aspecto humano e poético da vivência.

    **Seção: A Beleza da Aceitação**
    - Desenvolva de forma bela e fluida o Conceito Curatorial: "${concept}". Explique que a verdadeira força de um protagonista (e de nós) não está em vencer todos os desafios externos, mas na coragem de acolher o presente exatamente como ele é.

    **A Lista (Jornadas de Impermanência e Serenidade)**
    Para CADA UM dos ${moviesData.length} filmes, a estrutura DEVE SER EXATAMENTE ASSIM (Sem blocos de metadados YAML adicionais ou blocos de comentários):

    ### ${moviesData.length > 0 ? `1` : ''}. **[Título do Filme] ([Ano])**
    
    <p><img src="[URL da Imagem Supabase fornecida nos dados do filme]" alt="[Texto ALT altamente descritivo e acessível gerado por você, descrevendo a cena de forma poética com base no elenco e tom da obra, ex: 'Atores X e Y em cena dramática do filme Z']"></p>
    
    **Resumo Emocional**: Escreva 1 ou 2 parágrafos primorosos apresentando a atmosfera emocional do filme, conectando-a diretamente com a intenção e o conceito curatorial da lista.
    ⚠️ **DIRETRIZ DE ESCRITA CRÍTICA (FALTA DE SPOILERS):** Mantenha esta descrição estritamente como uma **introdução instigante e envolvente** da 'vibe' do filme, preparando o leitor para a jornada. **NÃO dê spoilers do final do filme** e não esgote a análise técnica profunda, pois cada filme tem um artigo e análise dedicados para leitura posterior. O objetivo é despertar o desejo de assistir e refletir.
    ⚠️ **REQUISITO OBRIGATÓRIO AQUI:** Sempre que citar o nome do DIRETOR ou atores listados no "Diretório de Links IMDb" no final da requisição, você deve OBRIGATORIAMENTE substituí-lo pelo formato de âncora completo informado (padrão internacional: https://www.imdb.com/name/nm...). Exemplo correto: "Sob a direção sensível de <a href="URL" target="_blank" rel="noopener">Brendan Fraser</a>...".
    
    **A Essência da Aceitação**: Uma frase final marcante (ou micro-parágrafo) destacando o momento ou a verdade inevitável da existência com a qual a obra nos convida a fazer as pazes.
    
    <p>📖 <a href="/artigo/[Slug do Filme da requisição]">Análise emocional completa de [Título do Filme]</a></p>
    <p>🎬 <a href="/onde-assistir/[Slug do Filme da requisição]">Onde Assistir Agora</a></p>

    (Repita essa exata mesma estrutura para TODOS os filmes listados no contexto).

    **Conclusão**
    - Fechamento poético e reconfortante sobre como a arte nos ajuda a abraçar o presente, as perdas e o fluxo natural do tempo para encontrar a verdadeira serenidade.

    **DADOS DOS FILMES PARA A LISTA:**
    ${moviesContext}

    ${imdbLinksContext}

    **TOM DE VOZ:**
    Empático, reflexivo, tocante e íntimo, conversando de forma honesta e sem jargões rebuscados ("exaustão existencial", "juxtaposição", "onírico"). Evite superlativos e termos médicos.
    `;

    // 3. Gerar com IA
    const aiConfig = getDefaultConfig(providerStr as any);
    if (args.model) {
      aiConfig.model = args.model;
    }
    const aiProvider = createAIProvider(aiConfig);

    const response = await aiProvider.generateResponse(
      "Você é um crítico de cinema especializado na jornada emocional e semântica da audiência, focado em reflexões sobre aceitação, tempo e impermanência. Rigoroso com regras de formatação HTML e limites de spoilers.",
      prompt,
      { maxTokens: 4000, temperature: 0.7 }
    );

    if (!response.success) {
      throw new Error(response.error);
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

    // Reagrupar conteúdo com YAML protegido
    enrichedContent = frontmatter + bodyPart;

    // 4. Salvar
    const outputDir = path.join(__dirname, '../../generated_articles');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    // Nome de arquivo dinâmico seguro baseado no título
    const safeTitle = articleTitle.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const suffix = providerStr === 'deepseek' ? '_deepseek' : '';
    const filename = `pilar_${safeTitle}${suffix}.md`;
    const filePath = path.join(outputDir, filename);

    writeFileSync(filePath, enrichedContent);

    console.log(`\n✅ Artigo Pilar gerado com sucesso!`);
    console.log(`📂 ${filePath}`);

    // Inserção opcional no Banco de Dados do Blog
    if (args.insertDb) {
      console.log('\n📦 Inserindo artigo no banco de dados do blog...');
      const blogId = args.blogId || 1;
      const published = args.published || false;

      const yamlMetadata = parseYaml(frontmatter);
      
      let finalArticleTitle = articleTitle;
      const titleMatch = bodyPart.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        finalArticleTitle = titleMatch[1].trim();
      }

      const postSlug = finalArticleTitle.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const slugExists = await prismaBlog.article.findFirst({
        where: { slug: postSlug }
      });
      const finalSlug = slugExists ? `${postSlug}-${Date.now()}` : postSlug;

      const authorId = await getOrCreateAuthor(blogId);
      const categoryId = await getOrCreateCategory(blogId);
      
      const sentimentNames: string[] = [];
      const genresList: string[] = [];
      const allKeywords: string[] = [];
      
      moviesData.forEach(m => {
        if (m.vibe) sentimentNames.push(m.vibe);
        if (m.genres) genresList.push(...m.genres);
        if (m.keywords) allKeywords.push(...m.keywords);
      });
      
      const tagIds = await getOrCreateTags(blogId, [...sentimentNames, ...genresList]);

      const imageUrl = moviesData[0]?.imageUrl || moviesData[0]?.thumbnail || '';
      const imageAlt = `Curadoria de filmes: ${finalArticleTitle}`;

      const aiModelUsed = args.model || aiConfig.model;

      const { marked } = await (Function('return import("marked")')() as Promise<any>);
      const htmlContent = await marked.parse(bodyPart.trim());

      const newArticle = await prismaBlog.article.create({
        data: {
          title: finalArticleTitle,
          content: htmlContent,
          description: yamlMetadata.excerpt_1 || yamlMetadata.meta_description || articleTitle,
          imageUrl,
          imageAlt,
          blogId,
          authorId,
          categoryId,
          slug: finalSlug,
          published,
          aiGenerated: true,
          aiModel: aiModelUsed,
          aiPrompt: `Gerar artigo pilar/lista: ${articleTitle}. Intenção: ${intention}. Conceito: ${concept}. Filmes: ${movieTitles.join(', ')}`,
          type: 'lista',
          metadata: {
            seoTitle: yamlMetadata.seo_title || finalArticleTitle,
            metaDescription: yamlMetadata.meta_description || ''
          },
          keywords: allKeywords.slice(0, 15),
          tags: {
            connect: tagIds.map(id => ({ id }))
          }
        }
      });

      console.log(`✅ Artigo Pilar inserido com sucesso no banco do blog!`);
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
  generatePillarArticle();
}

export { generatePillarArticle };

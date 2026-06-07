/// <reference types="node" />
import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createAIProvider, getDefaultConfig } from '../utils/aiProvider';
import axios from 'axios';

const prisma = new PrismaClient();

// Interface para argumentos CLI
interface CLIArgs {
  title?: string;
  intention?: string;
  concept?: string;
  movies?: string[];
  aiProvider?: 'openai' | 'deepseek' | 'gemini';
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {
    movies: []
  };

  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--ai-provider=')) {
      args.aiProvider = arg.split('=')[1] as any;
    } else if (arg.startsWith('--title=')) {
      args.title = arg.substring(arg.indexOf('=') + 1).replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--intention=')) {
      args.intention = arg.substring(arg.indexOf('=') + 1).replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--concept=')) {
      args.concept = arg.substring(arg.indexOf('=') + 1).replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--movies=')) {
      const rawMovies = arg.substring(arg.indexOf('=') + 1).replace(/^["']|["']$/g, '');
      args.movies = rawMovies.split(',').map(m => m.trim()).filter(m => m.length > 0);
    }
  });

  return args;
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

      moviesData.push({
        title: movie.title,
        year: movie.year,
        slug: movie.slug || movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        vibe: topSentiment?.subSentiment?.name || 'Aceitação Profunda',
        hook: hook,
        synopsis: movie.description,
        director: movie.director || 'Não informado',
        cast: castNames,
        imdbLinks: imdbLinks,
        imageUrl: imageUrl
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
    const aiProvider = createAIProvider(getDefaultConfig(providerStr as any));

    const response = await aiProvider.generateResponse(
      "Você é um crítico de cinema especializado na jornada emocional e semântica da audiência, focado em reflexões sobre aceitação, tempo e impermanência. Rigoroso com regras de formatação HTML e limites de spoilers.",
      prompt,
      { maxTokens: 4000, temperature: 0.7 }
    );

    if (!response.success) {
      throw new Error(response.error);
    }

    // 4. Salvar
    const outputDir = path.join(__dirname, '../../generated_articles');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    // Nome de arquivo dinâmico seguro baseado no título
    const safeTitle = articleTitle.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const suffix = providerStr === 'deepseek' ? '_deepseek' : '';
    const filename = `pilar_${safeTitle}${suffix}.md`;
    const filePath = path.join(outputDir, filename);

    writeFileSync(filePath, response.content);

    console.log(`\n✅ Artigo Pilar gerado com sucesso!`);
    console.log(`📂 ${filePath}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generatePillarArticle();

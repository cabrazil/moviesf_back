/// <reference types="node" />
import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createAIProvider, getDefaultConfig } from '../utils/aiProvider';

const prisma = new PrismaClient();

// Interface para argumentos CLI
interface CLIArgs {
  aiProvider?: 'openai' | 'deepseek' | 'gemini';
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--ai-provider=')) {
      args.aiProvider = arg.split('=')[1] as any;
    }
  });
  return args;
}

import axios from 'axios';

async function fetchIMDbIds(movieId: number): Promise<{ [key: string]: string }> {
  if (!movieId) return {};
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
        // Ignora silenciosamente para não poluir
      }
    }
  } catch (error) {
    // Ignora silenciosamente
  }
  return imdbIds;
}

async function generateGriefPillarArticle() {
  const args = parseArgs();
  const providerStr = args.aiProvider || 'openai';

  console.log(`🎬 Iniciando geração do Artigo Pilar: Luto (Grief)...`);
  console.log(`🤖 Usando Provider: ${providerStr.toUpperCase()}`);

  const movieTitles = [
    "Manchester à Beira-Mar",
    "A Chegada",
    "Up: Altas Aventuras",
    "Demolição",
    "O Quarto do Filho",
    "Aftersun"
  ];

  try {
    // 1. Buscar dados dos 6 filmes e links IMDb
    const moviesData = [];
    let globalImdbLinks: { [key: string]: string } = {};

    for (const title of movieTitles) {
      const movie = await prisma.movie.findFirst({
        where: { title: { contains: title, mode: 'insensitive' } },
        include: {
          movieSentiments: {
            include: { subSentiment: true },
            orderBy: { relevance: 'desc' },
            take: 2
          },
          movieSuggestionFlows: {
            where: { journeyOptionFlow: { journeyStepFlow: { journeyFlow: { mainSentimentId: 14 } } } }, // 14 = Triste
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
        console.warn(`⚠️ Aviso: Filme "${title}" não encontrado no banco.`);
        continue;
      }

      const topSentiment = movie.movieSentiments[0];
      const hook = movie.movieSuggestionFlows[0]?.reason || topSentiment?.explanation || movie.description;
      const castNames = movie.cast.map(c => c.actor.name).join(', ');

      const imdbLinks = movie.tmdbId ? await fetchIMDbIds(movie.tmdbId) : {};
      globalImdbLinks = { ...globalImdbLinks, ...imdbLinks };

      moviesData.push({
        title: movie.title,
        year: movie.year,
        slug: movie.slug || movie.title.toLowerCase().replace(/ /g, '-'),
        vibe: topSentiment?.subSentiment?.name || 'Melancolia Profunda',
        hook: hook,
        synopsis: movie.description,
        director: movie.director || 'Não informado',
        cast: castNames,
        imdbLinks: imdbLinks
      });
      console.log(`✅ Adicionado ao cluster: ${movie.title}`);
    }

    // Preparar lista formatada de links IMDb globais
    let imdbLinksContext = '';
    if (Object.keys(globalImdbLinks).length > 0) {
      imdbLinksContext = '\n**DIRETÓRIO DE LINKS IMDB (USE NO RESUMO EMOCIONAL ONDE OS NOMES APARECEREM):**\n';
      for (const [name, url] of Object.entries(globalImdbLinks)) {
        imdbLinksContext += `- **${name}**: <a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>\n`;
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
    --- FIM DO FILME ${i + 1} ---
    `).join('\n');

    const prompt = `
    Você é um redator sênior do blog "Vibesfilm".
    Escreva um "Artigo Pilar" (Lista) com o título: **"Cinema e Cura: 6 Filmes que nos Ajudam a Processar o Luto"**.

    **ESTRUTURA OBRIGATÓRIA (LEIA COM MUITA ATENÇÃO):**

    **METADADOS SEO DO ARTIGO PRINCIPAL (Inicie o arquivo com este bloco YAML OBRIGATORIAMENTE):**
    ---
    seo_title: "[Título Focado em Dor/Cura] | Vibesfilm (Max 60 chars)"
    meta_description: "[Resumo do artigo pilar para o Google | Max 160 chars. JAMAIS USE HTML AQUI]"
    excerpt_1: "[Resumo curto para chamadas em destaque. TEXTO PURO, SEM HTML]"
    excerpt_2: "[Resumo alternativo focado na proposta de valor. TEXTO PURO, SEM HTML]"
    ---

    # Cinema e Cura: 6 Filmes que nos Ajudam a Processar o Luto

    **Introdução Empática** (2-3 parágrafos)
    - Comece reconhecendo a dor do luto ("Se o coração está pesado...").
    - Apresente o cinema como um espaço seguro para validar sentimentos.

    **Seção: Quando as Palavras Faltam: O Valor do Cinema no Luto**
    - Explique brevemente como ver a dor do outro na tela pode gerar catarse.

    **A Lista (As Jóias da Cura)**
    Para CADA UM dos 6 filmes, a estrutura DEVE SER EXATAMENTE ASSIM:

    <!-- Bloco de Metadados Individual para o Filme Abaixo -->
    ---
    seo_title: "${moviesData[0]?.title || 'Filme'}: [Foco do Luto no Filme] | Vibesfilm"
    meta_description: "[Minissinopse SEO deste filme em específico. SEM HTML]"
    excerpt_1: "[Resumo Vibe 1. TEXTO PURO]"
    excerpt_2: "[Resumo Vibe 2. TEXTO PURO]"
    ---

    ### 1. **[Título do Filme] ([Ano])**
    
    **Resumo Emocional**: Escreva 1 parágrafo focado em *como* o personagem lida com a perda usando os dados de "Vibe Principal" e "Hook Emocional". 
    **REQUISITO OBRIGATÓRIO AQUI:** Sempre que citar o nome de um ATOR ou DIRETOR listado no "Diretório de Links IMDb" no final da requisição, você deve OBRIGATORIAMENTE substituí-lo pelo formato de âncora completo informado. Exemplo correto: "<a href="URL" target="_blank" rel="noopener noreferrer">Jessie Buckley</a> transmite a dor crua...".
    
    **A Vibe de Cura**: Uma frase final destacando o que esse filme ensina (ex: "Ensina que é ok não estar ok").
    
    <p>📖 <a href="/blog/artigo/[Slug do Filme da requisição]">Análise emocional completa de [Título do Filme]</a></p>
    <p>🎬 <a href="/onde-assistir/[Slug do Filme da requisição]">Onde Assistir Agora</a></p>

    (Repita essa exata mesma estrutura, incluindo o bloco --- YAML --- antes do H3, para TODOS os 6 filmes listados).

    **Conclusão**
    - Fechamento acolhedor sobre o luto ser um processo não-linear.

    **DADOS DOS FILMES PARA A LISTA:**
    ${moviesContext}

    ${imdbLinksContext}

    **TOM DE VOZ:**
    Empático, profundo, acolhedor. Não use "magistral" nem "jargões exaustivos".
    `;

    // 3. Gerar com IA
    const aiProvider = createAIProvider(getDefaultConfig(providerStr as any));

    const response = await aiProvider.generateResponse(
      "Você é um especialista em cinema e psicologia rigoroso com regras de formatação HTML.",
      prompt,
      { maxTokens: 4000, temperature: 0.7 }
    );

    if (!response.success) {
      throw new Error(response.error);
    }

    // 4. Salvar
    const outputDir = path.join(__dirname, '../../generated_articles');
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    // Add suffix if deepseek
    const suffix = providerStr === 'deepseek' ? '_deepseek' : '';
    const filename = `pilar_luto_cinema_cura${suffix}.md`;
    const filePath = path.join(outputDir, filename);

    writeFileSync(filePath, response.content);

    console.log(`✅ Artigo Pilar gerado com sucesso: ${filePath}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateGriefPillarArticle();

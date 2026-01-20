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
    // 1. Buscar dados dos 6 filmes
    const moviesData = [];

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
          }
        }
      });

      if (!movie) {
        console.warn(`⚠️ Aviso: Filme "${title}" não encontrado no banco.`);
        continue;
      }

      const topSentiment = movie.movieSentiments[0];
      // Tenta pegar o hook (reason) da jornada triste, se não tiver, usa explanation do sentimento
      const hook = movie.movieSuggestionFlows[0]?.reason || topSentiment?.explanation || movie.description;

      moviesData.push({
        title: movie.title,
        year: movie.year,
        slug: movie.slug || movie.title.toLowerCase().replace(/ /g, '-'),
        vibe: topSentiment?.subSentiment?.name || 'Melancolia Profunda',
        hook: hook,
        synopsis: movie.description
      });
    }

    // 2. Preparar Contexto para IA
    const moviesContext = moviesData.map((m, i) => `
    ${i + 1}. **${m.title} (${m.year})**
    - Vibe Principal: ${m.vibe}
    - Hook Emocional (Banco de Dados): "${m.hook}"
    - Sinopse: ${m.synopsis}
    `).join('\n');

    const prompt = `
    Você é um redator sênior do blog "Vibesfilm".
    Escreva um "Artigo Pilar" (Lista) com o título: **"Cinema e Cura: 6 Filmes que nos Ajudam a Processar o Luto"**.

    **ESTRUTURA OBRIGATÓRIA:**

    **METADADOS SEO (CRUCIAL - Inicie o arquivo com este bloco YAML):**
    ---
    seo_title: "[Título Focado em Dor/Cura] | Vibesfilm (Max 60 chars)"
    meta_description: "[Resumo do artigo pilar para o Google | Max 160 chars]"
    excerpt_1: "[Resumo curto para chamadas em destaque]"
    excerpt_2: "[Resumo alternativo focado na proposta de valor]"
    ---

    # Cinema e Cura: 6 Filmes que nos Ajudam a Processar o Luto

    **Introdução Empática** (2-3 parágrafos)
    - Comece reconhecendo a dor do luto ("Se o coração está pesado...").
    - Apresente o cinema como um espaço seguro para validar sentimentos.
    - Use a filosofia Vibesfilm: "Filmes não apenas para assistir, mas para sentir e processar".

    **Seção: Quando as Palavras Faltam: O Valor do Cinema no Luto**
    - Explique brevemente como ver a dor do outro na tela pode gerar catarse e alívio.

    **A Lista (As Jóias da Cura)**
    Para cada um dos 6 filmes abaixo, escreva:
    1. **Título (Ano)** como H3.
    2. **Resumo Emocional**: 1 parágrafo focado NÃO no plot twist, mas em *como* o personagem lida com a perda. Use os dados de "Vibe Principal" e "Hook Emocional" fornecidos.
    3. **A Vibe de Cura**: Uma frase final destacando o que esse filme ensina (ex: "Ensina que é ok não estar ok").
    4. **CTAs**: 
       <p>📖 <a href="/blog/artigo/${moviesData[0].slug}">Análise emocional completa de ${moviesData[0].title}</a> - Explore a curadoria emocional completa e a "vibe" deste filme.</p>
       <p>🎬 <a href="/onde-assistir/${moviesData[0].slug}">Onde Assistir Agora</a> - Verifique a disponibilidade nos streamings e detalhes técnicos na nossa Landing Page.</p>
       (Adapte os links para cada filme).

    **Conclusão**
    - Fechamento acolhedor sobre o luto ser um processo não-linear.
    - Convite para baixar o App Vibesfilm.

    **FILMES:**
    ${moviesContext}

    **TOM DE VOZ:**
    Empático, profundo, acolhedor, mas analítico. Português do Brasil.
    Use formatação Markdown (negrito, H2, H3).
    `;

    // 3. Gerar com IA
    const aiProvider = createAIProvider(getDefaultConfig(providerStr as any));

    const response = await aiProvider.generateResponse(
      "Você é um especialista em cinema e psicologia.",
      prompt,
      { maxTokens: 3000, temperature: 0.7 }
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

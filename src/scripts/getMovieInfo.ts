/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TagInfo {
  name: string;
  explanation: string | null;
}

async function getMovieInfo(title: string, year: number, journeyOptionFlowId: number) {
  try {
    // 1. Buscar o filme
    const movie = await prisma.movie.findFirst({
      where: {
        title: title,
        year: year
      },
      select: {
        id: true,
        title: true,
        year: true,
        landingPageHook: true,
        targetAudienceForLP: true,
        description: true
      }
    });

    if (!movie) {
      console.error(`❌ Filme não encontrado: ${title} (${year})`);
      return;
    }

    // 2. Buscar JourneyOptionFlow
    const journeyOptionFlow = await prisma.journeyOptionFlow.findUnique({
      where: {
        id: journeyOptionFlowId
      },
      select: {
        text: true
      }
    });

    if (!journeyOptionFlow) {
      console.error(`❌ Jornada não encontrada: ID ${journeyOptionFlowId}`);
      return;
    }

    // 3. Buscar MovieSuggestionFlow
    const movieSuggestionFlow = await prisma.movieSuggestionFlow.findFirst({
      where: {
        movieId: movie.id,
        journeyOptionFlowId: journeyOptionFlowId
      },
      select: {
        reason: true
      }
    });

    if (!movieSuggestionFlow) {
      console.error(`❌ Sugestão não encontrada para o filme ${title} (${year}) e jornada ${journeyOptionFlowId}`);
      return;
    }

    // 4. Buscar Tags Emocionais
    // Primeiro, tentar buscar via JourneyOptionFlowSubSentiment
    const journeySubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
      where: {
        journeyOptionFlowId: journeyOptionFlowId
      },
      select: {
        subSentimentId: true
      }
    });

    let tags: TagInfo[] = [];

    if (journeySubSentiments.length > 0) {
      // Buscar MovieSentiments do filme que correspondem aos subSentimentIds da jornada
      const subSentimentIds = journeySubSentiments.map(j => j.subSentimentId);
      
      const movieSentiments = await prisma.movieSentiment.findMany({
        where: {
          movieId: movie.id,
          subSentimentId: { in: subSentimentIds }
        },
        include: {
          subSentiment: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          relevance: 'desc'
        }
      });

      // Mapear tags e remover duplicatas mantendo apenas a primeira ocorrência (mais relevante)
      // Listar TODOS os subsentimentos relacionados à jornada, não apenas os 4 mais relevantes
      const uniqueTagsMap = new Map<string, TagInfo>();
      for (const ms of movieSentiments) {
        const tagName = ms.subSentiment.name;
        if (!uniqueTagsMap.has(tagName)) {
          uniqueTagsMap.set(tagName, {
            name: tagName,
            explanation: ms.explanation
          });
        }
      }
      tags = Array.from(uniqueTagsMap.values()); // Removido .slice(0, 4) para listar todos
    }

    // Se não encontrou tags relacionadas à jornada, buscar todas as mais relevantes do filme
    if (tags.length === 0) {
      const movieSentiments = await prisma.movieSentiment.findMany({
        where: {
          movieId: movie.id
        },
        include: {
          subSentiment: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          relevance: 'desc'
        }
        // Removido take: 4 para buscar todos
      });

      // Mapear tags e remover duplicatas mantendo apenas a primeira ocorrência (mais relevante)
      const uniqueTagsMapFallback = new Map<string, TagInfo>();
      for (const ms of movieSentiments) {
        const tagName = ms.subSentiment.name;
        if (!uniqueTagsMapFallback.has(tagName)) {
          uniqueTagsMapFallback.set(tagName, {
            name: tagName,
            explanation: ms.explanation
          });
        }
      }
      tags = Array.from(uniqueTagsMapFallback.values()); // Removido .slice(0, 4) para listar todos
    }

    // Remover duplicatas mantendo apenas a primeira ocorrência (mais relevante)
    const uniqueTags = new Map<string, TagInfo>();
    for (const tag of tags) {
      if (!uniqueTags.has(tag.name)) {
        uniqueTags.set(tag.name, tag);
      }
    }
    tags = Array.from(uniqueTags.values());

    // Ordenar tags por relevância (descendente) - manter ordem original que já vem ordenada por relevance desc
    // Não ordenar alfabeticamente para manter a ordem de relevância

    // Formatar e exibir a saída (formato copiável/colável)
    console.log(`Título: ${movie.title} (${movie.year || 'N/A'})`);
    console.log('');
    console.log(`Texto da opção de escolha: ${journeyOptionFlow.text}`);
    console.log('');
    console.log(`Razão: ${movieSuggestionFlow.reason}`);
    console.log('');
    
    if (movie.landingPageHook) {
      console.log(`Qual a Vibe: ${movie.landingPageHook}`);
    } else {
      console.log(`Qual a Vibe: [NÃO DEFINIDO]`);
    }
    console.log('');
    
    if (movie.targetAudienceForLP) {
      console.log(`Para Quem o Vibesfilm Recomenda: ${movie.targetAudienceForLP}`);
    } else {
      console.log(`Para Quem o Vibesfilm Recomenda: [NÃO DEFINIDO]`);
    }
    console.log('');
    
    if (movie.description) {
      console.log(`Sinopse: ${movie.description}`);
    } else {
      console.log(`Sinopse: [NÃO DEFINIDO]`);
    }
    console.log('');
    
    if (tags.length > 0) {
      const tagsText = tags.map(tag => tag.name).join(', ');
      console.log(`Tags Emocionais: ${tagsText}`);
      
      // Explicações das tags (informação adicional)
      const tagsWithExplanation = tags.filter(tag => tag.explanation && tag.explanation.trim() !== '');
      if (tagsWithExplanation.length > 0) {
        console.log('');
        tagsWithExplanation.forEach(tag => {
          console.log(`${tag.name}: ${tag.explanation}`);
        });
      }
    } else {
      console.log(`Tags Emocionais: [NENHUMA TAG ENCONTRADA]`);
    }

  } catch (error) {
    console.error('❌ Erro ao buscar informações do filme:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Função para processar argumentos da linha de comando
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: any = {};

  args.forEach(arg => {
    if (arg.startsWith('--title=')) {
      parsed.title = arg.split('=')[1].replace(/^["']|["']$/g, '');
    } else if (arg.startsWith('--year=')) {
      parsed.year = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--journeyOptionFlowId=')) {
      parsed.journeyOptionFlowId = parseInt(arg.split('=')[1]);
    }
  });

  if (!parsed.title || !parsed.year || !parsed.journeyOptionFlowId) {
    console.log('❌ Uso: npx ts-node src/scripts/getMovieInfo.ts --title="Nome do Filme" --year=2024 --journeyOptionFlowId=81');
    process.exit(1);
  }

  return parsed;
}

// Execução do script
async function main() {
  const args = parseArgs();
  await getMovieInfo(args.title, args.year, args.journeyOptionFlowId);
}

if (require.main === module) {
  main();
}


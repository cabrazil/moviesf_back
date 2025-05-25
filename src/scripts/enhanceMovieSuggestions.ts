import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface SuggestionAnalysis {
  movieId: string;
  title: string;
  mainSentimentId: number;
  mainSentimentName: string;
  subSentimentId: number;
  subSentimentName: string;
  currentRelevance: number;
  suggestedRelevance: number;
  keywords: string[];
  matchingKeywords: string[];
  reason: string;
}

async function analyzeSuggestion(
  suggestion: any,
  mainSentiment: any,
  subSentiment: any
): Promise<SuggestionAnalysis> {
  const movie = await prisma.movie.findUnique({
    where: { id: suggestion.movieId }
  });

  if (!movie) {
    throw new Error(`Filme não encontrado: ${suggestion.movieId}`);
  }

  // Buscar sentimentos do filme
  const movieSentiments = await prisma.movieSentiment.findMany({
    where: { movieId: movie.id },
    include: {
      mainSentiment: true,
      subSentiment: true
    }
  });

  // Verificar correspondência de sentimentos
  const hasMainSentiment = movieSentiments.some(
    ms => ms.mainSentimentId === mainSentiment.id
  );
  const hasSubSentiment = movieSentiments.some(
    ms => ms.subSentimentId === subSentiment.id
  );

  // Calcular relevância base
  let suggestedRelevance = suggestion.relevance;

  // Aumentar relevância se tiver correspondência de sentimentos
  if (hasMainSentiment) suggestedRelevance += 2;
  if (hasSubSentiment) suggestedRelevance += 1;

  // Verificar correspondência de keywords
  const mainSentimentKeywords = mainSentiment.keywords || [];
  const subSentimentKeywords = subSentiment.keywords || [];
  const movieKeywords = movie.keywords || [];

  const matchingKeywords = movieKeywords.filter(keyword => 
    mainSentimentKeywords.includes(keyword) || 
    subSentimentKeywords.includes(keyword)
  );

  // Ajustar relevância baseado em keywords
  suggestedRelevance += matchingKeywords.length;

  // Limitar relevância máxima a 10
  suggestedRelevance = Math.min(suggestedRelevance, 10);

  return {
    movieId: movie.id,
    title: movie.title,
    mainSentimentId: mainSentiment.id,
    mainSentimentName: mainSentiment.name,
    subSentimentId: subSentiment.id,
    subSentimentName: subSentiment.name,
    currentRelevance: suggestion.relevance,
    suggestedRelevance,
    keywords: movieKeywords,
    matchingKeywords,
    reason: suggestion.reason
  };
}

async function enhanceMovieSuggestions() {
  console.log('Iniciando aprimoramento das sugestões de filmes...');

  try {
    // Criar diretório de relatórios se não existir
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Timestamp para o nome do arquivo
    const timestamp = new Date().toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');

    const reportPath = path.join(reportsDir, `suggestions-enhancement-${timestamp}.txt`);
    const reportStream = fs.createWriteStream(reportPath);

    // Buscar todas as opções de fluxo que têm sugestões de filmes
    const journeyOptions = await prisma.journeyOptionFlow.findMany({
      where: {
        movieSuggestions: {
          some: {}
        }
      },
      include: {
        movieSuggestions: true,
        journeyStepFlow: {
          include: {
            journeyFlow: {
              include: {
                mainSentiment: true
              }
            }
          }
        },
        associatedSubSentiment: true
      }
    });

    console.log(`Encontradas ${journeyOptions.length} opções de fluxo com sugestões`);

    let totalSuggestions = 0;
    let updatedSuggestions = 0;
    let newSuggestions = 0;

    for (const option of journeyOptions) {
      const mainSentiment = option.journeyStepFlow.journeyFlow.mainSentiment;
      const subSentiment = option.associatedSubSentiment;

      if (!mainSentiment || !subSentiment) {
        console.log(`⚠️ Opção ${option.id} não tem sentimento principal ou secundário associado`);
        continue;
      }

      reportStream.write(`\n=== Opção ${option.id}: ${option.text} ===\n`);
      reportStream.write(`Sentimento Principal: ${mainSentiment.name}\n`);
      reportStream.write(`Sentimento Secundário: ${subSentiment.name}\n\n`);

      // Analisar sugestões existentes
      for (const suggestion of option.movieSuggestions) {
        totalSuggestions++;
        
        try {
          const analysis = await analyzeSuggestion(suggestion, mainSentiment, subSentiment);
          
          reportStream.write(`Filme: ${analysis.title}\n`);
          reportStream.write(`Relevância Atual: ${analysis.currentRelevance}\n`);
          reportStream.write(`Relevância Sugerida: ${analysis.suggestedRelevance}\n`);
          reportStream.write(`Keywords Correspondentes: ${analysis.matchingKeywords.join(', ')}\n`);
          reportStream.write(`Razão: ${analysis.reason}\n\n`);

          // Atualizar relevância se necessário
          if (analysis.suggestedRelevance !== analysis.currentRelevance) {
            await prisma.movieSuggestionFlow.update({
              where: { id: suggestion.id },
              data: { relevance: analysis.suggestedRelevance }
            });
            updatedSuggestions++;
          }
        } catch (error) {
          console.error(`Erro ao analisar sugestão ${suggestion.id}:`, error);
          reportStream.write(`❌ Erro ao analisar sugestão: ${error}\n\n`);
        }
      }

      // Buscar filmes adicionais que podem ser relevantes
      const relevantMovies = await prisma.movie.findMany({
        where: {
          AND: [
            {
              movieSentiments: {
                some: {
                  AND: [
                    { mainSentimentId: mainSentiment.id },
                    { subSentimentId: subSentiment.id }
                  ]
                }
              }
            },
            {
              movieSuggestionFlows: {
                none: {
                  journeyOptionFlowId: option.id
                }
              }
            }
          ]
        },
        include: {
          movieSentiments: {
            include: {
              mainSentiment: true,
              subSentiment: true
            }
          }
        }
      });

      // Adicionar novas sugestões para filmes relevantes
      for (const movie of relevantMovies) {
        const matchingKeywords = movie.keywords.filter(keyword => 
          mainSentiment.keywords.includes(keyword) || 
          subSentiment.keywords.includes(keyword)
        );

        if (matchingKeywords.length > 0) {
          const relevance = Math.min(3 + matchingKeywords.length, 10);
          
          await prisma.movieSuggestionFlow.create({
            data: {
              journeyOptionFlowId: option.id,
              movieId: movie.id,
              reason: `Sugestão baseada em correspondência de keywords: ${matchingKeywords.join(', ')}`,
              relevance
            }
          });

          reportStream.write(`✅ Nova sugestão adicionada:\n`);
          reportStream.write(`Filme: ${movie.title}\n`);
          reportStream.write(`Relevância: ${relevance}\n`);
          reportStream.write(`Keywords Correspondentes: ${matchingKeywords.join(', ')}\n\n`);

          newSuggestions++;
        }
      }
    }

    // Resumo final
    const summary = `\n=== Resumo do Aprimoramento ===\nTotal de sugestões analisadas: ${totalSuggestions}\nSugestões atualizadas: ${updatedSuggestions}\nNovas sugestões adicionadas: ${newSuggestions}\nRelatório salvo em: ${reportPath}\n`;

    console.log(summary);
    reportStream.write(summary);
    reportStream.end();

  } catch (error) {
    console.error('Erro durante o aprimoramento:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
enhanceMovieSuggestions(); 
import { MovieAnalysisService } from '../services/movieAnalysisService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const movieAnalysisService = new MovieAnalysisService();

async function testMovieAnalysis() {
  try {
    console.log('Iniciando teste de análise de filmes...');
    
    // Buscar um filme do banco de dados
    const movie = await prisma.movie.findFirst({
      include: {
        movieSentiment: {
          include: {
            mainSentiment: true,
            subSentiment: true
          }
        }
      }
    });

    console.log('Resultado da busca:', movie ? 'Filme encontrado' : 'Nenhum filme encontrado');

    if (!movie) {
      console.log('Nenhum filme encontrado no banco de dados');
      return;
    }

    console.log(`\nAnalisando o filme: ${movie.title}`);
    console.log('ID do filme:', movie.id);
    console.log('Número de sentimentos:', movie.movieSentiment.length);
    
    console.log('\nSentimentos associados:');
    movie.movieSentiment.forEach(ms => {
      console.log(`- ${ms.subSentiment.name} (${ms.mainSentiment.name})`);
      console.log('  Keywords do sub-sentimento:', ms.subSentiment.keywords);
      console.log('  Keywords do sentimento principal:', ms.mainSentiment.keywords);
    });

    console.log('\nBuscando análises...');
    
    const analyses = await movieAnalysisService.getMovieAnalyses(movie.id);

    console.log('\nResultados da análise:');
    console.log(`Total de análises encontradas: ${analyses.length}`);
    
    if (analyses.length > 0) {
      console.log('\nAnálises encontradas:');
      analyses.forEach((analysis, index) => {
        console.log(`\n${index + 1}. ${analysis.source} - ${analysis.author}`);
        console.log(`Score: ${analysis.score.toFixed(2)}%`);
        console.log(`Palavras-chave encontradas: ${analysis.matchedKeywords.join(', ')}`);
        console.log(`Data: ${analysis.date}`);
        console.log(`URL: ${analysis.url}`);
        console.log(`Conteúdo: ${analysis.content.substring(0, 200)}...`);
      });
    } else {
      console.log('Nenhuma análise encontrada');
    }

  } catch (error) {
    console.error('Erro ao testar análise de filmes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMovieAnalysis(); 
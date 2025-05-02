import { YouTubeAnalysisService } from '../services/youtubeAnalysisService';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Verificar se a chave de API está presente
console.log('Verificando configuração...');
console.log('YOUTUBE_API_KEY presente:', !!process.env.YOUTUBE_API_KEY);

const youtubeAnalysisService = new YouTubeAnalysisService();

async function testYouTubeAnalysis(channelUrl: string, language: string = 'pt-BR', maxVideos: number = 10) {
  try {
    console.log('Iniciando análise de conteúdo do YouTube...');
    console.log(`Idioma selecionado: ${language}`);
    console.log(`Número máximo de vídeos: ${maxVideos}`);
    
    console.log(`Analisando canal: ${channelUrl}`);
    
    const analyses = await youtubeAnalysisService.analyzeYouTubeContent(channelUrl, language, maxVideos);
    
    console.log('\nResultados da análise:');
    console.log(`Total de comentários analisados: ${analyses.length}`);
    
    if (analyses.length > 0) {
      console.log('\nAnálises encontradas:');
      analyses.forEach((analysis, index) => {
        if (analysis.score > 0) { // Mostrar apenas comentários com sentimentos detectados
          console.log(`\n${index + 1}. ${analysis.comment.author}`);
          console.log(`Score: ${analysis.score.toFixed(2)}%`);
          console.log(`Likes: ${analysis.comment.likeCount}`);
          console.log(`Data: ${new Date(analysis.comment.publishedAt).toLocaleDateString()}`);
          console.log(`Palavras-chave encontradas: ${analysis.matchedKeywords.join(', ')}`);
          
          if (analysis.mainSentiments.length > 0) {
            console.log('Sentimentos principais:');
            analysis.mainSentiments.forEach(sentiment => {
              console.log(`- ${sentiment.name}: ${sentiment.score.toFixed(2)}%`);
            });
          }
          
          if (analysis.subSentiments.length > 0) {
            console.log('Sub-sentimentos:');
            analysis.subSentiments.forEach(sentiment => {
              console.log(`- ${sentiment.name}: ${sentiment.score.toFixed(2)}%`);
            });
          }
          
          console.log(`Conteúdo: ${analysis.comment.content.substring(0, 200)}...`);
        }
      });
    } else {
      console.log('Nenhuma análise encontrada');
    }

  } catch (error) {
    console.error('Erro ao testar análise do YouTube:', error);
  }
}

// Obter argumentos da linha de comando
const args = process.argv.slice(2);
const channelUrl = args[0] || 'https://www.youtube.com/@IsabelaBoscov';
const language = args[1] || 'pt-BR';
const maxVideos = parseInt(args[2]) || 10;

testYouTubeAnalysis(channelUrl, language, maxVideos); 
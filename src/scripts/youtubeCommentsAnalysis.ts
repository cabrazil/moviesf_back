import axios from 'axios';
import { PrismaClient, MainSentiment, SubSentiment } from '@prisma/client';
import fs from 'fs';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

interface Comment {
  videoId: string;
  videoTitle: string;
  commentId: string;
  author: string;
  text: string;
  publishedAt: string;
  likeCount: number;
  matchedKeywords: string[];
  mainSentiment: string;
  subSentiments: string[];
}

interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      publishedAt: string;
    };
  }>;
}

interface YouTubeCommentResponse {
  items: Array<{
    id: string;
    snippet: {
      topLevelComment: {
        snippet: {
          authorDisplayName: string;
          textOriginal: string;
          publishedAt: string;
          likeCount: number;
        };
      };
    };
  }>;
}

interface PrismaQuery {
  include: {
    subSentiments: boolean;
  };
  where?: {
    id: number;
  };
}

interface MainSentimentWithSubs extends MainSentiment {
  subSentiments: SubSentiment[];
}

async function getSentimentKeywords(mainSentimentId?: number) {
  try {
    const query: PrismaQuery = {
      include: {
        subSentiments: true
      }
    };

    if (mainSentimentId) {
      query.where = { id: mainSentimentId };
    }

    const mainSentiments = await prisma.mainSentiment.findMany(query) as MainSentimentWithSubs[];
    
    const keywordsMap = new Map<string, string[]>();
    
    for (const main of mainSentiments) {
      // Adiciona palavras-chave do sentimento principal
      keywordsMap.set(main.name, main.keywords);
      
      // Adiciona palavras-chave dos sub-sentimentos
      for (const sub of main.subSentiments) {
        keywordsMap.set(sub.name, sub.keywords);
      }
    }
    
    return keywordsMap;
  } catch (error) {
    console.error('Erro ao buscar palavras-chave:', error);
    return new Map<string, string[]>();
  }
}

function hasMatchingKeywords(text: string, keywords: string[]): string[] {
  const matches: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matches.push(keyword);
    }
  }
  
  return matches;
}

async function getChannelVideos(apiKey: string, channelId: string) {
  try {
    const response = await axios.get<YouTubeSearchResponse>('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        channelId: channelId,
        maxResults: 50,
        order: 'date',
        type: 'video',
        key: apiKey
      }
    });

    return response.data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt
    }));
  } catch (error) {
    if (error instanceof Error) {
      console.error('Erro ao buscar vídeos:', error.message);
    } else {
      console.error('Erro ao buscar vídeos:', error);
    }
    return [];
  }
}

async function getVideoComments(apiKey: string, videoId: string, videoTitle: string, keywordsMap: Map<string, string[]>) {
  try {
    const response = await axios.get<YouTubeCommentResponse>('https://www.googleapis.com/youtube/v3/commentThreads', {
      params: {
        part: 'snippet',
        videoId: videoId,
        maxResults: 100,
        key: apiKey
      }
    });

    const comments: Comment[] = [];
    
    for (const item of response.data.items) {
      const comment = item.snippet.topLevelComment.snippet;
      const text = comment.textOriginal;
      
      // Verifica correspondência com cada conjunto de palavras-chave
      const matchedKeywords: string[] = [];
      const matchedMainSentiments: string[] = [];
      const matchedSubSentiments: string[] = [];
      
      for (const [sentiment, keywords] of keywordsMap.entries()) {
        const matches = hasMatchingKeywords(text, keywords);
        if (matches.length > 0) {
          matchedKeywords.push(...matches);
          if (keywordsMap.has(sentiment)) {
            matchedMainSentiments.push(sentiment);
          } else {
            matchedSubSentiments.push(sentiment);
          }
        }
      }
      
      // Se encontrou alguma correspondência, adiciona o comentário
      if (matchedKeywords.length > 0) {
        comments.push({
          videoId,
          videoTitle,
          commentId: item.id,
          author: comment.authorDisplayName,
          text,
          publishedAt: comment.publishedAt,
          likeCount: comment.likeCount,
          matchedKeywords,
          mainSentiment: matchedMainSentiments[0] || '',
          subSentiments: matchedSubSentiments
        });
      }
    }
    
    return comments;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Erro ao buscar comentários do vídeo ${videoId}:`, error.message);
    } else {
      console.error(`Erro ao buscar comentários do vídeo ${videoId}:`, error);
    }
    return [];
  }
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = 'UCC1QUJZGfqrSGwwYXvZhqig';
  
  // Verifica se o ID do sentimento foi fornecido e é válido
  const mainSentimentId = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  if (mainSentimentId && isNaN(mainSentimentId)) {
    console.error('O ID do sentimento deve ser um número válido.');
    process.exit(1);
  }

  const outputFile = `comentarios_sentimento${mainSentimentId ? `_${mainSentimentId}` : ''}.json`;

  if (!apiKey) {
    console.error('API key do YouTube não encontrada. Configure a variável de ambiente YOUTUBE_API_KEY.');
    process.exit(1);
  }

  try {
    console.log('Buscando palavras-chave de sentimento...');
    const keywordsMap = await getSentimentKeywords(mainSentimentId);
    
    if (keywordsMap.size === 0) {
      console.error('Nenhuma palavra-chave encontrada para análise.');
      process.exit(1);
    }

    console.log('Buscando vídeos do canal...');
    const videos = await getChannelVideos(apiKey, channelId);
    console.log(`Encontrados ${videos.length} vídeos`);

    const allComments: Comment[] = [];
    for (const video of videos) {
      console.log(`Processando vídeo: ${video.title}`);
      const comments = await getVideoComments(apiKey, video.videoId, video.title, keywordsMap);
      allComments.push(...comments);
      
      // Pequena pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Salva os comentários em um arquivo JSON
    fs.writeFileSync(outputFile, JSON.stringify(allComments, null, 2));
    console.log(`\nAnálise concluída!`);
    console.log(`Total de comentários com palavras-chave de sentimento: ${allComments.length}`);
    console.log(`Resultados salvos em: ${outputFile}`);

  } catch (error) {
    if (error instanceof Error) {
      console.error('Erro na execução:', error.message);
    } else {
      console.error('Erro na execução:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Verifica se o script está sendo executado diretamente
if (require.main === module) {
  main().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
} 
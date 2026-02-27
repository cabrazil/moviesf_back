import axios from 'axios';
import { SubSentiment, MainSentiment } from '@prisma/client';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

import { prismaApp as prisma } from '../prisma';
const cache = new NodeCache({ stdTTL: 3600 }); // Cache por 1 hora

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YouTubeComment {
  author: string;
  content: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
}

interface CommentAnalysis {
  comment: YouTubeComment;
  score: number;
  matchedKeywords: string[];
  mainSentiments: {
    name: string;
    score: number;
  }[];
  subSentiments: {
    name: string;
    score: number;
  }[];
}

interface YouTubeCommentResponse {
  items: {
    snippet: {
      topLevelComment: {
        snippet: {
          authorDisplayName: string;
          textDisplay: string;
          likeCount: number;
          publishedAt: string;
          updatedAt: string;
        };
      };
    };
  }[];
  nextPageToken?: string;
}

interface YouTubeVideoResponse {
  items: {
    id: {
      kind: string;
      videoId: string;
    };
  }[];
  nextPageToken?: string;
}

interface YouTubeChannelSearchResponse {
  items: {
    id: {
      channelId: string;
    };
  }[];
}

interface YouTubeChannelResponse {
  items: {
    id: string;
    snippet: {
      title: string;
      description: string;
    };
  }[];
}

export class YouTubeAnalysisService {
  private async extractYouTubeId(url: string): Promise<{ type: 'video' | 'channel', id: string } | null> {
    try {
      const urlObj = new URL(url);
      
      // Verifica se é URL de vídeo
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return { type: 'video', id: videoId };
      }
      
      // Verifica se é URL de canal
      const channelMatch = url.match(/youtube\.com\/(?:c\/|channel\/|@)([^\/\?]+)/);
      if (channelMatch) {
        return { type: 'channel', id: channelMatch[1] };
      }
      
      throw new Error('URL do YouTube inválida');
    } catch (error) {
      console.error('Erro ao extrair ID do YouTube:', error);
      return null;
    }
  }

  private async getChannelVideos(channelId: string, maxVideos: number = 10): Promise<string[]> {
    const cacheKey = `channel_videos_${channelId}`;
    const cached = cache.get<string[]>(cacheKey);
    if (cached) {
      console.log(`Cache hit para vídeos do canal ${channelId}`);
      return cached;
    }

    try {
      console.log(`Buscando vídeos do canal ID: ${channelId}`);
      const videos: string[] = [];
      let nextPageToken: string | undefined;

      do {
        const response = await axios.get<YouTubeVideoResponse>(`${YOUTUBE_BASE_URL}/search`, {
          params: {
            part: 'id',
            channelId: channelId,
            maxResults: 50,
            order: 'date',
            type: 'video',
            pageToken: nextPageToken,
            key: YOUTUBE_API_KEY
          }
        });

        console.log('Resposta da API de vídeos:', JSON.stringify(response.data, null, 2));

        const items = response.data.items;
        for (const item of items) {
          if (item.id && item.id.videoId) {
            videos.push(item.id.videoId);
            if (videos.length >= maxVideos) break;
          }
        }

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken && videos.length < maxVideos);

      cache.set(cacheKey, videos);
      return videos;
    } catch (error: any) {
      console.error('Erro detalhado ao buscar vídeos do canal:', error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Dados:', error.response.data);
      }
      return [];
    }
  }

  private async getVideoComments(videoId: string): Promise<YouTubeComment[]> {
    const cacheKey = `youtube_comments_${videoId}`;
    const cached = cache.get<YouTubeComment[]>(cacheKey);
    if (cached) {
      console.log(`Cache hit para comentários do vídeo ${videoId}`);
      return cached;
    }

    try {
      const comments: YouTubeComment[] = [];
      let nextPageToken: string | undefined;

      do {
        const response = await axios.get<YouTubeCommentResponse>(`${YOUTUBE_BASE_URL}/commentThreads`, {
          params: {
            part: 'snippet',
            videoId: videoId,
            maxResults: 100,
            pageToken: nextPageToken,
            key: YOUTUBE_API_KEY
          }
        });

        console.log('Resposta da API de comentários:', JSON.stringify(response.data, null, 2));

        const items = response.data.items;
        for (const item of items) {
          const comment = item.snippet.topLevelComment.snippet;
          comments.push({
            author: comment.authorDisplayName,
            content: comment.textDisplay,
            likeCount: comment.likeCount,
            publishedAt: comment.publishedAt,
            updatedAt: comment.updatedAt
          });
        }

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken && comments.length < 1000);

      cache.set(cacheKey, comments);
      return comments;
    } catch (error: any) {
      console.error('Erro ao buscar comentários do YouTube:', error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Dados:', error.response.data);
      }
      return [];
    }
  }

  private calculateSentimentScore(content: string, keywords: string[]): number {
    const words = content.toLowerCase().split(/\W+/);
    const matchedKeywords = keywords.filter(keyword => 
      words.includes(keyword.toLowerCase())
    );
    return (matchedKeywords.length / keywords.length) * 100;
  }

  private async getChannelIdByUsername(username: string): Promise<string | null> {
    try {
      console.log(`Tentando buscar canal para usuário: ${username}`);
      console.log(`Usando chave de API: ${YOUTUBE_API_KEY ? 'Presente' : 'Ausente'}`);
      
      // Primeiro, tenta buscar pelo nome de usuário usando a API de busca
      const response = await axios.get<YouTubeChannelSearchResponse>(`${YOUTUBE_BASE_URL}/search`, {
        params: {
          part: 'snippet',
          q: username,
          type: 'channel',
          maxResults: 1,
          key: YOUTUBE_API_KEY
        }
      });

      console.log('Resposta da API de busca:', JSON.stringify(response.data, null, 2));

      if (response.data.items && response.data.items.length > 0) {
        const channelId = response.data.items[0].id.channelId;
        console.log(`ID do canal encontrado: ${channelId}`);
        return channelId;
      }

      // Se não encontrar, tenta buscar pelo ID personalizado
      const responseById = await axios.get<YouTubeChannelResponse>(`${YOUTUBE_BASE_URL}/channels`, {
        params: {
          part: 'snippet',
          forUsername: username,
          key: YOUTUBE_API_KEY
        }
      });

      console.log('Resposta da API de canais:', JSON.stringify(responseById.data, null, 2));

      if (responseById.data.items && responseById.data.items.length > 0) {
        const channelId = responseById.data.items[0].id;
        console.log(`ID do canal encontrado (por ID): ${channelId}`);
        return channelId;
      }

      console.log('Nenhum canal encontrado');
      return null;
    } catch (error: any) {
      console.error('Erro ao buscar ID do canal:', error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Dados:', error.response.data);
      }
      return null;
    }
  }

  public async analyzeYouTubeContent(url: string, language: string = 'pt-BR', maxVideos: number = 10): Promise<CommentAnalysis[]> {
    try {
      // Extrair nome de usuário da URL
      const usernameMatch = url.match(/@([^\/]+)/);
      if (!usernameMatch) {
        throw new Error('URL do canal inválida');
      }

      const username = usernameMatch[1];
      console.log(`Buscando ID do canal para usuário: ${username}`);

      // Buscar ID do canal
      const channelId = await this.getChannelIdByUsername(username);
      if (!channelId) {
        throw new Error('Canal não encontrado ou não acessível');
      }

      console.log(`ID do canal encontrado: ${channelId}`);

      // Buscar vídeos do canal usando o ID correto
      const videoIds = await this.getChannelVideos(channelId, maxVideos);
      if (videoIds.length === 0) {
        throw new Error('Nenhum vídeo encontrado');
      }

      console.log(`Vídeos encontrados: ${videoIds.length}`);

      // Buscar todos os comentários dos vídeos
      const allComments: YouTubeComment[] = [];
      for (const videoId of videoIds) {
        const comments = await this.getVideoComments(videoId);
        allComments.push(...comments);
      }

      console.log(`Total de comentários encontrados: ${allComments.length}`);

      // Buscar todos os sentimentos do banco
      const mainSentiments = await prisma.mainSentiment.findMany({
        include: {
          subSentiments: true
        }
      });

      // Analisar cada comentário
      return allComments.map(comment => {
        const analysis: CommentAnalysis = {
          comment,
          score: 0,
          matchedKeywords: [],
          mainSentiments: [],
          subSentiments: []
        };

        // Analisar cada sentimento principal
        for (const mainSentiment of mainSentiments) {
          const mainScore = this.calculateSentimentScore(
            comment.content,
            mainSentiment.keywords
          );

          if (mainScore > 0) {
            analysis.mainSentiments.push({
              name: mainSentiment.name,
              score: mainScore
            });
          }

          // Analisar cada sub-sentimento
          for (const subSentiment of mainSentiment.subSentiments) {
            const subScore = this.calculateSentimentScore(
              comment.content,
              subSentiment.keywords
            );

            if (subScore > 0) {
              analysis.subSentiments.push({
                name: subSentiment.name,
                score: subScore
              });
            }
          }
        }

        // Calcular score total
        const allScores = [
          ...analysis.mainSentiments.map(s => s.score),
          ...analysis.subSentiments.map(s => s.score)
        ];
        analysis.score = allScores.length > 0 
          ? allScores.reduce((a, b) => a + b) / allScores.length 
          : 0;

        // Coletar todas as keywords encontradas
        analysis.matchedKeywords = [
          ...new Set([
            ...analysis.mainSentiments.flatMap(s => 
              mainSentiments.find(m => m.name === s.name)?.keywords || []
            ),
            ...analysis.subSentiments.flatMap(s => 
              mainSentiments.flatMap(m => 
                m.subSentiments.find(sub => sub.name === s.name)?.keywords || []
              )
            )
          ])
        ];

        return analysis;
      });
    } catch (error: any) {
      console.error('Erro ao analisar conteúdo do YouTube:', error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Dados:', error.response.data);
      }
      return [];
    }
  }
} 
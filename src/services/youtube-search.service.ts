import axios from 'axios';

interface YouTubeSearchResponse {
  items: Array<{
    snippet: {
      title: string;
      description: string;
    };
  }>;
}

// Mapeamento de títulos conhecidos
const KNOWN_TITLES: Record<string, string> = {
  'De Repente 30': '13 Going on 30',
  'Como Perder um Cara em 10 Dias': 'How to Lose a Guy in 10 Days',
  '10 Coisas que Eu Odeio em Você': '10 Things I Hate About You',
  'Diário de uma Paixão': 'The Notebook',
  'Simplesmente Amor': 'Love Actually',
  'O Diabo Veste Prada': 'The Devil Wears Prada',
  'Legalmente Loira': 'Legally Blonde',
  'O Senhor dos Anéis: A Sociedade do Anel': 'The Lord of the Rings: The Fellowship of the Ring',
  'Harry Potter e a Pedra Filosofal': 'Harry Potter and the Philosopher\'s Stone',
  'O Poderoso Chefão': 'The Godfather'
};

export class YouTubeSearchService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('YouTube API key not found in environment variables');
    }
  }

  async searchOriginalTitle(portugueseTitle: string): Promise<string | null> {
    try {
      // Primeiro, verificar se é um título conhecido
      if (KNOWN_TITLES[portugueseTitle]) {
        console.log(`Título original encontrado no mapeamento para "${portugueseTitle}": ${KNOWN_TITLES[portugueseTitle]}`);
        return KNOWN_TITLES[portugueseTitle];
      }

      // Se não for conhecido, buscar no YouTube
      const query = `${portugueseTitle} movie original title english`;
      
      const response = await axios.get<YouTubeSearchResponse>('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: this.apiKey,
          part: 'snippet',
          q: query,
          maxResults: 10,
          type: 'video',
          videoCategoryId: '1', // Categoria Filmes e Animação
          relevanceLanguage: 'en' // Priorizar resultados em inglês
        }
      });

      // Analisar os resultados para encontrar o título em inglês
      const results = response.data.items;
      
      for (const result of results) {
        const title = result.snippet.title;
        const description = result.snippet.description;
        const fullText = `${title}\n${description}`;

        // Padrões comuns para encontrar o título original
        const patterns = [
          /original title:?\s*"([^"]+)"/i,
          /original title:?\s*'([^']+)'/i,
          /original title:?\s*([^\(\).,]+)/i,
          /english title:?\s*"([^"]+)"/i,
          /english title:?\s*'([^']+)'/i,
          /english title:?\s*([^\(\).,]+)/i,
          /título original:?\s*"([^"]+)"/i,
          /título original:?\s*'([^']+)'/i,
          /título original:?\s*([^\(\).,]+)/i,
          /título em inglês:?\s*"([^"]+)"/i,
          /título em inglês:?\s*'([^']+)'/i,
          /título em inglês:?\s*([^\(\).,]+)/i,
          /\(([^\(\)]+)\)/i, // Título entre parênteses
          /\[([^\]]+)\]/i, // Título entre colchetes
          /"([^"]+)"/i, // Título entre aspas
          /'([^']+)'/i // Título entre aspas simples
        ];

        for (const pattern of patterns) {
          const match = fullText.match(pattern);
          if (match) {
            const originalTitle = match[1].trim();
            // Verificar se não é apenas um ano ou uma palavra comum
            if (!/^\d{4}$/.test(originalTitle) && 
                !/^(trailer|teaser|movie|film|official|legendado|dublado)$/i.test(originalTitle)) {
              console.log(`Título original encontrado para "${portugueseTitle}": ${originalTitle}`);
              return originalTitle;
            }
          }
        }
      }

      console.log(`Não foi possível encontrar o título original para "${portugueseTitle}"`);
      return null;
    } catch (error) {
      console.error('Erro ao buscar título original:', error);
      return null;
    }
  }
} 
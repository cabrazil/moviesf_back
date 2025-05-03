import axios from 'axios';

interface GoogleSearchResponse {
  items?: Array<{
    snippet: string;
  }>;
}

export class GoogleSearchService {
  private apiKey: string;
  private searchEngineId: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';

    if (!this.apiKey || !this.searchEngineId) {
      throw new Error('Google API credentials not found in environment variables');
    }
  }

  async searchOriginalTitle(portugueseTitle: string): Promise<string | null> {
    try {
      // Formatar a query para buscar o título original
      const query = `${portugueseTitle} filme título original`;
      
      const response = await axios.get<GoogleSearchResponse>('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.searchEngineId,
          q: query,
          num: 5 // Limitar a 5 resultados para análise
        }
      });

      // Analisar os resultados para encontrar o título em inglês
      const results = response.data.items || [];
      
      for (const result of results) {
        // Padrões comuns para encontrar o título original
        const patterns = [
          /título original:?\s*([^\(\)]+)/i,
          /original title:?\s*([^\(\)]+)/i,
          /título em inglês:?\s*([^\(\)]+)/i,
          /english title:?\s*([^\(\)]+)/i
        ];

        for (const pattern of patterns) {
          const match = result.snippet.match(pattern);
          if (match) {
            const originalTitle = match[1].trim();
            console.log(`Título original encontrado para "${portugueseTitle}": ${originalTitle}`);
            return originalTitle;
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
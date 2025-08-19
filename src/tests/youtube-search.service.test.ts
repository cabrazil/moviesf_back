import { YouTubeSearchService } from '../services/youtube-search.service';
import axios from 'axios';

// Mock do axios para controlar as respostas da API
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('YouTubeSearchService', () => {
  let youtubeService: YouTubeSearchService;

  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();
    youtubeService = new YouTubeSearchService();
  });

  describe('Constructor', () => {
    it('deve criar uma instância com a chave da API', () => {
      expect(youtubeService).toBeInstanceOf(YouTubeSearchService);
    });

    it('deve lançar erro se a chave da API não estiver configurada', () => {
      const originalEnv = process.env.YOUTUBE_API_KEY;
      delete process.env.YOUTUBE_API_KEY;
      
      expect(() => new YouTubeSearchService()).toThrow('YouTube API key not found in environment variables');
      
      // Restaurar a variável de ambiente
      if (originalEnv) {
        process.env.YOUTUBE_API_KEY = originalEnv;
      }
    });
  });

  describe('searchOriginalTitle - Títulos Conhecidos', () => {
    it('deve retornar título original para "De Repente 30"', async () => {
      const result = await youtubeService.searchOriginalTitle('De Repente 30');
      expect(result).toBe('13 Going on 30');
    });

    it('deve retornar título original para "Como Perder um Cara em 10 Dias"', async () => {
      const result = await youtubeService.searchOriginalTitle('Como Perder um Cara em 10 Dias');
      expect(result).toBe('How to Lose a Guy in 10 Days');
    });

    it('deve retornar título original para "10 Coisas que Eu Odeio em Você"', async () => {
      const result = await youtubeService.searchOriginalTitle('10 Coisas que Eu Odeio em Você');
      expect(result).toBe('10 Things I Hate About You');
    });

    it('deve retornar título original para "Diário de uma Paixão"', async () => {
      const result = await youtubeService.searchOriginalTitle('Diário de uma Paixão');
      expect(result).toBe('The Notebook');
    });

    it('deve retornar título original para "Simplesmente Amor"', async () => {
      const result = await youtubeService.searchOriginalTitle('Simplesmente Amor');
      expect(result).toBe('Love Actually');
    });

    it('deve retornar título original para "O Diabo Veste Prada"', async () => {
      const result = await youtubeService.searchOriginalTitle('O Diabo Veste Prada');
      expect(result).toBe('The Devil Wears Prada');
    });

    it('deve retornar título original para "Legalmente Loira"', async () => {
      const result = await youtubeService.searchOriginalTitle('Legalmente Loira');
      expect(result).toBe('Legally Blonde');
    });

    it('deve retornar título original para "O Senhor dos Anéis: A Sociedade do Anel"', async () => {
      const result = await youtubeService.searchOriginalTitle('O Senhor dos Anéis: A Sociedade do Anel');
      expect(result).toBe('The Lord of the Rings: The Fellowship of the Ring');
    });

    it('deve retornar título original para "Harry Potter e a Pedra Filosofal"', async () => {
      const result = await youtubeService.searchOriginalTitle('Harry Potter e a Pedra Filosofal');
      expect(result).toBe('Harry Potter and the Philosopher\'s Stone');
    });

    it('deve retornar título original para "O Poderoso Chefão"', async () => {
      const result = await youtubeService.searchOriginalTitle('O Poderoso Chefão');
      expect(result).toBe('The Godfather');
    });
  });

  describe('searchOriginalTitle - Busca na API', () => {
    it('deve buscar título original na API quando não for um título conhecido', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review: "The Matrix" (1999) - Original Title Found',
                description: 'This movie was originally titled "The Matrix" in English. Great sci-fi film!'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('Matrix');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/youtube/v3/search',
        {
          params: {
            key: process.env.YOUTUBE_API_KEY,
            part: 'snippet',
            q: 'Matrix movie original title english',
            maxResults: 10,
            type: 'video',
            videoCategoryId: '1',
            relevanceLanguage: 'en'
          }
        }
      );

      expect(result).toBe('The Matrix');
    });

    it('deve encontrar título original usando padrão "original title:"', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review',
                description: 'This film has original title: "Inception" and it\'s amazing!'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('A Origem');

      expect(result).toBe('Inception');
    });

    it('deve encontrar título original usando padrão "english title:"', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review',
                description: 'English title: "Interstellar" - This movie is incredible!'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('Interestelar');

      expect(result).toBe('Interstellar');
    });

    it('deve encontrar título original usando padrão "título original:"', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review',
                description: 'Título original: "The Dark Knight" - Este filme é incrível!'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('Batman: O Cavaleiro das Trevas');

      expect(result).toBe('The Dark Knight');
    });

    it('deve encontrar título original usando padrão entre parênteses', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review (Pulp Fiction) - Great Film!',
                description: 'This movie is amazing'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('Tempo de Violência');

      expect(result).toBe('Pulp Fiction');
    });

    it('deve encontrar título original usando padrão entre aspas', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review',
                description: 'This film is called "Fight Club" and it\'s amazing!'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('Clube da Luta');

      expect(result).toBe('Fight Club');
    });

    it('deve ignorar anos (4 dígitos) como títulos originais', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review',
                description: 'This film was released in 1994 and original title: "Forrest Gump"'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('Forrest Gump');

      expect(result).toBe('Forrest Gump');
    });

    it('deve ignorar palavras comuns como "trailer", "movie", etc.', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review',
                description: 'This trailer shows the movie "The Shawshank Redemption"'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('Um Sonho de Liberdade');

      expect(result).toBe('The Shawshank Redemption');
    });

    it('deve retornar null quando não encontrar título original', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Random Video Title',
                description: 'This video has no movie title information'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('Filme Inexistente');

      expect(result).toBeNull();
    });

    it('deve retornar null quando a API retornar lista vazia', async () => {
      const mockResponse = {
        data: {
          items: []
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('Filme Inexistente');

      expect(result).toBeNull();
    });
  });

  describe('searchOriginalTitle - Tratamento de Erros', () => {
    it('deve retornar null quando a API retornar erro', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const result = await youtubeService.searchOriginalTitle('Filme Teste');

      expect(result).toBeNull();
    });

    it('deve retornar null quando a API retornar erro de quota excedida', async () => {
      const mockError = {
        response: {
          status: 403,
          data: {
            error: {
              message: 'Quota exceeded'
            }
          }
        }
      };

      mockedAxios.get.mockRejectedValue(mockError);

      const result = await youtubeService.searchOriginalTitle('Filme Teste');

      expect(result).toBeNull();
    });

    it('deve retornar null quando a API retornar erro de chave inválida', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            error: {
              message: 'API key not valid'
            }
          }
        }
      };

      mockedAxios.get.mockRejectedValue(mockError);

      const result = await youtubeService.searchOriginalTitle('Filme Teste');

      expect(result).toBeNull();
    });
  });

  describe('searchOriginalTitle - Casos Especiais', () => {
    it('deve lidar com títulos que contêm caracteres especiais', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review',
                description: 'Original title: "Léon: The Professional" - Great film!'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('Léon: O Profissional');

      expect(result).toBe('Léon: The Professional');
    });

    it('deve lidar com títulos que contêm números', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review',
                description: 'Original title: "12 Angry Men" - Classic film!'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('12 Homens e uma Sentença');

      expect(result).toBe('12 Angry Men');
    });

    it('deve lidar com títulos que contêm múltiplos padrões', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              snippet: {
                title: 'Movie Review',
                description: 'This film has original title: "The Silence of the Lambs" and english title: "The Silence of the Lambs"'
              }
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await youtubeService.searchOriginalTitle('O Silêncio dos Inocentes');

      expect(result).toBe('The Silence of the Lambs');
    });
  });
});

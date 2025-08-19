import { YouTubeSearchService } from '../services/youtube-search.service';

// Teste manual para verificar se a API do YouTube está funcionando corretamente
// Este teste faz chamadas reais para a API do YouTube
describe('YouTube API - Teste Manual (Tempo Real)', () => {
  let youtubeService: YouTubeSearchService;

  beforeAll(() => {
    // Verificar se a chave da API está configurada
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY não está configurada no arquivo .env');
    }
    
    youtubeService = new YouTubeSearchService();
  });

  describe('Testes de Títulos Conhecidos (Cache Local)', () => {
    it('deve retornar título original para "De Repente 30" sem fazer chamada à API', async () => {
      const startTime = Date.now();
      const result = await youtubeService.searchOriginalTitle('De Repente 30');
      const endTime = Date.now();
      
      expect(result).toBe('13 Going on 30');
      expect(endTime - startTime).toBeLessThan(100); // Deve ser muito rápido (cache local)
    }, 10000);

    it('deve retornar título original para "O Poderoso Chefão" sem fazer chamada à API', async () => {
      const startTime = Date.now();
      const result = await youtubeService.searchOriginalTitle('O Poderoso Chefão');
      const endTime = Date.now();
      
      expect(result).toBe('The Godfather');
      expect(endTime - startTime).toBeLessThan(100); // Deve ser muito rápido (cache local)
    }, 10000);
  });

  describe('Testes de Busca na API (Tempo Real)', () => {
    it('deve buscar título original para "Matrix" na API do YouTube', async () => {
      const result = await youtubeService.searchOriginalTitle('Matrix');
      
      // Pode retornar "The Matrix" ou null dependendo dos resultados da API
      expect(result).toBeTruthy();
      if (result) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }, 15000);

    it('deve buscar título original para "Interestelar" na API do YouTube', async () => {
      const result = await youtubeService.searchOriginalTitle('Interestelar');
      
      // Pode retornar "Interstellar" ou null dependendo dos resultados da API
      expect(result).toBeTruthy();
      if (result) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }, 15000);

    it('deve buscar título original para "A Origem" na API do YouTube', async () => {
      const result = await youtubeService.searchOriginalTitle('A Origem');
      
      // Pode retornar "Inception" ou null dependendo dos resultados da API
      expect(result).toBeTruthy();
      if (result) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }, 15000);

    it('deve buscar título original para "Batman: O Cavaleiro das Trevas" na API do YouTube', async () => {
      const result = await youtubeService.searchOriginalTitle('Batman: O Cavaleiro das Trevas');
      
      // Pode retornar "The Dark Knight" ou null dependendo dos resultados da API
      expect(result).toBeTruthy();
      if (result) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }, 15000);

    it('deve buscar título original para "Clube da Luta" na API do YouTube', async () => {
      const result = await youtubeService.searchOriginalTitle('Clube da Luta');
      
      // Pode retornar "Fight Club" ou null dependendo dos resultados da API
      expect(result).toBeTruthy();
      if (result) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }, 15000);

    it('deve buscar título original para "Um Sonho de Liberdade" na API do YouTube', async () => {
      const result = await youtubeService.searchOriginalTitle('Um Sonho de Liberdade');
      
      // Pode retornar "The Shawshank Redemption" ou null dependendo dos resultados da API
      expect(result).toBeTruthy();
      if (result) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }, 15000);

    it('deve buscar título original para "Tempo de Violência" na API do YouTube', async () => {
      const result = await youtubeService.searchOriginalTitle('Tempo de Violência');
      
      // Pode retornar "Pulp Fiction" ou null dependendo dos resultados da API
      expect(result).toBeTruthy();
      if (result) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }, 15000);

    it('deve buscar título original para "O Silêncio dos Inocentes" na API do YouTube', async () => {
      const result = await youtubeService.searchOriginalTitle('O Silêncio dos Inocentes');
      
      // Pode retornar "The Silence of the Lambs" ou null dependendo dos resultados da API
      expect(result).toBeTruthy();
      if (result) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }, 15000);
  });

  describe('Testes de Casos Especiais', () => {
    it('deve lidar com título que não existe', async () => {
      const result = await youtubeService.searchOriginalTitle('Filme Que Não Existe 12345');
      
      // Deve retornar null para títulos inexistentes
      expect(result).toBeNull();
    }, 15000);

    it('deve lidar com título vazio', async () => {
      const result = await youtubeService.searchOriginalTitle('');
      
      // Deve retornar null para títulos vazios
      expect(result).toBeNull();
    }, 15000);

    it('deve lidar com título com caracteres especiais', async () => {
      const result = await youtubeService.searchOriginalTitle('Léon: O Profissional');
      
      // Pode retornar "Léon: The Professional" ou null
      expect(result).toBeTruthy();
      if (result) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }, 15000);
  });

  describe('Testes de Performance', () => {
    it('deve ter performance aceitável para títulos conhecidos', async () => {
      const startTime = Date.now();
      
      await youtubeService.searchOriginalTitle('De Repente 30');
      await youtubeService.searchOriginalTitle('O Poderoso Chefão');
      await youtubeService.searchOriginalTitle('Legalmente Loira');
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Títulos conhecidos devem ser muito rápidos (cache local)
      expect(totalTime).toBeLessThan(500); // Menos de 500ms para 3 consultas
    }, 10000);

    it('deve ter performance aceitável para buscas na API', async () => {
      const startTime = Date.now();
      
      await youtubeService.searchOriginalTitle('Matrix');
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Buscas na API devem ser razoavelmente rápidas
      expect(totalTime).toBeLessThan(10000); // Menos de 10 segundos
    }, 15000);
  });
});

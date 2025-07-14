import { PrismaClient } from '@prisma/client';
import { TMDBService } from '../services/tmdb.service';

const prisma = new PrismaClient();
const tmdbService = new TMDBService();

// Lista dos filmes que falharam
const failedMovies = [
  "10 Coisas Que Eu Odeio em Você",
  "A Incrível História de Adaline",
  "A Pele Que Habito",
  "À Procura da Felicidade",
  "À Procura de Elly",
  "A Separação",
  "A Vida dos Outros",
  "Beleza Oculta",
  "Cinema Paradiso",
  "Clube de Compras Dallas",
  "Comer, Rezar, Amar",
  "Como Perder um Cara em Dez Dias",
  "Delphine and Carole",
  "De Repente 30",
  "Hoje Eu Quero Voltar Sozinho",
  "Mad Max: Estrada da Fúria",
  "Meu Amigo Totoro",
  "Minha Vida Sem Mim",
  "O Cavalo de Turim",
  "O Curioso Caso de Benjamin Button",
  "O Diário de Bridget Jones",
  "O Fabuloso Destino de Amélie Poulain",
  "O Grande Hotel Budapeste",
  "Oito Mulheres e um Segredo",
  "O Quinto Elemento",
  "O Sabor da Vida",
  "O Selvagem da Motocicleta",
  "O Som do Coração",
  "Primavera, Verão, Outono, Inverno e... Primavera",
  "Retrato de uma Jovem em Chamas",
  "Sete Vidas",
  "Sociedade dos Poetas Mortos",
  "Todos Menos Você"
];

async function updateFailedMoviesTmdbId(): Promise<void> {
  try {
    console.log('🔄 Processando filmes que falharam na execução anterior...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < failedMovies.length; i++) {
      const movieTitle = failedMovies[i];
      
      console.log(`[${i + 1}/${failedMovies.length}] 🎬 Processando: ${movieTitle}`);
      
      try {
        // Buscar o filme no banco
        const movie = await prisma.movie.findFirst({
          where: {
            title: { contains: movieTitle, mode: 'insensitive' },
            tmdbId: null
          },
          select: {
            id: true,
            title: true,
            year: true,
            original_title: true
          }
        });
        
        if (!movie) {
          console.log(`   ⚠️  Filme não encontrado no banco ou já tem tmdbId`);
          continue;
        }
        
        const result = await searchAndUpdateMovie(movie);
        
        if (result.success) {
          successCount++;
          console.log(`   ✅ Sucesso: tmdbId ${result.tmdbId} atribuído`);
        } else {
          errorCount++;
          console.log(`   ❌ Erro: ${result.error}`);
        }
        
      } catch (error) {
        errorCount++;
        console.log(`   ❌ Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
      
      // Pausa entre requisições
      if (i < failedMovies.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('');
    }
    
    // Resumo final
    console.log('📊 === RESUMO DA ATUALIZAÇÃO (FILMES FALHADOS) ===');
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📋 Total processado: ${successCount + errorCount}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function searchAndUpdateMovie(movie: {
  id: string;
  title: string;
  year: number | null;
  original_title: string | null;
}): Promise<{ success: boolean; tmdbId?: number; error?: string }> {
  
  try {
    let searchResults: any = { results: [] };
    
    // Estratégia 1: Usar original_title se disponível
    if (movie.original_title) {
      console.log(`   🔍 Buscando com título original: "${movie.original_title}"`);
      searchResults = await tmdbService.searchMovies(movie.original_title);
      
      if (searchResults.results.length === 0 && movie.year) {
        const searchQuery = `${movie.original_title} ${movie.year}`;
        console.log(`   🔍 Tentando com ano: "${searchQuery}"`);
        searchResults = await tmdbService.searchMovies(searchQuery);
      }
    }
    
    // Estratégia 2: Usar título principal
    if (searchResults.results.length === 0) {
      console.log(`   🔍 Buscando com título principal: "${movie.title}"`);
      searchResults = await tmdbService.searchMovies(movie.title);
      
      if (searchResults.results.length === 0 && movie.year) {
        const searchQuery = `${movie.title} ${movie.year}`;
        console.log(`   🔍 Tentando com ano: "${searchQuery}"`);
        searchResults = await tmdbService.searchMovies(searchQuery);
      }
    }
    
    if (searchResults.results.length === 0) {
      return {
        success: false,
        error: 'Filme não encontrado no TMDB'
      };
    }
    
    // Encontrar o melhor match
    const bestMatch = findBestMatch(searchResults.results, movie);
    
    if (!bestMatch) {
      return {
        success: false,
        error: 'Nenhum resultado compatível encontrado'
      };
    }
    
    console.log(`   🎯 Melhor match: "${bestMatch.title}" (${bestMatch.release_date?.substring(0, 4)}) - ID: ${bestMatch.id}`);
    
    // Atualizar o filme no banco
    await prisma.movie.update({
      where: { id: movie.id },
      data: {
        tmdbId: bestMatch.id,
        updatedAt: new Date()
      }
    });
    
    return {
      success: true,
      tmdbId: bestMatch.id
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro na busca TMDB'
    };
  }
}

function findBestMatch(results: any[], movie: {
  title: string;
  year: number | null;
  original_title: string | null;
}): any | null {
  
  if (results.length === 0) return null;
  
  // Calcular score para cada resultado
  const scoredResults = results.map(result => {
    let score = 0;
    
    // Score por título original (prioridade máxima se disponível)
    if (movie.original_title && result.original_title) {
      const originalTitleSimilarity = calculateTitleSimilarity(movie.original_title, result.original_title);
      score += originalTitleSimilarity * 0.7;
    } else {
      // Se não tem título original, usar título principal
      const titleSimilarity = calculateTitleSimilarity(movie.title, result.title);
      score += titleSimilarity * 0.5;
    }
    
    // Score por ano
    if (movie.year && result.release_date) {
      const resultYear = parseInt(result.release_date.substring(0, 4));
      const yearDiff = Math.abs(movie.year - resultYear);
      
      if (yearDiff === 0) score += 0.3;
      else if (yearDiff <= 1) score += 0.15;
      else if (yearDiff <= 2) score += 0.05;
      else score -= 0.1;
    }
    
    // Score adicional se título principal também bate
    if (movie.original_title && result.original_title && movie.title !== movie.original_title) {
      const titleSimilarity = calculateTitleSimilarity(movie.title, result.title);
      score += titleSimilarity * 0.2;
    }
    
    return { ...result, score };
  });
  
  // Ordenar por score e retornar o melhor
  scoredResults.sort((a, b) => b.score - a.score);
  
  const threshold = movie.original_title ? 0.6 : 0.4;
  return scoredResults[0].score > threshold ? scoredResults[0] : null;
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const normalize = (str: string) => str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim();
  
  const norm1 = normalize(title1);
  const norm2 = normalize(title2);
  
  if (norm1 === norm2) return 1.0;
  
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  
  return maxLength > 0 ? 1 - (distance / maxLength) : 0;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

if (require.main === module) {
  updateFailedMoviesTmdbId();
} 
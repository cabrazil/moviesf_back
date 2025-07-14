import { PrismaClient } from '@prisma/client';
import { TMDBService } from '../services/tmdb.service';

const prisma = new PrismaClient();
const tmdbService = new TMDBService();

interface MovieUpdateResult {
  success: boolean;
  movie: {
    id: string;
    title: string;
    year: number | null;
  };
  tmdbId?: number;
  error?: string;
}

async function updateAllMoviesTmdbId(): Promise<void> {
  try {
    console.log('🔄 Iniciando atualização de tmdbId para todos os filmes...\n');
    
    // Buscar todos os filmes sem tmdbId
    const moviesWithoutTmdbId = await prisma.movie.findMany({
      where: {
        tmdbId: null
      },
      select: {
        id: true,
        title: true,
        year: true,
        original_title: true
      },
      orderBy: {
        title: 'asc'
      }
    });
    
    if (moviesWithoutTmdbId.length === 0) {
      console.log('✅ Todos os filmes já possuem tmdbId!');
      return;
    }
    
    console.log(`📋 Encontrados ${moviesWithoutTmdbId.length} filmes sem tmdbId`);
    console.log('🔍 Iniciando busca no TMDB...\n');
    
    const results: MovieUpdateResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < moviesWithoutTmdbId.length; i++) {
      const movie = moviesWithoutTmdbId[i];
      
      console.log(`[${i + 1}/${moviesWithoutTmdbId.length}] 🎬 Processando: ${movie.title} (${movie.year || 'Ano desconhecido'})`);
      
      try {
        const result = await searchAndUpdateMovie(movie);
        results.push(result);
        
        if (result.success) {
          successCount++;
          console.log(`✅ Sucesso: tmdbId ${result.tmdbId} atribuído`);
        } else {
          errorCount++;
          console.log(`❌ Erro: ${result.error}`);
        }
        
      } catch (error) {
        errorCount++;
        const errorResult: MovieUpdateResult = {
          success: false,
          movie: {
            id: movie.id,
            title: movie.title,
            year: movie.year
          },
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
        results.push(errorResult);
        console.log(`❌ Erro inesperado: ${errorResult.error}`);
      }
      
      // Pequena pausa para não sobrecarregar a API do TMDB
      if (i < moviesWithoutTmdbId.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(''); // Linha em branco para separar
    }
    
    // Resumo final
    console.log('📊 === RESUMO DA ATUALIZAÇÃO ===');
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📋 Total processado: ${results.length}`);
    
    if (errorCount > 0) {
      console.log('\n🚨 Filmes com erro:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.movie.title} (${r.movie.year}): ${r.error}`);
        });
    }
    
  } catch (error) {
    console.error('❌ Erro geral ao atualizar tmdbIds:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function searchAndUpdateMovie(movie: {
  id: string;
  title: string;
  year: number | null;
  original_title: string | null;
}): Promise<MovieUpdateResult> {
  
  const baseResult = {
    movie: {
      id: movie.id,
      title: movie.title,
      year: movie.year
    }
  };
  
  try {
    let searchResults: any = { results: [] };
    
    // Estratégia 1: Usar original_title se disponível (mais confiável)
    if (movie.original_title) {
      let searchQuery = movie.original_title;
      console.log(`   🔍 Buscando com título original: "${searchQuery}"`);
      searchResults = await tmdbService.searchMovies(searchQuery);
      
      // Se não encontrou com título original, tentar com ano
      if (searchResults.results.length === 0 && movie.year) {
        searchQuery = `${movie.original_title} ${movie.year}`;
        console.log(`   🔍 Tentando com ano: "${searchQuery}"`);
        searchResults = await tmdbService.searchMovies(searchQuery);
      }
    }
    
    // Estratégia 2: Se não tem original_title ou não encontrou, usar título principal
    if (searchResults.results.length === 0) {
      let searchQuery = movie.title;
      console.log(`   🔍 Buscando com título principal: "${searchQuery}"`);
      searchResults = await tmdbService.searchMovies(searchQuery);
      
      // Se não encontrou com título principal, tentar com ano
      if (searchResults.results.length === 0 && movie.year) {
        searchQuery = `${movie.title} ${movie.year}`;
        console.log(`   🔍 Tentando com ano: "${searchQuery}"`);
        searchResults = await tmdbService.searchMovies(searchQuery);
      }
    }
    
    if (searchResults.results.length === 0) {
      return {
        ...baseResult,
        success: false,
        error: 'Filme não encontrado no TMDB'
      };
    }
    
    // Encontrar o melhor match
    const bestMatch = findBestMatch(searchResults.results, movie);
    
    if (!bestMatch) {
      return {
        ...baseResult,
        success: false,
        error: 'Nenhum resultado compatível encontrado'
      };
    }
    
    console.log(`   🎯 Melhor match: "${bestMatch.title}" (${bestMatch.release_date?.substring(0, 4)}) - ID: ${bestMatch.id} [Score: ${bestMatch.score?.toFixed(2) || 'N/A'}]`);
    
    // Atualizar o filme no banco
    await prisma.movie.update({
      where: { id: movie.id },
      data: {
        tmdbId: bestMatch.id,
        updatedAt: new Date()
      }
    });
    
    return {
      ...baseResult,
      success: true,
      tmdbId: bestMatch.id
    };
    
  } catch (error) {
    return {
      ...baseResult,
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
      score += originalTitleSimilarity * 0.7; // Peso maior para título original
    } else {
      // Se não tem título original, usar título principal
      const titleSimilarity = calculateTitleSimilarity(movie.title, result.title);
      score += titleSimilarity * 0.5;
    }
    
    // Score por ano (muito importante para desambiguação)
    if (movie.year && result.release_date) {
      const resultYear = parseInt(result.release_date.substring(0, 4));
      const yearDiff = Math.abs(movie.year - resultYear);
      
      if (yearDiff === 0) score += 0.3; // Ano exato
      else if (yearDiff <= 1) score += 0.15; // Diferença de 1 ano
      else if (yearDiff <= 2) score += 0.05; // Diferença de 2 anos
      else score -= 0.1; // Penalizar diferenças maiores
    }
    
    // Score adicional se título principal também bate (quando temos original_title)
    if (movie.original_title && result.original_title && movie.title !== movie.original_title) {
      const titleSimilarity = calculateTitleSimilarity(movie.title, result.title);
      score += titleSimilarity * 0.2; // Peso menor como bônus
    }
    
    return { ...result, score };
  });
  
  // Ordenar por score e retornar o melhor
  scoredResults.sort((a, b) => b.score - a.score);
  
  // Só retorna se o score for razoável
  // Score mais alto para matches com original_title, mais baixo para título principal apenas
  const threshold = movie.original_title ? 0.6 : 0.4;
  return scoredResults[0].score > threshold ? scoredResults[0] : null;
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  // Normalizar títulos (remover acentos, converter para minúsculas, etc.)
  const normalize = (str: string) => str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .trim();
  
  const norm1 = normalize(title1);
  const norm2 = normalize(title2);
  
  // Se são iguais após normalização, score máximo
  if (norm1 === norm2) return 1.0;
  
  // Calcular similaridade usando Levenshtein distance
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
  updateAllMoviesTmdbId();
} 
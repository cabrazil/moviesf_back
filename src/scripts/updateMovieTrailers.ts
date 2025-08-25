/// <reference types="node" />
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

/**
 * Script para atualizar trailers de filmes da API TMDB
 * 
 * ESTRATÉGIA DE BUSCA:
 * 1. Primeira tentativa: Buscar trailers em pt-BR
 * 2. Segunda tentativa: Se não encontrar, buscar em en-US
 * 
 * HIERARQUIA DE PRIORIDADE PARA LANDING PAGE:
 * 1. PT-BR (Português brasileiro dublado) - Máxima prioridade
 * 2. PT (Português legendado) - Segunda prioridade  
 * 3. EN (Inglês original) - Terceira prioridade (FALLBACK)
 * 4. Outros idiomas - Baixa prioridade
 * 
 * O primeiro trailer da lista ordenada será marcado como isMain = true
 * e será exibido na Landing Page.
 * 
 * USO:
 * - Por TMDB ID (recomendado): --tmdbId=12345
 * - Por UUID (legado): --movieId=uuid
 * - Lote: --batch=10
 * - Teste: --dry-run
 */

const prisma = new PrismaClient();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  language: string;
  official: boolean;
  published_at: string;
}

interface TMDBVideosResponse {
  id: number;
  results: TMDBVideo[];
}

// Função para inferir idioma baseado no nome do trailer
function inferLanguageFromName(name: string): string {
  const lowerName = name.toLowerCase();
  
  // Padrões para português brasileiro (dublado)
  if (lowerName.includes('dublado') || lowerName.includes('dublagem') || 
      lowerName.includes('pt-br') || lowerName.includes('brasil')) {
    return 'pt-BR';
  }
  
  // Padrões para português (legendado)
  if (lowerName.includes('legendado') || lowerName.includes('legendas') || 
      lowerName.includes('pt') || lowerName.includes('português')) {
    return 'pt';
  }
  
  // Padrões para inglês (mais abrangente)
  if (lowerName.includes('english') || lowerName.includes('original') || 
      lowerName.includes('en') || lowerName.includes('official') ||
      lowerName.includes('trailer') || lowerName.includes('teaser') ||
      lowerName.includes('final') || lowerName.includes('new')) {
    return 'en';
  }
  
  return 'unknown';
}

// Função para determinar a prioridade do idioma (quanto menor o número, maior a prioridade)
// Hierarquia: PT-BR (dublado) > PT (legendado) > EN (original) > outros
function getLanguagePriority(language: string): number {
  switch (language) {
    case 'pt-BR': return 1;  // Português brasileiro dublado - máxima prioridade
    case 'pt': return 2;     // Português legendado - segunda prioridade
    case 'en': return 3;     // Inglês original - terceira prioridade
    case 'unknown': return 4; // Idioma desconhecido/undefined
    default: return 999;     // Outros idiomas - baixa prioridade
  }
}

// Função para determinar a prioridade do tipo de vídeo
function getTypePriority(type: string): number {
  switch (type) {
    case 'Trailer': return 1;  // Trailer oficial - máxima prioridade
    case 'Teaser': return 2;   // Teaser
    default: return 999;       // Outros tipos - baixa prioridade
  }
}

export async function getMovieTrailers(movieId: number): Promise<Array<{
  tmdbId: string;
  key: string;
  name: string;
  site: string;
  type: string;
  language: string;
  official: boolean;
  publishedAt: string;
}>> {
  try {
    console.log(`🎬 Buscando trailers para TMDB ID: ${movieId}`);
    
    // Primeira tentativa: buscar com idioma pt-BR
    let response = await axios.get<TMDBVideosResponse>(`${TMDB_API_URL}/movie/${movieId}/videos`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'pt-BR'
      }
    });

    // Se não encontrou trailers, tentar com idioma en-US
    if (response.data.results.length === 0) {
      console.log(`🔍 Nenhum trailer encontrado em pt-BR, tentando em inglês...`);
      response = await axios.get<TMDBVideosResponse>(`${TMDB_API_URL}/movie/${movieId}/videos`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'en-US'
        }
      });
    }

    // Filtrar apenas trailers do YouTube
    const trailers = response.data.results.filter(video => 
      video.site === 'YouTube' && 
      (video.type === 'Trailer' || video.type === 'Teaser')
    );

    console.log(`📊 Total de vídeos encontrados: ${response.data.results.length}`);
    
    // Debug: Mostrar todos os vídeos encontrados
    if (response.data.results.length > 0) {
      console.log(`🔍 Debug - Todos os vídeos encontrados:`);
      response.data.results.forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.name} (${video.type}) - ${video.site} - ${video.language || 'sem idioma'}`);
      });
    }
    
    console.log(`🎬 Trailers do YouTube encontrados: ${trailers.length}`);

    // Primeiro, processar e inferir idiomas
    const processedTrailers = trailers.map(trailer => {
      // Inferir idioma se não estiver definido
      const originalLanguage = trailer.language;
      const inferredLanguage = trailer.language || inferLanguageFromName(trailer.name);
      
      // Log quando inferência é aplicada
      if (!originalLanguage && inferredLanguage !== 'unknown') {
        console.log(`🔍 Idioma inferido para "${trailer.name}": ${inferredLanguage}`);
      }
      
      return {
        tmdbId: trailer.id,
        key: trailer.key,
        name: trailer.name,
        site: trailer.site,
        type: trailer.type,
        language: inferredLanguage,
        official: trailer.official,
        publishedAt: trailer.published_at
      };
    });

    // Depois, ordenar por prioridade (idioma + tipo + oficial + data)
    const sortedTrailers = processedTrailers.sort((a, b) => {
      // 1. Prioridade do idioma
      const langPriorityA = getLanguagePriority(a.language);
      const langPriorityB = getLanguagePriority(b.language);
      if (langPriorityA !== langPriorityB) {
        return langPriorityA - langPriorityB;
      }

      // 2. Prioridade do tipo
      const typePriorityA = getTypePriority(a.type);
      const typePriorityB = getTypePriority(b.type);
      if (typePriorityA !== typePriorityB) {
        return typePriorityA - typePriorityB;
      }

      // 3. Oficial primeiro
      if (a.official && !b.official) return -1;
      if (!a.official && b.official) return 1;

      // 4. Mais recente primeiro
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return sortedTrailers;

  } catch (error) {
    console.error(`❌ Erro ao buscar trailers para TMDB ID ${movieId}:`, error);
    return [];
  }
}

async function updateMovieTrailersByTmdbId(tmdbId: number, dryRun: boolean = false): Promise<void> {
  try {
    console.log(`\n=== Atualizando trailers para TMDB ID: ${tmdbId} ===`);
    if (dryRun) {
      console.log(`🔍 MODO DRY-RUN: Apenas logs, sem salvar no banco`);
    }

    // Buscar trailers da API TMDB diretamente
    const trailers = await getMovieTrailers(tmdbId);

    if (trailers.length === 0) {
      console.log(`⚠️ Nenhum trailer encontrado para TMDB ID: ${tmdbId}`);
      return;
    }

    console.log(`\n📋 Trailers encontrados (ordenados por prioridade para LP:`);
    console.log(`   🥇 PT-BR (dublado) > 🥈 PT (legendado) > 🥉 EN (original) > outros`);
    trailers.forEach((trailer, index) => {
      const priority = index === 0 ? '🔥 PRINCIPAL' : `   ${index + 1}`;
      const language = trailer.language || 'desconhecido';
      const languageEmoji = trailer.language === 'pt-BR' ? '🇧🇷' : 
                           trailer.language === 'pt' ? '🇵🇹' : 
                           trailer.language === 'en' ? '🇺🇸' : '🌐';
      console.log(`${priority}: ${languageEmoji} ${trailer.name} (${trailer.type}) - ${language} - ${trailer.official ? 'Oficial' : 'Não oficial'}`);
    });

    if (dryRun) {
      console.log(`\n🔍 DRY-RUN: ${trailers.length} trailers seriam processados`);
      return;
    }

    // Buscar o filme no banco para salvar os trailers
    const movie = await prisma.movie.findFirst({
      where: { tmdbId: tmdbId }
    });

    if (!movie) {
      console.log(`⚠️ Filme com TMDB ID ${tmdbId} não encontrado no banco. Trailers não podem ser salvos.`);
      return;
    }

    console.log(`✅ Filme encontrado no banco: ${movie.title} (ID: ${movie.id})`);

    // Remover trailers existentes
    console.log(`🗑️ Removendo trailers existentes...`);
    await prisma.movieTrailer.deleteMany({
      where: { movieId: movie.id }
    });

    // Inserir novos trailers
    console.log(`📝 Inserindo ${trailers.length} trailers...`);
    
    for (let i = 0; i < trailers.length; i++) {
      const trailer = trailers[i];
      const isMain = i === 0; // Primeiro trailer é o principal

      await prisma.movieTrailer.create({
        data: {
          movieId: movie.id,
          tmdbId: trailer.tmdbId,
          key: trailer.key,
          name: trailer.name,
          site: trailer.site,
          type: trailer.type,
          language: trailer.language,
          isMain: isMain
        }
      });

      console.log(`✅ Trailer ${i + 1}: ${trailer.name} (${trailer.type}) - ${isMain ? 'PRINCIPAL' : 'secundário'}`);
    }

    console.log(`\n🎉 Trailers atualizados com sucesso para ${movie.title}!`);
    console.log(`📊 Resumo:`);
    console.log(`   - Filme: ${movie.title}`);
    console.log(`   - Trailers processados: ${trailers.length}`);
    console.log(`   - Trailer principal: ${trailers[0]?.name} (${trailers[0]?.language || 'desconhecido'})`);

  } catch (error) {
    console.error(`❌ Erro ao atualizar trailers:`, error);
    throw error;
  }
}

async function updateMovieTrailers(movieId: string, dryRun: boolean = false): Promise<void> {
  try {
    console.log(`\n=== Atualizando trailers para filme ID: ${movieId} ===`);
    if (dryRun) {
      console.log(`🔍 MODO DRY-RUN: Apenas logs, sem salvar no banco`);
    }

    // Buscar o filme
    const movie = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (!movie) {
      throw new Error(`Filme não encontrado com ID: ${movieId}`);
    }

    if (!movie.tmdbId) {
      throw new Error(`Filme ${movie.title} não possui TMDB ID`);
    }

    console.log(`✅ Filme encontrado: ${movie.title} (TMDB ID: ${movie.tmdbId})`);

    // Buscar trailers da API TMDB
    const trailers = await getMovieTrailers(movie.tmdbId);

    if (trailers.length === 0) {
      console.log(`⚠️ Nenhum trailer encontrado para ${movie.title}`);
      return;
    }

    console.log(`\n📋 Trailers encontrados (ordenados por prioridade para LP:`);
    console.log(`   🥇 PT-BR (dublado) > 🥈 PT (legendado) > 🥉 EN (original) > outros`);
    trailers.forEach((trailer, index) => {
      const priority = index === 0 ? '🔥 PRINCIPAL' : `   ${index + 1}`;
      const language = trailer.language || 'desconhecido';
      const languageEmoji = trailer.language === 'pt-BR' ? '🇧🇷' : 
                           trailer.language === 'pt' ? '🇵🇹' : 
                           trailer.language === 'en' ? '🇺🇸' : '🌐';
      console.log(`${priority}: ${languageEmoji} ${trailer.name} (${trailer.type}) - ${language} - ${trailer.official ? 'Oficial' : 'Não oficial'}`);
    });

    if (dryRun) {
      console.log(`\n🔍 DRY-RUN: ${trailers.length} trailers seriam processados`);
      return;
    }

    // Remover trailers existentes
    console.log(`🗑️ Removendo trailers existentes...`);
    await prisma.movieTrailer.deleteMany({
      where: { movieId: movieId }
    });

    // Inserir novos trailers
    console.log(`📝 Inserindo ${trailers.length} trailers...`);
    
    for (let i = 0; i < trailers.length; i++) {
      const trailer = trailers[i];
      const isMain = i === 0; // Primeiro trailer é o principal

      await prisma.movieTrailer.create({
        data: {
          movieId: movieId,
          tmdbId: trailer.tmdbId,
          key: trailer.key,
          name: trailer.name,
          site: trailer.site,
          type: trailer.type,
          language: trailer.language,
          isMain: isMain
        }
      });

      console.log(`✅ Trailer ${i + 1}: ${trailer.name} (${trailer.type}) - ${isMain ? 'PRINCIPAL' : 'secundário'}`);
    }

    console.log(`\n🎉 Trailers atualizados com sucesso para ${movie.title}!`);
    console.log(`📊 Resumo:`);
    console.log(`   - Filme: ${movie.title}`);
    console.log(`   - Trailers processados: ${trailers.length}`);
    console.log(`   - Trailer principal: ${trailers[0]?.name} (${trailers[0]?.language || 'desconhecido'})`);

  } catch (error) {
    console.error(`❌ Erro ao atualizar trailers:`, error);
    throw error;
  }
}

async function processBatchOfMovies(batchSize: number = 10, dryRun: boolean = false): Promise<void> {
  try {
    console.log(`\n=== Processando lote de ${batchSize} filmes ===`);
    if (dryRun) {
      console.log(`🔍 MODO DRY-RUN: Apenas logs, sem salvar no banco`);
    }

    // Buscar filmes que não têm trailers ou têm TMDB ID
    const movies = await prisma.movie.findMany({
      where: {
        tmdbId: { not: null },
        trailers: { none: {} } // Filmes sem trailers
      },
      take: batchSize,
      orderBy: { createdAt: 'desc' }
    });

    if (movies.length === 0) {
      console.log(`✅ Nenhum filme encontrado para processar`);
      return;
    }

    console.log(`📋 Encontrados ${movies.length} filmes para processar:`);
    movies.forEach(movie => {
      console.log(`   - ${movie.title} (${movie.year}) - TMDB ID: ${movie.tmdbId}`);
    });

    let successCount = 0;
    let errorCount = 0;

    for (const movie of movies) {
      try {
        await updateMovieTrailers(movie.id, dryRun);
        successCount++;
        
        // Delay entre requisições para não sobrecarregar a API
        if (!dryRun) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Erro ao processar ${movie.title}:`, error);
        errorCount++;
      }
    }

    console.log(`\n=== Resumo do Processamento ===`);
    console.log(`Total de filmes: ${movies.length}`);
    console.log(`Sucessos: ${successCount}`);
    console.log(`Erros: ${errorCount}`);

  } catch (error) {
    console.error(`❌ Erro no processamento em lote:`, error);
    throw error;
  }
}

// Função para processar argumentos da linha de comando
function parseArgs(): { movieId?: string; tmdbId?: number; batchSize?: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  const parsed: any = { dryRun: false };

  args.forEach(arg => {
    if (arg.startsWith('--movieId=')) {
      parsed.movieId = arg.split('=')[1];
    } else if (arg.startsWith('--tmdbId=')) {
      parsed.tmdbId = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--batch=')) {
      parsed.batchSize = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    }
  });

  return parsed;
}

// Execução do script
async function main() {
  try {
    const args = parseArgs();

    if (args.tmdbId) {
      // Processar um filme específico por TMDB ID
      await updateMovieTrailersByTmdbId(args.tmdbId, args.dryRun);
    } else if (args.movieId) {
      // Processar um filme específico por UUID (legado)
      await updateMovieTrailers(args.movieId, args.dryRun);
    } else {
      // Processar lote de filmes
      const batchSize = args.batchSize || 10;
      await processBatchOfMovies(batchSize, args.dryRun);
    }

  } catch (error) {
    console.error('❌ Erro na execução do script:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

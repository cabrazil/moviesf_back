import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface TMDBWatchProvider {
  display_priority: number;
  logo_path: string;
  provider_id: number;
  provider_name: string;
}

interface TMDBWatchProviders {
  buy?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
  flatrate?: TMDBWatchProvider[];
  free?: TMDBWatchProvider[];
}

interface TMDBResponse {
  id: number;
  results: {
    BR?: TMDBWatchProviders; // Brasil
  };
}

// Mapeamento de providers TMDB para nossas plataformas
const TMDB_PROVIDER_MAPPING: Record<string, { name: string; accessType?: string }> = {
  'Netflix': { name: 'Netflix', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Netflix Standard with Ads': { name: 'Netflix', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Amazon Prime Video': { name: 'Prime Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Amazon Prime Video with Ads': { name: 'Prime Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Amazon Video': { name: 'Prime Video' }, // accessType removido - usar fallback
  'Disney Plus': { name: 'Disney+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'HBO Max': { name: 'HBO Max', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'HBO Max Amazon Channel': { name: 'HBO Max', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Paramount Plus': { name: 'Paramount+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Paramount+ Amazon Channel': { name: 'Paramount+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Paramount Plus Premium': { name: 'Paramount+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Apple TV Plus': { name: 'Apple TV+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Apple TV': { name: 'Apple TV (Loja)' }, // accessType removido - usar fallback
  'Google Play Movies': { name: 'Google Play' }, // accessType removido - usar fallback
  'Microsoft Store': { name: 'Microsoft Store' }, // accessType removido - usar fallback
  'YouTube': { name: 'YouTube (Gratuito)', accessType: 'FREE_WITH_ADS' },
  'Pluto TV': { name: 'Pluto TV', accessType: 'FREE_WITH_ADS' },
  'Globoplay': { name: 'Globoplay', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Telecine': { name: 'Telecine', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Telecine Amazon Channel': { name: 'Telecine', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Looke': { name: 'Looke', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Looke Amazon Channel': { name: 'Looke', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
      'MUBI': { name: 'MUBI', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
    'MUBI Amazon Channel': { name: 'MUBI', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Oldflix': { name: 'Oldflix', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Crunchyroll': { name: 'Crunchyroll', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Claro tv+': { name: 'Claro Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Claro video': { name: 'Claro Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Reserva Imovision Amazon Channel': { name: 'Reserva Imovision', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MGM+ Apple TV Channel': { name: 'MGM+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'MGM Plus Amazon Channel': { name: 'MGM+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'FilmBox+': { name: 'FilmBox+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  
  // Novos providers encontrados
  'Sony One Amazon Channel': { name: 'Sony One', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Filmelier Plus Amazon Channel': { name: 'Filmelier+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Apple TV Plus Amazon Channel': { name: 'Apple TV+', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Plex': { name: 'Plex', accessType: 'FREE_WITH_ADS' },
  'Plex Channel': { name: 'Plex', accessType: 'FREE_WITH_ADS' },
  'Univer Video': { name: 'Univer Video', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'Belas Artes à La Carte': { name: 'Belas Artes à La Carte', accessType: 'INCLUDED_WITH_SUBSCRIPTION' },
  'GOSPEL PLAY': { name: 'GOSPEL PLAY', accessType: 'INCLUDED_WITH_SUBSCRIPTION' }
};

// Determinar AccessType baseado no tipo de provider do TMDB
function getAccessTypeFromTMDB(providerType: 'flatrate' | 'buy' | 'rent' | 'free', providerName: string): string {
  // Primeiro, verificar mapeamento específico
  const mapped = TMDB_PROVIDER_MAPPING[providerName];
  if (mapped && mapped.accessType) {
    return mapped.accessType; // Usar accessType explícito se definido
  }

  // Fallback baseado no tipo - AGORA CORRETO!
  switch (providerType) {
    case 'flatrate':
      return 'INCLUDED_WITH_SUBSCRIPTION';
    case 'buy':
      return 'PURCHASE';
    case 'rent':
      return 'RENTAL';
    case 'free':
      return 'FREE_WITH_ADS';
    default:
      return 'HYBRID_OR_UNKNOWN';
  }
}

async function fetchTMDBWatchProviders(tmdbId: number): Promise<TMDBWatchProviders | null> {
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      console.error('❌ TMDB_API_KEY não encontrada no .env');
      return null;
    }

    const url = `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${apiKey}`;
    const response = await axios.get<TMDBResponse>(url);
    
    // Retornar dados do Brasil
    return response.data.results.BR || null;
  } catch (error) {
    console.error(`❌ Erro ao buscar providers para TMDB ID ${tmdbId}:`, error);
    return null;
  }
}

async function enrichStreamingPlatforms(movieLimit: number = 50, dryRun: boolean = true) {
  console.log('🎬 === ENRIQUECIMENTO DE STREAMING PLATFORMS VIA TMDB ===');
  console.log(`📊 Processando até ${movieLimit} filmes sem plataformas...`);
  console.log(`🔍 Modo: ${dryRun ? 'DRY RUN (apenas análise)' : 'EXECUÇÃO REAL'}\n`);

  try {
    // 1. Buscar plataformas cadastradas
    const streamingPlatforms = await prisma.streamingPlatform.findMany();
    const platformMap = new Map(streamingPlatforms.map(p => [p.name, p]));

    // 2. Buscar TODOS os filmes com TMDB ID
    const allMoviesWithTMDB = await prisma.movie.findMany({
      where: {
        tmdbId: { not: null }
      },
      select: {
        id: true,
        title: true,
        year: true,
        tmdbId: true
      }
    });

    // Aplicar limite apenas no processamento, não na query
    const moviesToProcess = allMoviesWithTMDB.slice(0, movieLimit);

    console.log(`🎯 Encontrados ${allMoviesWithTMDB.length} filmes com TMDB ID`);
    console.log(`📊 Processando ${moviesToProcess.length} filmes (limite: ${movieLimit})\n`);

    if (moviesToProcess.length === 0) {
      console.log('✅ Nenhum filme com TMDB ID encontrado!');
      return;
    }

    // Estatísticas
    let processedMovies = 0;
    let moviesWithProviders = 0;
    let totalProvidersFound = 0;
    let successfulInserts = 0;
    const newProvidersFound = new Set<string>();
    const enrichmentReport: Array<{
      movie: string;
      tmdbId: number;
      providers: Array<{
        name: string;
        type: string;
        mapped: string;
        accessType: string;
        status: 'found' | 'new' | 'inserted' | 'error';
      }>;
    }> = [];

    // 3. Processar cada filme
    for (const movie of moviesToProcess) {
      processedMovies++;
      console.log(`🎬 [${processedMovies}/${moviesToProcess.length}] ${movie.title} (${movie.year}) - TMDB: ${movie.tmdbId}`);

      const movieReport = {
        movie: `${movie.title} (${movie.year})`,
        tmdbId: movie.tmdbId!,
        providers: [] as any[]
      };

      // Buscar providers no TMDB
      const providers = await fetchTMDBWatchProviders(movie.tmdbId!);
      if (!providers) {
        console.log('  ❌ Nenhum provider encontrado no TMDB');
        enrichmentReport.push(movieReport);
        continue;
      }

      // Processar todos os tipos de providers
      const allProviders: Array<{ name: string; type: 'flatrate' | 'buy' | 'rent' | 'free' }> = [];
      
      if (providers.flatrate) allProviders.push(...providers.flatrate.map(p => ({ name: p.provider_name, type: 'flatrate' as const })));
      if (providers.buy) allProviders.push(...providers.buy.map(p => ({ name: p.provider_name, type: 'buy' as const })));
      if (providers.rent) allProviders.push(...providers.rent.map(p => ({ name: p.provider_name, type: 'rent' as const })));
      if (providers.free) allProviders.push(...providers.free.map(p => ({ name: p.provider_name, type: 'free' as const })));

      if (allProviders.length === 0) {
        console.log('  ⚠️  Providers vazios no TMDB');
        enrichmentReport.push(movieReport);
        continue;
      }

      moviesWithProviders++;
      console.log(`  ✅ Encontrados ${allProviders.length} providers:`);

      // Processar cada provider
      for (const provider of allProviders) {
        totalProvidersFound++;
        
        // Mapear nome do provider
        const mappedName = TMDB_PROVIDER_MAPPING[provider.name]?.name || provider.name;
        const platform = platformMap.get(mappedName);
        const accessType = getAccessTypeFromTMDB(provider.type, provider.name);

        console.log(`    📺 ${provider.name} (${provider.type}) → ${mappedName} (${accessType})`);

        if (!platform) {
          console.log(`      ❌ Plataforma não cadastrada: ${mappedName}`);
          newProvidersFound.add(provider.name);
          
          movieReport.providers.push({
            name: provider.name,
            type: provider.type,
            mapped: mappedName,
            accessType,
            status: 'new'
          });
          continue;
        }

        movieReport.providers.push({
          name: provider.name,
          type: provider.type,
          mapped: mappedName,
          accessType,
          status: 'found'
        });

        // Inserir relação (se não for dry run)
        if (!dryRun) {
          try {
            // Usar upsert para evitar duplicatas
            await prisma.movieStreamingPlatform.upsert({
              where: {
                movieId_streamingPlatformId_accessType: {
                  movieId: movie.id,
                  streamingPlatformId: platform.id,
                  accessType: accessType as any
                }
              },
              update: {
                updatedAt: new Date()
              },
              create: {
                movieId: movie.id,
                streamingPlatformId: platform.id,
                accessType: accessType as any
              }
            });
            
            console.log(`      ✅ Relação criada/atualizada: ${mappedName}`);
            successfulInserts++;
            movieReport.providers[movieReport.providers.length - 1].status = 'inserted';
          } catch (error) {
            console.log(`      ❌ Erro ao criar relação: ${error}`);
            movieReport.providers[movieReport.providers.length - 1].status = 'error';
          }
        }
      }

      enrichmentReport.push(movieReport);
      console.log('');

      // Rate limiting para API do TMDB
      await new Promise(resolve => setTimeout(resolve, 250)); // 4 requests per second
    }

    // 4. Relatório final
    console.log('📊 === RELATÓRIO DE ENRIQUECIMENTO ===');
    console.log(`🎬 Filmes processados: ${processedMovies}`);
    console.log(`✅ Filmes com providers: ${moviesWithProviders}`);
    console.log(`📺 Total de providers encontrados: ${totalProvidersFound}`);
    if (!dryRun) {
      console.log(`💾 Relações inseridas com sucesso: ${successfulInserts}`);
    }
    console.log(`🆕 Providers novos encontrados: ${newProvidersFound.size}\n`);

    if (newProvidersFound.size > 0) {
      console.log('🆕 Novos providers para adicionar ao sistema:');
      newProvidersFound.forEach(p => console.log(`  - "${p}"`));
      console.log('');
    }

    // Taxa de sucesso
    const successRate = processedMovies > 0 ? ((moviesWithProviders / processedMovies) * 100).toFixed(1) : '0';
    console.log(`🎯 Taxa de encontro: ${successRate}% (${moviesWithProviders}/${processedMovies})`);

  } catch (error) {
    console.error('❌ Erro durante o enriquecimento:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execução via linha de comando
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const dryRunArg = args.includes('--dry-run');
  const executeArg = args.includes('--execute');

  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000; // Processar todos os filmes por padrão
  const dryRun = !executeArg; // Por padrão é dry run, só executa com --execute

  if (dryRun) {
    console.log('⚠️  MODO DRY RUN - Nenhuma alteração será feita no banco');
    console.log('   Use --execute para realizar as inserções\n');
  }

  await enrichStreamingPlatforms(limit, dryRun);
}

if (require.main === module) {
  main().catch(console.error);
}

export { enrichStreamingPlatforms };
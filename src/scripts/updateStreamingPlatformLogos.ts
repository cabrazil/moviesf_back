import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Configuração da API TMDB
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_URL = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

// Interface para provider da API TMDB
interface TMDBProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
  display_priorities: Record<string, number>;
}

interface TMDBProvidersResponse {
  results: TMDBProvider[];
}

// Mapeamento entre nomes do TMDB e nomes da tabela StreamingPlatform
const TMDB_TO_PLATFORM_MAPPING: Record<string, string> = {
  'Netflix': 'Netflix',
  'Netflix Standard with Ads': 'Netflix',
  'Prime Video': 'Prime Video',
  'Amazon Prime Video': 'Prime Video',
  'Amazon Prime Video with Ads': 'Prime Video',
  'Disney Plus': 'Disney+',
  'Disney+': 'Disney+',
  'HBO Max': 'HBO Max',
  'Max': 'HBO Max',
  'Paramount Plus': 'Paramount+',
  'Paramount+': 'Paramount+',
  'Paramount+ Amazon Channel': 'Paramount+',
  'Paramount Plus Premium': 'Paramount+',
  'Apple TV+': 'Apple TV+',
  'Apple TV Plus Amazon Channel': 'Apple TV+',
  'Apple TV': 'Apple TV (Loja)',
  'Google Play Movies': 'Google Play',
  'Google Play': 'Google Play',
  'Amazon Video': 'Prime Video',
  'Globoplay': 'Globoplay',
  'Claro video': 'Claro Video',
  'Claro tv+': 'Claro Video',
  'Telecine': 'Telecine',
  'Telecine Amazon Channel': 'Telecine',
  'Looke': 'Looke',
  'Looke Amazon Channel': 'Looke',
  'MUBI': 'MUBI',
  'MUBI Amazon Channel': 'MUBI',
  'Oldflix': 'Oldflix',
  'Crunchyroll': 'Crunchyroll',
  'Filmelier Plus Amazon Channel': 'Filmelier+',
  'MGM+': 'MGM+',
  'MGM Plus Amazon Channel': 'MGM+',
  'MGM+ Apple TV Channel': 'MGM+',
  'YouTube Premium': 'YouTube Premium',
  'YouTube (Gratuito)': 'YouTube (Gratuito)'
};

async function getAllProviders(): Promise<TMDBProvidersResponse> {
  try {
    const response = await axios.get<TMDBProvidersResponse>(
      `${TMDB_API_URL}/watch/providers/movie`,
      {
        params: { 
          api_key: TMDB_API_KEY,
          language: 'pt-BR',
          watch_region: 'BR'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar todos os providers:', error);
    throw error;
  }
}

async function getStreamingPlatforms() {
  try {
    const platforms = await prisma.streamingPlatform.findMany({
      select: {
        id: true,
        name: true,
        logoPath: true,
        category: true
      }
    });
    return platforms;
  } catch (error) {
    console.error('Erro ao buscar plataformas do banco:', error);
    throw error;
  }
}

async function updatePlatformLogo(platformId: number, logoPath: string) {
  try {
    await prisma.streamingPlatform.update({
      where: { id: platformId },
      data: { logoPath }
    });
    return true;
  } catch (error) {
    console.error(`Erro ao atualizar logo da plataforma ${platformId}:`, error);
    return false;
  }
}

async function updateStreamingPlatformLogos() {
  console.log('🎬 ATUALIZANDO LOGOS DAS PLATAFORMAS DE STREAMING (logoPath)');
  console.log('=' .repeat(60));

  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY não encontrada no arquivo .env');
    console.log('💡 Certifique-se de que a variável TMDB_API_KEY está definida no arquivo .env');
    return;
  }

  try {
    // Buscar providers da API TMDB
    console.log('📡 Buscando providers da API TMDB...');
    const tmdbProviders = await getAllProviders();
    
    // Filtrar apenas providers com prioridade para o Brasil
    const brProviders = tmdbProviders.results.filter(provider => 
      provider.display_priorities.BR !== undefined
    );

    console.log(`✅ Encontrados ${brProviders.length} providers com prioridade para o Brasil`);

    // Buscar plataformas do banco de dados
    console.log('📡 Buscando plataformas do banco de dados...');
    const dbPlatforms = await getStreamingPlatforms();
    console.log(`✅ Encontradas ${dbPlatforms.length} plataformas no banco`);

    // Criar mapa de providers TMDB por nome
    const tmdbProvidersMap = new Map<string, TMDBProvider>();
    brProviders.forEach(provider => {
      tmdbProvidersMap.set(provider.provider_name, provider);
    });

    // Criar mapa de plataformas do banco por nome
    const dbPlatformsMap = new Map<string, typeof dbPlatforms[0]>();
    dbPlatforms.forEach(platform => {
      dbPlatformsMap.set(platform.name, platform);
    });

    console.log('\n🔄 PROCESSANDO ATUALIZAÇÕES:');
    console.log('-'.repeat(60));

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Processar cada provider TMDB
    for (const [tmdbName, tmdbProvider] of tmdbProvidersMap) {
      const mappedName = TMDB_TO_PLATFORM_MAPPING[tmdbName];
      
      if (!mappedName) {
        console.log(`⚠️  Nome não mapeado: "${tmdbName}"`);
        continue;
      }

      const dbPlatform = dbPlatformsMap.get(mappedName);
      
      if (!dbPlatform) {
        console.log(`⚠️  Plataforma não encontrada no banco: "${mappedName}" (TMDB: "${tmdbName}")`);
        continue;
      }

      const logoPath = tmdbProvider.logo_path || null;

      if (!logoPath) {
        console.log(`⚠️  Logo não disponível para: "${mappedName}"`);
        skippedCount++;
        continue;
      }

      // Verificar se o logo já está atualizado
      if (dbPlatform.logoPath === logoPath) {
        console.log(`✅ Logo já atualizado: "${mappedName}"`);
        skippedCount++;
        continue;
      }

      // Atualizar logo
      console.log(`🔄 Atualizando logo de "${mappedName}":`);
      console.log(`   Antes: ${dbPlatform.logoPath || 'N/A'}`);
      console.log(`   Depois: ${logoPath}`);

      const success = await updatePlatformLogo(dbPlatform.id, logoPath);
      
      if (success) {
        console.log(`   ✅ Atualizado com sucesso!`);
        updatedCount++;
      } else {
        console.log(`   ❌ Erro na atualização`);
        errorCount++;
      }
    }

    console.log('\n📊 RESUMO DA ATUALIZAÇÃO:');
    console.log('=' .repeat(60));
    console.log(`✅ Atualizados: ${updatedCount}`);
    console.log(`⏭️  Pulados: ${skippedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📋 Total processado: ${updatedCount + skippedCount + errorCount}`);

    // Mostrar plataformas que não foram encontradas no TMDB
    console.log('\n🔍 PLATAFORMAS NÃO ENCONTRADAS NO TMDB:');
    console.log('-'.repeat(60));
    
    const mappedTmdbNames = new Set(Object.values(TMDB_TO_PLATFORM_MAPPING));
    const notFoundPlatforms = dbPlatforms.filter(platform => 
      !mappedTmdbNames.has(platform.name)
    );

    if (notFoundPlatforms.length > 0) {
      notFoundPlatforms.forEach(platform => {
        console.log(`⚠️  "${platform.name}" (ID: ${platform.id})`);
      });
    } else {
      console.log('✅ Todas as plataformas foram encontradas no TMDB!');
    }

  } catch (error) {
    console.error('❌ Erro ao executar o script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
if (require.main === module) {
  updateStreamingPlatformLogos()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

export { updateStreamingPlatformLogos };

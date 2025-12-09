// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeamento de nomes antigos para novos (padronizados)
const PLATFORM_MAPPING: Record<string, string> = {
  'Prime Video': 'Prime Video',
  'Prime Vídeo': 'Prime Video',        // Remove acento
  'Amazon Prime': 'Prime Video',       // Simplifica nome
  'Amazon Prime Video': 'Prime Video', // Simplifica nome
  'Google Play': 'Google Play',        // Sem "Filmes"
  'Google Play Filmes': 'Google Play', // Remove "Filmes"
  'Max': 'HBO Max',                    // Rebrand
  'Disney Plus': 'Disney+',            // Normaliza
  'Disney+': 'Disney+',
  'Netflix': 'Netflix',
  'Paramount+': 'Paramount+',
  'HBO Max': 'HBO Max',
  'Apple TV+': 'Apple TV+',
  'Microsoft Store': 'Microsoft Store'
};

// Lógica para determinar AccessType baseado na categoria da plataforma
function getAccessTypeFromCategory(category: string): string {
  switch (category) {
    case 'SUBSCRIPTION_PRIMARY':
      return 'INCLUDED_WITH_SUBSCRIPTION';
    case 'HYBRID':
      return 'HYBRID_OR_UNKNOWN';
    case 'RENTAL_PURCHASE_PRIMARY':
      return 'HYBRID_OR_UNKNOWN';
    case 'FREE_PRIMARY':
      return 'FREE_WITH_ADS';
    default:
      return 'HYBRID_OR_UNKNOWN';
  }
}

async function migrateStreamingPlatforms(movieLimit: number = 20) {
  console.log('🎬 === MIGRAÇÃO DE STREAMING PLATFORMS ===');
  console.log(`📊 Processando ${movieLimit} filmes aleatórios...\n`);

  try {
    // 1. Buscar plataformas cadastradas
    const streamingPlatforms = await prisma.streamingPlatform.findMany();
    const platformMap = new Map(streamingPlatforms.map(p => [p.name, p]));
    
    console.log('📋 Plataformas disponíveis no banco:');
    streamingPlatforms.forEach(p => {
      console.log(`  - ${p.name} (${p.category})`);
    });
    console.log('');

    // 2. Buscar filmes aleatórios que tenham streaming platforms
    const movies = await prisma.movie.findMany({
      where: {
        streamingPlatforms: {
          isEmpty: false
        }
      },
      take: movieLimit,
      orderBy: {
        createdAt: 'desc' // Pode ser alterado para randomização real se necessário
      },
      select: {
        id: true,
        title: true,
        year: true,
        streamingPlatforms: true
      }
    });

    console.log(`🎯 Encontrados ${movies.length} filmes para migrar\n`);

    // Estatísticas
    let totalMigrations = 0;
    let successfulMigrations = 0;
    let skippedPlatforms = 0;
    const unmappedPlatforms = new Set<string>();
    const migrationReport: Array<{
      movie: string;
      platforms: Array<{
        original: string;
        mapped: string;
        accessType: string;
        status: 'success' | 'skipped' | 'error';
      }>;
    }> = [];

    // 3. Processar cada filme
    for (const movie of movies) {
      console.log(`🎬 Processando: ${movie.title} (${movie.year})`);
      
      const movieReport = {
        movie: `${movie.title} (${movie.year})`,
        platforms: [] as any[]
      };

      for (const platformName of movie.streamingPlatforms) {
        totalMigrations++;
        
        // Mapear nome da plataforma
        const mappedName = PLATFORM_MAPPING[platformName] || platformName;
        const platform = platformMap.get(mappedName);

        if (!platform) {
          console.log(`  ❌ Plataforma não encontrada: "${platformName}" → "${mappedName}"`);
          unmappedPlatforms.add(platformName);
          skippedPlatforms++;
          
          movieReport.platforms.push({
            original: platformName,
            mapped: mappedName,
            accessType: 'N/A',
            status: 'skipped'
          });
          continue;
        }

        // Determinar AccessType
        const accessType = getAccessTypeFromCategory(platform.category);

        // Verificar se já existe
        const existingRelation = await prisma.movieStreamingPlatform.findFirst({
          where: {
            movieId: movie.id,
            streamingPlatformId: platform.id,
            accessType: accessType as any
          }
        });

        if (existingRelation) {
          console.log(`  ⚠️  Relação já existe: ${mappedName} (${accessType})`);
          movieReport.platforms.push({
            original: platformName,
            mapped: mappedName,
            accessType,
            status: 'skipped'
          });
          continue;
        }

        // Criar relação
        try {
          await prisma.movieStreamingPlatform.create({
            data: {
              movieId: movie.id,
              streamingPlatformId: platform.id,
              accessType: accessType as any
            }
          });

          console.log(`  ✅ Migrado: "${platformName}" → "${mappedName}" (${accessType})`);
          successfulMigrations++;
          
          movieReport.platforms.push({
            original: platformName,
            mapped: mappedName,
            accessType,
            status: 'success'
          });
        } catch (error) {
          console.log(`  ❌ Erro ao migrar: ${mappedName} - ${error}`);
          movieReport.platforms.push({
            original: platformName,
            mapped: mappedName,
            accessType,
            status: 'error'
          });
        }
      }

      migrationReport.push(movieReport);
      console.log('');
    }

    // 4. Relatório final
    console.log('📊 === RELATÓRIO DE MIGRAÇÃO ===');
    console.log(`✅ Migrações bem-sucedidas: ${successfulMigrations}`);
    console.log(`⚠️  Plataformas não mapeadas: ${skippedPlatforms}`);
    console.log(`📈 Total processado: ${totalMigrations}`);
    console.log(`🎯 Taxa de sucesso: ${((successfulMigrations / totalMigrations) * 100).toFixed(1)}%\n`);

    if (unmappedPlatforms.size > 0) {
      console.log('❌ Plataformas não encontradas:');
      unmappedPlatforms.forEach(p => console.log(`  - "${p}"`));
      console.log('');
    }

    // 5. Relatório detalhado
    console.log('📋 === RELATÓRIO DETALHADO ===');
    migrationReport.forEach(report => {
      console.log(`🎬 ${report.movie}:`);
      report.platforms.forEach(p => {
        const statusIcon = p.status === 'success' ? '✅' : p.status === 'skipped' ? '⚠️' : '❌';
        console.log(`  ${statusIcon} ${p.original} → ${p.mapped} (${p.accessType})`);
      });
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execução via linha de comando
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 20;

  console.log(`🚀 Iniciando migração com limite de ${limit} filmes...\n`);
  await migrateStreamingPlatforms(limit);
}

if (require.main === module) {
  main().catch(console.error);
}

export { migrateStreamingPlatforms };
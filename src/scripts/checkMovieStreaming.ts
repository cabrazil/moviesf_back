import { PrismaClient } from '@prisma/client';
import * as process from 'process';

const prisma = new PrismaClient();

async function checkMovieStreaming(tmdbId: number) {
  try {
    console.log(`🔍 Verificando plataformas de streaming para TMDB ID: ${tmdbId}`);
    console.log('==================================================');

    // Buscar o filme
    const movie = await prisma.movie.findUnique({
      where: { tmdbId },
      include: {
        platforms: {
          include: {
            streamingPlatform: true
          }
        }
      }
    });

    if (!movie) {
      console.log('❌ Filme não encontrado');
      return;
    }

    console.log(`✅ Filme encontrado: ${movie.title} (${movie.year})`);
    console.log(`📺 Total de plataformas associadas: ${movie.platforms.length}`);
    console.log('');

    if (movie.platforms.length === 0) {
      console.log('⚠️ Nenhuma plataforma de streaming associada');
      return;
    }

    // Agrupar por plataforma
    const platformGroups = movie.platforms.reduce((acc, platform) => {
      const platformName = platform.streamingPlatform.name;
      if (!acc[platformName]) {
        acc[platformName] = [];
      }
      acc[platformName].push(platform);
      return acc;
    }, {} as Record<string, typeof movie.platforms>);

    console.log('📋 Plataformas e tipos de acesso:');
    console.log('');

    Object.entries(platformGroups).forEach(([platformName, platforms]) => {
      console.log(`🎬 ${platformName}:`);
      platforms.forEach(platform => {
        const accessTypeDesc = getAccessTypeDescription(platform.accessType);
        console.log(`   - ${accessTypeDesc}`);
      });
      console.log('');
    });

    // Verificar se há Apple TV+ na lista
    const appleTVPlus = movie.platforms.find(p => 
      p.streamingPlatform.name.toLowerCase().includes('apple tv+') ||
      p.streamingPlatform.name.toLowerCase().includes('apple tv plus')
    );

    if (appleTVPlus) {
      console.log('🍎 Apple TV+ encontrado:');
      console.log(`   - Tipo: ${getAccessTypeDescription(appleTVPlus.accessType)}`);
      console.log(`   - Categoria da plataforma: ${appleTVPlus.streamingPlatform.category}`);
    } else {
      console.log('❌ Apple TV+ NÃO encontrado nas plataformas');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar plataformas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getAccessTypeDescription(accessType: string): string {
  switch (accessType) {
    case 'INCLUDED_WITH_SUBSCRIPTION':
      return 'Incluído na Assinatura';
    case 'PURCHASE':
      return 'Disponível para Compra';
    case 'RENTAL':
      return 'Disponível para Aluguel';
    case 'FREE_WITH_ADS':
      return 'Gratuito com Anúncios';
    case 'HYBRID_OR_UNKNOWN':
      return 'Híbrido ou Desconhecido';
    default:
      return `Outro (${accessType})`;
  }
}

// Executar script
const args = process.argv.slice(2);
const tmdbIdArg = args.find(arg => arg.startsWith('--tmdbId='));

if (!tmdbIdArg) {
  console.log('❌ Uso: npx ts-node src/scripts/checkMovieStreaming.ts --tmdbId=4566');
  process.exit(1);
}

const tmdbId = parseInt(tmdbIdArg.split('=')[1]);
checkMovieStreaming(tmdbId);

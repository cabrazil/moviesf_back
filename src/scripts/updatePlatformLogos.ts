import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeamento das plataformas para os arquivos de imagem
const platformLogoMap: Record<string, string> = {
  'Netflix': '/platforms/netflix.avif',
  'Netflix Basic with Ads': '/platforms/netflixbasicwithads.avif',
  'Amazon Prime Video': '/platforms/amazonprimevideo.avif',
  'Disney+': '/platforms/disneyplus.avif',
  'HBO Max': '/platforms/max.avif',
  'Globoplay': '/platforms/globoplay.avif',
  'Claro Video': '/platforms/clarovideo.avif',
  'Apple TV+': '/platforms/itunes.avif',
  'Paramount+': '/platforms/paramountplus.avif',
  'Looke': '/platforms/looke.avif',
  'Oldflix': '/platforms/oldflix.avif',
  'Play': '/platforms/play.avif',
  'Amazon': '/platforms/amazon.avif',
  'Amazon FilmeLier Plus': '/platforms/amazonfilmelierplus.avif',
  'Amazon HBO Max': '/platforms/amazonhbomax.avif',
  'Amazon Imovision': '/platforms/amazonimovision.avif',
  'Amazon Looke': '/platforms/amazonlooke.avif',
  'Amazon MGM+': '/platforms/amazonmgmplus.avif',
  'Amazon Paramount+': '/platforms/amazonparamountplus.avif',
  'Amazon Telecine': '/platforms/amazontelecine.avif',
  'Belas Artes à la Carte': '/platforms/belasartesalacarte.avif',
  'Reserva Imovision': '/platforms/reservaimovision.avif',
  'Univer Video': '/platforms/univervideo.avif',
  'YouTube Premium': '/platforms/youtubepremium.jpg',
  'YouTube': '/platforms/logo-youtube.png'
};

async function updatePlatformLogos() {
  try {
    console.log('🔄 Iniciando atualização dos logos das plataformas...');

    // Buscar todas as plataformas existentes
    const platforms = await prisma.streamingPlatform.findMany();
    console.log(`📊 Encontradas ${platforms.length} plataformas no banco`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const platform of platforms) {
      const logoPath = platformLogoMap[platform.name];
      
      if (logoPath) {
        await prisma.streamingPlatform.update({
          where: { id: platform.id },
          data: { logoUrl: logoPath }
        });
        console.log(`✅ ${platform.name} -> ${logoPath}`);
        updatedCount++;
      } else {
        console.log(`❌ Logo não encontrado para: ${platform.name}`);
        notFoundCount++;
      }
    }

    console.log('\n📈 Resumo:');
    console.log(`✅ ${updatedCount} plataformas atualizadas`);
    console.log(`❌ ${notFoundCount} plataformas sem logo encontrado`);

    // Listar plataformas que não foram encontradas
    if (notFoundCount > 0) {
      console.log('\n🔍 Plataformas sem logo:');
      for (const platform of platforms) {
        if (!platformLogoMap[platform.name]) {
          console.log(`   - ${platform.name}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro ao atualizar logos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
updatePlatformLogos();

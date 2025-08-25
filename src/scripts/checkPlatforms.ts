import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPlatforms() {
  try {
    console.log('🔍 Verificando plataformas no banco de dados...\n');

    const platforms = await prisma.streamingPlatform.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📊 Total de plataformas: ${platforms.length}\n`);

    if (platforms.length === 0) {
      console.log('❌ Nenhuma plataforma encontrada no banco');
      return;
    }

    console.log('📋 Lista de plataformas:');
    platforms.forEach((platform, index) => {
      console.log(`${index + 1}. ${platform.name} (ID: ${platform.id})`);
      console.log(`   Categoria: ${platform.category}`);
      console.log(`   Logo URL: ${platform.logoUrl || 'Não definido'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro ao verificar plataformas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
checkPlatforms();

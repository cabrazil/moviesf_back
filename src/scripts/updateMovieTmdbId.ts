import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateMovieTmdbId() {
  try {
    console.log('🔄 Atualizando tmdbId para "Moonlight: Sob a Luz do Luar"...');
    
    // Buscar o filme na base
    const movie = await prisma.movie.findFirst({
      where: {
        title: { contains: 'Moonlight: Sob a Luz do Luar', mode: 'insensitive' },
        year: 2016
      }
    });
    
    if (!movie) {
      console.log('❌ Filme "Moonlight: Sob a Luz do Luar" (2016) não encontrado na base');
      return;
    }
    
    console.log(`📋 Filme encontrado: ${movie.title} (ID: ${movie.id})`);
    console.log(`📊 tmdbId atual: ${movie.tmdbId || 'null'}`);
    
    // Atualizar o tmdbId
    const updatedMovie = await prisma.movie.update({
      where: { id: movie.id },
      data: { 
        tmdbId: 376867,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ tmdbId atualizado para: ${updatedMovie.tmdbId}`);
    console.log(`🎬 Filme: ${updatedMovie.title} (${updatedMovie.year})`);
    
  } catch (error) {
    console.error('❌ Erro ao atualizar tmdbId:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  updateMovieTmdbId();
} 
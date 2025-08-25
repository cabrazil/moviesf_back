/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

async function clearOscarData(movieTitle: string) {
  try {
    console.log(`🧹 LIMPANDO DADOS DO OSCAR PARA: ${movieTitle}`);
    console.log('==================================================');

    // Encontrar o filme
    const movie = await prisma.movie.findFirst({
      where: {
        original_title: {
          contains: movieTitle,
          mode: 'insensitive'
        }
      }
    });

    if (!movie) {
      console.log(`❌ Filme "${movieTitle}" não encontrado`);
      return;
    }

    console.log(`✅ Filme encontrado: ${movie.title} (ID: ${movie.id})`);

    // Limpar dados do Oscar
    const oscarAward = await prisma.award.findUnique({
      where: { name: 'Oscar' }
    });

    if (!oscarAward) {
      console.log('❌ Award "Oscar" não encontrado');
      return;
    }

    // Deletar vitórias de filmes
    const deletedWins = await prisma.movieAwardWin.deleteMany({
      where: {
        movieId: movie.id,
        awardId: oscarAward.id
      }
    });

    // Deletar indicações de filmes
    const deletedNominations = await prisma.movieAwardNomination.deleteMany({
      where: {
        movieId: movie.id,
        awardId: oscarAward.id
      }
    });

    // Deletar vitórias de pessoas para este filme
    const deletedPersonWins = await prisma.personAwardWin.deleteMany({
      where: {
        forMovieId: movie.id,
        awardId: oscarAward.id
      }
    });

    // Deletar indicações de pessoas para este filme
    const deletedPersonNominations = await prisma.personAwardNomination.deleteMany({
      where: {
        forMovieId: movie.id,
        awardId: oscarAward.id
      }
    });

    console.log(`✅ Vitórias de filmes deletadas: ${deletedWins.count}`);
    console.log(`✅ Indicações de filmes deletadas: ${deletedNominations.count}`);
    console.log(`✅ Vitórias de pessoas deletadas: ${deletedPersonWins.count}`);
    console.log(`✅ Indicações de pessoas deletadas: ${deletedPersonNominations.count}`);

    console.log('✅ LIMPEZA CONCLUÍDA!');

  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const movieTitle = process.argv[2];
  
  if (!movieTitle) {
    console.log('❌ Uso: npx ts-node src/scripts/clearOscarData.ts "Título do Filme"');
    process.exit(1);
  }

  clearOscarData(movieTitle);
}

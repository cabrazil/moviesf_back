#!/usr/bin/env ts-node

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findMovieTmdbId(title: string) {
  console.log(`🔍 Buscando filme: "${title}"`);
  console.log('='.repeat(50));

  try {
    const movies = await prisma.movie.findMany({
      where: {
        title: {
          contains: title,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        title: true,
        year: true,
        tmdbId: true,
        director: true
      },
      orderBy: { year: 'desc' }
    });

    if (movies.length === 0) {
      console.log(`❌ Nenhum filme encontrado com título contendo "${title}"`);
      return;
    }

    console.log(`✅ Encontrados ${movies.length} filme(s):\n`);
    
    movies.forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.title} (${movie.year || 'N/A'})`);
      console.log(`   Diretor: ${movie.director || 'N/A'}`);
      console.log(`   TMDB ID: ${movie.tmdbId || 'NÃO DEFINIDO'}`);
      console.log(`   UUID: ${movie.id}`);
      console.log('');
    });

    if (movies.length === 1 && movies[0].tmdbId) {
      console.log(`🎯 Para usar no rastreamento:`);
      console.log(`   npx ts-node src/scripts/traceMovieJourney.ts --tmdbId=${movies[0].tmdbId}`);
      console.log(`   npx ts-node src/scripts/debugMovieJourney.ts --tmdbId=${movies[0].tmdbId}`);
    }

  } catch (error) {
    console.error('❌ Erro ao buscar filme:', error);
  }
}

// Processar argumentos da linha de comando
if (require.main === module) {
  const args = process.argv.slice(2);
  let title: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--title=')) {
      title = args[i].split('=')[1];
    }
  }

  if (title) {
    findMovieTmdbId(title);
  } else {
    console.log(`
🔍 BUSCA DE TMDB ID DE FILMES
==============================

Uso:
  npx ts-node src/scripts/findMovieTmdbId.ts --title="Nome do Filme"

Exemplos:
  npx ts-node src/scripts/findMovieTmdbId.ts --title="Intocáveis"
  npx ts-node src/scripts/findMovieTmdbId.ts --title="Inception"
`);
  }

  // Certifique-se de desconectar o Prisma no final da execução
  prisma.$disconnect();
} 
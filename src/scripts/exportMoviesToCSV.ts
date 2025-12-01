/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportMoviesToCSV() {
  try {
    console.log('🎬 Exportando filmes para CSV...');

    // Buscar todos os filmes ordenados por título
    const movies = await prisma.movie.findMany({
      select: {
        title: true,
        year: true,
        tmdbId: true
      },
      orderBy: {
        title: 'asc'
      }
    });

    console.log(`📊 Total de filmes encontrados: ${movies.length}`);

    // Criar conteúdo CSV
    const csvHeader = 'title,year,tmdbId\n';
    const csvRows = movies.map(movie => {
      const title = movie.title.replace(/"/g, '""'); // Escapar aspas duplas
      const year = movie.year || '';
      const tmdbId = movie.tmdbId || '';
      return `"${title}",${year},${tmdbId}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Salvar arquivo
    const outputPath = path.join(__dirname, '../../../filmes-alfa.csv');
    writeFileSync(outputPath, csvContent, 'utf-8');

    console.log(`✅ Arquivo salvo em: ${outputPath}`);
    console.log(`📊 Total de registros: ${movies.length}`);

  } catch (error) {
    console.error('❌ Erro ao exportar filmes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
if (require.main === module) {
  exportMoviesToCSV();
}

export { exportMoviesToCSV };


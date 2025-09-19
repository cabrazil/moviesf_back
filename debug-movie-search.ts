import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function debugMovieSearch() {
  const filmTitle = "A Bela e a Fera";
  const year = 1991;

  console.log(`🔍 Buscando filme: "${filmTitle}" (${year})`);
  console.log('='.repeat(50));

  // 1. Busca exata por original_title
  console.log('\n1. Busca exata por original_title:');
  const exactSearch = await prisma.movie.findFirst({
    where: {
      original_title: filmTitle,
      year: year
    }
  });
  console.log('Resultado:', exactSearch ? `✅ Encontrado: ${exactSearch.original_title} (${exactSearch.title})` : '❌ Não encontrado');

  // 2. Busca com contains (como no script original)
  console.log('\n2. Busca com contains (insensitive):');
  const containsSearch = await prisma.movie.findFirst({
    where: {
      original_title: {
        contains: filmTitle,
        mode: 'insensitive'
      },
      year: year
    }
  });
  console.log('Resultado:', containsSearch ? `✅ Encontrado: ${containsSearch.original_title} (${containsSearch.title})` : '❌ Não encontrado');

  // 3. Busca por title (título em português)
  console.log('\n3. Busca por title (português):');
  const titleSearch = await prisma.movie.findFirst({
    where: {
      title: {
        contains: filmTitle,
        mode: 'insensitive'
      },
      year: year
    }
  });
  console.log('Resultado:', titleSearch ? `✅ Encontrado: ${titleSearch.original_title} (${titleSearch.title})` : '❌ Não encontrado');

  // 4. Busca mais ampla por ano
  console.log('\n4. Todos os filmes de 1991:');
  const all1991 = await prisma.movie.findMany({
    where: { year: 1991 },
    select: { id: true, title: true, original_title: true, year: true }
  });
  console.log(`Encontrados ${all1991.length} filmes:`);
  all1991.forEach(movie => {
    console.log(`  - ${movie.original_title} (${movie.title}) - ${movie.year}`);
  });

  // 5. Busca por "Bela" ou "Beast"
  console.log('\n5. Busca por palavras-chave:');
  const keywordSearch = await prisma.movie.findMany({
    where: {
      OR: [
        { original_title: { contains: 'Bela', mode: 'insensitive' } },
        { original_title: { contains: 'Beast', mode: 'insensitive' } },
        { title: { contains: 'Bela', mode: 'insensitive' } },
        { title: { contains: 'Beast', mode: 'insensitive' } }
      ],
      year: year
    },
    select: { id: true, title: true, original_title: true, year: true }
  });
  console.log(`Encontrados ${keywordSearch.length} filmes com palavras-chave:`);
  keywordSearch.forEach(movie => {
    console.log(`  - ${movie.original_title} (${movie.title}) - ${movie.year}`);
  });
}

debugMovieSearch()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

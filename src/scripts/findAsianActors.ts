import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Escaneando o banco de dados por atores com caracteres asiáticos/árabes não traduzidos...");

  const actors = await prisma.actor.findMany({
    include: {
      movies: true
    }
  });

  const specialActors = actors.filter((actor: any) => 
    /[\u0590-\u05FF\u0600-\u06FF\uAC00-\uD7AF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(actor.name)
  );

  if (specialActors.length === 0) {
    console.log("✅ Nenhum ator com caracteres exóticos encontrado! A base está limpa.");
    return;
  }

  console.log(`⚠️ Encontrados ${specialActors.length} atores não traduzidos.\n`);

  const movieIds = new Set<string>();
  specialActors.forEach(actor => {
    actor.movies.forEach(mc => {
      movieIds.add(mc.movieId);
    });
  });

  console.log("🎬 Filmes afetados que precisam ser apagados e re-importados:");
  console.log("--------------------------------------------------------------");
  
  for (const id of Array.from(movieIds)) {
    const movie = await prisma.movie.findUnique({ where: { id }});
    if (movie) {
      console.log(`📌 Título: ${movie.title} (${movie.year})`);
      console.log(`   Comando: npx ts-node src/scripts/deleteMovie.ts --title="${movie.title}" --year=${movie.year}`);
      console.log("--------------------------------------------------------------");
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

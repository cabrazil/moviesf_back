
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const titles = [
    'O Sabor da Vida',
    'Vidas Passadas',
    'Todos Nós Desconhecidos', // Checking presence for removal
    'Decisão de Partir', // Checking presence for removal
    'Click', // Checking presence for removal
    'É Assim Que Acaba' // Checking presence for removal
  ];

  console.log('--- SEARCHING SOURCE JOFS FOR JOF 7 MIGRATION ---');

  const movies = await prisma.movie.findMany({
    where: { title: { in: titles } },
    select: {
      title: true,
      year: true,
      movieSuggestionFlows: {
        select: {
          journeyOptionFlowId: true
        }
      }
    }
  });

  titles.forEach(reqTitle => {
    const found = movies.find(m => m.title === reqTitle);
    if (!found) {
      console.log(`❌ Not Found: "${reqTitle}"`);
    } else {
      const jofs = found.movieSuggestionFlows.map(f => f.journeyOptionFlowId).join(', ');
      console.log(`🎬 ${found.title} (${found.year}) -> JOFs: ${jofs}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

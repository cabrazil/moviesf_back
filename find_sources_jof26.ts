
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const titles = [
    'Dirty Dancing: Ritmo Quente',
    'RRR: Revolta, Rebelião, Revolução',
    'Furiosa: Uma Saga Mad Max',
    'Tudo em Todo o Lugar ao Mesmo Tempo'
  ];

  console.log('--- SEARCHING SOURCE JOFS FOR JOF 26 MIGRATION ---');

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


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const titles = [
    'John Wick 4: Baba Yaga',
    'O Dublê',
    'Furiosa: Uma Saga Mad Max',
    'Fogo Contra Fogo', // Checking presence for removal
    'Jack Reacher: O Último Tiro' // Checking presence for removal
  ];

  console.log('--- SEARCHING SOURCE JOFS FOR JOF 6 MIGRATION ---');

  const movies = await prisma.movie.findMany({
    where: {
      OR: [
        { title: { in: titles } },
        { title: { contains: 'Fogo Contra', mode: 'insensitive' } } // Handle typo robustness
      ]
    },
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
    // Fuzzy match for Fogo Contra Fogo/Hogo
    const found = movies.find(m => m.title === reqTitle || (reqTitle.includes('Fogo') && m.title.includes('Fogo Contra')));

    if (!found) {
      console.log(`❌ Not Found: "${reqTitle}"`);
    } else {
      const jofs = found.movieSuggestionFlows.map(f => f.journeyOptionFlowId).join(', ');
      console.log(`🎬 ${found.title} (${found.year}) -> JOFs: ${jofs}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

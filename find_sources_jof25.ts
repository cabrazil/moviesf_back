
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const titles = [
    'A Proposta',
    'O Casamento do Meu Melhor Amigo',
    '10 Coisas Que Eu Odeio em Você',
    'Free Guy: Assumindo o Controle',
    'Sing Sing',
    'Um Pai Para Minha Filha'
  ];

  console.log('--- SEARCHING SOURCE JOFS FOR JOF 25 MIGRATION ---');

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

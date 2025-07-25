
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function findMovie() {
  try {
    const movies = await prisma.movie.findMany({
      where: { title: { contains: 'Pulp', mode: 'insensitive' } },
      select: { title: true, year: true }
    });
    console.log('Found movies:', movies);
  } catch (e) {
    console.error('Error fetching movies:', e);
  } finally {
    await prisma.$disconnect();
  }
}
findMovie();

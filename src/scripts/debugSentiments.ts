
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectSentiments() {
  console.log('🔍 Analyzing SubSentiment distribution...');

  // 1. Get raw counts
  const counts = await prisma.subSentiment.findMany({
    include: {
      mainSentiment: true,
      _count: {
        select: { movieSentiment: true }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Print summary similar to what user saw
  console.log('\n📊 Counts per SubSentiment:');
  const groupedByCount: Record<number, string[]> = {};

  counts.forEach(s => {
    const count = s._count.movieSentiment;
    console.log(`- ${s.name} (${s.mainSentiment.name}): ${count}`);

    if (!groupedByCount[count]) groupedByCount[count] = [];
    groupedByCount[count].push(s.name);
  });

  // 2. Check for Overlaps
  // Are the 85 movies in "Doçura" the SAME 85 movies in "Conforto"?
  const weirdCount = 85;
  if (groupedByCount[weirdCount] && groupedByCount[weirdCount].length > 1) {
    console.log(`\n⚠️ Suspicious cluster found at count ${weirdCount}:`);
    const suspectNames = groupedByCount[weirdCount];
    console.log(`Sentiments: ${suspectNames.join(', ')}`);

    // Pick top 2 suspects
    const s1 = suspectNames[0];
    const s2 = suspectNames[1];

    console.log(`\n🕵️ Comparing movie lists for "${s1}" vs "${s2}"...`);

    const movies1 = await prisma.movie.findMany({
      where: { movieSentiments: { some: { subSentiment: { name: s1 } } } },
      select: { title: true }
    });

    const movies2 = await prisma.movie.findMany({
      where: { movieSentiments: { some: { subSentiment: { name: s2 } } } },
      select: { title: true }
    });

    const titles1 = new Set(movies1.map(m => m.title).sort());
    const titles2 = new Set(movies2.map(m => m.title).sort());

    // Check intersection
    let overlap = 0;
    titles1.forEach(t => { if (titles2.has(t)) overlap++; });

    console.log(`- Movies in "${s1}": ${titles1.size}`);
    console.log(`- Movies in "${s2}": ${titles2.size}`);
    console.log(`- Exact Overlap: ${overlap} movies shared.`);

    if (overlap === titles1.size && titles1.size === titles2.size) {
      console.log('🚨 CONCLUSION: The lists are IDENTICAL. Likely a data population script bug.');
    } else {
      console.log('✅ CONCLUSION: The lists are different, just coincidental count.');
    }
  }

  await prisma.$disconnect();
}

inspectSentiments();

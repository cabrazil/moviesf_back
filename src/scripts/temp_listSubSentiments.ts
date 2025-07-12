import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const subSentiments = await prisma.subSentiment.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
  console.log(subSentiments);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

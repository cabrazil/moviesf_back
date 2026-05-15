import { loadEnvironment, validateEnvironment } from './src/config/env-loader';
loadEnvironment();
validateEnvironment();
import { prismaBlog } from './src/prisma';

async function test() {
  try {
    const res = await prismaBlog.$queryRawUnsafe(`SELECT * FROM "Category" LIMIT 1`);
    console.log("Category columns:", res);
  } catch (e: any) {
    console.error("Error:", e.message);
  }

  await prismaBlog.$disconnect();
}
test();

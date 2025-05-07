import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function fixMovieSuggestionFlow() {
  try {
    // Executar SQL diretamente para remover a constraint
    await prisma.$executeRaw`
      ALTER TABLE "MovieSuggestionFlow" 
      DROP CONSTRAINT IF EXISTS "MovieSuggestionFlow_journeyOptionFlowId_movieId_key";
    `;

    await prisma.$executeRaw`
      ALTER TABLE "MovieSuggestionFlow" 
      DROP CONSTRAINT IF EXISTS "movie_suggestion_flow_unique";
    `;

    await prisma.$executeRaw`
      ALTER TABLE "MovieSuggestionFlow" 
      DROP CONSTRAINT IF EXISTS "movie_suggestion_flow_unique_constraint";
    `;

    console.log('✅ Constraints removidas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao remover constraints:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMovieSuggestionFlow(); 
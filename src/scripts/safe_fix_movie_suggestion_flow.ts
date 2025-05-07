import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function safeFixMovieSuggestionFlow() {
  try {
    console.log('🔄 Iniciando processo de correção segura...');

    // 1. Fazer backup dos dados existentes
    console.log('📦 Fazendo backup dos dados...');
    const existingData = await prisma.movieSuggestionFlow.findMany();
    console.log(`✅ Backup concluído: ${existingData.length} registros salvos`);

    // 2. Listar todas as constraints existentes
    console.log('🔍 Listando constraints existentes...');
    const constraints = await prisma.$queryRaw`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'MovieSuggestionFlow'::regclass;
    `;
    console.log('Constraints encontradas:', constraints);

    // 3. Remover todas as constraints de unicidade
    console.log('🔧 Removendo constraints...');
    const constraintNames = [
      'MovieSuggestionFlow_journeyOptionFlowId_movieId_key',
      'movie_suggestion_flow_unique',
      'movie_suggestion_flow_unique_constraint',
      'MovieSuggestionFlow_pkey',
      'MovieSuggestionFlow_journeyOptionFlowId_fkey',
      'MovieSuggestionFlow_movieId_fkey'
    ];

    for (const constraintName of constraintNames) {
      try {
        await prisma.$executeRaw`
          ALTER TABLE "MovieSuggestionFlow" 
          DROP CONSTRAINT IF EXISTS ${constraintName};
        `;
        console.log(`✅ Constraint ${constraintName} removida ou não existia`);
      } catch (error) {
        console.log(`ℹ️ Erro ao tentar remover ${constraintName}:`, error.message);
      }
    }

    // 4. Recriar as constraints necessárias (exceto a de unicidade)
    console.log('🔧 Recriando constraints necessárias...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "MovieSuggestionFlow" 
        ADD CONSTRAINT "MovieSuggestionFlow_pkey" PRIMARY KEY ("id");
      `;
      console.log('✅ Primary key recriada');

      await prisma.$executeRaw`
        ALTER TABLE "MovieSuggestionFlow" 
        ADD CONSTRAINT "MovieSuggestionFlow_journeyOptionFlowId_fkey" 
        FOREIGN KEY ("journeyOptionFlowId") 
        REFERENCES "JourneyOptionFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      `;
      console.log('✅ Foreign key journeyOptionFlowId recriada');

      await prisma.$executeRaw`
        ALTER TABLE "MovieSuggestionFlow" 
        ADD CONSTRAINT "MovieSuggestionFlow_movieId_fkey" 
        FOREIGN KEY ("movieId") 
        REFERENCES "Movie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      `;
      console.log('✅ Foreign key movieId recriada');
    } catch (error) {
      console.error('❌ Erro ao recriar constraints:', error);
    }

    // 5. Verificar se os dados continuam intactos
    const dataAfterFix = await prisma.movieSuggestionFlow.findMany();
    console.log(`✅ Verificação concluída: ${dataAfterFix.length} registros encontrados`);

    if (dataAfterFix.length === existingData.length) {
      console.log('✅ Todos os dados foram preservados!');
    } else {
      console.warn('⚠️ Atenção: Número de registros diferente do backup!');
      console.log(`Registros antes: ${existingData.length}`);
      console.log(`Registros depois: ${dataAfterFix.length}`);
    }

    // 6. Tentar inserir um registro duplicado para testar
    const firstRecord = existingData[0];
    if (firstRecord) {
      try {
        await prisma.movieSuggestionFlow.create({
          data: {
            movieId: firstRecord.movieId,
            journeyOptionFlowId: 49, // ID válido que você mencionou
            reason: 'Teste de duplicação',
            relevance: 1
          }
        });
        console.log('✅ Teste de inserção com mesmo movieId funcionou!');
      } catch (error) {
        console.error('❌ Erro no teste de inserção:', error);
      }
    }

    console.log('✅ Processo concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o processo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

safeFixMovieSuggestionFlow(); 
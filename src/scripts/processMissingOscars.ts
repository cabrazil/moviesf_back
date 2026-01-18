
import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import { OscarDataService } from '../services/OscarDataService';

const prisma = new PrismaClient();
const oscarService = new OscarDataService();

async function main() {
  console.log('🔍 Buscando filmes com menção a Oscar mas sem dados detalhados no banco...');

  // SQL Raw para encontrar os filmes (adaptação da query SQL para Prisma Raw ou lógica JS)
  // Como Prisma não tem EXISTS fácil no findMany, vamos buscar os candidatos e filtrar ou usar raw query.
  // Usando raw query para eficiência.

  const moviesToProcess = await prisma.$queryRaw<Array<{ id: string, title: string, tmdbId: number, year: number, awardsSummary: string }>>`
    SELECT 
        m.id, 
        m.title, 
        m."tmdbId", 
        m.year, 
        m."awardsSummary"
    FROM "Movie" m
    WHERE 
        (m."awardsSummary" ILIKE '%Oscar%' OR m."awardsSummary" ILIKE '%Academy Award%')
        AND NOT EXISTS (
            SELECT 1 
            FROM "MovieAwardWin" maw
            JOIN "Award" a ON maw."awardId" = a.id
            WHERE maw."movieId" = m.id AND a.name = 'Oscar'
        )
        AND NOT EXISTS (
            SELECT 1 
            FROM "MovieAwardNomination" man
            JOIN "Award" a ON man."awardId" = a.id
            WHERE man."movieId" = m.id AND a.name = 'Oscar'
        )
    ORDER BY m.year DESC;
  `;

  console.log(`📋 Encontrados ${moviesToProcess.length} filmes pendentes de processamento.`);

  if (moviesToProcess.length === 0) {
    console.log('✅ Nenhum filme pendente. Tudo atualizado!');
    return;
  }

  console.log('🚀 Iniciando processamento em massa...');
  console.log('--------------------------------------------------');

  let processedCount = 0;
  let errorCount = 0;

  for (const movie of moviesToProcess) {
    if (!movie.tmdbId) {
      console.log(`⚠️ Pulando "${movie.title}" (sem tmdbId)`);
      continue;
    }

    try {
      console.log(`\n[${processedCount + 1}/${moviesToProcess.length}] Processando: ${movie.title} (${movie.year})`);
      await oscarService.enrichMovieAwards(movie.tmdbId);
      processedCount++;

      // Pequena pausa para não estourar rate limit da API se tiver muitos
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Erro ao processar ${movie.title}:`, error);
      errorCount++;
    }
  }

  console.log('\n==================================================');
  console.log(`🏁 Processamento concluído!`);
  console.log(`✅ Sucessos: ${processedCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log('==================================================');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import { curationLogger, LogLevel } from '../services/curationLogger';

const prisma = new PrismaClient();

class SystemCleanup {
  private cleanupActions = 0;
  private errors = 0;

  async removeDuplicateMovies(): Promise<void> {
    console.log('\n🧹 Removendo filmes duplicados...');
    
    try {
      // Buscar filmes duplicados por título e ano
      const duplicateGroups = await prisma.movie.groupBy({
        by: ['title', 'year'],
        _count: { id: true },
        having: {
          id: { _count: { gt: 1 } }
        }
      });

      for (const group of duplicateGroups) {
        const duplicateMovies = await prisma.movie.findMany({
          where: {
            title: group.title,
            year: group.year
          },
          orderBy: { createdAt: 'desc' }
        });

        // Manter o mais recente, remover os outros
        const [keepMovie, ...removeMovies] = duplicateMovies;
        
        for (const movie of removeMovies) {
          console.log(`   Removendo duplicata: ${movie.title} (${movie.year}) - ID: ${movie.id}`);
          
          // Remover relacionamentos primeiro
          await prisma.movieSentiment.deleteMany({
            where: { movieId: movie.id }
          });
          
          await prisma.movieSuggestionFlow.deleteMany({
            where: { movieId: movie.id }
          });
          
          // Remover filme
          await prisma.movie.delete({
            where: { id: movie.id }
          });
          
          this.cleanupActions++;
        }
        
        console.log(`   Mantido: ${keepMovie.title} (${keepMovie.year}) - ID: ${keepMovie.id}`);
      }
      
      console.log(`✅ Removidas ${duplicateGroups.length} duplicatas de filmes`);
      
    } catch (error) {
      console.error('❌ Erro ao remover filmes duplicados:', error);
      this.errors++;
    }
  }

  async removeOrphanedMovieSentiments(): Promise<void> {
    console.log('\n🧹 Removendo sentimentos de filmes órfãos...');
    
    try {
      // Buscar MovieSentiments com filmes inexistentes usando raw SQL
      const orphanedSentiments = await prisma.$queryRaw<Array<{movieId: string}>>`
        SELECT "movieId" FROM "MovieSentiment" 
        WHERE "movieId" NOT IN (SELECT "id" FROM "Movie")
      `;

      if (orphanedSentiments.length > 0) {
        const orphanedIds = orphanedSentiments.map(item => item.movieId);
        const deletedCount = await prisma.movieSentiment.deleteMany({
          where: {
            movieId: { in: orphanedIds }
          }
        });

        console.log(`✅ Removidos ${deletedCount.count} sentimentos órfãos`);
        this.cleanupActions += deletedCount.count;
      } else {
        console.log('✅ Nenhum sentimento órfão encontrado');
      }
      
    } catch (error) {
      console.error('❌ Erro ao remover sentimentos órfãos:', error);
      this.errors++;
    }
  }

  async removeOrphanedMovieSuggestions(): Promise<void> {
    console.log('\n🧹 Removendo sugestões de filmes órfãs...');
    
    try {
      // Buscar MovieSuggestionFlow com filmes inexistentes usando raw SQL
      const orphanedSuggestions = await prisma.$queryRaw<Array<{movieId: string}>>`
        SELECT "movieId" FROM "MovieSuggestionFlow" 
        WHERE "movieId" NOT IN (SELECT "id" FROM "Movie")
      `;

      if (orphanedSuggestions.length > 0) {
        const orphanedIds = orphanedSuggestions.map(item => item.movieId);
        const deletedCount = await prisma.movieSuggestionFlow.deleteMany({
          where: {
            movieId: { in: orphanedIds }
          }
        });

        console.log(`✅ Removidas ${deletedCount.count} sugestões órfãs`);
        this.cleanupActions += deletedCount.count;
      } else {
        console.log('✅ Nenhuma sugestão órfã encontrada');
      }
      
    } catch (error) {
      console.error('❌ Erro ao remover sugestões órfãs:', error);
      this.errors++;
    }
  }

  async fixInconsistentMovieData(): Promise<void> {
    console.log('\n🔧 Corrigindo dados inconsistentes de filmes...');
    
    try {
      // Buscar filmes com anos inválidos
      const moviesWithInvalidYear = await prisma.movie.findMany({
        where: {
          OR: [
            { year: { lt: 1900 } },
            { year: { gt: new Date().getFullYear() + 10 } }
          ]
        }
      });

      for (const movie of moviesWithInvalidYear) {
        console.log(`   Corrigindo ano inválido: ${movie.title} (${movie.year})`);
        
        // Tentar extrair ano do título
        const yearMatch = movie.title.match(/\((\d{4})\)$/);
        if (yearMatch) {
          const extractedYear = parseInt(yearMatch[1]);
          if (extractedYear >= 1900 && extractedYear <= new Date().getFullYear() + 10) {
            await prisma.movie.update({
              where: { id: movie.id },
              data: { 
                year: extractedYear,
                title: movie.title.replace(/\s*\(\d{4}\)$/, '').trim()
              }
            });
            
            console.log(`     Corrigido para: ${movie.title} (${extractedYear})`);
            this.cleanupActions++;
            continue;
          }
        }
        
        // Se não conseguir extrair, definir como null
        await prisma.movie.update({
          where: { id: movie.id },
          data: { year: null }
        });
        
        console.log(`     Ano definido como null para: ${movie.title}`);
        this.cleanupActions++;
      }
      
      console.log(`✅ Corrigidos ${moviesWithInvalidYear.length} filmes com anos inválidos`);
      
    } catch (error) {
      console.error('❌ Erro ao corrigir dados inconsistentes:', error);
      this.errors++;
    }
  }

  async removeEmptyJourneySteps(): Promise<void> {
    console.log('\n🧹 Removendo passos de jornada vazios...');
    
    try {
      // Buscar passos sem opções
      const stepsWithoutOptions = await prisma.journeyStepFlow.findMany({
        where: {
          options: {
            none: {}
          }
        },
        include: {
          journeyFlow: {
            include: {
              mainSentiment: {
                select: { name: true }
              }
            }
          }
        }
      });

      for (const step of stepsWithoutOptions) {
        console.log(`   Removendo passo vazio: ${step.question} (${step.journeyFlow.mainSentiment.name})`);
        
        // Remover associações de intenção emocional primeiro
        await prisma.emotionalIntentionJourneyStep.deleteMany({
          where: { journeyStepFlowId: step.id }
        });
        
        // Remover passo
        await prisma.journeyStepFlow.delete({
          where: { id: step.id }
        });
        
        this.cleanupActions++;
      }
      
      console.log(`✅ Removidos ${stepsWithoutOptions.length} passos vazios`);
      
    } catch (error) {
      console.error('❌ Erro ao remover passos vazios:', error);
      this.errors++;
    }
  }

  async consolidateSubSentiments(): Promise<void> {
    console.log('\n🔄 Consolidando subsentimentos duplicados...');
    
    try {
      // Buscar subsentimentos duplicados por nome e mainSentimentId
      const duplicateSubSentiments = await prisma.subSentiment.groupBy({
        by: ['name', 'mainSentimentId'],
        _count: { id: true },
        having: {
          id: { _count: { gt: 1 } }
        }
      });

      for (const group of duplicateSubSentiments) {
        const duplicates = await prisma.subSentiment.findMany({
          where: {
            name: group.name,
            mainSentimentId: group.mainSentimentId
          },
          orderBy: { createdAt: 'desc' }
        });

        const [keepSubSentiment, ...removeSubSentiments] = duplicates;
        
        for (const subSentiment of removeSubSentiments) {
          console.log(`   Consolidando: ${subSentiment.name} (ID: ${subSentiment.id})`);
          
          // Atualizar referências para usar o subsentimento que vamos manter
          await prisma.movieSentiment.updateMany({
            where: { subSentimentId: subSentiment.id },
            data: { subSentimentId: keepSubSentiment.id }
          });
          
          await prisma.journeyOptionFlowSubSentiment.updateMany({
            where: { subSentimentId: subSentiment.id },
            data: { subSentimentId: keepSubSentiment.id }
          });
          
          // Remover subsentimento duplicado
          await prisma.subSentiment.delete({
            where: { id: subSentiment.id }
          });
          
          this.cleanupActions++;
        }
        
        console.log(`   Mantido: ${keepSubSentiment.name} (ID: ${keepSubSentiment.id})`);
      }
      
      console.log(`✅ Consolidados ${duplicateSubSentiments.length} grupos de subsentimentos`);
      
    } catch (error) {
      console.error('❌ Erro ao consolidar subsentimentos:', error);
      this.errors++;
    }
  }

  async optimizeDatabase(): Promise<void> {
    console.log('\n🗄️ Otimizando banco de dados...');
    
    try {
      // Executar VACUUM e ANALYZE no PostgreSQL
      await prisma.$executeRawUnsafe('VACUUM ANALYZE');
      
      console.log('✅ Banco de dados otimizado');
      
    } catch (error) {
      console.error('❌ Erro ao otimizar banco:', error);
      this.errors++;
    }
  }

  async runFullCleanup(): Promise<void> {
    console.log('\n🧹 === LIMPEZA COMPLETA DO SISTEMA ===');
    
    const startTime = Date.now();
    
    await this.removeDuplicateMovies();
    await this.removeOrphanedMovieSentiments();
    await this.removeOrphanedMovieSuggestions();
    await this.fixInconsistentMovieData();
    await this.removeEmptyJourneySteps();
    await this.consolidateSubSentiments();
    await this.optimizeDatabase();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n📊 === RESUMO DA LIMPEZA ===');
    console.log(`✅ Ações de limpeza executadas: ${this.cleanupActions}`);
    console.log(`❌ Erros encontrados: ${this.errors}`);
    console.log(`⏱️ Tempo total: ${duration}ms`);
    
    // Log da sessão
    await curationLogger.logBatchProcessing(
      this.errors > 0 ? LogLevel.WARN : LogLevel.INFO,
      'Limpeza do sistema concluída',
      {
        duration: `${duration}ms`,
        cleanupActions: this.cleanupActions,
        errors: this.errors
      }
    );
    
    if (this.errors > 0) {
      console.log('\n⚠️ Limpeza concluída com erros. Verifique os logs para mais detalhes.');
    } else {
      console.log('\n🎉 Limpeza concluída com sucesso!');
    }
  }
}

// Função principal
async function main() {
  const cleanup = new SystemCleanup();
  
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('🧹 === SISTEMA DE LIMPEZA DE DADOS ===');
      console.log('\nUso:');
      console.log('  npx ts-node cleanup.ts --full         # Limpeza completa');
      console.log('  npx ts-node cleanup.ts --duplicates   # Apenas duplicatas');
      console.log('  npx ts-node cleanup.ts --orphans      # Apenas registros órfãos');
      console.log('  npx ts-node cleanup.ts --optimize     # Apenas otimização');
      return;
    }
    
    switch (args[0]) {
      case '--full':
        await cleanup.runFullCleanup();
        break;
      case '--duplicates':
        await cleanup.removeDuplicateMovies();
        await cleanup.consolidateSubSentiments();
        break;
      case '--orphans':
        await cleanup.removeOrphanedMovieSentiments();
        await cleanup.removeOrphanedMovieSuggestions();
        break;
      case '--optimize':
        await cleanup.optimizeDatabase();
        break;
      default:
        console.log('❌ Opção inválida. Use --help para ver as opções disponíveis.');
    }
    
  } catch (error) {
    console.error('❌ Erro fatal durante limpeza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
} 
// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import { curationLogger, LogLevel } from '../services/curationLogger';

const prisma = new PrismaClient();

interface HealthCheckResult {
  category: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
}

class SystemHealthChecker {
  private results: HealthCheckResult[] = [];

  private addResult(result: HealthCheckResult): void {
    this.results.push(result);
    
    const emoji = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${emoji} ${result.category}: ${result.message}`);
    
    if (result.details) {
      console.log(`   Detalhes: ${JSON.stringify(result.details, null, 2)}`);
    }
  }

  async checkDatabaseConnectivity(): Promise<void> {
    try {
      await prisma.$connect();
      this.addResult({
        category: 'DATABASE_CONNECTION',
        status: 'OK',
        message: 'Conexão com banco de dados estabelecida'
      });
    } catch (error) {
      this.addResult({
        category: 'DATABASE_CONNECTION',
        status: 'ERROR',
        message: 'Falha na conexão com banco de dados',
        details: error
      });
    }
  }

  async checkEnvironmentVariables(): Promise<void> {
    const requiredVars = ['DATABASE_URL', 'OPENAI_API_KEY', 'TMDB_API_KEY'];
    const missingVars: string[] = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length === 0) {
      this.addResult({
        category: 'ENVIRONMENT_VARIABLES',
        status: 'OK',
        message: 'Todas as variáveis de ambiente obrigatórias estão configuradas'
      });
    } else {
      this.addResult({
        category: 'ENVIRONMENT_VARIABLES',
        status: 'ERROR',
        message: 'Variáveis de ambiente faltando',
        details: { missing: missingVars }
      });
    }
  }

  async checkDataIntegrity(): Promise<void> {
    try {
      // Verificar filmes sem sentimentos
      const moviesWithoutSentiments = await prisma.movie.findMany({
        where: {
          movieSentiments: {
            none: {}
          }
        },
        select: { id: true, title: true, year: true }
      });

      if (moviesWithoutSentiments.length > 0) {
        this.addResult({
          category: 'DATA_INTEGRITY',
          status: 'WARNING',
          message: `${moviesWithoutSentiments.length} filmes sem sentimentos associados`,
          details: { count: moviesWithoutSentiments.length, examples: moviesWithoutSentiments.slice(0, 5) }
        });
      } else {
        this.addResult({
          category: 'DATA_INTEGRITY',
          status: 'OK',
          message: 'Todos os filmes possuem sentimentos associados'
        });
      }

      // Verificar sentimentos principais sem subsentimentos
      const mainSentimentsWithoutSub = await prisma.mainSentiment.findMany({
        where: {
          subSentiments: {
            none: {}
          }
        },
        select: { id: true, name: true }
      });

      if (mainSentimentsWithoutSub.length > 0) {
        this.addResult({
          category: 'DATA_INTEGRITY',
          status: 'WARNING',
          message: `${mainSentimentsWithoutSub.length} sentimentos principais sem subsentimentos`,
          details: { sentiments: mainSentimentsWithoutSub }
        });
      } else {
        this.addResult({
          category: 'DATA_INTEGRITY',
          status: 'OK',
          message: 'Todos os sentimentos principais possuem subsentimentos'
        });
      }

      // Verificar opções de jornada sem sugestões de filmes
      const optionsWithoutSuggestions = await prisma.journeyOptionFlow.findMany({
        where: {
          movieSuggestions: {
            none: {}
          }
        },
        select: { id: true, text: true }
      });

      if (optionsWithoutSuggestions.length > 0) {
        this.addResult({
          category: 'DATA_INTEGRITY',
          status: 'WARNING',
          message: `${optionsWithoutSuggestions.length} opções de jornada sem sugestões de filmes`,
          details: { count: optionsWithoutSuggestions.length, examples: optionsWithoutSuggestions.slice(0, 5) }
        });
      } else {
        this.addResult({
          category: 'DATA_INTEGRITY',
          status: 'OK',
          message: 'Todas as opções de jornada possuem sugestões de filmes'
        });
      }

    } catch (error) {
      this.addResult({
        category: 'DATA_INTEGRITY',
        status: 'ERROR',
        message: 'Erro ao verificar integridade dos dados',
        details: error
      });
    }
  }

  async checkJourneyFlowIntegrity(): Promise<void> {
    try {
      // Verificar fluxos de jornada sem passos
      const flowsWithoutSteps = await prisma.journeyFlow.findMany({
        where: {
          steps: {
            none: {}
          }
        },
        include: {
          mainSentiment: {
            select: { name: true }
          }
        }
      });

      if (flowsWithoutSteps.length > 0) {
        this.addResult({
          category: 'JOURNEY_INTEGRITY',
          status: 'ERROR',
          message: `${flowsWithoutSteps.length} fluxos de jornada sem passos`,
          details: { flows: flowsWithoutSteps.map(f => ({ id: f.id, sentiment: f.mainSentiment.name })) }
        });
      } else {
        this.addResult({
          category: 'JOURNEY_INTEGRITY',
          status: 'OK',
          message: 'Todos os fluxos de jornada possuem passos'
        });
      }

      // Verificar passos sem opções
      const stepsWithoutOptions = await prisma.journeyStepFlow.findMany({
        where: {
          options: {
            none: {}
          }
        },
        select: { id: true, question: true, stepId: true }
      });

      if (stepsWithoutOptions.length > 0) {
        this.addResult({
          category: 'JOURNEY_INTEGRITY',
          status: 'ERROR',
          message: `${stepsWithoutOptions.length} passos de jornada sem opções`,
          details: { steps: stepsWithoutOptions }
        });
      } else {
        this.addResult({
          category: 'JOURNEY_INTEGRITY',
          status: 'OK',
          message: 'Todos os passos de jornada possuem opções'
        });
      }

    } catch (error) {
      this.addResult({
        category: 'JOURNEY_INTEGRITY',
        status: 'ERROR',
        message: 'Erro ao verificar integridade dos fluxos de jornada',
        details: error
      });
    }
  }

  async checkEmotionalIntentionSystem(): Promise<void> {
    try {
      // Verificar sentimentos principais sem intenções emocionais
      const mainSentimentsWithoutIntentions = await prisma.mainSentiment.findMany({
        where: {
          emotionalIntentions: {
            none: {}
          }
        },
        select: { id: true, name: true }
      });

      if (mainSentimentsWithoutIntentions.length > 0) {
        this.addResult({
          category: 'EMOTIONAL_INTENTION',
          status: 'WARNING',
          message: `${mainSentimentsWithoutIntentions.length} sentimentos principais sem intenções emocionais`,
          details: { sentiments: mainSentimentsWithoutIntentions }
        });
      } else {
        this.addResult({
          category: 'EMOTIONAL_INTENTION',
          status: 'OK',
          message: 'Todos os sentimentos principais possuem intenções emocionais'
        });
      }

      // Verificar intenções emocionais sem associações de jornada
      const intentionsWithoutJourney = await prisma.emotionalIntention.findMany({
        where: {
          emotionalIntentionJourneySteps: {
            none: {}
          }
        },
        include: {
          mainSentiment: {
            select: { name: true }
          }
        }
      });

      if (intentionsWithoutJourney.length > 0) {
        this.addResult({
          category: 'EMOTIONAL_INTENTION',
          status: 'WARNING',
          message: `${intentionsWithoutJourney.length} intenções emocionais sem associações de jornada`,
          details: {
            intentions: intentionsWithoutJourney.map(i => ({
              id: i.id,
              type: i.intentionType,
              sentiment: i.mainSentiment.name
            }))
          }
        });
      } else {
        this.addResult({
          category: 'EMOTIONAL_INTENTION',
          status: 'OK',
          message: 'Todas as intenções emocionais possuem associações de jornada'
        });
      }

    } catch (error) {
      this.addResult({
        category: 'EMOTIONAL_INTENTION',
        status: 'ERROR',
        message: 'Erro ao verificar sistema de intenções emocionais',
        details: error
      });
    }
  }

  async checkSystemStats(): Promise<void> {
    try {
      const stats = {
        movies: await prisma.movie.count(),
        mainSentiments: await prisma.mainSentiment.count(),
        subSentiments: await prisma.subSentiment.count(),
        journeyFlows: await prisma.journeyFlow.count(),
        journeySteps: await prisma.journeyStepFlow.count(),
        journeyOptions: await prisma.journeyOptionFlow.count(),
        movieSuggestions: await prisma.movieSuggestionFlow.count(),
        emotionalIntentions: await prisma.emotionalIntention.count(),
        movieSentiments: await prisma.movieSentiment.count()
      };

      this.addResult({
        category: 'SYSTEM_STATS',
        status: 'OK',
        message: 'Estatísticas do sistema coletadas',
        details: stats
      });

    } catch (error) {
      this.addResult({
        category: 'SYSTEM_STATS',
        status: 'ERROR',
        message: 'Erro ao coletar estatísticas do sistema',
        details: error
      });
    }
  }

  async runFullHealthCheck(): Promise<void> {
    console.log('\n🏥 === VERIFICAÇÃO DE SAÚDE DO SISTEMA ===\n');
    
    const startTime = Date.now();
    
    await this.checkEnvironmentVariables();
    await this.checkDatabaseConnectivity();
    await this.checkDataIntegrity();
    await this.checkJourneyFlowIntegrity();
    await this.checkEmotionalIntentionSystem();
    await this.checkSystemStats();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Resumo final
    const okCount = this.results.filter(r => r.status === 'OK').length;
    const warningCount = this.results.filter(r => r.status === 'WARNING').length;
    const errorCount = this.results.filter(r => r.status === 'ERROR').length;
    
    console.log('\n📊 === RESUMO DA VERIFICAÇÃO ===');
    console.log(`✅ Verificações OK: ${okCount}`);
    console.log(`⚠️ Avisos: ${warningCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`⏱️ Tempo total: ${duration}ms`);
    
    // Log detalhado
    await curationLogger.logBatchProcessing(
      errorCount > 0 ? LogLevel.ERROR : warningCount > 0 ? LogLevel.WARN : LogLevel.INFO,
      'Verificação de saúde do sistema concluída',
      {
        duration: `${duration}ms`,
        checks: { ok: okCount, warnings: warningCount, errors: errorCount },
        results: this.results
      }
    );
    
    // Determinar código de saída
    if (errorCount > 0) {
      process.exit(1);
    } else if (warningCount > 0) {
      process.exit(2);
    } else {
      process.exit(0);
    }
  }
}

// Função principal
async function main() {
  const checker = new SystemHealthChecker();
  
  try {
    await checker.runFullHealthCheck();
  } catch (error) {
    console.error('❌ Erro fatal durante verificação de saúde:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
} 
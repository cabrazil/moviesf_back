/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';

dotenv.config();

const prisma = new PrismaClient();

interface ScriptArgs {
  force?: boolean;
  limit?: number;
  dryRun?: boolean;
  title?: string;
}

function parseArgs(): ScriptArgs {
  const args: ScriptArgs = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--force') {
      args.force = true;
    } else if (arg.startsWith('--limit=')) {
      args.limit = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg.startsWith('--title=')) {
      args.title = arg.split('=')[1];
    }
  }
  
  return args;
}

interface MovieWithData {
  id: string;
  tmdbId: number | null;
  title: string;
  year: number | null;
  landingPageHook: string | null;
  movieSentiments: Array<{
    relevance: any;
    explanation: string | null;
    subSentiment: {
      name: string;
    };
  }>;
  movieSuggestionFlows: Array<{
    id: number;
    journeyOptionFlowId: number;
  }>;
}

async function checkMovieCompleteness(movie: MovieWithData): Promise<{
  isComplete: boolean;
  missingElements: string[];
  canUpdateDirectly: boolean;
}> {
  const missingElements: string[] = [];
  
  // Verificar se tem movieSentiments
  if (!movie.movieSentiments || movie.movieSentiments.length === 0) {
    missingElements.push('movieSentiments');
  }
  
  // Verificar se tem movieSuggestionFlows
  if (!movie.movieSuggestionFlows || movie.movieSuggestionFlows.length === 0) {
    missingElements.push('movieSuggestionFlows');
  }
  
  // Verificar se tem landingPageHook (para saber se já foi processado)
  if (!movie.landingPageHook) {
    missingElements.push('landingPageHook');
  }
  
  const isComplete = missingElements.length === 0;
  const canUpdateDirectly = isComplete && movie.landingPageHook && 
    movie.landingPageHook.includes('suggestedSubSentiments'); // Estrutura antiga
  
  return { isComplete, missingElements, canUpdateDirectly: !!canUpdateDirectly };
}

async function updateLandingPageHookDirectly(movie: MovieWithData): Promise<boolean> {
  try {
    console.log(`🔄 Atualizando landingPageHook diretamente para: ${movie.title}`);
    
    // Construir o contexto emocional
    let sentimentContext = '';
    if (movie.movieSentiments && movie.movieSentiments.length > 0) {
      sentimentContext = '\n\nAnálise emocional do filme:\n';
      movie.movieSentiments.forEach((sentiment, index) => {
        sentimentContext += `${index + 1}. ${sentiment.subSentiment.name} (Relevância: ${sentiment.relevance}): ${sentiment.explanation}\n`;
      });
    }
    
    // Extrair texto após JSON (para preservar)
    const currentHook = movie.landingPageHook || '';
    const jsonEndIndex = currentHook.lastIndexOf('}');
    const textAfterJson = jsonEndIndex !== -1 ? currentHook.substring(jsonEndIndex + 1).trim() : '';
    
    // Gerar novo targetAudience baseado nos sentimentos existentes
    // Filtrar sentimentos com relevância válida
    const validSentiments = movie.movieSentiments.filter(s => s.relevance !== null);
    const topSentiment = validSentiments[0]; // Mais relevante
    const secondSentiment = validSentiments[1]; // Segundo mais relevante
    
    // Função para sintetizar sentimentos em uma frase natural
    function synthesizeEmotionalBenefit(sentiment1: any, sentiment2?: any): string {
      const name1 = sentiment1.subSentiment.name.toLowerCase();
      const name2 = sentiment2?.subSentiment.name.toLowerCase();
      
      // Mapear sentimentos para benefícios emocionais sintetizados
      const benefitMap: { [key: string]: string } = {
        'humor': 'humor',
        'leveza': 'leveza',
        'diversão': 'diversão',
        'descompromissada': 'diversão descompromissada',
        'intriga leve': 'humor inteligente',
        'humor irreverente': 'humor irreverente',
        'doçura': 'doçura',
        'encanto': 'encanto',
        'conforto': 'conforto emocional',
        'aconchego': 'aconchego',
        'família': 'conexão familiar',
        'familiar': 'laços familiares',
        'reconciliação': 'reconciliação',
        'aceitação': 'aceitação',
        'perdão': 'perdão',
        'superação': 'superação',
        'crescimento': 'crescimento pessoal',
        'inspiração': 'inspiração',
        'otimismo': 'otimismo',
        'nostalgia': 'nostalgia',
        'reflexão': 'reflexão profunda',
        'amor': 'amor',
        'perda': 'reflexão sobre perda',
        'emotivo': 'experiência emocional profunda',
        'triste': 'catarse emocional',
        'drama': 'drama emocional'
      };
      
      // Buscar benefícios mapeados
      const benefit1 = benefitMap[name1] || name1;
      const benefit2 = name2 ? (benefitMap[name2] || name2) : null;
      
      // Criar frase natural baseada nos tipos de sentimentos
      if (benefit2) {
        // Se ambos são relacionados a humor/leveza
        if ((benefit1.includes('humor') || benefit1.includes('leveza') || benefit1.includes('diversão')) && 
            (benefit2.includes('doçura') || benefit2.includes('encanto') || benefit2.includes('conforto'))) {
          return `uma comédia com ${benefit1}, cheia de ${benefit2} e um toque de encanto`;
        }
        
        // Se ambos são relacionados a humor (caso específico para Os Estagiários)
        if ((benefit1.includes('humor') || benefit1.includes('diversão') || benefit1.includes('leveza')) && 
            (benefit2.includes('humor') || benefit2.includes('irreverente'))) {
          return `uma comédia com ${benefit1} e ${benefit2}`;
        }
        
        // Se ambos são relacionados a família/conforto
        if ((benefit1.includes('família') || benefit1.includes('conforto') || benefit1.includes('aconchego')) && 
            (benefit2.includes('amor') || benefit2.includes('conexão'))) {
          return `uma história de ${benefit1} e ${benefit2}`;
        }
        
        // Se ambos são relacionados a superação/crescimento
        if ((benefit1.includes('superação') || benefit1.includes('crescimento') || benefit1.includes('inspiração')) && 
            (benefit2.includes('aceitação') || benefit2.includes('reconciliação'))) {
          return `uma jornada de ${benefit1} e ${benefit2}`;
        }
        
        // Se ambos são relacionados a nostalgia/reflexão
        if ((benefit1.includes('nostalgia') || benefit1.includes('reflexão')) && 
            (benefit2.includes('memórias') || benefit2.includes('amor') || benefit2.includes('perda'))) {
          return `uma reflexão sobre ${benefit1} e ${benefit2}`;
        }
        
        // Padrão genérico
        return `${benefit1} e ${benefit2}`;
      }
      
      return benefit1;
    }
    
    // Construir frase focada no impacto emocional
    let targetAudience = '';
    
    if (topSentiment && secondSentiment) {
      const emotionalBenefit = synthesizeEmotionalBenefit(topSentiment, secondSentiment);
      
      // Criar frase baseada no tipo de sentimento
      if (emotionalBenefit.includes('reconciliação') || emotionalBenefit.includes('aceitação') || emotionalBenefit.includes('perdão') || emotionalBenefit.includes('cura')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma jornada de cura e crescimento emocional.`;
      } else if (emotionalBenefit.includes('humor') || emotionalBenefit.includes('leveza') || emotionalBenefit.includes('diversão') || emotionalBenefit.includes('alegria') || emotionalBenefit.includes('descontração')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma experiência contagiante de alegria e descontração.`;
      } else if (emotionalBenefit.includes('superação') || emotionalBenefit.includes('crescimento') || emotionalBenefit.includes('inspiração') || emotionalBenefit.includes('otimismo') || emotionalBenefit.includes('esperança')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma jornada inspiradora de transformação pessoal.`;
      } else if (emotionalBenefit.includes('conforto') || emotionalBenefit.includes('aconchego') || emotionalBenefit.includes('família') || emotionalBenefit.includes('conexão') || emotionalBenefit.includes('laços')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma experiência calorosa de conexão familiar e emocional.`;
      } else if (emotionalBenefit.includes('emotivo') || emotionalBenefit.includes('triste') || emotionalBenefit.includes('drama') || emotionalBenefit.includes('catarse')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma experiência profunda de reflexão e catarse emocional.`;
      } else if (emotionalBenefit.includes('nostalgia') || emotionalBenefit.includes('reflexão') || emotionalBenefit.includes('amor') || emotionalBenefit.includes('perda') || emotionalBenefit.includes('memórias')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma experiência contemplativa de memórias e emoções profundas.`;
      } else {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma experiência emocionalmente rica e envolvente.`;
      }
    } else if (topSentiment) {
      const emotionalBenefit = synthesizeEmotionalBenefit(topSentiment);
      
      if (emotionalBenefit.includes('reconciliação') || emotionalBenefit.includes('aceitação') || emotionalBenefit.includes('perdão') || emotionalBenefit.includes('cura')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma jornada de cura e crescimento emocional.`;
      } else if (emotionalBenefit.includes('humor') || emotionalBenefit.includes('leveza') || emotionalBenefit.includes('diversão') || emotionalBenefit.includes('alegria') || emotionalBenefit.includes('descontração')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma experiência contagiante de alegria e descontração.`;
      } else if (emotionalBenefit.includes('superação') || emotionalBenefit.includes('crescimento') || emotionalBenefit.includes('inspiração') || emotionalBenefit.includes('otimismo') || emotionalBenefit.includes('esperança')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma jornada inspiradora de transformação pessoal.`;
      } else if (emotionalBenefit.includes('conforto') || emotionalBenefit.includes('aconchego') || emotionalBenefit.includes('família') || emotionalBenefit.includes('conexão') || emotionalBenefit.includes('laços')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma experiência calorosa de conexão familiar e emocional.`;
      } else if (emotionalBenefit.includes('emotivo') || emotionalBenefit.includes('triste') || emotionalBenefit.includes('drama') || emotionalBenefit.includes('catarse')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma experiência profunda de reflexão e catarse emocional.`;
      } else if (emotionalBenefit.includes('nostalgia') || emotionalBenefit.includes('reflexão') || emotionalBenefit.includes('amor') || emotionalBenefit.includes('perda') || emotionalBenefit.includes('memórias')) {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma experiência contemplativa de memórias e emoções profundas.`;
      } else {
        targetAudience = `Este filme é ideal para quem busca ${emotionalBenefit}, oferecendo uma experiência emocionalmente rica e envolvente.`;
      }
    } else {
      targetAudience = `Este filme é ideal para quem busca uma experiência cinematográfica envolvente e emocionalmente rica.`;
    }
    
    console.log(`🎯 Target Audience gerado: ${targetAudience}`);
    
    // Criar nova estrutura JSON
    const newJsonStructure = `{\n  "targetAudience": "${targetAudience}"\n}`;
    
    // Combinar JSON + texto preservado
    const newLandingPageHook = newJsonStructure + (textAfterJson ? '\n\n' + textAfterJson : '');
    
    console.log(`📝 Nova estrutura gerada:`);
    console.log(newLandingPageHook);
    
    // Atualizar no banco
    await prisma.movie.update({
      where: { id: movie.id },
      data: { landingPageHook: newLandingPageHook }
    });
    
    console.log(`✅ LandingPageHook atualizado para: ${movie.title}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${movie.title}:`, error);
    return false;
  }
}

async function reprocessWithOrchestrator(movie: MovieWithData): Promise<boolean> {
  try {
    console.log(`🔄 Reprocessando com orchestrator: ${movie.title}`);
    
    // Encontrar um journeyOptionFlowId válido
    const journeyOptionFlowId = movie.movieSuggestionFlows[0]?.journeyOptionFlowId || 1;
    
    // Verificar se temos tmdbId e year
    if (!movie.tmdbId || !movie.year) {
      console.log(`⚠️ Pulando ${movie.title} - tmdbId ou year não encontrados`);
      return false;
    }
    
    // Executar orchestrator.ts
    const orchestratorPath = path.join(__dirname, 'orchestrator.ts');
    const args = [
      '--title=' + movie.title,
      '--year=' + movie.year.toString(),
      '--journey-option-flow-id=' + journeyOptionFlowId.toString(),
      '--analysis-lens=3',
      '--journey-validation=1'
    ];
    
    return new Promise((resolve) => {
      const child = spawn('npx', ['ts-node', orchestratorPath, ...args], {
        stdio: 'pipe',
        shell: true
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Orchestrator concluído para: ${movie.title}`);
          resolve(true);
        } else {
          console.error(`❌ Orchestrator falhou para ${movie.title}:`, errorOutput);
          resolve(false);
        }
      });
    });
    
  } catch (error) {
    console.error(`❌ Erro ao reprocessar ${movie.title}:`, error);
    return false;
  }
}

async function updateLandingPageHooks(args: ScriptArgs) {
  try {
    console.log('🔍 Buscando filmes com landingPageHook...');
    
    // Buscar filmes com landingPageHook
    const whereClause: any = {
      landingPageHook: { not: null }
    };
    
    // Se um título específico foi fornecido, filtrar por ele
    if (args.title) {
      whereClause.title = { contains: args.title, mode: 'insensitive' as const };
    }
    
    const movies = await prisma.movie.findMany({
      where: whereClause,
      select: {
        id: true,
        tmdbId: true,
        title: true,
        year: true,
        landingPageHook: true,
        movieSentiments: {
          select: {
            relevance: true,
            explanation: true,
            subSentiment: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            relevance: 'desc'
          },
          take: 3
        },
        movieSuggestionFlows: {
          select: {
            id: true,
            journeyOptionFlowId: true
          },
          take: 1
        }
      },
      take: args.limit || 50
    });
    
    console.log(`📊 Encontrados ${movies.length} filmes com landingPageHook`);
    
    let updatedDirectly = 0;
    let reprocessed = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const movie of movies) {
      console.log(`\n🎬 Processando: ${movie.title} (${movie.year})`);
      
      const completeness = await checkMovieCompleteness(movie);
      
      if (args.dryRun) {
        console.log(`📋 Status: ${completeness.isComplete ? '✅ Completo' : '❌ Incompleto'}`);
        if (completeness.missingElements.length > 0) {
          console.log(`   Elementos faltando: ${completeness.missingElements.join(', ')}`);
        }
        if (completeness.canUpdateDirectly) {
          console.log(`   ✅ Pode ser atualizado diretamente`);
        } else {
          console.log(`   🔄 Precisa reprocessar com orchestrator`);
        }
        continue;
      }
      
      if (completeness.canUpdateDirectly) {
        const success = await updateLandingPageHookDirectly(movie);
        if (success) {
          updatedDirectly++;
        } else {
          failed++;
        }
      } else if (completeness.isComplete || args.force) {
        const success = await reprocessWithOrchestrator(movie);
        if (success) {
          reprocessed++;
        } else {
          failed++;
        }
      } else {
        console.log(`⏭️ Pulando ${movie.title} - dados incompletos`);
        skipped++;
      }
    }
    
    console.log(`\n📊 RESUMO FINAL:`);
    console.log(`✅ Atualizados diretamente: ${updatedDirectly}`);
    console.log(`🔄 Reprocessados com orchestrator: ${reprocessed}`);
    console.log(`⏭️ Pulados: ${skipped}`);
    console.log(`❌ Falharam: ${failed}`);
    console.log(`📈 Total processados: ${updatedDirectly + reprocessed + skipped + failed}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const args = parseArgs();
  
  console.log('🚀 Script de Atualização de LandingPageHooks');
  console.log('📋 Uso: npx ts-node src/scripts/update-landing-page-hooks.ts [opções]');
  console.log('📋 Opções:');
  console.log('   --force: Força reprocessamento mesmo com dados incompletos');
  console.log('   --limit=N: Limita o número de filmes processados');
  console.log('   --dry-run: Apenas mostra o que seria feito, sem executar');
  console.log('   --title=Nome: Processa apenas um filme específico');
  console.log('');
  
  updateLandingPageHooks(args).catch(console.error);
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function mapJourneyStructure() {
  try {
    console.log('🗺️ === MAPEANDO ESTRUTURA COMPLETA DAS JORNADAS ===\n');

    // 1. Buscar todos os MainSentiments com seus JourneyFlows
    const mainSentiments = await prisma.mainSentiment.findMany({
      include: {
        journeyFlow: {
          include: {
            steps: {
              include: {
                options: {
                  orderBy: {
                    id: 'asc'
                  }
                }
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`📊 Encontrados ${mainSentiments.length} sentimentos principais:\n`);

    // 2. Mapear cada sentimento e sua jornada
    for (const sentiment of mainSentiments) {
      console.log(`🎯 ${sentiment.name} (ID: ${sentiment.id})`);
      console.log(`   Descrição: ${sentiment.description}`);
      
      if (!sentiment.journeyFlow) {
        console.log(`   ❌ Nenhuma jornada configurada`);
        console.log('');
        continue;
      }

      console.log(`   JourneyFlow ID: ${sentiment.journeyFlow.id}`);
      console.log(`   Steps: ${sentiment.journeyFlow.steps.length}`);
      console.log('');

      // 3. Mapear cada step
      for (let i = 0; i < sentiment.journeyFlow.steps.length; i++) {
        const step = sentiment.journeyFlow.steps[i];
        console.log(`   📝 Step ${i + 1} (ID: ${step.id}, StepId: "${step.stepId}", Order: ${step.order}):`);
        console.log(`      Pergunta: "${step.question}"`);
        console.log(`      Opções: ${step.options.length}`);
        
        // 4. Mapear cada opção
        for (let j = 0; j < step.options.length; j++) {
          const option = step.options[j];
          const finalIndicator = option.isEndState ? " ✅ FINAL" : "";
          console.log(`         ${j + 1}. ID: ${option.id}, OptionId: "${option.optionId}"${finalIndicator}`);
          console.log(`            Texto: "${option.text}"`);
          console.log(`            Próximo: ${option.nextStepId || 'N/A'}`);
        }
        console.log('');
      }
    }

    // 5. Gerar configurações TypeScript automaticamente
    console.log('⚙️ === CONFIGURAÇÕES TYPESCRIPT GERADAS ===\n');
    
    console.log('const JOURNEY_CONFIGS = {');
    
    for (const sentiment of mainSentiments) {
      if (!sentiment.journeyFlow || sentiment.journeyFlow.steps.length === 0) {
        continue;
      }

      const sentimentKey = sentiment.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      console.log(`  "${sentimentKey}": {`);
      console.log(`    mainSentimentId: ${sentiment.id},`);
      console.log(`    mainSentimentName: "${sentiment.name}",`);
      console.log(`    journeyFlowId: ${sentiment.journeyFlow.id},`);
      console.log(`    steps: [`);
      
      for (const step of sentiment.journeyFlow.steps) {
        // Pegar apenas a primeira opção de cada step como exemplo
        if (step.options.length > 0) {
          const option = step.options[0];
          console.log(`      { stepId: ${step.id}, optionId: ${option.id} }, // ${option.text.substring(0, 30)}...`);
        }
      }
      
      console.log(`    ]`);
      console.log(`  },`);
    }
    
    console.log('};');

    // 6. Estatísticas gerais
    console.log('\n📈 === ESTATÍSTICAS ===');
    
    const totalSteps = mainSentiments.reduce((acc, s) => 
      acc + (s.journeyFlow?.steps.length || 0), 0);
    
    const totalOptions = mainSentiments.reduce((acc, s) => 
      acc + (s.journeyFlow?.steps.reduce((stepAcc, step) => 
        stepAcc + step.options.length, 0) || 0), 0);
    
    const finalOptions = mainSentiments.reduce((acc, s) => 
      acc + (s.journeyFlow?.steps.reduce((stepAcc, step) => 
        stepAcc + step.options.filter(o => o.isEndState).length, 0) || 0), 0);
    
    console.log(`Total de sentimentos principais: ${mainSentiments.length}`);
    console.log(`Total de steps: ${totalSteps}`);
    console.log(`Total de opções: ${totalOptions}`);
    console.log(`Opções finais (isEndState): ${finalOptions}`);

    // 7. SQL para consultas específicas
    console.log('\n🔍 === QUERIES SQL ÚTEIS ===\n');
    
    console.log('-- Buscar todas as jornadas com seus steps e options:');
    console.log(`
SELECT 
  ms.id as main_sentiment_id,
  ms.name as main_sentiment_name,
  jf.id as journey_flow_id,
  jsf.id as step_id,
  jsf.stepId as step_identifier,
  jsf.order as step_order,
  jsf.question as step_question,
  jof.id as option_id,
  jof.optionId as option_identifier,
  jof.text as option_text,
  jof.isEndState as is_final,
  jof.nextStepId as next_step
FROM "MainSentiment" ms
LEFT JOIN "JourneyFlow" jf ON ms.id = jf."mainSentimentId"
LEFT JOIN "JourneyStepFlow" jsf ON jf.id = jsf."journeyFlowId"
LEFT JOIN "JourneyOptionFlow" jof ON jsf.id = jof."journeyStepFlowId"
ORDER BY ms.id, jsf.order, jof.id;
    `);

    console.log('\n-- Buscar apenas opções finais (isEndState = true):');
    console.log(`
SELECT 
  ms.name as sentiment,
  jsf.question as step_question,
  jof.text as final_option,
  jof.id as option_id
FROM "MainSentiment" ms
JOIN "JourneyFlow" jf ON ms.id = jf."mainSentimentId"
JOIN "JourneyStepFlow" jsf ON jf.id = jsf."journeyFlowId"
JOIN "JourneyOptionFlow" jof ON jsf.id = jof."journeyStepFlowId"
WHERE jof."isEndState" = true
ORDER BY ms.id, jsf.order;
    `);

  } catch (error) {
    console.error('❌ Erro ao mapear estrutura:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mapJourneyStructure(); 
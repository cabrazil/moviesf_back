import { PrismaClient } from '@prisma/client';
import { EmotionalIntention, getIntentionConfig } from './emotionalIntentionSystem';

const prisma = new PrismaClient();

async function analyzePositiveSentiments() {
  console.log('🌟 === ANÁLISE DE SENTIMENTOS POSITIVOS ===\n');

  // Cenários para "Feliz / Alegre"
  console.log('😊 SENTIMENTO: "Feliz / Alegre"');
  console.log('=' .repeat(50));
  
  console.log('\n🧘‍♀️ PROCESSAR a felicidade:');
  console.log('💭 "Quero saborear e amplificar essa felicidade"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "A Vida é Bela" (1997) - Drama que celebra a vida');
  console.log('   ✅ "Forrest Gump" (1994) - História inspiradora de otimismo');
  console.log('   ✅ "O Fabuloso Destino de Amélie Poulain" (2001) - Romance lúdico');
  console.log('   ❌ Comédias exageradas que podem "quebrar" o momento');
  
  console.log('\n🌈 TRANSFORMAR a felicidade:');
  console.log('💭 "Quero direcionar essa energia para algo mais intenso"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "Top Gun: Maverick" (2022) - Ação emocionante');
  console.log('   ✅ "Guardiões da Galáxia" (2014) - Aventura divertida');
  console.log('   ✅ "La La Land" (2016) - Musical energético');
  console.log('   ❌ Dramas pesados que podem "puxar para baixo"');
  
  console.log('\n🎭 MANTER a felicidade:');
  console.log('💭 "Quero continuar nessa vibe boa e relaxada"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "Mamma Mia!" (2008) - Musical alegre');
  console.log('   ✅ "Paddington" (2014) - Família reconfortante');
  console.log('   ✅ "Chef" (2014) - Feel-good sobre paixão');
  console.log('   ❌ Qualquer coisa muito intensa ou dramática');
  
  console.log('\n🔍 EXPLORAR a felicidade:');
  console.log('💭 "Quero entender diferentes tipos de alegria e contentamento"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "Divertida Mente" (2015) - Sobre as emoções');
  console.log('   ✅ "Coco" (2017) - Celebração da vida e família');
  console.log('   ✅ "Soul" (2020) - Sobre propósito e paixão');
  console.log('   ❌ Filmes superficiais sem profundidade emocional');

  console.log('\n' + '='.repeat(80) + '\n');

  // Cenários para "Animado(a) / Entusiasmado(a)"
  console.log('⚡ SENTIMENTO: "Animado(a) / Entusiasmado(a)"');
  console.log('=' .repeat(50));
  
  console.log('\n🧘‍♀️ PROCESSAR o entusiasmo:');
  console.log('💭 "Quero canalizar essa energia de forma construtiva"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "Rocky" (1976) - Drama de superação');
  console.log('   ✅ "O Clube dos Poetas Mortos" (1989) - Inspiração educacional');
  console.log('   ✅ "Whiplash" (2014) - Paixão pela música');
  
  console.log('\n🌈 TRANSFORMAR o entusiasmo:');
  console.log('💭 "Quero usar essa energia para me divertir muito"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "Mad Max: Estrada da Fúria" (2015) - Ação alucinante');
  console.log('   ✅ "John Wick" (2014) - Ação estilizada');
  console.log('   ✅ "Velocidade Furiosa" - Adrenalina pura');
  
  console.log('\n🎭 MANTER o entusiasmo:');
  console.log('💭 "Quero manter essa energia positiva e motivadora"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "Homem-Aranha: No Aranhaverso" (2018) - Aventura inspiradora');
  console.log('   ✅ "Os Incríveis" (2004) - Família de super-heróis');
  console.log('   ✅ "Escola de Rock" (2003) - Comédia energética');
  
  console.log('\n🔍 EXPLORAR o entusiasmo:');
  console.log('💭 "Quero descobrir o que me move e inspira"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "Estrelas Além do Tempo" (2016) - Inspiração histórica');
  console.log('   ✅ "Steve Jobs" (2015) - Biografia sobre paixão');
  console.log('   ✅ "A Rede Social" (2010) - Ambição e criação');

  console.log('\n' + '='.repeat(80) + '\n');

  // Cenários para "Calmo(a) / Relaxado(a)"
  console.log('😌 SENTIMENTO: "Calmo(a) / Relaxado(a)"');
  console.log('=' .repeat(50));
  
  console.log('\n🧘‍♀️ PROCESSAR a calma:');
  console.log('💭 "Quero aprofundar essa tranquilidade e paz interior"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "Lost in Translation" (2003) - Contemplação silenciosa');
  console.log('   ✅ "A Árvore da Vida" (2011) - Filosofia visual');
  console.log('   ✅ "Her" (2013) - Introspecção moderna');
  
  console.log('\n🌈 TRANSFORMAR a calma:');
  console.log('💭 "Quero usar essa paz como base para algo inspirador"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "O Jardim Secreto" (1993) - Transformação suave');
  console.log('   ✅ "Eat Pray Love" (2010) - Jornada de autodescoberta');
  console.log('   ✅ "Julie & Julia" (2009) - Crescimento através da paixão');
  
  console.log('\n🎭 MANTER a calma:');
  console.log('💭 "Quero continuar nesse estado de serenidade"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "Meu Vizinho Totoro" (1988) - Tranquilidade infantil');
  console.log('   ✅ "O Grande Hotel Budapeste" (2014) - Comédia elegante');
  console.log('   ✅ "Midnight in Paris" (2011) - Romance nostálgico');
  
  console.log('\n🔍 EXPLORAR a calma:');
  console.log('💭 "Quero entender diferentes aspectos da tranquilidade"');
  console.log('🎬 Filmes sugeridos:');
  console.log('   ✅ "2001: Uma Odisseia no Espaço" (1968) - Contemplação cósmica');
  console.log('   ✅ "Blade Runner 2049" (2017) - Sci-fi contemplativo');
  console.log('   ✅ "A Chegada" (2016) - Mistério reflexivo');
}

async function analyzeIntentionApplicability() {
  console.log('\n🔍 === ANÁLISE DE APLICABILIDADE DAS INTENÇÕES ===\n');

  const sentimentAnalysis = [
    {
      sentiment: 'Feliz / Alegre',
      applicability: {
        PROCESS: {
          makes_sense: true,
          explanation: 'Saborear e amplificar a felicidade é uma necessidade real',
          examples: ['Celebrar conquistas', 'Momentos de gratidão', 'Compartilhar alegria']
        },
        TRANSFORM: {
          makes_sense: true,
          explanation: 'Direcionar energia positiva para outras atividades',
          examples: ['De alegria para aventura', 'De contentamento para ação', 'De felicidade para criatividade']
        },
        MAINTAIN: {
          makes_sense: true,
          explanation: 'Preservar o estado positivo é muito comum',
          examples: ['Manter o clima de festa', 'Continuar relaxado', 'Sustentar o bom humor']
        },
        EXPLORE: {
          makes_sense: true,
          explanation: 'Entender diferentes tipos de felicidade',
          examples: ['Alegria vs euforia', 'Contentamento vs empolgação', 'Felicidade simples vs intensa']
        }
      }
    },
    {
      sentiment: 'Animado(a) / Entusiasmado(a)',
      applicability: {
        PROCESS: {
          makes_sense: true,
          explanation: 'Canalizar energia de forma produtiva',
          examples: ['Focar no trabalho', 'Estudar com motivação', 'Exercitar-se']
        },
        TRANSFORM: {
          makes_sense: true,
          explanation: 'Converter entusiasmo em outras emoções',
          examples: ['De empolgação para diversão', 'De energia para relaxamento', 'De motivação para contemplação']
        },
        MAINTAIN: {
          makes_sense: true,
          explanation: 'Sustentar a motivação é desejável',
          examples: ['Manter o pique', 'Continuar inspirado', 'Preservar a energia']
        },
        EXPLORE: {
          makes_sense: true,
          explanation: 'Descobrir o que realmente motiva',
          examples: ['Paixões autênticas', 'Propósito de vida', 'Talentos naturais']
        }
      }
    },
    {
      sentiment: 'Calmo(a) / Relaxado(a)',
      applicability: {
        PROCESS: {
          makes_sense: true,
          explanation: 'Aprofundar o estado de paz interior',
          examples: ['Meditação através do cinema', 'Contemplação estética', 'Reflexão filosófica']
        },
        TRANSFORM: {
          makes_sense: true,
          explanation: 'Usar a calma como base para crescimento',
          examples: ['De paz para criatividade', 'De tranquilidade para ação', 'De serenidade para aventura']
        },
        MAINTAIN: {
          makes_sense: true,
          explanation: 'Preservar o estado de relaxamento',
          examples: ['Continuar descansando', 'Manter a paz', 'Sustentar o bem-estar']
        },
        EXPLORE: {
          makes_sense: true,
          explanation: 'Investigar diferentes aspectos da tranquilidade',
          examples: ['Tipos de paz', 'Fontes de serenidade', 'Caminhos para o equilíbrio']
        }
      }
    }
  ];

  sentimentAnalysis.forEach(analysis => {
    console.log(`🎭 ${analysis.sentiment}:`);
    console.log('-'.repeat(40));
    
    Object.entries(analysis.applicability).forEach(([intention, data]) => {
      const icon = data.makes_sense ? '✅' : '❌';
      console.log(`${icon} ${intention}: ${data.explanation}`);
      console.log(`   Exemplos: ${data.examples.join(', ')}`);
    });
    console.log('');
  });
}

async function compareWithNegativeSentiments() {
  console.log('\n⚖️ === COMPARAÇÃO: POSITIVOS vs NEGATIVOS ===\n');

  console.log('📊 PADRÕES IDENTIFICADOS:');
  console.log('-------------------------');
  
  console.log('\n🟢 SENTIMENTOS POSITIVOS:');
  console.log('• PROCESSAR → Amplificar, saborear, canalizar energia');
  console.log('• TRANSFORMAR → Direcionar para outras atividades/emoções');
  console.log('• MANTER → Preservar e sustentar o estado positivo');
  console.log('• EXPLORAR → Entender nuances e fontes da positividade');
  
  console.log('\n🔴 SENTIMENTOS NEGATIVOS:');
  console.log('• PROCESSAR → Elaborar, trabalhar, compreender o sentimento');
  console.log('• TRANSFORMAR → Sair do estado negativo para positivo');
  console.log('• MANTER → Aceitar temporariamente o estado (raro)');
  console.log('• EXPLORAR → Investigar causas e aprender com a experiência');
  
  console.log('\n🎯 DIFERENÇAS PRINCIPAIS:');
  console.log('• Positivos: Foco em AMPLIFICAR e DIRECIONAR');
  console.log('• Negativos: Foco em PROCESSAR e TRANSFORMAR');
  console.log('• Positivos: MANTER é desejável');
  console.log('• Negativos: MANTER é mais sobre aceitação temporária');
  
  console.log('\n💡 CONCLUSÃO:');
  console.log('As 4 intenções fazem sentido para TODOS os sentimentos,');
  console.log('mas com significados e aplicações diferentes!');
}

async function main() {
  try {
    await analyzePositiveSentiments();
    await analyzeIntentionApplicability();
    await compareWithNegativeSentiments();
  } catch (error) {
    console.error('Erro na análise:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
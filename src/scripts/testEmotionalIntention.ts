import { PrismaClient } from '@prisma/client';
import { EmotionalIntention, getIntentionConfig } from './emotionalIntentionSystem';

const prisma = new PrismaClient();

async function testEmotionalIntentionSystem() {
  console.log('🧠 === TESTE DO SISTEMA DE INTENÇÃO EMOCIONAL ===\n');

  // Cenário 1: Usuário está triste e quer PROCESSAR a tristeza
  console.log('🎭 CENÁRIO 1: Usuário TRISTE que quer PROCESSAR a tristeza');
  console.log('---------------------------------------------------');
  
  const processConfig = getIntentionConfig('Triste / Melancólico(a)', EmotionalIntention.PROCESS);
  if (processConfig) {
    console.log(`📝 Descrição: ${processConfig.description}`);
    console.log(`🎬 Gêneros preferidos: ${processConfig.journeyModifications.preferredGenres.join(', ')}`);
    console.log(`🚫 Gêneros evitados: ${processConfig.journeyModifications.avoidGenres.join(', ')}`);
    console.log(`🎵 Tom emocional: ${processConfig.journeyModifications.emotionalTone}`);
    console.log('📊 SubSentimentos valorizados:');
    Object.entries(processConfig.journeyModifications.subSentimentWeights).forEach(([name, weight]) => {
      console.log(`   - ${name}: ${weight}`);
    });
  }
  
  console.log('\n' + '='.repeat(80) + '\n');

  // Cenário 2: Usuário está triste e quer TRANSFORMAR o estado
  console.log('🎭 CENÁRIO 2: Usuário TRISTE que quer TRANSFORMAR o estado');
  console.log('------------------------------------------------------');
  
  const transformConfig = getIntentionConfig('Triste / Melancólico(a)', EmotionalIntention.TRANSFORM);
  if (transformConfig) {
    console.log(`📝 Descrição: ${transformConfig.description}`);
    console.log(`🎬 Gêneros preferidos: ${transformConfig.journeyModifications.preferredGenres.join(', ')}`);
    console.log(`🚫 Gêneros evitados: ${transformConfig.journeyModifications.avoidGenres.join(', ')}`);
    console.log(`🎵 Tom emocional: ${transformConfig.journeyModifications.emotionalTone}`);
    console.log('📊 SubSentimentos valorizados:');
    Object.entries(transformConfig.journeyModifications.subSentimentWeights).forEach(([name, weight]) => {
      console.log(`   - ${name}: ${weight}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Demonstração de como isso mudaria as recomendações
  console.log('💡 IMPACTO NAS RECOMENDAÇÕES:');
  console.log('-----------------------------');
  
  console.log('👤 Usuário triste + PROCESSAR:');
  console.log('   ✅ "Her" (2013) - Drama sobre solidão e conexão');
  console.log('   ✅ "Manchester by the Sea" (2016) - Drama sobre luto');
  console.log('   ❌ "Vingadores" (2012) - Ação/aventura');
  console.log('   ❌ "Gente Grande" (2010) - Comédia');
  
  console.log('\n👤 Usuário triste + TRANSFORMAR:');
  console.log('   ✅ "Divertida Mente" (2015) - Animação sobre emoções');
  console.log('   ✅ "A Fantástica Fábrica de Chocolate" (2005) - Musical/fantasia');
  console.log('   ❌ "Réquiem para um Sonho" (2000) - Drama pesado');
  console.log('   ❌ "Cisne Negro" (2010) - Thriller psicológico');

  console.log('\n' + '='.repeat(80) + '\n');

  // Buscar filmes reais do banco para demonstrar
  console.log('🎬 TESTE COM FILMES REAIS DO BANCO:');
  console.log('----------------------------------');

  try {
    // Buscar alguns filmes para teste
    const movies = await prisma.movie.findMany({
      take: 5,
      include: {
        movieSentiments: {
          include: {
            subSentiment: true
          }
        }
      }
    });

    console.log(`📊 Encontrados ${movies.length} filmes para teste:\n`);

    movies.forEach((movie, index) => {
      console.log(`${index + 1}. "${movie.title}" (${movie.year})`);
      console.log(`   Gêneros: ${movie.genres.join(', ')}`);
      console.log(`   SubSentimentos: ${movie.movieSentiments.length}`);
      
      // Simular como seria a compatibilidade com diferentes intenções
      const movieGenres = movie.genres || [];
      
      // Para PROCESSAR tristeza
      const processGenres = processConfig?.journeyModifications.preferredGenres || [];
      const processMatch = movieGenres.some(genre => 
        processGenres.some(preferred => 
          genre.toLowerCase().includes(preferred.toLowerCase())
        )
      );
      
      // Para TRANSFORMAR tristeza
      const transformGenres = transformConfig?.journeyModifications.preferredGenres || [];
      const transformMatch = movieGenres.some(genre => 
        transformGenres.some(preferred => 
          genre.toLowerCase().includes(preferred.toLowerCase())
        )
      );
      
      console.log(`   💭 Compatibilidade:`);
      console.log(`      PROCESSAR tristeza: ${processMatch ? '✅' : '❌'}`);
      console.log(`      TRANSFORMAR tristeza: ${transformMatch ? '✅' : '❌'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Erro ao buscar filmes:', error);
  }

  console.log('🎯 CONCLUSÃO:');
  console.log('O sistema de Intenção Emocional permite que o mesmo usuário');
  console.log('no mesmo estado emocional receba recomendações completamente');
  console.log('diferentes baseadas na sua INTENÇÃO com aquele sentimento.');
  console.log('');
  console.log('Isso resolve o problema de ambiguidade emocional mencionado!');
}

// Função para demonstrar integração com a jornada existente
async function demonstrateJourneyIntegration() {
  console.log('\n🔗 === INTEGRAÇÃO COM JORNADA EXISTENTE ===\n');

  console.log('💡 FLUXO PROPOSTO:');
  console.log('------------------');
  console.log('1. Usuário seleciona sentimento: "Triste / Melancólico(a)"');
  console.log('2. 🆕 NOVA PERGUNTA: "O que você gostaria de fazer com essa tristeza?"');
  console.log('   a) Processar e elaborar esse sentimento');
  console.log('   b) Mudar para um estado mais positivo');
  console.log('   c) Aceitar e ficar em sintonia com ela');
  console.log('   d) Explorar diferentes aspectos dela');
  console.log('');
  console.log('3. Sistema adapta a jornada baseado na intenção escolhida');
  console.log('4. Recomendações são filtradas e priorizadas conforme a intenção');
  
  console.log('\n📋 IMPLEMENTAÇÃO SUGERIDA:');
  console.log('-------------------------');
  console.log('• Adicionar step de "intenção" após seleção do sentimento principal');
  console.log('• Modificar pesos dos subsentimentos baseado na intenção');
  console.log('• Filtrar gêneros compatíveis/incompatíveis');
  console.log('• Ajustar algoritmo de recomendação final');
}

async function main() {
  try {
    await testEmotionalIntentionSystem();
    await demonstrateJourneyIntegration();
  } catch (error) {
    console.error('Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
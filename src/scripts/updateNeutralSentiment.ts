import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateNeutralSentiment() {
  try {
    console.log('Iniciando atualização do sentimento Neutro / Indiferente...');

    // 1. Atualizar o MainSentiment
    const updatedMainSentiment = await prisma.mainSentiment.update({
      where: { name: 'Neutro / Indiferente' },
      data: {
        description: 'Estado de equilíbrio emocional, contemplação e análise objetiva',
        keywords: [
          // Aspectos positivos da neutralidade
          'contemplação',
          'observação',
          'análise',
          'reflexão',
          'objetividade',
          'imparcialidade',
          'equilíbrio',
          'serenidade',
          'distanciamento',
          'introspecção',
          // Aspectos neutros
          'neutralidade',
          'indiferença',
          'apatia',
          'desinteresse',
          'desmotivação',
          'desconexão',
          'distância',
          'frieza',
          'vazio',
          'ausência',
          'passividade',
          'inércia',
          'estagnação',
          'indecisão',
          'incerteza',
          'dúvida',
          'hesitação',
          'desapego',
          'desprendimento',
          'descompromisso'
        ]
      }
    });

    console.log('MainSentiment atualizado com sucesso!');

    // 2. Criar novos SubSentiments
    const newSubSentiments = [
      {
        name: 'Observação e Análise',
        description: 'Estado de observação atenta e análise objetiva',
        keywords: [
          'observação',
          'análise',
          'estudo',
          'compreensão',
          'entendimento',
          'objetividade',
          'imparcialidade',
          'racionalidade',
          'lógica',
          'contemplação'
        ]
      },
      {
        name: 'Equilíbrio e Serenidade',
        description: 'Estado de equilíbrio emocional e serenidade',
        keywords: [
          'equilíbrio',
          'serenidade',
          'paz',
          'harmonia',
          'tranquilidade',
          'calma',
          'controle',
          'estabilidade',
          'centramento',
          'presença'
        ]
      },
      {
        name: 'Distanciamento e Objetividade',
        description: 'Estado de distanciamento emocional e objetividade',
        keywords: [
          'distanciamento',
          'objetividade',
          'imparcialidade',
          'neutralidade',
          'desapego',
          'desprendimento',
          'frieza',
          'controle',
          'racionalidade',
          'análise'
        ]
      }
    ];

    // 3. Remover SubSentiments existentes
    await prisma.subSentiment.deleteMany({
      where: {
        mainSentimentId: updatedMainSentiment.id
      }
    });

    // 4. Criar novos SubSentiments
    for (const subSentiment of newSubSentiments) {
      await prisma.subSentiment.create({
        data: {
          ...subSentiment,
          mainSentimentId: updatedMainSentiment.id
        }
      });
    }

    console.log('SubSentiments atualizados com sucesso!');
    console.log('\nResumo das alterações:');
    console.log(`- MainSentiment "${updatedMainSentiment.name}" atualizado com ${updatedMainSentiment.keywords.length} keywords`);
    console.log(`- ${newSubSentiments.length} novos SubSentiments criados`);

  } catch (error) {
    console.error('Erro ao atualizar sentimentos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a atualização
updateNeutralSentiment(); 
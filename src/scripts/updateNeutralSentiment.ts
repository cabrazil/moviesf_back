import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateNeutralSentiment() {
  try {
    console.log('Iniciando atualização do sentimento Neutro / Indiferente...');

    // 1. Atualizar o MainSentiment usando o ID
    const updatedMainSentiment = await prisma.mainSentiment.update({
      where: { id: 19 }, // Usando o ID ao invés do nome
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
          'descompromisso',
          // Novas keywords para filmes clássicos e cult
          'clássico',
          'cult',
          'cultuado',
          'reconhecido',
          'premiado',
          'histórico',
          'importante',
          'relevante',
          'significativo',
          'marcante',
          'influente',
          'referência',
          'fundamental',
          'essencial',
          'crucial',
          'determinante',
          'decisivo',
          'fundamental',
          'básico',
          'elementar'
        ]
      }
    });

    console.log('MainSentiment atualizado com sucesso!');

    // 2. Buscar SubSentiments existentes
    const existingSubSentiments = await prisma.subSentiment.findMany({
      where: {
        mainSentimentId: 19
      }
    });

    console.log(`\nSubSentiments existentes encontrados: ${existingSubSentiments.length}`);

    // 3. Atualizar ou criar SubSentiments
    const subSentimentsToUpdate = [
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
      },
      {
        name: 'Drama Familiar Neutro',
        description: 'Filmes que exploram relações familiares de forma objetiva e analítica',
        keywords: [
          'família',
          'relacionamento',
          'parentesco',
          'laços',
          'conexão',
          'vínculo',
          'união',
          'separação',
          'conflito',
          'tensão',
          'distância',
          'aproximação',
          'afastamento',
          'reconciliação',
          'ruptura',
          'reconstrução',
          'transformação',
          'evolução',
          'mudança',
          'adaptação',
          'aceitação',
          'compreensão',
          'entendimento',
          'diálogo',
          'comunicação',
          'silêncio',
          'ausência',
          'presença',
          'memória',
          'lembrança',
          'passado',
          'presente',
          'futuro',
          'herança',
          'tradição',
          'costume',
          'cultura',
          'identidade',
          'pertencimento'
        ]
      }
    ];

    for (const subSentiment of subSentimentsToUpdate) {
      const existingSubSentiment = existingSubSentiments.find(
        es => es.name === subSentiment.name
      );

      if (existingSubSentiment) {
        // Atualizar SubSentiment existente
        await prisma.subSentiment.update({
          where: { id: existingSubSentiment.id },
          data: {
            description: subSentiment.description,
            keywords: subSentiment.keywords
          }
        });
        console.log(`✅ Atualizado SubSentiment: ${subSentiment.name}`);
      } else {
        // Criar novo SubSentiment
        await prisma.subSentiment.create({
          data: {
            ...subSentiment,
            mainSentimentId: 19
          }
        });
        console.log(`✅ Criado novo SubSentiment: ${subSentiment.name}`);
      }
    }

    console.log('\nResumo das alterações:');
    console.log(`- MainSentiment ID 19 atualizado com ${updatedMainSentiment.keywords.length} keywords`);
    console.log(`- SubSentiments atualizados/criados com sucesso`);

  } catch (error) {
    console.error('Erro ao atualizar sentimentos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a atualização
updateNeutralSentiment(); 
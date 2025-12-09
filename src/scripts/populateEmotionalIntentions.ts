// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configurações de intenção emocional
const EMOTIONAL_INTENTION_CONFIGS = [
  {
    sentiment: "Triste / Melancólico(a)",
    intentions: [
      {
        type: "PROCESS",
        description: "Quero um filme que me ajude a processar e elaborar essa tristeza",
        preferredGenres: ["drama", "romance dramático", "biografia"],
        avoidGenres: ["comédia", "ação", "terror"],
        emotionalTone: "similar",
        subSentimentWeights: {
          "Melancolia Reflexiva": 2.0,
          "Emotivo(a) (Triste)": 1.8,
          "Vazio(a)": 1.5,
          "Reflexão Filosófica": 1.6
        }
      },
      {
        type: "TRANSFORM",
        description: "Quero um filme que me ajude a sair dessa tristeza",
        preferredGenres: ["comédia", "comédia romântica", "animação", "musical"],
        avoidGenres: ["drama pesado", "thriller psicológico"],
        emotionalTone: "contrasting",
        subSentimentWeights: {
          "Humor / Comédia": 2.0,
          "Conforto / Aconchego Emocional": 1.8,
          "Inspiração / Motivação para Agir": 1.6,
          "Emotivo(a) (Feliz)": 1.4
        }
      },
      {
        type: "MAINTAIN",
        description: "Estou bem com essa melancolia, quero algo que ressoe com ela",
        preferredGenres: ["drama indie", "filme de arte", "documentário"],
        avoidGenres: ["comédia exagerada", "ação"],
        emotionalTone: "similar",
        subSentimentWeights: {
          "Emotivo(a) (Triste)": 1.8,
          "Reflexão Filosófica": 1.6,
          "Vazio(a)": 1.4
        }
      },
      {
        type: "EXPLORE",
        description: "Quero explorar diferentes aspectos da tristeza e melancolia",
        preferredGenres: ["drama", "romance", "filme de época"],
        avoidGenres: ["terror", "ação"],
        emotionalTone: "progressive",
        subSentimentWeights: {
          "Superação e Crescimento": 2.0,
          "Drama Familiar": 1.8,
          "Emotivo(a) (Triste)": 1.6
        }
      }
    ]
  },
  {
    sentiment: "Feliz / Alegre",
    intentions: [
      {
        type: "PROCESS",
        description: "Quero saborear e amplificar essa felicidade",
        preferredGenres: ["drama inspirador", "biografia motivacional", "romance lúdico"],
        avoidGenres: ["comédia exagerada", "ação intensa"],
        emotionalTone: "similar",
        subSentimentWeights: {
          "Emotivo(a) (Feliz)": 2.0,
          "Inspiração / Motivação para Agir": 1.8,
          "Conforto / Aconchego Emocional": 1.6
        }
      },
      {
        type: "TRANSFORM",
        description: "Quero direcionar essa energia para algo mais intenso",
        preferredGenres: ["ação emocionante", "aventura", "musical energético"],
        avoidGenres: ["drama pesado", "thriller psicológico"],
        emotionalTone: "progressive",
        subSentimentWeights: {
          "Empolgado(a) / Energético(a)": 2.0,
          "Ação / Aventura": 1.8,
          "Emotivo(a) (Feliz)": 1.6
        }
      },
      {
        type: "MAINTAIN",
        description: "Quero continuar nessa vibe boa e relaxada",
        preferredGenres: ["comédia leve", "família", "feel-good"],
        avoidGenres: ["drama intenso", "terror", "thriller"],
        emotionalTone: "similar",
        subSentimentWeights: {
          "Conforto / Aconchego Emocional": 2.0,
          "Humor / Comédia": 1.8,
          "Drama Familiar": 1.6
        }
      },
      {
        type: "EXPLORE",
        description: "Quero entender diferentes tipos de alegria e contentamento",
        preferredGenres: ["drama sobre emoções", "animação reflexiva", "documentário inspirador"],
        avoidGenres: ["filme superficial", "comédia rasa"],
        emotionalTone: "progressive",
        subSentimentWeights: {
          "Superação e Crescimento": 2.0,
          "Reflexão Filosófica": 1.8,
          "Emotivo(a) (Feliz)": 1.6
        }
      }
    ]
  },
  {
    sentiment: "Ansioso(a) / Nervoso(a)",
    intentions: [
      {
        type: "PROCESS",
        description: "Quero entender e trabalhar essa ansiedade",
        preferredGenres: ["drama psicológico", "thriller psicológico", "biografia"],
        avoidGenres: ["terror", "ação intensa"],
        emotionalTone: "similar",
        subSentimentWeights: {
          "Tenso(a) / Ansioso(a)": 1.8,
          "Reflexão Filosófica": 1.6,
          "Superação e Crescimento": 1.4
        }
      },
      {
        type: "TRANSFORM",
        description: "Quero algo que me acalme e relaxe",
        preferredGenres: ["comédia leve", "documentário de natureza", "romance suave"],
        avoidGenres: ["thriller", "terror", "ação"],
        emotionalTone: "contrasting",
        subSentimentWeights: {
          "Conforto / Aconchego Emocional": 2.0,
          "Humor / Comédia": 1.8,
          "Drama Familiar": 1.6
        }
      },
      {
        type: "MAINTAIN",
        description: "Aceito essa ansiedade, quero algo que dialogue com ela",
        preferredGenres: ["suspense leve", "mistério", "drama psicológico"],
        avoidGenres: ["comédia", "romance"],
        emotionalTone: "similar",
        subSentimentWeights: {
          "Suspense / Mistério": 1.8,
          "Tenso(a) / Ansioso(a)": 1.6,
          "Reflexão Filosófica": 1.4
        }
      },
      {
        type: "EXPLORE",
        description: "Quero explorar as causas e soluções para a ansiedade",
        preferredGenres: ["drama de superação", "biografia inspiradora", "documentário"],
        avoidGenres: ["terror", "thriller intenso"],
        emotionalTone: "progressive",
        subSentimentWeights: {
          "Superação e Crescimento": 2.0,
          "Inspiração / Motivação para Agir": 1.8,
          "Reflexão Filosófica": 1.6
        }
      }
    ]
  },
  {
    sentiment: "Calmo(a) / Relaxado(a)",
    intentions: [
      {
        type: "PROCESS",
        description: "Quero aprofundar essa tranquilidade e paz interior",
        preferredGenres: ["drama contemplativo", "filme de arte", "sci-fi filosófico"],
        avoidGenres: ["ação", "comédia agitada", "terror"],
        emotionalTone: "similar",
        subSentimentWeights: {
          "Reflexão Filosófica": 2.0,
          "Conforto / Aconchego Emocional": 1.8,
          "Vazio(a)": 1.4 // No sentido positivo de quietude
        }
      },
      {
        type: "TRANSFORM",
        description: "Quero usar essa paz como base para algo inspirador",
        preferredGenres: ["drama de crescimento", "romance suave", "aventura leve"],
        avoidGenres: ["ação intensa", "thriller agitado"],
        emotionalTone: "progressive",
        subSentimentWeights: {
          "Superação e Crescimento": 2.0,
          "Inspiração / Motivação para Agir": 1.8,
          "Drama Familiar": 1.6
        }
      },
      {
        type: "MAINTAIN",
        description: "Quero continuar nesse estado de serenidade",
        preferredGenres: ["comédia suave", "romance calmo", "animação tranquila"],
        avoidGenres: ["ação", "terror", "thriller"],
        emotionalTone: "similar",
        subSentimentWeights: {
          "Conforto / Aconchego Emocional": 2.0,
          "Drama Familiar": 1.8,
          "Humor / Comédia": 1.6
        }
      },
      {
        type: "EXPLORE",
        description: "Quero entender diferentes aspectos da tranquilidade",
        preferredGenres: ["sci-fi contemplativo", "drama filosófico", "documentário reflexivo"],
        avoidGenres: ["ação", "comédia barulhenta"],
        emotionalTone: "progressive",
        subSentimentWeights: {
          "Reflexão Filosófica": 2.0,
          "Superação e Crescimento": 1.8,
          "Conforto / Aconchego Emocional": 1.6
        }
      }
    ]
  },
  {
    sentiment: "Indiferente",
    intentions: [
      {
        type: "PROCESS",
        description: "Quero entender essa indiferença e o que ela significa",
        preferredGenres: ["drama psicológico", "filme de arte", "documentário"],
        avoidGenres: ["comédia exagerada", "ação"],
        emotionalTone: "similar",
        subSentimentWeights: {
          "Reflexão Filosófica": 2.0,
          "Vazio(a)": 1.8,
          "Superação e Crescimento": 1.6
        }
      },
      {
        type: "TRANSFORM",
        description: "Quero algo que desperte algum interesse ou emoção",
        preferredGenres: ["drama intenso", "thriller", "comédia", "ação"],
        avoidGenres: ["filme contemplativo lento"],
        emotionalTone: "contrasting",
        subSentimentWeights: {
          "Empolgado(a) / Energético(a)": 2.0,
          "Emotivo(a) (Feliz)": 1.8,
          "Tenso(a) / Ansioso(a)": 1.6,
          "Inspiração / Motivação para Agir": 1.4
        }
      },
      {
        type: "MAINTAIN",
        description: "Estou bem com essa neutralidade, algo sem pressão",
        preferredGenres: ["comédia leve", "documentário", "filme de arte"],
        avoidGenres: ["drama intenso", "thriller"],
        emotionalTone: "similar",
        subSentimentWeights: {
          "Conforto / Aconchego Emocional": 1.8,
          "Humor / Comédia": 1.6,
          "Reflexão Filosófica": 1.4
        }
      },
      {
        type: "EXPLORE",
        description: "Quero descobrir o que realmente me interessa",
        preferredGenres: ["drama variado", "comédia", "ação", "romance", "sci-fi"],
        avoidGenres: [],
        emotionalTone: "progressive",
        subSentimentWeights: {
          "Superação e Crescimento": 2.0,
          "Inspiração / Motivação para Agir": 1.8,
          "Emotivo(a) (Feliz)": 1.6,
          "Drama Familiar": 1.4
        }
      }
    ]
  }
];

async function populateEmotionalIntentions() {
  console.log('🎭 === POPULANDO CONFIGURAÇÕES DE INTENÇÃO EMOCIONAL ===\n');

  try {
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const config of EMOTIONAL_INTENTION_CONFIGS) {
      console.log(`📊 Processando sentimento: ${config.sentiment}`);
      
      // Buscar o MainSentiment
      const mainSentiment = await prisma.mainSentiment.findFirst({
        where: { name: config.sentiment }
      });

      if (!mainSentiment) {
        console.log(`❌ Sentimento "${config.sentiment}" não encontrado no banco`);
        continue;
      }

      console.log(`✅ Sentimento encontrado: ID ${mainSentiment.id}`);

      // Processar cada intenção
      for (const intention of config.intentions) {
        const intentionType = intention.type as "PROCESS" | "TRANSFORM" | "MAINTAIN" | "EXPLORE";
        
        // Verificar se já existe
        const existingIntention = await prisma.emotionalIntention.findFirst({
          where: {
            mainSentimentId: mainSentiment.id,
            intentionType: intentionType
          }
        });

        if (existingIntention) {
          console.log(`   ⏭️ Intenção ${intentionType} já existe`);
          totalSkipped++;
          continue;
        }

        // Criar nova intenção
        await prisma.emotionalIntention.create({
          data: {
            mainSentimentId: mainSentiment.id,
            intentionType: intentionType,
            description: intention.description,
            preferredGenres: intention.preferredGenres,
            avoidGenres: intention.avoidGenres,
            emotionalTone: intention.emotionalTone,
            subSentimentWeights: intention.subSentimentWeights
          }
        });

        console.log(`   ✅ Criada intenção: ${intentionType}`);
        totalCreated++;
      }

      console.log(); // Linha em branco
    }

    console.log('🎉 === POPULAÇÃO CONCLUÍDA ===');
    console.log(`✅ Intenções criadas: ${totalCreated}`);
    console.log(`⏭️ Intenções já existentes: ${totalSkipped}`);
    console.log(`📊 Total processado: ${totalCreated + totalSkipped}`);

  } catch (error) {
    console.error('❌ Erro durante a população:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  populateEmotionalIntentions();
}

export { populateEmotionalIntentions }; 
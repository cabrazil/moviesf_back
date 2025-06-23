import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Tipos de intenção emocional
export enum EmotionalIntention {
  PROCESS = "process",        // Processar/elaborar o sentimento atual
  TRANSFORM = "transform",    // Mudar/transformar o estado emocional
  MAINTAIN = "maintain",      // Manter o estado atual
  EXPLORE = "explore"         // Explorar nuances do sentimento
}

// Configuração de intenção por sentimento
interface IntentionConfig {
  sentiment: string;
  intentions: {
    [key in EmotionalIntention]: {
      description: string;
      journeyModifications: {
        preferredGenres: string[];
        avoidGenres: string[];
        emotionalTone: "similar" | "contrasting" | "progressive";
        subSentimentWeights: { [key: string]: number };
      };
    };
  };
}

// Configurações de intenção para cada sentimento principal
const INTENTION_CONFIGS: IntentionConfig[] = [
  {
    sentiment: "Triste / Melancólico(a)",
    intentions: {
      [EmotionalIntention.PROCESS]: {
        description: "Quero um filme que me ajude a processar e elaborar essa tristeza",
        journeyModifications: {
          preferredGenres: ["drama", "romance dramático", "biografia"],
          avoidGenres: ["comédia", "ação", "terror"],
          emotionalTone: "similar",
          subSentimentWeights: {
            "Melancolia Reflexiva": 2.0,
            "Catarse Emocional": 1.8,
            "Solidão Contemplativa": 1.5
          }
        }
      },
      [EmotionalIntention.TRANSFORM]: {
        description: "Quero um filme que me ajude a sair dessa tristeza",
        journeyModifications: {
          preferredGenres: ["comédia", "comédia romântica", "animação", "musical"],
          avoidGenres: ["drama pesado", "thriller psicológico"],
          emotionalTone: "contrasting",
          subSentimentWeights: {
            "Humor Reconfortante": 2.0,
            "Esperança e Otimismo": 1.8,
            "Conexão Humana": 1.6
          }
        }
      },
      [EmotionalIntention.MAINTAIN]: {
        description: "Estou bem com essa melancolia, quero algo que ressoe com ela",
        journeyModifications: {
          preferredGenres: ["drama indie", "filme de arte", "documentário"],
          avoidGenres: ["comédia exagerada", "ação"],
          emotionalTone: "similar",
          subSentimentWeights: {
            "Beleza na Tristeza": 1.8,
            "Introspecção": 1.6,
            "Nostalgia": 1.4
          }
        }
      },
      [EmotionalIntention.EXPLORE]: {
        description: "Quero explorar diferentes aspectos da tristeza e melancolia",
        journeyModifications: {
          preferredGenres: ["drama", "romance", "filme de época"],
          avoidGenres: ["terror", "ação"],
          emotionalTone: "progressive",
          subSentimentWeights: {
            "Complexidade Emocional": 2.0,
            "Narrativa Profunda": 1.8,
            "Crescimento Pessoal": 1.6
          }
        }
      }
    }
  },
  {
    sentiment: 'Feliz / Alegre',
    intentions: {
      [EmotionalIntention.PROCESS]: {
        description: 'Quero saborear e amplificar essa felicidade',
        journeyModifications: {
          preferredGenres: ['drama inspirador', 'biografia motivacional', 'romance lúdico'],
          avoidGenres: ['comédia exagerada', 'ação intensa'],
          emotionalTone: 'similar',
          subSentimentWeights: {
            'Celebração da Vida': 2.0,
            'Gratidão': 1.8,
            'Otimismo': 1.6
          }
        }
      },
      [EmotionalIntention.TRANSFORM]: {
        description: 'Quero direcionar essa energia para algo mais intenso',
        journeyModifications: {
          preferredGenres: ['ação emocionante', 'aventura', 'musical energético'],
          avoidGenres: ['drama pesado', 'thriller psicológico'],
          emotionalTone: 'progressive',
          subSentimentWeights: {
            'Energia e Vitalidade': 2.0,
            'Aventura': 1.8,
            'Criatividade': 1.6
          }
        }
      },
      [EmotionalIntention.MAINTAIN]: {
        description: 'Quero continuar nessa vibe boa e relaxada',
        journeyModifications: {
          preferredGenres: ['comédia leve', 'família', 'feel-good'],
          avoidGenres: ['drama intenso', 'terror', 'thriller'],
          emotionalTone: 'similar',
          subSentimentWeights: {
            'Bem-estar': 2.0,
            'Conforto': 1.8,
            'Leveza': 1.6
          }
        }
      },
      [EmotionalIntention.EXPLORE]: {
        description: 'Quero entender diferentes tipos de alegria e contentamento',
        journeyModifications: {
          preferredGenres: ['drama sobre emoções', 'animação reflexiva', 'documentário inspirador'],
          avoidGenres: ['filme superficial', 'comédia rasa'],
          emotionalTone: 'progressive',
          subSentimentWeights: {
            'Complexidade Emocional': 2.0,
            'Autoconhecimento': 1.8,
            'Profundidade': 1.6
          }
        }
      }
    }
  },
  {
    sentiment: 'Animado(a) / Entusiasmado(a)',
    intentions: {
      [EmotionalIntention.PROCESS]: {
        description: 'Quero canalizar essa energia de forma construtiva',
        journeyModifications: {
          preferredGenres: ['drama de superação', 'biografia inspiradora', 'esporte'],
          avoidGenres: ['comédia boba', 'romance lento'],
          emotionalTone: 'similar',
          subSentimentWeights: {
            'Foco e Determinação': 2.0,
            'Superação': 1.8,
            'Produtividade': 1.6
          }
        }
      },
      [EmotionalIntention.TRANSFORM]: {
        description: 'Quero usar essa energia para me divertir muito',
        journeyModifications: {
          preferredGenres: ['ação', 'aventura', 'comédia energética'],
          avoidGenres: ['drama lento', 'filme contemplativo'],
          emotionalTone: 'contrasting',
          subSentimentWeights: {
            'Adrenalina': 2.0,
            'Diversão': 1.8,
            'Intensidade': 1.6
          }
        }
      },
      [EmotionalIntention.MAINTAIN]: {
        description: 'Quero manter essa energia positiva e motivadora',
        journeyModifications: {
          preferredGenres: ['aventura inspiradora', 'comédia motivacional', 'musical'],
          avoidGenres: ['drama pesado', 'terror'],
          emotionalTone: 'similar',
          subSentimentWeights: {
            'Motivação Sustentada': 2.0,
            'Inspiração': 1.8,
            'Energia Positiva': 1.6
          }
        }
      },
      [EmotionalIntention.EXPLORE]: {
        description: 'Quero descobrir o que me move e inspira',
        journeyModifications: {
          preferredGenres: ['biografia', 'documentário', 'drama de descoberta'],
          avoidGenres: ['ação sem substância', 'comédia vazia'],
          emotionalTone: 'progressive',
          subSentimentWeights: {
            'Autodescoberta': 2.0,
            'Propósito': 1.8,
            'Paixão': 1.6
          }
        }
      }
    }
  },
  {
    sentiment: 'Calmo(a) / Relaxado(a)',
    intentions: {
      [EmotionalIntention.PROCESS]: {
        description: 'Quero aprofundar essa tranquilidade e paz interior',
        journeyModifications: {
          preferredGenres: ['drama contemplativo', 'filme de arte', 'sci-fi filosófico'],
          avoidGenres: ['ação', 'comédia agitada', 'terror'],
          emotionalTone: 'similar',
          subSentimentWeights: {
            'Contemplação Profunda': 2.0,
            'Paz Interior': 1.8,
            'Introspecção': 1.6
          }
        }
      },
      [EmotionalIntention.TRANSFORM]: {
        description: 'Quero usar essa paz como base para algo inspirador',
        journeyModifications: {
          preferredGenres: ['drama de crescimento', 'romance suave', 'aventura leve'],
          avoidGenres: ['ação intensa', 'thriller agitado'],
          emotionalTone: 'progressive',
          subSentimentWeights: {
            'Crescimento Suave': 2.0,
            'Inspiração Gentil': 1.8,
            'Transformação Gradual': 1.6
          }
        }
      },
      [EmotionalIntention.MAINTAIN]: {
        description: 'Quero continuar nesse estado de serenidade',
        journeyModifications: {
          preferredGenres: ['comédia suave', 'romance calmo', 'animação tranquila'],
          avoidGenres: ['ação', 'terror', 'thriller'],
          emotionalTone: 'similar',
          subSentimentWeights: {
            'Serenidade Mantida': 2.0,
            'Tranquilidade': 1.8,
            'Bem-estar': 1.6
          }
        }
      },
      [EmotionalIntention.EXPLORE]: {
        description: 'Quero entender diferentes aspectos da tranquilidade',
        journeyModifications: {
          preferredGenres: ['sci-fi contemplativo', 'drama filosófico', 'documentário reflexivo'],
          avoidGenres: ['ação', 'comédia barulhenta'],
          emotionalTone: 'progressive',
          subSentimentWeights: {
            'Exploração da Paz': 2.0,
            'Filosofia da Calma': 1.8,
            'Tipos de Serenidade': 1.6
          }
        }
      }
    }
  }
];

// Função para obter configuração de intenção
export function getIntentionConfig(sentiment: string, intention: EmotionalIntention) {
  const config = INTENTION_CONFIGS.find(c => c.sentiment === sentiment);
  return config?.intentions[intention] || null;
}

export default {
  EmotionalIntention,
  getIntentionConfig
};

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mainSentiments = [
  {
    name: 'Relaxation and Distraction',
    description: 'Movies that help you relax and provide a pleasant distraction from daily life',
    keywords: [
      'relax', 'distract', 'light', 'easy', 'simple', 'peaceful', 'calm', 'serene',
      'comfortable', 'pleasant', 'enjoyable', 'entertaining', 'fun', 'happy', 'positive'
    ],
    subSentiments: [
      {
        name: 'Light and Carefree',
        description: 'Light comedies, children\'s animations, simple narratives with happy endings',
        keywords: [
          'light', 'carefree', 'comedy', 'funny', 'humorous', 'happy', 'joyful',
          'simple', 'easy', 'pleasant', 'enjoyable', 'entertaining', 'amusing'
        ]
      },
      {
        name: 'Immersion and Escapism',
        description: 'Fantasy films, science fiction with immersive worlds, well-produced historical films',
        keywords: [
          'fantasy', 'sci-fi', 'historical', 'immersive', 'escapism', 'world-building',
          'magical', 'mystical', 'epic', 'grand', 'spectacular', 'wonderful'
        ]
      },
      {
        name: 'Calming and Comforting',
        description: 'Movies with beautiful landscapes, relaxing soundtracks, slow and contemplative stories',
        keywords: [
          'calm', 'comforting', 'peaceful', 'serene', 'tranquil', 'quiet', 'slow',
          'contemplative', 'meditative', 'relaxing', 'soothing', 'gentle', 'soft'
        ]
      }
    ]
  },
  {
    name: 'Fun and Joy',
    description: 'Movies that bring laughter, happiness, and positive energy',
    keywords: [
      'fun', 'joy', 'happy', 'laugh', 'smile', 'positive', 'upbeat', 'cheerful',
      'lighthearted', 'entertaining', 'amusing', 'delightful', 'enjoyable'
    ],
    subSentiments: [
      {
        name: 'Laughter and Slapstick',
        description: 'Slapstick comedies, absurd situations, and caricatured characters',
        keywords: [
          'slapstick', 'comedy', 'funny', 'hilarious', 'absurd', 'ridiculous',
          'wacky', 'zany', 'goofy', 'silly', 'amusing', 'entertaining'
        ]
      },
      {
        name: 'Smiles and Lightness',
        description: 'Romantic comedies with happy endings, optimistic stories of friendship and overcoming',
        keywords: [
          'romantic', 'comedy', 'happy', 'joyful', 'optimistic', 'positive',
          'light', 'easy', 'pleasant', 'enjoyable', 'delightful'
        ]
      },
      {
        name: 'Adventure Fun',
        description: 'Adventure films with just the right amount of action and a light, exciting tone',
        keywords: [
          'adventure', 'action', 'exciting', 'thrilling', 'fun', 'enjoyable',
          'entertaining', 'amusing', 'light', 'easy', 'pleasant'
        ]
      },
      {
        name: 'Happy Nostalgia',
        description: 'Classic films from childhood or adolescence that bring back good memories',
        keywords: [
          'nostalgic', 'classic', 'childhood', 'adolescence', 'memories',
          'remember', 'recall', 'reminisce', 'sentimental', 'emotional'
        ]
      }
    ]
  },
  {
    name: 'Comfort and Security',
    description: 'Movies that provide a sense of comfort, familiarity, and safety',
    keywords: [
      'comfort', 'security', 'safe', 'familiar', 'known', 'predictable',
      'reassuring', 'soothing', 'calming', 'peaceful', 'serene'
    ],
    subSentiments: [
      {
        name: 'Familiar and Predictable',
        description: 'Movies watched many times that bring a sense of familiarity and comfort',
        keywords: [
          'familiar', 'predictable', 'known', 'comfortable', 'safe',
          'secure', 'reassuring', 'soothing', 'calming', 'peaceful'
        ]
      },
      {
        name: 'Overcoming Fear (Controlled)',
        description: 'Horror or suspense films where danger is eventually controlled and there is a sense of relief at the end',
        keywords: [
          'horror', 'suspense', 'fear', 'scary', 'thrilling', 'exciting',
          'controlled', 'safe', 'secure', 'reassuring', 'relief'
        ]
      },
      {
        name: 'Safe and Welcoming Worlds',
        description: 'Fantasy or science fiction films with a strong sense of community and hope',
        keywords: [
          'fantasy', 'sci-fi', 'community', 'hope', 'safe', 'secure',
          'welcoming', 'friendly', 'kind', 'gentle', 'peaceful'
        ]
      },
      {
        name: 'Edifying Stories',
        description: 'Movies based on true stories with inspiring endings and positive messages',
        keywords: [
          'inspiring', 'motivating', 'encouraging', 'positive', 'hopeful',
          'optimistic', 'uplifting', 'empowering', 'strengthening'
        ]
      }
    ]
  },
  {
    name: 'Intense Emotions',
    description: 'Movies that evoke strong emotions and keep you on the edge of your seat',
    keywords: [
      'intense', 'emotional', 'strong', 'powerful', 'deep', 'profound',
      'moving', 'touching', 'affecting', 'impactful', 'significant'
    ],
    subSentiments: [
      {
        name: 'Suspense and Tension',
        description: 'Movies that hold your breath and generate constant expectation',
        keywords: [
          'suspense', 'tension', 'thrilling', 'exciting', 'intense',
          'powerful', 'strong', 'deep', 'profound', 'moving'
        ]
      },
      {
        name: 'Action and Adrenaline',
        description: 'Movies with fight sequences, chases, and lots of energy',
        keywords: [
          'action', 'adrenaline', 'exciting', 'thrilling', 'intense',
          'powerful', 'strong', 'dynamic', 'energetic', 'vital'
        ]
      },
      {
        name: 'Drama and Suffering',
        description: 'Movies that explore deep emotions like sadness, loss, and conflict',
        keywords: [
          'drama', 'suffering', 'sadness', 'loss', 'conflict', 'pain',
          'grief', 'sorrow', 'anguish', 'distress', 'trouble'
        ]
      },
      {
        name: 'Mystery and Intrigue',
        description: 'Movies that challenge the viewer to discover the truth',
        keywords: [
          'mystery', 'intrigue', 'suspense', 'thrilling', 'exciting',
          'puzzling', 'perplexing', 'confusing', 'bewildering', 'baffling'
        ]
      }
    ]
  },
  {
    name: 'Reflection and Learning',
    description: 'Movies that make you think deeply and learn something new',
    keywords: [
      'reflection', 'learning', 'thinking', 'understanding', 'comprehension',
      'knowledge', 'wisdom', 'insight', 'enlightenment', 'awareness'
    ],
    subSentiments: [
      {
        name: 'Social and Political Issues',
        description: 'Documentaries and films that address important themes and lead to critical reflection',
        keywords: [
          'social', 'political', 'documentary', 'important', 'significant',
          'critical', 'analytical', 'thoughtful', 'profound', 'deep'
        ]
      },
      {
        name: 'Personal Growth and Self-Knowledge',
        description: 'Movies about transformation journeys, overcome challenges, and internal discoveries',
        keywords: [
          'personal', 'growth', 'self-knowledge', 'transformation', 'change',
          'development', 'progress', 'improvement', 'advancement', 'evolution'
        ]
      },
      {
        name: 'Different Cultures and Perspectives',
        description: 'Foreign films, documentaries about other societies, and stories with diverse points of view',
        keywords: [
          'cultural', 'diverse', 'different', 'foreign', 'international',
          'global', 'worldwide', 'universal', 'general', 'common'
        ]
      },
      {
        name: 'Philosophy and Existentialism',
        description: 'Movies that raise deep questions about life, death, and the meaning of existence',
        keywords: [
          'philosophy', 'existential', 'life', 'death', 'meaning',
          'purpose', 'significance', 'importance', 'value', 'worth'
        ]
      }
    ]
  },
  {
    name: 'Identification and Empathy',
    description: 'Movies that help you understand and connect with others on a deep emotional level',
    keywords: [
      'identification', 'empathy', 'understanding', 'connection', 'relation',
      'relationship', 'bond', 'link', 'tie', 'connection'
    ],
    subSentiments: [
      {
        name: 'Personal Overcoming Stories',
        description: 'Movies with characters who face great challenges and inspire the audience',
        keywords: [
          'overcoming', 'challenge', 'difficulty', 'obstacle', 'barrier',
          'hurdle', 'impediment', 'hindrance', 'block', 'stop'
        ]
      },
      {
        name: 'Complex Human Relationships',
        description: 'Movies that explore the nuances of family, love, and friendship relationships',
        keywords: [
          'relationship', 'family', 'love', 'friendship', 'connection',
          'bond', 'link', 'tie', 'relation', 'association'
        ]
      },
      {
        name: 'Marginalized Voices',
        description: 'Movies that highlight stories of minority groups and promote understanding',
        keywords: [
          'marginalized', 'minority', 'group', 'community', 'society',
          'culture', 'tradition', 'custom', 'practice', 'habit'
        ]
      },
      {
        name: 'Universal Experiences',
        description: 'Movies that address themes common to all, such as love, loss, joy, and fear',
        keywords: [
          'universal', 'common', 'general', 'shared', 'collective',
          'communal', 'public', 'social', 'societal', 'cultural'
        ]
      }
    ]
  },
  {
    name: 'Community Feeling',
    description: 'Movies that promote a sense of togetherness and shared experience',
    keywords: [
      'community', 'together', 'united', 'joined', 'connected',
      'related', 'associated', 'affiliated', 'allied', 'partnered'
    ],
    subSentiments: [
      {
        name: 'Family Movies',
        description: 'Animations, adventure films for all ages, light comedies',
        keywords: [
          'family', 'children', 'kids', 'parents', 'siblings',
          'relatives', 'kin', 'relations', 'connections', 'bonds'
        ]
      },
      {
        name: 'Movies to Share with Friends',
        description: 'Comedies, action films with exciting scenes to comment on, horror films to be scared together',
        keywords: [
          'friends', 'companions', 'mates', 'buddies', 'pals',
          'associates', 'colleagues', 'partners', 'allies', 'supporters'
        ]
      },
      {
        name: 'Shared Cultural Events',
        description: 'Very popular or classic films that generate conversations and common references',
        keywords: [
          'cultural', 'popular', 'classic', 'famous', 'well-known',
          'renowned', 'celebrated', 'noted', 'notable', 'distinguished'
        ]
      },
      {
        name: 'Movies that Celebrate Unity',
        description: 'Stories about teamwork, collaboration, and the power of unity',
        keywords: [
          'unity', 'togetherness', 'solidarity', 'cooperation', 'collaboration',
          'partnership', 'alliance', 'association', 'connection', 'relation'
        ]
      }
    ]
  }
];

async function updateSentiments() {
  try {
    console.log('Starting sentiment update...');
    
    // Primeiro, limpar os dados existentes
    console.log('Cleaning existing data...');
    await prisma.subSentiment.deleteMany();
    await prisma.mainSentiment.deleteMany();

    console.log('Inserting new data...');
    // Inserir os novos dados
    for (const mainSentiment of mainSentiments) {
      const createdMain = await prisma.mainSentiment.create({
        data: {
          name: mainSentiment.name,
          description: mainSentiment.description,
          keywords: mainSentiment.keywords,
          subSentiments: {
            create: mainSentiment.subSentiments.map(sub => ({
              name: sub.name,
              description: sub.description,
              keywords: sub.keywords
            }))
          }
        }
      });

      console.log(`Created main sentiment: ${createdMain.name} with ${mainSentiment.subSentiments.length} sub-sentiments`);
    }

    console.log('All sentiments updated successfully!');
  } catch (error) {
    console.error('Error updating sentiments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSentiments(); 
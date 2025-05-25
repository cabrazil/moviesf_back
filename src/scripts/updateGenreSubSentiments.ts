import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const genreSubSentiments = {
  'Drama': [
    {
      name: 'Contemplação e Reflexão',
      description: 'Filmes que exploram temas profundos e convidam à reflexão',
      keywords: [
        'contemplação',
        'reflexão',
        'introspecção',
        'análise',
        'profundidade',
        'complexidade',
        'humanidade',
        'emoção',
        'sentimento',
        'experiência'
      ]
    },
    {
      name: 'Superação e Crescimento',
      description: 'Histórias de transformação pessoal e desenvolvimento',
      keywords: [
        'superação',
        'crescimento',
        'transformação',
        'desenvolvimento',
        'evolução',
        'mudança',
        'aprendizado',
        'desafio',
        'conquista',
        'vitória'
      ]
    }
  ],
  'Comédia': [
    {
      name: 'Leveza e Diversão',
      description: 'Filmes que trazem alegria e descontração',
      keywords: [
        'leveza',
        'diversão',
        'alegria',
        'descontração',
        'humor',
        'riso',
        'bem-humorado',
        'divertido',
        'engraçado',
        'alegre'
      ]
    },
    {
      name: 'Sátira e Crítica Social',
      description: 'Comédias que fazem críticas sociais de forma inteligente',
      keywords: [
        'sátira',
        'crítica',
        'social',
        'inteligente',
        'irônico',
        'mordaz',
        'perspicaz',
        'agudo',
        'sagaz',
        'astuto'
      ]
    }
  ],
  'Crime': [
    {
      name: 'Análise Criminal',
      description: 'Filmes que exploram a mente criminosa e a investigação',
      keywords: [
        'análise',
        'investigação',
        'detetive',
        'mistério',
        'crime',
        'resolução',
        'pista',
        'evidência',
        'dedução',
        'lógica'
      ]
    },
    {
      name: 'Consequências e Justiça',
      description: 'Exploração das consequências do crime e busca por justiça',
      keywords: [
        'consequência',
        'justiça',
        'moral',
        'ética',
        'responsabilidade',
        'culpa',
        'redenção',
        'arrependimento',
        'perdão',
        'punição'
      ]
    }
  ],
  'Ficção Científica': [
    {
      name: 'Exploração Científica',
      description: 'Filmes que exploram conceitos científicos e tecnológicos',
      keywords: [
        'ciência',
        'tecnologia',
        'futuro',
        'inovação',
        'descoberta',
        'experimento',
        'pesquisa',
        'análise',
        'investigação',
        'exploração'
      ]
    },
    {
      name: 'Reflexão Filosófica',
      description: 'Exploração de questões filosóficas através da ficção científica',
      keywords: [
        'filosofia',
        'existência',
        'consciência',
        'realidade',
        'humanidade',
        'ética',
        'moral',
        'futuro',
        'evolução',
        'transformação'
      ]
    }
  ]
};

async function updateGenreSubSentiments() {
  try {
    console.log('Iniciando atualização dos SubSentiments por gênero...');

    // Buscar o MainSentiment "Neutro / Indiferente"
    const neutralSentiment = await prisma.mainSentiment.findFirst({
      where: { name: 'Neutro / Indiferente' }
    });

    if (!neutralSentiment) {
      throw new Error('MainSentiment "Neutro / Indiferente" não encontrado');
    }

    // Remover SubSentiments existentes
    await prisma.subSentiment.deleteMany({
      where: {
        mainSentimentId: neutralSentiment.id
      }
    });

    console.log('SubSentiments antigos removidos');

    // Criar novos SubSentiments para cada gênero
    for (const [genre, subSentiments] of Object.entries(genreSubSentiments)) {
      console.log(`\nProcessando gênero: ${genre}`);
      
      for (const subSentiment of subSentiments) {
        const created = await prisma.subSentiment.create({
          data: {
            ...subSentiment,
            mainSentimentId: neutralSentiment.id
          }
        });
        console.log(`✅ Criado SubSentiment: ${created.name}`);
      }
    }

    console.log('\n✅ Atualização concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao atualizar SubSentiments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
if (require.main === module) {
  updateGenreSubSentiments();
} 
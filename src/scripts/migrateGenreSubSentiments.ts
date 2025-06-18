import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const genreSubSentiments = {
  'Drama': [
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
      name: 'Drama Familiar',
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
    },
    {
      name: 'Drama Familiar',
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

async function migrateGenreSubSentiments() {
  try {
    console.log('Iniciando migração dos gêneros e SubSentiments...');

    // 1. Buscar o MainSentiment "Neutro / Indiferente"
    const neutralSentiment = await prisma.mainSentiment.findFirst({
      where: { name: 'Neutro / Indiferente' }
    });

    if (!neutralSentiment) {
      throw new Error('MainSentiment "Neutro / Indiferente" não encontrado');
    }

    // 2. Criar ou atualizar gêneros
    const genreMap = new Map<string, number>();
    
    for (const genreName of Object.keys(genreSubSentiments)) {
      const genre = await prisma.genre.upsert({
        where: { name: genreName },
        update: {},
        create: { name: genreName }
      });
      genreMap.set(genreName, genre.id);
      console.log(`✅ Gênero processado: ${genreName}`);
    }

    // 3. Remover SubSentiments existentes
    await prisma.subSentiment.deleteMany({
      where: {
        mainSentimentId: neutralSentiment.id
      }
    });
    console.log('SubSentiments antigos removidos');

    // 4. Criar novos SubSentiments e suas relações com gêneros
    for (const [genreName, subSentiments] of Object.entries(genreSubSentiments)) {
      console.log(`\nProcessando gênero: ${genreName}`);
      const genreId = genreMap.get(genreName);
      
      if (!genreId) {
        console.error(`❌ Gênero não encontrado: ${genreName}`);
        continue;
      }
      
      for (const subSentiment of subSentiments) {
        // Criar SubSentiment
        const created = await prisma.subSentiment.create({
          data: {
            ...subSentiment,
            mainSentimentId: neutralSentiment.id
          }
        });
        console.log(`✅ Criado SubSentiment: ${created.name}`);

        // Criar relação com o gênero
        await prisma.genreSubSentiment.create({
          data: {
            genreId,
            subSentimentId: created.id
          }
        });
        console.log(`✅ Relação criada: ${genreName} -> ${created.name}`);
      }
    }

    // 5. Atualizar filmes existentes com os IDs dos gêneros
    const movies = await prisma.movie.findMany();
    for (const movie of movies) {
      const genreIds = await Promise.all(
        movie.genres.map(async (genreName) => {
          const genre = await prisma.genre.findFirst({
            where: { name: genreName }
          });
          return genre?.id;
        })
      );

      const validGenreIds = genreIds.filter((id): id is number => id !== undefined);

      await prisma.movie.update({
        where: { id: movie.id },
        data: {
          genreIds: validGenreIds,
          genreRelations: {
            connect: validGenreIds.map(id => ({ id }))
          }
        }
      });
      console.log(`✅ Filme atualizado: ${movie.title}`);
    }

    console.log('\n✅ Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
if (require.main === module) {
  migrateGenreSubSentiments();
} 
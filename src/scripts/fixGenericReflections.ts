import { PrismaClient } from '@prisma/client';
import { searchMovie } from './populateMovies';
import axios from 'axios';

const prisma = new PrismaClient();

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function generateReflectionWithOpenAI(movie: any, keywords: string[]): Promise<string> {
  const prompt = `
Filme: ${movie.title} (${movie.year || 'Ano não especificado'})
Sinopse: ${movie.overview}
Gêneros: ${movie.genres.map((g: any) => g.name).join(', ')}
Palavras-chave emocionais: ${keywords.join(', ')}

Com base nessas informações, escreva uma reflexão curta, inspiradora e específica sobre este filme, capturando sua essência emocional e os temas principais da história.

A reflexão deve:
- Ter entre 20-35 palavras
- Ser inspiradora e envolvente
- Capturar o tom e tema específico do filme
- Terminar com um ponto final
- Não repetir o nome do filme
- Conectar os temas principais com o impacto emocional

Seja específico para este filme, não genérico.
`;

  try {
    const response = await axios.post<OpenAIResponse>('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Você é um crítico de cinema especializado em análise emocional de filmes. Escreva reflexões concisas e inspiradoras que capturem a essência emocional única de cada filme.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 120
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const reflection = response.data.choices[0].message.content.trim();
    return reflection;
  } catch (error) {
    console.error('Erro ao gerar reflexão com OpenAI:', error);
    return `Uma jornada cinematográfica que explora a complexidade das emoções humanas com profundidade e sensibilidade.`;
  }
}

async function fixGenericReflections() {
  console.log('🔧 === CORREÇÃO DE REFLEXÕES GENÉRICAS ===');
  console.log('📋 Buscando registros entre IDs 254 e 273...\n');

  try {
    // 1. Buscar registros da MovieSuggestionFlow entre os IDs especificados
    const movieSuggestions = await prisma.movieSuggestionFlow.findMany({
      where: {
        id: {
          gte: 254,
          lte: 273
        }
      },
      include: {
        movie: {
          include: {
            movieSentiments: {
              include: {
                subSentiment: true
              }
            }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`📊 Encontrados ${movieSuggestions.length} registros para correção.\n`);

    if (movieSuggestions.length === 0) {
      console.log('⚠️ Nenhum registro encontrado no intervalo especificado.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // 2. Processar cada registro
    for (const suggestion of movieSuggestions) {
      console.log(`\n🎬 Processando ID ${suggestion.id}: "${suggestion.movie.title}" (${suggestion.movie.year})`);
      console.log(`📝 Reflexão atual: "${suggestion.reason}"`);

      try {
        // 3. Obter keywords dos sentimentos do filme
        const keywords = suggestion.movie.movieSentiments
          .flatMap(ms => ms.subSentiment.keywords)
          .filter((value, index, self) => self.indexOf(value) === index);

        console.log(`🏷️ Keywords encontradas: ${keywords.join(', ')}`);

        // 4. Buscar dados do filme no TMDB
        let tmdbMovie;
        if (suggestion.movie.tmdbId) {
          console.log(`🔍 Consultando TMDB com ID: ${suggestion.movie.tmdbId}`);
          tmdbMovie = await searchMovie(undefined, undefined, suggestion.movie.tmdbId);
        } else {
          console.log(`🔍 Consultando TMDB por título e ano`);
          tmdbMovie = await searchMovie(suggestion.movie.title, suggestion.movie.year || undefined);
        }

        if (!tmdbMovie) {
          console.log(`❌ Filme não encontrado no TMDB`);
          errorCount++;
          continue;
        }

        // 5. Gerar nova reflexão
        console.log(`🧠 Gerando nova reflexão...`);
        const newReflection = await generateReflectionWithOpenAI(tmdbMovie.movie, keywords);

        // 6. Atualizar o registro
        await prisma.movieSuggestionFlow.update({
          where: { id: suggestion.id },
          data: { reason: newReflection }
        });

        console.log(`✅ Nova reflexão: "${newReflection}"`);
        successCount++;

        // Delay para evitar rate limiting da OpenAI
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Erro ao processar registro ${suggestion.id}:`, error);
        errorCount++;
      }
    }

    // 7. Relatório final
    console.log(`\n📊 === RELATÓRIO FINAL ===`);
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📈 Total processado: ${successCount + errorCount}`);

    if (successCount > 0) {
      console.log(`\n🎉 Correção concluída com sucesso!`);
    }

  } catch (error) {
    console.error('❌ Erro fatal no processo de correção:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log('🔧 === CORRETOR DE REFLEXÕES GENÉRICAS ===');
    console.log('\nUso: npx ts-node fixGenericReflections.ts');
    console.log('\nEste script corrige reflexões genéricas na tabela MovieSuggestionFlow');
    console.log('para os registros com IDs entre 254 e 273, gerando novas reflexões');
    console.log('específicas baseadas nos dados dos filmes e usando OpenAI.');
    console.log('\nCertifique-se de ter a variável OPENAI_API_KEY configurada no .env');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Erro: OPENAI_API_KEY não encontrada no arquivo .env');
    console.error('Configure a chave da API OpenAI antes de executar o script.');
    return;
  }

  await fixGenericReflections();
}

if (require.main === module) {
  main();
}

export { fixGenericReflections }; 
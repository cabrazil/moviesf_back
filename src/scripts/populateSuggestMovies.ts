import { PrismaClient } from '@prisma/client';
import { validateMovieSentiments } from './validateMovieSentiments';
import { searchMovie } from './populateMovies';
import axios from 'axios';

const prisma = new PrismaClient();

interface JourneyStep {
  stepId: number;
  optionId: number;
}

interface JourneyPath {
  mainSentimentId: number;
  mainSentimentName: string;
  journeyFlowId: number;
  steps: JourneyStep[];
}

interface JourneyOptionFlowSubSentiment {
  subSentimentId: number;
  weight: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function generateReflectionWithOpenAI(movie: any, keywords: string[]): Promise<string> {
  const prompt = `
Sinopse: ${movie.overview}
Gêneros: ${movie.genres.map((g: any) => g.name).join(', ')}
Palavras-chave: ${keywords.join(', ')}

Com base nessas informações, escreva uma reflexão curta, inspiradora e única sobre o filme, conectando os temas principais e o impacto emocional da história. 
A reflexão deve ter no máximo 30 palavras e terminar com um ponto final.
Não repita o nome do filme.
`;

  try {
    const response = await axios.post<OpenAIResponse>(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é um crítico de cinema especializado em análise emocional de filmes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro ao gerar reflexão:', error);
    return 'Filme que explora temas profundos e emocionais.';
  }
}

async function validateJourneyPath(
  movieId: string,
  journeyPath: JourneyPath
): Promise<boolean> {
  try {
    // 1. Validar se o filme existe
    const movie = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (!movie) {
      console.log(`❌ Filme não encontrado: ${movieId}`);
      return false;
    }

    // 2. Validar se o filme tem sentimentos compatíveis com o MainSentiment
    const movieSentiments = await validateMovieSentiments({
      mainSentiment: journeyPath.mainSentimentName,
      movieTitle: movie.title,
      year: movie.year || undefined,
      flow: 'genre',
      genre: movie.genres.join(', ')
    });

    if (!movieSentiments.success) {
      console.log(`❌ Filme não tem sentimentos compatíveis com ${journeyPath.mainSentimentName}`);
      return false;
    }

    // 3. Validar cada passo da jornada
    for (const step of journeyPath.steps) {
      // 3.1 Buscar a opção escolhida
      const option = await prisma.journeyOptionFlow.findUnique({
        where: { id: step.optionId }
      });

      if (!option) {
        console.log(`❌ Opção não encontrada: ${step.optionId}`);
        return false;
      }

      // Validar apenas a última opção da jornada
      if (step !== journeyPath.steps[journeyPath.steps.length - 1]) {
        console.log(`\n⏭️ Pulando validação da opção: ${option.text}`);
        continue;
      }

      console.log(`\nValidando última opção da jornada: ${option.text}`);

      // 3.2.1 Validação específica para obras aclamadas pela crítica (optionId 135)
      if (step.optionId === 135) {
        console.log('\n🔍 Validando se o filme é uma obra aclamada pela crítica...');
        
        // Buscar dados do filme no TMDB para verificar avaliações
        const tmdbMovie = await searchMovie(movie.title, movie.year || undefined);
        if (!tmdbMovie) {
          console.log('❌ Filme não encontrado no TMDB para validação de crítica');
          return false;
        }

        // Verificar se o filme tem uma boa avaliação (acima de 7.0 no TMDB)
        const tmdbRating = tmdbMovie.movie.vote_average || 0;
        const tmdbVoteCount = tmdbMovie.movie.vote_count || 0;
        const popularity = tmdbMovie.movie.popularity || 0;
        
        console.log(`📊 Avaliação TMDB: ${tmdbRating}/10 (${tmdbVoteCount} votos)`);
        console.log(`📈 Popularidade: ${popularity}`);
        
        // Critérios para obra aclamada pela crítica:
        // 1. Avaliação acima de 7.0 no TMDB E pelo menos 1000 votos
        // 2. OU avaliação acima de 7.5 no TMDB (mesmo com menos votos)
        // 3. OU alta popularidade (> 50) com boa avaliação (> 6.5)
        // 4. OU ser um filme clássico/antigo com boa reputação
        
        const isHighRated = tmdbRating >= 7.0 && tmdbVoteCount >= 1000;
        const isVeryHighRated = tmdbRating >= 7.5;
        const isPopularAndWellRated = popularity > 50 && tmdbRating >= 6.5;
        const isClassic = movie.year && movie.year < 1990 && tmdbRating >= 7.0;
        
        const isCriticallyAcclaimed = isHighRated || isVeryHighRated || isPopularAndWellRated || isClassic;
        
        if (!isCriticallyAcclaimed) {
          console.log(`❌ Filme não atende aos critérios de obra aclamada pela crítica`);
          console.log(`   - Avaliação alta + votos: ${isHighRated ? '✅' : '❌'} (${tmdbRating}/10, ${tmdbVoteCount} votos)`);
          console.log(`   - Avaliação muito alta: ${isVeryHighRated ? '✅' : '❌'} (${tmdbRating}/10)`);
          console.log(`   - Popular e bem avaliado: ${isPopularAndWellRated ? '✅' : '❌'} (popularidade: ${popularity}, avaliação: ${tmdbRating})`);
          console.log(`   - Clássico: ${isClassic ? '✅' : '❌'} (ano: ${movie.year}, avaliação: ${tmdbRating})`);
          return false;
        }
        
        console.log(`✅ Filme validado como obra aclamada pela crítica!`);
        if (isHighRated) console.log(`   - Motivo: Alta avaliação (${tmdbRating}/10) com muitos votos (${tmdbVoteCount})`);
        if (isVeryHighRated) console.log(`   - Motivo: Avaliação excepcional (${tmdbRating}/10)`);
        if (isPopularAndWellRated) console.log(`   - Motivo: Alta popularidade (${popularity}) com boa avaliação (${tmdbRating}/10)`);
        if (isClassic) console.log(`   - Motivo: Filme clássico (${movie.year}) com boa reputação (${tmdbRating}/10)`);
      }

      // 3.2 Buscar os SubSentiments associados à opção
      const optionSubSentiments = await prisma.journeyOptionFlowSubSentiment.findMany({
        where: {
          journeyOptionFlowId: step.optionId
        }
      });

      // Buscar detalhes dos SubSentiments
      const subSentimentDetails = await prisma.subSentiment.findMany({
        where: {
          id: {
            in: optionSubSentiments.map(jofss => jofss.subSentimentId)
          }
        }
      });

      // console.log('\nDebug - SubSentiments da opção:', JSON.stringify({
      //   optionSubSentiments,
      //   subSentimentDetails
      // }, null, 2));

      // 3.3 Validar se o filme tem os SubSentiments da opção
      const movieSubSentiments = await prisma.movieSentiment.findMany({
        where: {
          movieId: movieId,
          subSentimentId: {
            in: optionSubSentiments.map(jofss => jofss.subSentimentId)
          }
        }
      });

      // Buscar detalhes dos SubSentiments do filme
      const movieSubSentimentDetails = await prisma.subSentiment.findMany({
        where: {
          id: {
            in: movieSubSentiments.map(mss => mss.subSentimentId)
          }
        }
      });

      // console.log('\nDebug - SubSentiments do filme:', JSON.stringify({
      //   movieSubSentiments,
      //   movieSubSentimentDetails
      // }, null, 2));  

      if (movieSubSentiments.length === 0) {
        console.log(`❌ Filme não tem SubSentiments compatíveis com a opção: ${option.text}`);
        return false;
      }

      // 3.4 Calcular score baseado nos pesos
      const totalScore = movieSubSentiments.reduce((acc, mss) => {
        const optionWeight = optionSubSentiments.find(
          jofss => jofss.subSentimentId === mss.subSentimentId
        )?.weight || 0;
        return acc + Number(optionWeight);
      }, 0);

      // 3.5 Definir threshold mínimo para considerar válido
      const threshold = 0.5;
      if (totalScore < threshold) {
        console.log(`❌ Score insuficiente para a opção: ${option.text} (score: ${totalScore})`);
        return false;
      }

      console.log(`✅ Última opção validada com sucesso: ${option.text}`);
    }

    // 4. Se passou por todas as validações, adicionar à MovieSuggestionFlow
    const movieDetails = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        movieSentiments: {
          include: {
            subSentiment: true
          }
        }
      }
    });

    if (!movieDetails) {
      console.log('❌ Detalhes do filme não encontrados');
      return false;
    }

    // Buscar filme no TMDB para obter mais detalhes
    const tmdbMovie = await searchMovie(movieDetails.title, movieDetails.year || undefined);
    if (!tmdbMovie) {
      console.log('❌ Filme não encontrado no TMDB');
      return false;
    }

    // Gerar reflexão usando OpenAI
    const keywords = movieDetails.movieSentiments
      .flatMap(ms => ms.subSentiment.keywords)
      .filter((value, index, self) => self.indexOf(value) === index);

    const movieKeywords = [
      ...keywords,
      // Keywords extras para Sete Vidas
      "culpa", "arrependimento", "remorso", "peso na consciência",
      "busca por redenção", "necessidade de perdão", "expiação",
      "reparação", "sacrifício pessoal", "autoflagelação",
      "penitência", "busca por paz interior", "redenção",
      "transformação pessoal", "busca por significado",
      "superação", "resgate", "salvação", "altruísmo",
      "compaixão", "empatia", "solidariedade", "generosidade",
      "doação", "entrega"
    ];

    // console.log(`\nDebug - Keywords do filme: ${JSON.stringify(movieKeywords, null, 2)}`);

    const reason = await generateReflectionWithOpenAI(tmdbMovie.movie, movieKeywords);

    await prisma.movieSuggestionFlow.create({
      data: {
        movieId: movieId,
        journeyOptionFlowId: journeyPath.steps[journeyPath.steps.length - 1].optionId,
        reason: reason,
        relevance: 1
      }
    });

    console.log(`✅ Filme ${movieDetails.title} adicionado com sucesso à jornada!`);
    return true;

  } catch (error) {
    console.error('Erro ao validar jornada:', error);
    return false;
  }
}

// Exemplo de uso
async function main() {
  const journeyPath: JourneyPath = {
    mainSentimentId: 15, // Calmo(a)
    mainSentimentName: "Calmo(a)",
    journeyFlowId: 4,
    steps: [
      {
        stepId: 20, // primeiro passo da jornada Calmo(a)
        optionId: 70 // opção "distração leve e agradável"
      },
      {
        stepId: 22, // segundo passo após a opção escolhida
        optionId: 78 // opção "comédia com humor suave"
      }
    ]
  };

  // Testar com o filme "Like Crazy"
  const movieId = "65f8d0b1-2e01-41e4-98e8-bacbed083601";
  await validateJourneyPath(movieId, journeyPath);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 
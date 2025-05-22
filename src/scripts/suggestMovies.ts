async function suggestMovies(userId: string, journeyOptionFlowId: number) {
  try {
    // 1. Buscar as sugestões de filmes para a opção escolhida
    const movieSuggestions = await prisma.movieSuggestionFlow.findMany({
      where: {
        journeyOptionFlowId: journeyOptionFlowId,
      },
      include: {
        movie: true, // Incluir os dados do filme
        journeyOptionFlow: {
          include: {
            journeyStepFlow: {
                include: {
                    journeyFlow: true
                }
            }
          }
        },
      },
    });

    if (movieSuggestions.length === 0) {
      return []; // Nenhuma sugestão encontrada
    }

    const journeyFlow = movieSuggestions[0].journeyOptionFlow.journeyStepFlow.journeyFlow;
    const sentimentoPrincipalId = journeyFlow.mainSentimentId;

    // 2. Buscar o sentimento principal
    const sentimentoPrincipal = await prisma.mainSentiment.findUnique({
        where: {
            id: sentimentoPrincipalId
        }
    })

    // Determinar o sub-sentimento mais relevante (isso depende da lógica do seu aplicativo)
    const subSentimentoId = await getRelevantSubSentimentId(userId); // Função para obter o sub-sentimento

    // 3. Filtrar filmes por MovieSentiment
    const filmesFiltrados = await prisma.movieSentiment.findMany({
      where: {
        mainSentimentId: sentimentoPrincipalId,
        ...(subSentimentoId ? { subSentimentId } : {}), // Se houver sub-sentimento, filtrar por ele também
        movieId: {
          in: movieSuggestions.map((sugestao) => sugestao.movieId), // Filtrar apenas os filmes sugeridos
        },
      },
      include: {
        movie: true,
      },
    });

    // 4. Priorizar filmes (exemplo simples: contar quantas keywords do sentimento o filme tem)
    const filmesPriorizados = filmesFiltrados.map((ms) => {
      const filme = ms.movie;
      const score = filme.keywords.filter((keyword) =>
        sentimentoPrincipal?.keywords.includes(keyword)
      ).length;
      return { filme, score };
    });

    filmesPriorizados.sort((a, b) => b.score - a.score); // Ordenar por score

    return filmesPriorizados.map(item => item.filme).slice(0, 5); // Retornar os 5 melhores
  } catch (error) {
    console.error("Erro ao sugerir filmes:", error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

// Função auxiliar para determinar o sub-sentimento mais relevante para o usuário
// (Você precisa implementar esta lógica com base no seu modelo de dados e nas escolhas do usuário)
async function getRelevantSubSentimentId(userId: string): Promise<number | null> {
  //  Implemente a lógica para buscar o histórico de escolhas do usuário
  //  e determinar qual SubSentiment é o mais adequado.
  //  Pode envolver buscar opções escolhidas em JourneyOptionFlow e relacionar
  //  com as keywords dos SubSentiments.

  return null; // Por enquanto retorna nulo
}

// Exemplo de uso:
async function main() {
  const userId = "user123";
  const journeyOptionFlowId = 10; // Substitua pelo ID da opção escolhida pelo usuário

  const filmesSugeridos = await suggestMovies(userId, journeyOptionFlowId);
  console.log("Filmes sugeridos:", filmesSugeridos);
}

main();
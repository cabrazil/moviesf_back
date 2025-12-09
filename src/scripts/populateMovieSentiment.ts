// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeamento de sentimentos para gêneros incompatíveis
const sentimentosGenerosIncompativeis: { [key: string]: string[] } = {
  'Triste / Melancólico(a)': [
    'comedia',
    'comédia',
    'musical',
    'animacao',
    'animação',
    'familia',
    'família',
    'aventura',
    'acao',
    'ação',
    'super-heroi',
    'super-herói',
    'ficcao cientifica',
    'ficção científica',
    'documentario',
    'documentário',
    'esporte',
    'biografia',
    'faroeste',
    'guerra',
    'crime',
    'misterio',
    'mistério',
    'suspense',
    'terror',
    'thriller',
    'romance'
  ],
  // Adicione outros sentimentos conforme necessário
};

// Função para normalizar texto (remover acentos e converter para minúsculas)
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function popularMovieSentiment(mainSentimentId?: number) {
  try {
    console.log('\n=== INICIANDO PROCESSO ===');
    console.log('Iniciando população da tabela MovieSentiment...');
    
    // 1. Buscar sentimentos principais (filtrado por ID se fornecido)
    const sentimentosPrincipais = mainSentimentId 
      ? await prisma.mainSentiment.findMany({ where: { id: mainSentimentId } })
      : await prisma.mainSentiment.findMany();
    
    console.log(`\nTotal de sentimentos principais encontrados: ${sentimentosPrincipais.length}`);
    sentimentosPrincipais.forEach(s => console.log(`- ${s.name}`));

    // 2. Buscar filmes com filtro inicial por gêneros
    let filmes = await prisma.movie.findMany();
    console.log(`\nTotal de filmes antes do filtro: ${filmes.length}`);

    // Aplicar filtro de gêneros incompatíveis para cada sentimento principal
    for (const sentimentoPrincipal of sentimentosPrincipais) {
      console.log(`\nVerificando sentimento: "${sentimentoPrincipal.name}"`);
      const generosIncompativeis = sentimentosGenerosIncompativeis[sentimentoPrincipal.name] || [];
      console.log(`Gêneros incompatíveis encontrados para "${sentimentoPrincipal.name}": ${generosIncompativeis.length}`);
      
      if (generosIncompativeis.length > 0) {
        console.log(`\n=== FILTRANDO FILMES PARA: ${sentimentoPrincipal.name} ===`);
        console.log(`Gêneros incompatíveis: ${generosIncompativeis.join(', ')}`);

        // Filtrar filmes
        filmes = filmes.filter(filme => {
          console.log(`\n--- PROCESSANDO FILME: ${filme.title} ---`);
          console.log(`Gêneros originais: ${filme.genres.join(', ')}`);

          // Normalizar gêneros do filme
          const generosFilmeNormalizados = filme.genres.map(normalizarTexto);
          console.log(`Gêneros normalizados: ${generosFilmeNormalizados.join(', ')}`);

          // Verificar se algum gênero do filme está na lista de incompatíveis
          const generosIncompativeisEncontrados = generosFilmeNormalizados.filter(generoFilme => {
            // Normalizar também os gêneros incompatíveis para comparação
            const generosIncompativeisNormalizados = generosIncompativeis.map(normalizarTexto);
            const encontrado = generosIncompativeisNormalizados.includes(generoFilme);
            console.log(`Verificando gênero "${generoFilme}": ${encontrado ? 'INCOMPATÍVEL' : 'compatível'}`);
            return encontrado;
          });

          const temGeneroIncompativel = generosIncompativeisEncontrados.length > 0;

          if (temGeneroIncompativel) {
            console.log(`\n❌ EXCLUINDO filme: "${filme.title}"`);
            console.log(`Gêneros incompatíveis encontrados: ${generosIncompativeisEncontrados.join(', ')}`);
          } else {
            console.log(`\n✅ MANTENDO filme: "${filme.title}"`);
          }

          return !temGeneroIncompativel;
        });
      }
    }

    console.log(`\n=== RESULTADO FINAL ===`);
    console.log(`Total de filmes após filtro de gêneros: ${filmes.length}`);
    console.log('\nFilmes que passaram no filtro:');
    filmes.forEach(filme => {
      console.log(`- ${filme.title} (${filme.genres.join(', ')})`);
    });

    // 3. Buscar sub-sentimentos relacionados aos sentimentos principais
    const subSentimentos = await prisma.subSentiment.findMany({
      where: {
        mainSentimentId: {
          in: sentimentosPrincipais.map(s => s.id)
        }
      }
    });
    console.log(`\nTotal de sub-sentimentos encontrados: ${subSentimentos.length}`);

    // Array para armazenar os dados a serem inseridos em MovieSentiment
    const dadosMovieSentiment = [];

    // 4. Iterar sobre os filmes que passaram no filtro de gêneros
    for (const filme of filmes) {
      console.log(`\nProcessando filme: ${filme.title}`);
      console.log(`Gêneros: ${filme.genres.join(', ')}`);
      
      // 5. Iterar sobre os sentimentos principais
      for (const sentimentoPrincipal of sentimentosPrincipais) {
        console.log(`Verificando sentimento principal: ${sentimentoPrincipal.name}`);
        
        // Verificar se há correspondência de keywords
        const keywordsFilme = filme.keywords.map(k => k.toLowerCase());
        const keywordsSentimento = sentimentoPrincipal.keywords.map(k => k.toLowerCase());
        
        console.log(`\nVerificando keywords para "${filme.title}":`);
        console.log(`Keywords do filme: ${keywordsFilme.join(', ')}`);
        console.log(`Keywords do sentimento "${sentimentoPrincipal.name}": ${keywordsSentimento.join(', ')}`);
        
        const matchesPrincipal = keywordsFilme.filter(keywordFilme => {
          // Verificar se alguma keyword do sentimento está contida na keyword do filme
          // ou se a keyword do filme está contida em alguma keyword do sentimento
          const match = keywordsSentimento.some(keywordSentimento => {
            const temMatch = keywordFilme.includes(keywordSentimento) || 
                           keywordSentimento.includes(keywordFilme);
            if (temMatch) {
              console.log(`Match encontrado: "${keywordFilme}" <-> "${keywordSentimento}"`);
            }
            return temMatch;
          });
          return match;
        });

        if (matchesPrincipal.length > 0) {
          console.log(`Match encontrado com sentimento principal: ${sentimentoPrincipal.name}`);
          console.log(`Keywords correspondentes: ${matchesPrincipal.join(', ')}`);

          // 6. Se houver correspondência com o sentimento principal, verificar sub-sentimentos
          const subSentimentosFiltrados = subSentimentos.filter(
            sub => sub.mainSentimentId === sentimentoPrincipal.id
          );

          let encontrouMatchSubSentimento = false;

          if (subSentimentosFiltrados.length > 0) {
            for (const subSentimento of subSentimentosFiltrados) {
              const keywordsSubSentimento = subSentimento.keywords.map(k => k.toLowerCase());
              console.log(`\nVerificando sub-sentimento "${subSentimento.name}":`);
              console.log(`Keywords do sub-sentimento: ${keywordsSubSentimento.join(', ')}`);
              
              const matchesSub = keywordsFilme.filter(keywordFilme => {
                const match = keywordsSubSentimento.some(keywordSub => {
                  const temMatch = keywordFilme.includes(keywordSub) || 
                                 keywordSub.includes(keywordFilme);
                  if (temMatch) {
                    console.log(`Match encontrado: "${keywordFilme}" <-> "${keywordSub}"`);
                  }
                  return temMatch;
                });
                return match;
              });

              if (matchesSub.length > 0) {
                console.log(`Match encontrado com sub-sentimento: ${subSentimento.name}`);
                console.log(`Keywords correspondentes: ${matchesSub.join(', ')}`);
                
                dadosMovieSentiment.push({
                  movieId: filme.id,
                  mainSentimentId: sentimentoPrincipal.id,
                  subSentimentId: subSentimento.id,
                });
                encontrouMatchSubSentimento = true;
              } else {
                console.log(`Nenhum match encontrado com sub-sentimento: ${subSentimento.name}`);
              }
            }
          }

          // Se não encontrou match com nenhum sub-sentimento, criar associação com o sentimento principal
          if (!encontrouMatchSubSentimento) {
            console.log(`Criando associação direta com sentimento principal: ${sentimentoPrincipal.name}`);
            
            // Buscar o primeiro sub-sentimento deste sentimento principal
            const primeiroSubSentimento = subSentimentosFiltrados[0];
            
            if (primeiroSubSentimento) {
              console.log(`Usando sub-sentimento padrão: ${primeiroSubSentimento.name}`);
            dadosMovieSentiment.push({
              movieId: filme.id,
              mainSentimentId: sentimentoPrincipal.id,
                subSentimentId: primeiroSubSentimento.id,
            });
            } else {
              console.log(`AVISO: Não foi possível criar associação para ${filme.title} - nenhum sub-sentimento disponível`);
            }
          }
        } else {
          console.log(`Nenhum match encontrado com sentimento principal: ${sentimentoPrincipal.name}`);
        }
      }
    }

    // 7. Inserir os dados na tabela MovieSentiment
    if (dadosMovieSentiment.length > 0) {
      console.log(`\nTotal de matches encontrados: ${dadosMovieSentiment.length}`);
      
      // Primeiro, remover registros existentes para os filmes e sentimentos processados
      const movieIds = [...new Set(dadosMovieSentiment.map(d => d.movieId))];
      const mainSentimentIds = [...new Set(dadosMovieSentiment.map(d => d.mainSentimentId))];
      
      await prisma.movieSentiment.deleteMany({
        where: {
          AND: [
            { movieId: { in: movieIds } },
            { mainSentimentId: { in: mainSentimentIds } }
          ]
        }
      });
      
      // Inserir novos registros
      await prisma.movieSentiment.createMany({
        data: dadosMovieSentiment,
        skipDuplicates: true,
      });
      
      console.log('Tabela MovieSentiment atualizada com sucesso!');
    } else {
      console.log('Nenhuma correspondência encontrada para popular MovieSentiment.');
    }
  } catch (erro) {
    console.error('Erro ao popular tabela MovieSentiment:', erro);
  } finally {
    await prisma.$disconnect();
  }
}

// Verificar se foi fornecido um ID de sentimento principal como argumento
const mainSentimentId = process.argv[2] ? parseInt(process.argv[2]) : undefined;

// Executar a função
popularMovieSentiment(mainSentimentId);


import { PrismaClient } from '@prisma/client';
import { createAIProvider, getDefaultConfig, AIProvider } from '../utils/aiProvider';

const prisma = new PrismaClient();

interface OscarData {
  filmTitle: string;
  production: string;
  year: number;
  ceremony: number;
  nominations: {
    category: string;
    nominee: string;
    character?: string;
    isWin: boolean;
  }[];
}

export class OscarDataService {

  /**
   * Verifica se o filme deve ter dados de Oscar enriquecidos e executa o processo se necessário.
   * @param tmdbId ID do filme no TMDB (para buscar registro exato no banco)
   * @param force Forçar execução mesmo se já existirem dados
   */
  async enrichMovieAwards(tmdbId: number, force: boolean = false): Promise<void> {
    console.log(`🏆 Verificando dados de Oscar para filme ID (TMDB): ${tmdbId}...`);

    // 1. Buscar filme no banco
    const movie = await prisma.movie.findUnique({
      where: { tmdbId },
      include: {
        awardWins: {
          where: { award: { name: 'Oscar' } }
        },
        awardNominations: {
          where: { award: { name: 'Oscar' } }
        }
      }
    });

    if (!movie) {
      console.log('❌ Filme não encontrado para enriquecimento de Oscars.');
      return;
    }

    // 2. Verificar se tem Oscar no summary
    const summary = (movie.awardsSummary || '').toLowerCase();
    const hasOscarMention = summary.includes('oscar') || summary.includes('academy award');

    if (!hasOscarMention && !force) {
      console.log('ℹ️ Filme não menciona Oscars no awardsSummary. Pulando.');
      return;
    }

    // 3. Verificar se já tem dados (se não estiver forçando)
    const hasExistingData = movie.awardWins.length > 0 || movie.awardNominations.length > 0;

    if (hasExistingData && !force) {
      console.log(`✅ Filme já possui ${movie.awardWins.length} vitórias e ${movie.awardNominations.length} indicações ao Oscar registradas. Pulando.`);
      return;
    }

    console.log(`🚀 Iniciando enriquecimento de Oscars via IA para: ${movie.title} (${movie.year})...`);

    // 4. Buscar dados via IA
    const searchTitle = movie.original_title || movie.title;
    console.log(`🤖 Buscando por título: "${searchTitle}"`);
    const oscarData = await this.fetchOscarDataFromAI(searchTitle, movie.year || 0);

    if (!oscarData) {
      console.log('⚠️ A IA não retornou dados de Oscar válidos ou o filme não teve indicações.');
      return;
    }

    // 5. Processar e Salvar no Banco
    await this.processAndSaveOscarData(oscarData, movie);

    console.log('✅ Enriquecimento de Oscars concluído com sucesso.');
  }

  private async fetchOscarDataFromAI(title: string, year: number): Promise<OscarData | null> {
    const config = getDefaultConfig('deepseek');
    config.temperature = 0.1; // Precisão máxima
    const aiProvider = createAIProvider(config);

    const systemPrompt = `Você é um bibliotecário rigoroso do banco de dados oficial do Oscar (Academy Awards). Sua prioridade máxima é a PRECISÃO FACTUAL.
    Você NUNCA deve inventar vitórias. É melhor listar apenas indicações do que inventar uma vitória falsa.
    Muitos filmes são indicados a várias categorias mas não ganham nenhuma. Isso é normal.
    Se um filme não tem vitórias, NÃO coloque asteriscos.`;

    const userPrompt = `
Forneça a lista completa de indicações e vitórias no Oscar para o filme "${title}" lançado em ${year}.

A saída DEVE seguir ESTRITAMENTE este formato de texto plano:

Linha 1: Título do Filme (em inglês)
Linha 2: Produtoras (separadas por ponto e vírgula)
Linha 3: Ano da cerimônia e número da edição (FORMATO EXATO: "YYYY (NNth)")
Linhas seguintes: Categoria -- Indicados

REGRAS DE PRECISÃO (CRÍTICO):
1. Marque VENCEDORES com um asterisco (*) APENAS se tiver 100% de certeza absoluta.
2. CUIDADO: É comum filmes terem muitas indicações (Nominations) e ZERO vitórias (Wins). Não confunda.
3. Exemplo de erro comum: "News of the World" NÃO ganhou Visual Effects (o vencedor foi Tenet). Não cometa esse erro.
4. Use "--" para separar categoria dos indicados.
5. Liste TODAS as indicações.

Exemplo de filme SEM vitórias:
The Wolf of Wall Street
Red Granite Pictures; Appian Way
2014 (86th)
BEST PICTURE -- Martin Scorsese, Leonardo DiCaprio, Joey McFarland and Emma Tillinger Koskoff, Producers
DIRECTING -- Martin Scorsese
ACTOR IN A LEADING ROLE -- Leonardo DiCaprio
ACTOR IN A SUPPORTING ROLE -- Jonah Hill
WRITING (Adapted Screenplay) -- Screenplay by Terence Winter

Exemplo de filme COM vitórias:
Dunkirk
Syncopy Pictures Production; Warner Bros.
2018 (90th)
DIRECTING -- Christopher Nolan
*FILM EDITING -- Lee Smith
`;

    try {
      const response = await aiProvider.generateResponse(systemPrompt, userPrompt);
      if (!response.success) {
        console.error('❌ Erro na IA ao buscar Oscars:', response.error);
        return null;
      }

      const text = response.content.trim();
      if (text.includes('NENHUMA INDICAÇÃO')) {
        return null;
      }

      return this.parseOscarText(text);

    } catch (error) {
      console.error('❌ Erro ao buscar dados de Oscar:', error);
      return null;
    }
  }

  private parseOscarText(text: string): OscarData | null {
    // Remover backticks se houver
    const cleanText = text.replace(/```text/g, '').replace(/```/g, '').trim();
    const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length < 3) return null;

    const result: OscarData = {
      filmTitle: lines[0],
      production: lines[1],
      year: 0,
      ceremony: 0,
      nominations: []
    };

    // Linha 3: Ano e Cerimônia
    const yearMatch = lines[2].match(/(\d{4})\s*\((\d+)(?:st|nd|rd|th)\)/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[1], 10);
      result.ceremony = parseInt(yearMatch[2], 10);
    }

    // Processar indicações (a partir da linha 3 em diante - índice 3)
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('[NOTE:') || line.startsWith('Results')) continue;

      const isWin = line.startsWith('*');
      const cleanLine = line.replace(/^\*\s*/, '');

      let match = cleanLine.match(/^(.+?)\s*--\s*(.+?)(?:\s*\{\"([^"]+)\"\})?\s*$/);

      if (match) {
        result.nominations.push({
          category: match[1].trim(),
          nominee: match[2].trim(),
          character: match[3] || undefined,
          isWin
        });
      }
    }

    return result;
  }

  private async processAndSaveOscarData(data: OscarData, movieArg: any): Promise<void> {
    // Obter Award Oscar
    const oscarAward = await prisma.award.upsert({
      where: { name: 'Oscar' },
      update: {},
      create: { name: 'Oscar', category: 'Cinema', url: 'https://www.oscars.org/' }
    });

    // Processar cada indicação/vitória
    for (const nomination of data.nominations) {
      // Obter ou criar Categoria
      const category = await prisma.awardCategory.upsert({
        where: { awardId_name: { awardId: oscarAward.id, name: nomination.category } },
        update: {},
        create: { awardId: oscarAward.id, name: nomination.category }
      });

      // Tentar criar Actor
      let personId: string | undefined;
      if (nomination.nominee) {
        const existingActor = await prisma.actor.findFirst({
          where: { name: { equals: nomination.nominee, mode: 'insensitive' } }
        });

        if (existingActor) {
          personId = existingActor.id;
        } else {
          const max = await prisma.actor.findFirst({ orderBy: { tmdbId: 'desc' } });
          const newTmdbId = (max?.tmdbId || 0) + 1;

          const newActor = await prisma.actor.create({
            data: { name: nomination.nominee, tmdbId: newTmdbId }
          });
          personId = newActor.id;
        }
      }

      const commonData = {
        movieId: movieArg.id,
        awardId: oscarAward.id,
        awardCategoryId: category.id,
        year: data.year
      };

      if (nomination.isWin) {
        // Registrar Vitória
        await prisma.movieAwardWin.upsert({
          where: { movieId_awardId_awardCategoryId_year: commonData },
          update: {},
          create: commonData
        });
        console.log(`   🏆 Vitória: ${nomination.category}`);

        // Vincular Pessoa se houver
        if (personId) {
          // Remover movieId para as tabelas de Pessoa (se não existir na tabela)
          // Usando destructuring para remover campos desnecessários
          const { movieId, ...personData } = commonData;

          await prisma.personAwardWin.upsert({
            where: { personId_awardId_awardCategoryId_year: { ...personData, personId } },
            update: { forMovieId: movieArg.id },
            create: { ...personData, personId, forMovieId: movieArg.id }
          }).catch(e => console.error('Erro ao vincular pessoa vitória:', e.message));
        }

      } else {
        // Registrar Indicação
        await prisma.movieAwardNomination.upsert({
          where: { movieId_awardId_awardCategoryId_year: commonData },
          update: {},
          create: commonData
        });
        console.log(`   🎯 Indicação: ${nomination.category}`);

        // Vincular Pessoa se houver
        if (personId) {
          const { movieId, ...personData } = commonData;

          await prisma.personAwardNomination.upsert({
            where: { personId_awardId_awardCategoryId_year: { ...personData, personId } },
            update: { forMovieId: movieArg.id },
            create: { ...personData, personId, forMovieId: movieArg.id }
          }).catch(e => console.error('Erro ao vincular pessoa indicação:', e.message));
        }
      }
    }
  }
}

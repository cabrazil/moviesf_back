import './scripts-helper';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ParsedMovie {
  title: string;
  year?: number;
}

/**
 * Faz o parse de uma string de filme, detectando opcionalmente o ano no formato "Título (Ano)"
 */
function parseMovieString(movieStr: string): ParsedMovie {
  const match = movieStr.match(/^(.+?)\s*\((\d{4})\)$/);
  if (match) {
    return {
      title: match[1].trim(),
      year: parseInt(match[2], 10),
    };
  }
  return { title: movieStr.trim() };
}

async function main() {
  const args = process.argv.slice(2);
  let moviesArg: string | undefined;
  let buttonTitle: string | undefined;
  let buttonMicrocopy: string = 'Uma pequena curadoria para o seu momento.';
  let headerPhrase: string | undefined;
  let startDateStr: string | undefined;
  let endDateStr: string | undefined;
  let priorityVal: number = 0;
  let isActive: boolean = true;

  // Parsing manual consistente com o padrão do projeto
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--movies=')) {
      moviesArg = args[i].split('=')[1];
    } else if (args[i].startsWith('--title=')) {
      buttonTitle = args[i].split('=')[1];
    } else if (args[i].startsWith('--microcopy=')) {
      buttonMicrocopy = args[i].split('=')[1];
    } else if (args[i].startsWith('--phrase=')) {
      headerPhrase = args[i].split('=')[1];
    } else if (args[i].startsWith('--start=')) {
      startDateStr = args[i].split('=')[1];
    } else if (args[i].startsWith('--end=')) {
      endDateStr = args[i].split('=')[1];
    } else if (args[i].startsWith('--priority=')) {
      priorityVal = parseInt(args[i].split('=')[1], 10);
    } else if (args[i].startsWith('--active=')) {
      isActive = args[i].split('=')[1] === 'true';
    }
  }

  // 1. Mostrar curadorias ativas atuais
  try {
    const now = new Date();
    const activeCurations = await prisma.dailyCuration.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { startDate: 'asc' }
      ]
    });

    console.log('\n📅 === Painel: Curadorias Ativas no Banco ===');
    if (activeCurations.length === 0) {
      console.log('  Nenhuma curadoria ativa cadastrada.');
    } else {
      for (const cur of activeCurations) {
        // Encontrar títulos dos filmes associados preservando a ordem dos movieIds
        const moviesList = await prisma.movie.findMany({
          where: { id: { in: cur.movieIds } },
          select: { id: true, title: true, year: true }
        });
        
        // Mapear preservando a ordem original do array movieIds
        const orderedMovies = cur.movieIds
          .map(id => moviesList.find(m => m.id === id))
          .filter((m): m is { id: string; title: string; year: number } => !!m);

        const movieNames = orderedMovies.map(m => `${m.title} (${m.year})`).join(', ');

        const isCurrentlyLive = cur.startDate <= now && cur.endDate >= now;
        const statusIcon = isCurrentlyLive ? '🟢 NO APP AGORA' : '⏰ AGENDADA';

        console.log(`  - [ID: ${cur.id}] "${cur.buttonTitle}" (${statusIcon})`);
        console.log(`    💬 Frase: "${cur.headerPhrase}"`);
        console.log(`    📅 Período: ${cur.startDate.toLocaleDateString('pt-BR')} até ${cur.endDate.toLocaleDateString('pt-BR')} (Prioridade: ${cur.priority})`);
        console.log(`    🎬 Filmes: ${movieNames || 'Nenhum'}`);
        console.log('    ------------------------------------------------------');
      }
    }
    console.log('==============================================\n');
  } catch (err) {
    console.error('⚠️ Não foi possível listar as curadorias existentes:', err);
  }

  // Validações obrigatórias
  if (!moviesArg || !buttonTitle || !headerPhrase) {
    console.log(`
❌ Argumentos obrigatórios ausentes!

Uso do script:
  npx ts-node src/scripts/addDailyCuration.ts \\
    --movies="Filme A (Ano), Filme B, Filme C" \\
    --title="Título do Botão" \\
    --phrase="Frase Emocional do Dia" \\
    [--microcopy="Microcopy do Botão"] \\
    [--start="YYYY-MM-DD"] \\
    [--end="YYYY-MM-DD"] \\
    [--priority=0] \\
    [--active=true]

Exemplo completo:
  npx ts-node src/scripts/addDailyCuration.ts \\
    --movies="A Origem (2010), Matrix (1999), Interestelar" \\
    --title="✨ Perfeito para hoje" \\
    --phrase="Cinema pulsante para sair do automático e questionar a realidade." \\
    --start="2026-05-18" \\
    --end="2026-05-19" \\
    --priority=10
`);
    process.exit(1);
  }

  // Parsear os nomes dos filmes
  const rawMovieNames = moviesArg.split(',').map(m => m.trim());
  if (rawMovieNames.length === 0) {
    console.error('❌ Nenhum filme fornecido em --movies.');
    process.exit(1);
  }

  console.log('🔍 Buscando filmes no banco de dados...');
  const movieIds: string[] = [];

  for (const rawName of rawMovieNames) {
    const parsed = parseMovieString(rawName);
    
    // Construir filtros de busca
    const whereClause: any = {
      title: {
        equals: parsed.title,
        mode: 'insensitive' as const
      }
    };
    
    if (parsed.year) {
      whereClause.year = parsed.year;
    }

    // Buscar no banco incluindo as plataformas de streaming
    const foundMovies = await prisma.movie.findMany({
      where: whereClause,
      include: {
        platforms: true
      },
      orderBy: { year: 'desc' }
    });

    if (foundMovies.length === 0) {
      console.error(`❌ Filme não encontrado: "${parsed.title}" ${parsed.year ? `(${parsed.year})` : ''}`);
      console.log('⚠️ Abortando para garantir a integridade da curadoria.');
      process.exit(1);
    }

    if (foundMovies.length > 1) {
      console.log(`⚠️ Múltiplos filmes encontrados para "${parsed.title}":`);
      foundMovies.forEach(m => console.log(`  - [${m.id}] ${m.title} (${m.year})`));
      console.log(`💡 Dica: Especifique o ano exato no argumento usando: "Título (Ano)"`);
      console.log(`👉 Selecionando automaticamente o mais recente: ${foundMovies[0].title} (${foundMovies[0].year})`);
    }

    const selectedMovie = foundMovies[0];

    // Validação se o filme possui alguma plataforma cadastrada
    if (!selectedMovie.platforms || selectedMovie.platforms.length === 0) {
      console.error(`\n❌ ERRO DE FLUXO: O filme "${selectedMovie.title}" (${selectedMovie.year}) NÃO está disponível em nenhuma plataforma de streaming cadastrada!`);
      console.log('💡 Para garantir uma boa experiência ao usuário, a curadoria diária aceita apenas filmes que possam ser assistidos imediatamente.');
      console.log('⚠️ Processamento cancelado. Nenhuma alteração foi feita no banco.');
      process.exit(1);
    }

    movieIds.push(selectedMovie.id);
    console.log(`✅ Adicionado: "${selectedMovie.title}" (${selectedMovie.year}) -> ID: ${selectedMovie.id} (${selectedMovie.platforms.length} plataforma(s) cadastrada(s))`);
  }

  // Tratar datas de início e fim
  let startDate = new Date();
  if (startDateStr) {
    startDate = new Date(startDateStr);
  } else {
    // Definir para o início do dia atual por padrão
    startDate.setHours(0, 0, 0, 0);
  }

  let endDate = new Date('2099-12-31T23:59:59Z');
  if (endDateStr) {
    endDate = new Date(endDateStr);
    // Se a hora não foi especificada, definir para o fim daquele dia
    if (!endDateStr.includes('T') && !endDateStr.includes(':')) {
      endDate.setHours(23, 59, 59, 999);
    }
  }

  console.log('\n🚀 Inserindo registro na tabela DailyCuration...');

  try {
    const curation = await prisma.dailyCuration.create({
      data: {
        buttonTitle,
        buttonMicrocopy,
        headerPhrase,
        movieIds,
        isActive,
        startDate,
        endDate,
        priority: priorityVal
      }
    });

    console.log('\n🎉 Curadoria Diária inserida com sucesso no banco de dados!');
    console.log('===========================================================');
    console.log(`🆔 ID da Curadoria: ${curation.id}`);
    console.log(`🏷️  Botão: "${curation.buttonTitle}"`);
    console.log(`📝 Microcopy: "${curation.buttonMicrocopy}"`);
    console.log(`💬 Frase: "${curation.headerPhrase}"`);
    console.log(`📅 Início: ${curation.startDate.toISOString()}`);
    console.log(`📅 Fim: ${curation.endDate.toISOString()}`);
    console.log(`🎯 Prioridade: ${curation.priority}`);
    console.log(`⭐ Status: ${curation.isActive ? 'Ativa 🟢' : 'Inativa 🔴'}`);
    console.log(`🎬 Filmes associados (${curation.movieIds.length}):`);
    curation.movieIds.forEach((id, idx) => {
      console.log(`  ${idx + 1}. [UUID: ${id}]`);
    });
    console.log('===========================================================');

  } catch (error) {
    console.error('❌ Erro ao criar registro de Curadoria Diária:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('💥 Erro catastrófico no script:', err);
  prisma.$disconnect();
  process.exit(1);
});

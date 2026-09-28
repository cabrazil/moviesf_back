import './scripts-helper';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Configuração do caminho do Obsidian
const DEFAULT_OBSIDIAN_PATH = '/mnt/d/Obsidian/CarlosB/Projetos/Vibesfilm';
const OBSIDIAN_PATH = process.env.OBSIDIAN_VIBESFILM_PATH || DEFAULT_OBSIDIAN_PATH;

interface JofData {
  id: number;
  stepId?: string;
  mainSentiment?: string;
  mainSentimentId?: number;
  intentions: string[];
  emotionalJourney?: string;
  essence?: string;
  strongMovies: {
    targetFile: string;
    displayText: string;
  }[];
}

interface MovieNoteData {
  targetFile: string;
  displayText: string;
  tmdbId?: number;
  year?: number;
}

interface ResolvedMovie {
  id: string; // UUID do banco
  title: string;
  year: number | null;
  tmdbId: number | null;
  platforms: string[];
}

interface ExpiredCurationPlan {
  id: number;
  buttonTitle: string;
  headerPhrase: string;
  oldStart: Date;
  oldEnd: Date;
  newStart: Date;
  newEnd: Date;
}

/**
 * Remove aspas e caracteres especiais no início/fim de strings
 */
function cleanText(text: string): string {
  return text.replace(/^["'>\s]+|["'\s]+$/g, '').trim();
}

/**
 * Formata data para SQL ou exibição (YYYY-MM-DD HH:mm:ss)
 */
function formatDateToSql(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formata data curta pt-BR (DD/MM/YYYY)
 */
function formatDatePtBr(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Adiciona N dias a uma data
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Encontra o arquivo da JOF no Obsidian
 */
function findJofFile(jofId: number | string): string | null {
  const jofsDir = path.join(OBSIDIAN_PATH, 'JOFs');
  if (!fs.existsSync(jofsDir)) {
    return null;
  }

  const variations = [
    `JOF ${jofId}.md`,
    `JOF_${jofId}.md`,
    `jof ${jofId}.md`,
    `JOF${jofId}.md`,
    `${jofId}.md`,
  ];

  for (const fileName of variations) {
    const fullPath = path.join(jofsDir, fileName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Faz parse do arquivo da JOF
 */
function parseJofContent(content: string, jofId: number): JofData {
  const jofData: JofData = {
    id: jofId,
    intentions: [],
    strongMovies: [],
  };

  // 1. Extrair dados do Frontmatter (YAML simples)
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];
    
    const stepMatch = fm.match(/step_id:\s*["']?([^"'\r\n]+)["']?/i);
    if (stepMatch) jofData.stepId = stepMatch[1].trim();

    const sentimentMatch = fm.match(/main_sentiment:\s*["']?([^"'\r\n]+)["']?/i);
    if (sentimentMatch) jofData.mainSentiment = sentimentMatch[1].trim();

    const sentimentIdMatch = fm.match(/main_sentiment_id:\s*(\d+)/i);
    if (sentimentIdMatch) jofData.mainSentimentId = parseInt(sentimentIdMatch[1], 10);

    const intentionsMatch = fm.match(/intentions:\s*\[(.*?)\]/i);
    if (intentionsMatch) {
      jofData.intentions = intentionsMatch[1]
        .split(',')
        .map(i => cleanText(i))
        .filter(Boolean);
    }
  }

  // 2. Extrair "Jornada emocional"
  const journeyMatch = content.match(/## Jornada emocional\s*\r?\n(?:>\s*)?["']?([^"\r\n]+)["']?/i);
  if (journeyMatch) {
    jofData.emotionalJourney = cleanText(journeyMatch[1]);
  }

  // 3. Extrair "Essência da jornada"
  const essenceMatch = content.match(/## Essência da jornada\s*\r?\n([\s\S]*?)(?:\r?\n---|\r?\n##|$)/i);
  if (essenceMatch) {
    jofData.essence = essenceMatch[1].replace(/\r?\n/g, ' ').trim();
  }

  // 4. Extrair "Filmes com encaixe forte"
  const moviesSectionMatch = content.match(/## Filmes com encaixe forte\s*\r?\n([\s\S]*?)(?:\r?\n---|\r?\n##|$)/i);
  if (moviesSectionMatch) {
    const lines = moviesSectionMatch[1].split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*-\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      if (match) {
        const targetFile = match[1].trim();
        const displayText = (match[2] || targetFile).trim();
        jofData.strongMovies.push({ targetFile, displayText });
      }
    }
  }

  return jofData;
}

/**
 * Lê a nota de um filme no Obsidian para extrair tmdb_id e year
 */
function readMovieNote(targetFile: string, displayText: string): MovieNoteData {
  const filmesDir = path.join(OBSIDIAN_PATH, 'Filmes');
  const result: MovieNoteData = { targetFile, displayText };

  // Tenta encontrar o arquivo com diferentes normalizações
  const possibleNames = [
    `${targetFile}.md`,
    `${targetFile.replace(/:/g, '-')}.md`,
    `${targetFile.replace(/-/g, ':')}.md`,
    `${displayText}.md`,
  ];

  let filePath: string | null = null;
  for (const name of possibleNames) {
    const p = path.join(filmesDir, name);
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath && fs.existsSync(filmesDir)) {
    // Busca case-insensitive
    const files = fs.readdirSync(filmesDir);
    const targetLower = targetFile.toLowerCase();
    const found = files.find(f => f.toLowerCase() === `${targetLower}.md` || f.toLowerCase().startsWith(targetLower));
    if (found) {
      filePath = path.join(filmesDir, found);
    }
  }

  if (filePath && fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      const fm = fmMatch[1];
      const tmdbMatch = fm.match(/tmdb_id:\s*(\d+)/i);
      if (tmdbMatch) {
        result.tmdbId = parseInt(tmdbMatch[1], 10);
      }
      const yearMatch = fm.match(/year:\s*(\d{4})/i);
      if (yearMatch) {
        result.year = parseInt(yearMatch[1], 10);
      }
    }

    if (!result.year) {
      const titleYearMatch = content.match(/#\s*.+?\((\d{4})\)/);
      if (titleYearMatch) {
        result.year = parseInt(titleYearMatch[1], 10);
      }
    }
  }

  return result;
}

/**
 * Imprime banner de ajuda
 */
function printHelp() {
  console.log(`
🎬 Gerador de Daily Curation a partir do Obsidian (JOF)

Uso básico:
  npx ts-node src/scripts/generateDailyCurationFromJof.ts <JOF_ID> [opções]

Exemplos:
  # 1. Simulação (Dry-Run): visualiza a curadoria e gera o SQL
  npx ts-node src/scripts/generateDailyCurationFromJof.ts 104

  # 2. Aplicação direta no banco de dados
  npx ts-node src/scripts/generateDailyCurationFromJof.ts 104 --apply

  # 3. Renovando curadorias vencidas em blocos de 3 dias sequenciais
  npx ts-node src/scripts/generateDailyCurationFromJof.ts 104 --renew-expired --apply

  # 4. Customizando frase e selecionando limite de filmes
  npx ts-node src/scripts/generateDailyCurationFromJof.ts 104 \\
    --limit=3 \\
    --phrase="Histórias de personagens que enfrentam a inquietação e buscam um novo equilíbrio." \\
    --renew-expired \\
    --apply

Opções disponíveis:
  --apply                   Grava no banco via Prisma (sem essa flag, roda em modo simulação/dry-run)
  --renew-expired           Renova todas as curadorias vencidas do banco após o término da nova (+3 dias cada)
  --limit=N                 Número de filmes a incluir da JOF (padrão: 3)
  --movies="F1, F2, F3"     Seleciona filmes específicos da JOF por nome
  --phrase="Frase..."       Sobrescreve a frase emocional do cabeçalho
  --title="Título..."       Sobrescreve o título do botão (padrão: "✨ Perfeito para hoje")
  --microcopy="Texto..."    Sobrescreve o microcopy (padrão: "Uma pequena curadoria para hoje.")
  --start="YYYY-MM-DD"      Data de início manual (se omitido, calcula a próxima data vaga)
  --end="YYYY-MM-DD"        Data de fim manual (se omitido, calcula início + 3 dias)
  --priority=N              Prioridade no app (padrão: 0)
  --export-sql[=arquivo]    Exporta o comando SQL gerado para um arquivo (padrão: inserts.sql)
  --ignore-streaming-warn   Não barra filmes que não tenham plataformas de streaming cadastradas
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Parse dos argumentos
  let jofArg: string | undefined;
  let applyChanges = false;
  let renewExpired = false;
  let limit = 3;
  let specificMoviesArg: string | undefined;
  let customPhrase: string | undefined;
  let customTitle = '✨ Perfeito para hoje';
  let customMicrocopy = 'Uma pequena curadoria para hoje.';
  let startDateStr: string | undefined;
  let endDateStr: string | undefined;
  let priorityVal = 0;
  let exportSqlPath: string | null = null;
  let ignoreStreamingWarning = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply') {
      applyChanges = true;
    } else if (arg === '--renew-expired') {
      renewExpired = true;
    } else if (arg === '--ignore-streaming-warn' || arg === '--ignore-streaming-warning') {
      ignoreStreamingWarning = true;
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--movies=')) {
      specificMoviesArg = arg.split('=')[1];
    } else if (arg.startsWith('--phrase=')) {
      customPhrase = arg.split('=')[1];
    } else if (arg.startsWith('--title=')) {
      customTitle = arg.split('=')[1];
    } else if (arg.startsWith('--microcopy=')) {
      customMicrocopy = arg.split('=')[1];
    } else if (arg.startsWith('--start=')) {
      startDateStr = arg.split('=')[1];
    } else if (arg.startsWith('--end=')) {
      endDateStr = arg.split('=')[1];
    } else if (arg.startsWith('--priority=')) {
      priorityVal = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--export-sql')) {
      const parts = arg.split('=');
      exportSqlPath = parts[1] || 'inserts.sql';
    } else if (!arg.startsWith('--') && !jofArg) {
      jofArg = arg.replace(/^JOF\s*/i, '').trim();
    }
  }

  if (!jofArg) {
    console.error('❌ Você precisa especificar o ID da JOF (ex: 104).');
    printHelp();
    process.exit(1);
  }

  const jofId = parseInt(jofArg, 10);
  if (isNaN(jofId)) {
    console.error(`❌ ID de JOF inválido: "${jofArg}". Deve ser um número.`);
    process.exit(1);
  }

  console.log(`\n===========================================================`);
  console.log(`🔮 Jev: Gerador de Daily Curation a partir do Obsidian`);
  console.log(`📁 Vault Obsidian: ${OBSIDIAN_PATH}`);
  console.log(`🎯 Modo: ${applyChanges ? '🚀 Gravação Direta no Banco (--apply)' : '🧪 Simulação / Revisão SQL (--dry-run)'}`);
  console.log(`===========================================================\n`);

  // 1. Localizar e ler a JOF
  const jofFilePath = findJofFile(jofId);
  if (!jofFilePath) {
    console.error(`❌ Arquivo da JOF ${jofId} não encontrado em: ${path.join(OBSIDIAN_PATH, 'JOFs')}`);
    process.exit(1);
  }

  console.log(`📖 Lendo arquivo: ${path.basename(jofFilePath)}`);
  const jofContent = fs.readFileSync(jofFilePath, 'utf-8');
  const jofData = parseJofContent(jofContent, jofId);

  console.log(`   - Sentimento: ${jofData.mainSentiment || 'Não definido'}`);
  console.log(`   - Intenções: ${jofData.intentions.join(', ') || 'Nenhuma'}`);
  console.log(`   - Filmes com encaixe forte na nota: ${jofData.strongMovies.length}`);

  if (jofData.strongMovies.length === 0) {
    console.error(`❌ A JOF ${jofId} não possui nenhum filme listado na seção '## Filmes com encaixe forte'.`);
    process.exit(1);
  }

  // 2. Resolver filmes da JOF
  let candidates = jofData.strongMovies;
  if (specificMoviesArg) {
    const requestedNames = specificMoviesArg.split(',').map(n => n.trim().toLowerCase());
    candidates = candidates.filter(m => 
      requestedNames.some(req => m.displayText.toLowerCase().includes(req) || m.targetFile.toLowerCase().includes(req))
    );
  }

  console.log(`\n🔍 Lendo notas dos filmes no Obsidian e extraindo tmdb_id...`);
  const movieNotesData: MovieNoteData[] = candidates.map(c => readMovieNote(c.targetFile, c.displayText));

  const notesWithTmdb = movieNotesData.filter(m => !!m.tmdbId);
  console.log(`   - Notas com tmdb_id identificado: ${notesWithTmdb.length}/${movieNotesData.length}`);

  // 3. Consultar filmes no Banco de Dados
  console.log(`📡 Consultando filmes no banco PostgreSQL...`);
  const tmdbIds = notesWithTmdb.map(m => m.tmdbId as number);

  const dbMovies = await prisma.movie.findMany({
    where: {
      tmdbId: { in: tmdbIds },
    },
    include: {
      platforms: {
        include: {
          streamingPlatform: true,
        },
      },
    },
  });

  const resolvedMovies: ResolvedMovie[] = [];

  for (const note of movieNotesData) {
    if (resolvedMovies.length >= limit) break;

    let dbMovie = dbMovies.find(m => m.tmdbId === note.tmdbId);
    
    // Fallback: se não achou por tmdbId, tenta por título
    if (!dbMovie) {
      dbMovie = (await prisma.movie.findFirst({
        where: {
          title: { equals: note.displayText, mode: 'insensitive' },
        },
        include: {
          platforms: {
            include: {
              streamingPlatform: true,
            },
          },
        },
      })) || undefined;
    }

    if (dbMovie) {
      const platformNames = dbMovie.platforms?.map(p => p.streamingPlatform?.name).filter(Boolean) as string[] || [];

      if (!ignoreStreamingWarning && platformNames.length === 0) {
        console.log(`⚠️ Filme ignorado por não ter plataformas cadastradas: "${dbMovie.title}" (${dbMovie.year})`);
        continue;
      }

      resolvedMovies.push({
        id: dbMovie.id,
        title: dbMovie.title,
        year: dbMovie.year,
        tmdbId: dbMovie.tmdbId,
        platforms: platformNames,
      });
    } else {
      console.log(`⚠️ Filme da JOF não encontrado no banco: "${note.displayText}" (tmdb_id: ${note.tmdbId || 'N/A'})`);
    }
  }

  if (resolvedMovies.length === 0) {
    console.error(`\n❌ Nenhum filme da JOF ${jofId} pôde ser resolvido no banco com plataformas disponíveis!`);
    console.log(`💡 Dica: Se quiser permitir filmes sem streaming cadastrado, use --ignore-streaming-warn.`);
    process.exit(1);
  }

  console.log(`\n🎬 Filmes selecionados para a curadoria (${resolvedMovies.length}/${limit}):`);
  resolvedMovies.forEach((m, idx) => {
    console.log(`   ${idx + 1}. ${m.title} (${m.year}) -> UUID: ${m.id} | Streamings: [${m.platforms.join(', ') || 'Nenhum'}]`);
  });

  // 4. Lapidar a headerPhrase
  let headerPhrase = customPhrase;
  if (!headerPhrase) {
    if (jofData.essence && jofData.essence.length <= 250) {
      headerPhrase = jofData.essence;
    } else if (jofData.emotionalJourney) {
      // Ex: "Mostre personagens em busca de..." -> "Histórias de personagens em busca de..."
      let phrase = jofData.emotionalJourney;
      if (phrase.toLowerCase().startsWith('mostre ')) {
        phrase = 'Histórias de ' + phrase.slice(7);
      } else if (!phrase.toLowerCase().startsWith('histórias')) {
        phrase = 'Histórias de ' + phrase;
      }
      if (!phrase.endsWith('.')) phrase += '.';
      headerPhrase = phrase;
    } else {
      headerPhrase = 'Uma seleção de filmes que tocam fundo na alma.';
    }
  }

  // Garantir limite de 255 chars
  if (headerPhrase.length > 255) {
    headerPhrase = headerPhrase.substring(0, 252) + '...';
  }

  // 5. Calcular Período Inteligente (Janela de 3 Dias)
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (startDateStr && endDateStr) {
    startDate = new Date(startDateStr);
    if (!startDateStr.includes('T')) startDate.setHours(0, 0, 0, 0);

    endDate = new Date(endDateStr);
    if (!endDateStr.includes('T')) endDate.setHours(23, 59, 59, 999);
  } else {
    // Buscar a curadoria ativa com maior endDate
    const latestCuration = await prisma.dailyCuration.findFirst({
      where: { isActive: true },
      orderBy: { endDate: 'desc' },
    });

    if (latestCuration && latestCuration.endDate > now) {
      // Começa no dia seguinte ao término da última
      startDate = new Date(
        latestCuration.endDate.getFullYear(),
        latestCuration.endDate.getMonth(),
        latestCuration.endDate.getDate() + 1,
        0, 0, 0, 0
      );
    } else {
      // Nenhuma futura, começar hoje
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }

    // Janela padrão de 3 dias (ex: dia 1, dia 2 e dia 3)
    endDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + 2,
      23, 59, 59, 999
    );
  }

  console.log(`\n📅 Período Calculado para a Nova Curadoria (3 Dias):`);
  console.log(`   - Início: ${formatDatePtBr(startDate)} (${formatDateToSql(startDate)})`);
  console.log(`   - Fim:    ${formatDatePtBr(endDate)} (${formatDateToSql(endDate)})`);

  // 6. Tratar Renovação de Curadorias Vencidas (se solicitado)
  const expiredPlans: ExpiredCurationPlan[] = [];

  if (renewExpired) {
    // Buscar curadorias ativas cujo endDate já passou
    const expiredCurations = await prisma.dailyCuration.findMany({
      where: {
        isActive: true,
        endDate: { lt: now },
      },
      orderBy: {
        startDate: 'asc', // FIFO: mais antigas primeiro
      },
    });

    if (expiredCurations.length === 0) {
      console.log(`\nℹ️ Nenhuma curadoria vencida encontrada no banco para renovação.`);
    } else {
      console.log(`\n🔄 Planejando Renovação de ${expiredCurations.length} Curadorias Vencidas (Loop de 3 Dias):`);
      
      let cursorStart = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate() + 1,
        0, 0, 0, 0
      );

      for (const exp of expiredCurations) {
        const curStart = new Date(cursorStart);
        const curEnd = new Date(
          curStart.getFullYear(),
          curStart.getMonth(),
          curStart.getDate() + 2,
          23, 59, 59, 999
        );

        expiredPlans.push({
          id: exp.id,
          buttonTitle: exp.buttonTitle,
          headerPhrase: exp.headerPhrase,
          oldStart: exp.startDate,
          oldEnd: exp.endDate,
          newStart: curStart,
          newEnd: curEnd,
        });

        // Próximo bloco começa no dia seguinte
        cursorStart = new Date(
          curEnd.getFullYear(),
          curEnd.getMonth(),
          curEnd.getDate() + 1,
          0, 0, 0, 0
        );
      }

      console.log(`   ------------------------------------------------------------------------------------------------`);
      for (const p of expiredPlans) {
        console.log(`   - [ID: ${p.id}] "${p.buttonTitle}"`);
        console.log(`     💬 "${p.headerPhrase.substring(0, 60)}..."`);
        console.log(`     ⏰ Era: ${formatDatePtBr(p.oldStart)} até ${formatDatePtBr(p.oldEnd)} ➔ NOVO: ${formatDatePtBr(p.newStart)} até ${formatDatePtBr(p.newEnd)}`);
      }
      console.log(`   ------------------------------------------------------------------------------------------------`);
      const totalDays = expiredPlans.length * 3;
      console.log(`   ✨ Calendário estendido por mais +${totalDays} dias sem lacunas!`);
    }
  }

  // 7. Montar os comandos SQL
  const movieIdsArrayStr = `{"${resolvedMovies.map(m => m.id).join('","')}"}`;
  
  const insertSql = `INSERT INTO "DailyCuration" (
  "buttonTitle",
  "buttonMicrocopy",
  "headerPhrase",
  "movieIds",
  "isActive",
  "startDate",
  "endDate",
  "priority",
  "createdAt",
  "updatedAt"
) VALUES (
  ${escapeSqlString(customTitle)},
  ${escapeSqlString(customMicrocopy)},
  ${escapeSqlString(headerPhrase)},
  '${movieIdsArrayStr}',
  true,
  '${formatDateToSql(startDate)}',
  '${formatDateToSql(endDate)}',
  ${priorityVal},
  NOW(),
  NOW()
);`;

  let fullSqlScript = `-- ==========================================================\n`;
  fullSqlScript += `-- Curadoria Diária gerada a partir da JOF ${jofId} (${jofData.mainSentiment || 'Emocional'})\n`;
  fullSqlScript += `-- Filmes: ${resolvedMovies.map(m => `${m.title} (${m.year})`).join(', ')}\n`;
  fullSqlScript += `-- Período: ${formatDatePtBr(startDate)} até ${formatDatePtBr(endDate)}\n`;
  fullSqlScript += `-- ==========================================================\n\n`;
  fullSqlScript += insertSql + `\n\n`;

  if (expiredPlans.length > 0) {
    fullSqlScript += `-- ==========================================================\n`;
    fullSqlScript += `-- Renovação de Curadorias Vencidas (Ciclos de 3 dias)\n`;
    fullSqlScript += `-- ==========================================================\n`;
    for (const p of expiredPlans) {
      fullSqlScript += `UPDATE "DailyCuration" SET "startDate" = '${formatDateToSql(p.newStart)}', "endDate" = '${formatDateToSql(p.newEnd)}', "updatedAt" = NOW() WHERE id = ${p.id};\n`;
    }
  }

  // 8. Execução: Apply vs Dry-Run
  if (applyChanges) {
    console.log(`\n🚀 Gravando alterações diretamente no banco de dados via Prisma...`);
    try {
      const createdCuration = await prisma.$transaction(
        async (tx) => {
          // Inserir a nova curadoria
          const newRecord = await tx.dailyCuration.create({
            data: {
              buttonTitle: customTitle,
              buttonMicrocopy: customMicrocopy,
              headerPhrase: headerPhrase,
              movieIds: resolvedMovies.map(m => m.id),
              isActive: true,
              startDate: startDate,
              endDate: endDate,
              priority: priorityVal,
            },
          });

          // Atualizar as vencidas em paralelo se houver
          if (expiredPlans.length > 0) {
            await Promise.all(
              expiredPlans.map(p =>
                tx.dailyCuration.update({
                  where: { id: p.id },
                  data: {
                    startDate: p.newStart,
                    endDate: p.newEnd,
                  },
                })
              )
            );
          }

          return newRecord;
        },
        {
          timeout: 30000, // 30 segundos para acomodar latência de rede com a VPS
          maxWait: 10000,
        }
      );

      console.log(`\n🎉 SUCESSO! Nova Curadoria Diária criada com sucesso!`);
      console.log(`   🆔 ID Gerado: ${createdCuration.id}`);
      console.log(`   🏷️  Botão: "${createdCuration.buttonTitle}"`);
      console.log(`   💬 Frase: "${createdCuration.headerPhrase}"`);
      console.log(`   📅 Vigência: ${formatDatePtBr(createdCuration.startDate)} até ${formatDatePtBr(createdCuration.endDate)}`);
      if (expiredPlans.length > 0) {
        console.log(`   🔄 Curadorias renovadas com sucesso: ${expiredPlans.length}`);
      }
    } catch (err) {
      console.error(`❌ Erro ao gravar no banco:`, err);
      process.exit(1);
    }
  } else {
    console.log(`\n📋 === COMANDO SQL GERADO (MODO SIMULAÇÃO) ===`);
    console.log(fullSqlScript);
    console.log(`==============================================`);
    console.log(`💡 Para gravar diretamente no banco de dados, execute novamente adicionando a flag: --apply`);
    if (!renewExpired && expiredPlans.length === 0) {
      console.log(`💡 Para renovar as curadorias vencidas em blocos de 3 dias, adicione também: --renew-expired`);
    }
  }

  // 9. Exportar para arquivo SQL se solicitado
  if (exportSqlPath) {
    fs.writeFileSync(exportSqlPath, fullSqlScript, 'utf-8');
    console.log(`\n💾 Arquivo SQL exportado com sucesso: ${path.resolve(exportSqlPath)}`);
  }
}

function escapeSqlString(str: string): string {
  return `'${str.replace(/'/g, "''")}'`;
}

main()
  .catch((err) => {
    console.error('💥 Erro fatal ao executar script:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

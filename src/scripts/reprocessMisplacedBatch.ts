import { execFileSync } from 'child_process';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const moviesToRemoveFromJof140Only = [
  // Já estão posicionados nas suas prateleiras corretas (JOF 139 e JOF 102)
  'A Assistente',
  'O Chef',
  'Kimi: Alguém Está Escutando',
];

const moviesToReplace = [
  // Intrusos na JOF 140 ("A busca por equilíbrio e um novo ritmo") -> --replace
  'Erin Brockovich: Uma Mulher de Talento',
  'Ainda Estou Aqui',
  'Os Banshees de Inisherin',
];

const moviesToRefreshOnJof140 = [
  // Filmes coerentes da JOF 140 para reavaliar com a régua calibrada -> --jofId=140
  'O Diabo Veste Prada',
  'O Mal Não Existe',
  'Viver',
];

async function calibrateJof140SubSentiments() {
  console.log('🔧 Calibrando os 12 SubSentiments da JOF 140 ("A busca por equilíbrio e um novo ritmo")...');

  // 1. Remover 101 (Luta por Justiça) e 102 (Conflito e Sobrevivência / Guerra)
  await prisma.journeyOptionFlowSubSentiment.deleteMany({
    where: {
      journeyOptionFlowId: 140,
      subSentimentId: { in: [101, 102] },
    },
  });

  // 2. Inserir 74 (Reavaliação de Vida: 1.00) e 70 (Vida Simples e Reflexiva: 0.95) e ajustar pesos
  const items = [
    { subSentimentId: 74, weight: 1.00 },  // Reavaliação de Vida (recomeço, mudança, autenticidade)
    { subSentimentId: 70, weight: 0.95 },  // Vida Simples e Reflexiva (simplicidade, desapego, presença)
    { subSentimentId: 98, weight: 0.95 },  // Exaustão e Pressão
    { subSentimentId: 38, weight: 0.92 },  // Descanso / Leveza Mental
    { subSentimentId: 69, weight: 0.90 },  // Superação e Resiliência
    { subSentimentId: 71, weight: 0.90 },  // Conexão Humana e Natureza
    { subSentimentId: 109, weight: 0.90 }, // Transformação Pessoal
    { subSentimentId: 39, weight: 0.85 },  // Inspiração / Reacender a Chama
    { subSentimentId: 90, weight: 0.85 },  // Autodescoberta e Crescimento
    { subSentimentId: 28, weight: 0.85 },  // Reflexão Serena
    { subSentimentId: 35, weight: 0.80 },  // Inspiração / Motivação para Agir
    { subSentimentId: 100, weight: 0.75 }, // Fragilidade da Condição Humana
  ];

  for (const item of items) {
    await prisma.journeyOptionFlowSubSentiment.upsert({
      where: {
        journeyOptionFlowId_subSentimentId: {
          journeyOptionFlowId: 140,
          subSentimentId: item.subSentimentId,
        },
      },
      update: { weight: new Prisma.Decimal(item.weight), updatedAt: new Date() },
      create: {
        journeyOptionFlowId: 140,
        subSentimentId: item.subSentimentId,
        weight: new Prisma.Decimal(item.weight),
        updatedAt: new Date(),
      },
    });
  }

  const finalRows = await prisma.journeyOptionFlowSubSentiment.findMany({
    where: { journeyOptionFlowId: 140 },
    orderBy: { weight: 'desc' },
  });
  console.log(`✅ JOF 140 calibrada com ${finalRows.length} SubSentiments (IDs: ${finalRows.map(r => `${r.subSentimentId}(${r.weight})`).join(', ')})\n`);
}

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  await calibrateJof140SubSentiments();

  for (const title of moviesToRemoveFromJof140Only) {
    const m = await prisma.movie.findFirst({
      where: { title: { equals: title, mode: 'insensitive' } },
      select: { id: true, title: true },
    });
    if (m) {
      const del = await prisma.movieSuggestionFlow.deleteMany({
        where: { movieId: m.id, journeyOptionFlowId: 140 },
      });
      console.log(`🧹 Removido vínculo secundário de "${m.title}" na JOF 140 (${del.count} registro).`);
    }
  }

  console.log(`\n🚀 Etapa 1: Reprocessando (--replace) ${moviesToReplace.length} intrusos da JOF 140...\n`);
  const summaryReplace: Array<{ title: string; jof1?: string; jof2?: string; status: string }> = [];

  for (let i = 0; i < moviesToReplace.length; i++) {
    const title = moviesToReplace[i];
    console.log(`\n======================================================`);
    console.log(`🎬 [Replace ${i + 1}/${moviesToReplace.length}] Reprocessando: "${title}"`);
    console.log(`======================================================`);

    try {
      const output = execFileSync(
        'npx',
        ['ts-node', path.join(__dirname, 'curateMovie.ts'), `--title=${title}`, '--replace'],
        { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 }
      );

      const jsonMatch = output.match(/---JSON_RESULT_START---\s*([\s\S]*?)\s*---JSON_RESULT_END---/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        const s1 = parsed.savedSuggestions?.[0];
        const s2 = parsed.savedSuggestions?.[1];
        const jof1Str = s1 ? `JOF ${s1.jofId} (${s1.sentiment} -> ${s1.journeyText}) [${s1.score}]` : 'N/A';
        const jof2Str = s2 ? `JOF ${s2.jofId} (${s2.sentiment} -> ${s2.journeyText}) [${s2.score}]` : '-';
        console.log(`✅ Concluído:`);
        console.log(`   1ª Opção: ${jof1Str}`);
        console.log(`   2ª Opção: ${jof2Str}`);
        summaryReplace.push({ title, jof1: jof1Str, jof2: jof2Str, status: 'OK' });
      } else {
        console.log(`⚠️ Concluído sem JSON estruturado.`);
        summaryReplace.push({ title, status: 'Sem JSON' });
      }
    } catch (err: any) {
      console.error(`❌ Erro ao reprocessar "${title}":`, err.message?.slice(0, 300));
      summaryReplace.push({ title, status: 'ERRO' });
    }
  }

  console.log(`\n\n🚀 Etapa 2: Reavaliando (--jofId=140) ${moviesToRefreshOnJof140.length} filmes na JOF 140 calibrada...\n`);
  const summaryRefresh: Array<{ title: string; jof1?: string; status: string }> = [];

  for (let i = 0; i < moviesToRefreshOnJof140.length; i++) {
    const title = moviesToRefreshOnJof140[i];
    console.log(`\n======================================================`);
    console.log(`🎬 [JOF 140 ${i + 1}/${moviesToRefreshOnJof140.length}] Avaliando na JOF 140: "${title}"`);
    console.log(`======================================================`);

    try {
      const output = execFileSync(
        'npx',
        ['ts-node', path.join(__dirname, 'curateMovie.ts'), `--title=${title}`, '--jofId=140'],
        { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 }
      );

      const jsonMatch = output.match(/---JSON_RESULT_START---\s*([\s\S]*?)\s*---JSON_RESULT_END---/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        const s1 = parsed.savedSuggestions?.[0];
        const jof1Str = s1 ? `JOF ${s1.jofId} (${s1.sentiment} -> ${s1.journeyText}) [${s1.score}]` : 'N/A';
        console.log(`✅ Atualizado na JOF 140: ${jof1Str}`);
        summaryRefresh.push({ title, jof1: jof1Str, status: 'OK' });
      } else {
        console.log(`⚠️ Concluído sem JSON estruturado.`);
        summaryRefresh.push({ title, status: 'Sem JSON' });
      }
    } catch (err: any) {
      console.error(`❌ Erro ao atualizar "${title}":`, err.message?.slice(0, 300));
      summaryRefresh.push({ title, status: 'ERRO' });
    }
  }

  console.log('\n\n📊 === RESUMO ETAPA 1: REPLACE (INTRUSOS DA JOF 140) ===');
  console.table(summaryReplace);

  console.log('\n📊 === RESUMO ETAPA 2: ATUALIZAÇÃO NA JOF 140 CALIBRADA ===');
  console.table(summaryRefresh);

  await prisma.$disconnect();
}

main();

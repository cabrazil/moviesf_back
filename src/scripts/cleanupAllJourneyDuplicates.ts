import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface ReplacementSpec {
  jofId: number;
  removeSubSentimentIds: number[];
  addSubSentiments: Array<{
    subSentimentId: number;
    weight: number;
  }>;
}

const REPLACEMENTS: ReplacementSpec[] = [
  {
    // JOF 54: Clássicos e comédias cheios de nostalgia
    // Remove 24 (Nostalgia Positiva 0.90, mantendo 94 com 1.00) -> Adiciona 29 (Distração Total / Escape 0.90)
    jofId: 54,
    removeSubSentimentIds: [24],
    addSubSentiments: [{ subSentimentId: 29, weight: 0.90 }]
  },
  {
    // JOF 73: Passatempo leve, familiar e aconchegante
    // Remove 40 (Conforto e Acolhimento 0.85, mantendo 26 com 1.00) -> Restaura 94 (0.95) e adiciona 68 (Doçura / Encanto 0.85)
    jofId: 73,
    removeSubSentimentIds: [40],
    addSubSentiments: [
      { subSentimentId: 94, weight: 0.95 },
      { subSentimentId: 68, weight: 0.85 }
    ]
  },
  {
    // JOF 79: Deslumbre visual e cenários épicos
    // Remove 84 (Deslumbramento Visual 0.90, mantendo 83 com 1.00) -> Adiciona 35 (Inspiração / Motivação para Agir 0.88)
    jofId: 79,
    removeSubSentimentIds: [84],
    addSubSentiments: [{ subSentimentId: 35, weight: 0.88 }]
  },
  {
    // JOF 80: A harmonia da arte e da estética
    // Remove 84 (Deslumbramento Visual 0.88, mantendo 83 com 0.95) e 41 (inválido) -> Adiciona 37 (Inovação / Descoberta (mental) 0.82)
    jofId: 80,
    removeSubSentimentIds: [84, 41],
    addSubSentiments: [{ subSentimentId: 37, weight: 0.82 }]
  },
  {
    // JOF 91: Clima feel-good para aquecer o coração (tinha 11 linhas sendo 1 duplicata)
    // Remove 40 (Conforto e Acolhimento 0.70, mantendo 26 com 1.00) -> Restaura 27 (0.80) e adiciona 36 (Celebração / Grandeza 0.80) + 88 (Humor Contagiante 0.78)
    jofId: 91,
    removeSubSentimentIds: [40],
    addSubSentiments: [
      { subSentimentId: 27, weight: 0.80 },
      { subSentimentId: 36, weight: 0.80 },
      { subSentimentId: 88, weight: 0.78 }
    ]
  },
  {
    // JOF 100: Tramas intensas que prendem até o fim
    // Remove 97 (Conflito e Sobrevivência 0.80, mantendo 80 com 0.95) -> Adiciona 141 (Estratégia e Execução 0.85)
    jofId: 100,
    removeSubSentimentIds: [97],
    addSubSentiments: [{ subSentimentId: 141, weight: 0.85 }]
  },
  {
    // JOF 101: Reviravoltas surpreendentes na trama
    // Remove 91 (Suspense Crescente 0.95, mantendo 79 com 0.98) e 92 (Desespero Crescente 0.78, mantendo 82 com 0.82)
    // Restaura 141 (0.92) e adiciona 80 (Conflito e Sobrevivência 0.82) + 63 (Consequências e Justiça 0.78)
    jofId: 101,
    removeSubSentimentIds: [91, 92],
    addSubSentiments: [
      { subSentimentId: 141, weight: 0.92 },
      { subSentimentId: 80, weight: 0.82 },
      { subSentimentId: 63, weight: 0.78 }
    ]
  },
  {
    // JOF 180: Suspense intrigante cheio de reviravoltas
    // Remove 91 (Suspense Crescente 0.88, mantendo 79 com 1.00) -> Restaura 141 (0.95) e adiciona 142 (Tensão Social e Invasiva 0.85)
    jofId: 180,
    removeSubSentimentIds: [91],
    addSubSentiments: [
      { subSentimentId: 141, weight: 0.95 },
      { subSentimentId: 142, weight: 0.85 }
    ]
  }
];

async function main() {
  console.log('🔧 Aplicando ajustes finais para garantir 12 SubSentiments únicos por JOF...\n');

  for (const spec of REPLACEMENTS) {
    console.log(`🔧 Ajustando JOF ${spec.jofId}...`);

    const deleted = await prisma.journeyOptionFlowSubSentiment.deleteMany({
      where: {
        journeyOptionFlowId: spec.jofId,
        subSentimentId: { in: spec.removeSubSentimentIds }
      }
    });
    if (deleted.count > 0) {
      console.log(`   🗑️  Removidos ${deleted.count} registro(s): [${spec.removeSubSentimentIds.join(', ')}]`);
    }

    for (const add of spec.addSubSentiments) {
      await prisma.journeyOptionFlowSubSentiment.upsert({
        where: {
          journeyOptionFlowId_subSentimentId: {
            journeyOptionFlowId: spec.jofId,
            subSentimentId: add.subSentimentId
          }
        },
        update: {
          weight: new Prisma.Decimal(add.weight),
          updatedAt: new Date()
        },
        create: {
          journeyOptionFlowId: spec.jofId,
          subSentimentId: add.subSentimentId,
          weight: new Prisma.Decimal(add.weight),
          updatedAt: new Date()
        }
      });

      const ss = await prisma.subSentiment.findUnique({ where: { id: add.subSentimentId } });
      console.log(`   ➕ Ativo: ID ${add.subSentimentId} ("${ss?.name}") com peso ${add.weight.toFixed(2)}`);
    }
  }

  console.log('\n📊 Verificando resultado final nas 8 JOFs ajustadas:');
  const targetJofIds = REPLACEMENTS.map(r => r.jofId);

  for (const jofId of targetJofIds) {
    const rows: Array<{ subSentimentId: number; name: string; weight: any }> = await prisma.$queryRaw`
      SELECT jofss."subSentimentId", ss.name, jofss.weight
      FROM "JourneyOptionFlowSubSentiment" jofss
      JOIN "SubSentiment" ss ON ss.id = jofss."subSentimentId"
      WHERE jofss."journeyOptionFlowId" = ${jofId}
      ORDER BY jofss.weight DESC, ss.name ASC
    `;
    const uniqueNames = new Set(rows.map(r => r.name.trim().toLowerCase()));
    console.log(`   ✅ JOF ${jofId}: ${rows.length} registros | ${uniqueNames.size} nomes únicos`);
  }

  const remainingDuplicates: Array<{ journeyOptionFlowId: number; name: string; cnt: bigint }> = await prisma.$queryRaw`
    SELECT jofss."journeyOptionFlowId", ss.name, COUNT(*) as cnt
    FROM "JourneyOptionFlowSubSentiment" jofss
    JOIN "SubSentiment" ss ON ss.id = jofss."subSentimentId"
    GROUP BY jofss."journeyOptionFlowId", ss.name
    HAVING COUNT(*) > 1
  `;

  if (remainingDuplicates.length === 0) {
    console.log('\n🎉 Nenhuma duplicata de nome de SubSentiment restante em nenhuma JOF do banco!');
  } else {
    console.log('\n⚠️ Duplicatas restantes encontradas:', remainingDuplicates);
  }
}

main()
  .catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

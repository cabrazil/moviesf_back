import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface NormalizationSpec {
  jofId: number;
  removeIds: number[];
  addItems: Array<{ subSentimentId: number; weight: number }>;
}

const SPECS: NormalizationSpec[] = [
  // 1. JOF 27 (Intermediária - isEndState: false) -> remover vínculo
  {
    jofId: 27,
    removeIds: [20],
    addItems: []
  },
  // 2. JOF 91: Remover órfão 120 (já tem 12 válidos)
  {
    jofId: 91,
    removeIds: [120],
    addItems: []
  },
  // 3. JOF 10: Remover órfão 125 -> Adicionar 37 (Inovação / Descoberta (mental) 0.80)
  {
    jofId: 10,
    removeIds: [125],
    addItems: [{ subSentimentId: 37, weight: 0.80 }]
  },
  // 4. JOF 102: Remover órfão 124 -> Adicionar 14 (Sozinho(a) 0.85)
  {
    jofId: 102,
    removeIds: [124],
    addItems: [{ subSentimentId: 14, weight: 0.85 }]
  },
  // 5. JOF 118: Remover órfão 120 -> Adicionar 26 (Conforto e Acolhimento 0.80)
  {
    jofId: 118,
    removeIds: [120],
    addItems: [{ subSentimentId: 26, weight: 0.80 }]
  },
  // 6. JOF 119: Remover órfãos 107, 119 -> Adicionar 25 (Paz / Contemplação 1.00) e 148 (Estética Visual Agradável 0.98)
  {
    jofId: 119,
    removeIds: [107, 119],
    addItems: [
      { subSentimentId: 25, weight: 1.00 },
      { subSentimentId: 148, weight: 0.98 }
    ]
  },
  // 7. JOF 139: Remover órfãos 32, 44 -> Adicionar 82 (Desespero Crescente 0.90) e 81 (Desintegração Psicológica 0.85)
  {
    jofId: 139,
    removeIds: [32, 44],
    addItems: [
      { subSentimentId: 82, weight: 0.90 },
      { subSentimentId: 81, weight: 0.85 }
    ]
  },
  // 8. JOF 142: Remover órfão 44 -> Adicionar 98 (Exaustão e Pressão 0.95)
  {
    jofId: 142,
    removeIds: [44],
    addItems: [{ subSentimentId: 98, weight: 0.95 }]
  },
  // 9. JOF 140: Tinha 11 -> Adicionar 28 (Reflexão Serena 0.85)
  {
    jofId: 140,
    removeIds: [],
    addItems: [{ subSentimentId: 28, weight: 0.85 }]
  },
  // 10. JOF 159: Tinha 10 (sendo 17, 18, 19 tristes) -> Remover 17, 18, 19 e adicionar 88, 29, 85, 20, 36
  {
    jofId: 159,
    removeIds: [17, 18, 19],
    addItems: [
      { subSentimentId: 88, weight: 0.95 },
      { subSentimentId: 29, weight: 0.90 },
      { subSentimentId: 85, weight: 0.90 },
      { subSentimentId: 20, weight: 0.85 },
      { subSentimentId: 36, weight: 0.80 }
    ]
  },
  // 11. JOF 128: Tinha 9 -> Adicionar 27 (0.95), 68 (0.90), 21 (0.88)
  {
    jofId: 128,
    removeIds: [],
    addItems: [
      { subSentimentId: 27, weight: 0.95 },
      { subSentimentId: 68, weight: 0.90 },
      { subSentimentId: 21, weight: 0.88 }
    ]
  },
  // 12. JOF 67: Tinha 8 -> Adicionar 34 (0.90), 21 (0.88), 29 (0.85), 35 (0.82)
  {
    jofId: 67,
    removeIds: [],
    addItems: [
      { subSentimentId: 34, weight: 0.90 },
      { subSentimentId: 21, weight: 0.88 },
      { subSentimentId: 29, weight: 0.85 },
      { subSentimentId: 35, weight: 0.82 }
    ]
  },
  // 13. JOF 93: Tinha 7 -> Adicionar 21 (0.92), 95 (0.90), 88 (0.85), 20 (0.80), 30 (0.80)
  {
    jofId: 93,
    removeIds: [],
    addItems: [
      { subSentimentId: 21, weight: 0.92 },
      { subSentimentId: 95, weight: 0.90 },
      { subSentimentId: 88, weight: 0.85 },
      { subSentimentId: 20, weight: 0.80 },
      { subSentimentId: 30, weight: 0.80 }
    ]
  },
  // 14. JOF 98: Tinha 7 -> Adicionar 87 (0.98), 37 (0.90), 76 (0.85), 75 (0.82), 63 (0.80)
  {
    jofId: 98,
    removeIds: [],
    addItems: [
      { subSentimentId: 87, weight: 0.98 },
      { subSentimentId: 37, weight: 0.90 },
      { subSentimentId: 76, weight: 0.85 },
      { subSentimentId: 75, weight: 0.82 },
      { subSentimentId: 63, weight: 0.80 }
    ]
  }
];

async function main() {
  console.log('🔧 Normalizando órfãos e JOFs restantes para 12 SubSentiments válidos no PostgreSQL...\n');

  for (const spec of SPECS) {
    console.log(`🔧 JOF ${spec.jofId}:`);
    if (spec.removeIds.length > 0) {
      const del = await prisma.journeyOptionFlowSubSentiment.deleteMany({
        where: {
          journeyOptionFlowId: spec.jofId,
          subSentimentId: { in: spec.removeIds }
        }
      });
      console.log(`   🗑️  Removidos ${del.count} registro(s): [${spec.removeIds.join(', ')}]`);
    }

    for (const item of spec.addItems) {
      await prisma.journeyOptionFlowSubSentiment.upsert({
        where: {
          journeyOptionFlowId_subSentimentId: {
            journeyOptionFlowId: spec.jofId,
            subSentimentId: item.subSentimentId
          }
        },
        update: {
          weight: new Prisma.Decimal(item.weight),
          updatedAt: new Date()
        },
        create: {
          journeyOptionFlowId: spec.jofId,
          subSentimentId: item.subSentimentId,
          weight: new Prisma.Decimal(item.weight),
          updatedAt: new Date()
        }
      });
    }
    if (spec.addItems.length > 0) {
      console.log(`   ➕ Adicionados/atualizados ${spec.addItems.length} SubSentiments: [${spec.addItems.map(i => i.subSentimentId).join(', ')}]`);
    }
  }

  // Auditoria Final no Banco de Dados
  const orphansAfter: Array<{ journeyOptionFlowId: number; subSentimentId: number }> = await prisma.$queryRaw`
    SELECT jofss."journeyOptionFlowId", jofss."subSentimentId"
    FROM "JourneyOptionFlowSubSentiment" jofss
    LEFT JOIN "SubSentiment" ss ON ss.id = jofss."subSentimentId"
    WHERE ss.id IS NULL
  `;
  console.log(`\n✅ Registros órfãos restantes no banco: ${orphansAfter.length}`);

  const non12EndStates: Array<{
    jofId: number;
    text: string;
    totalRows: bigint;
    validRows: bigint;
    uniqueNames: bigint;
  }> = await prisma.$queryRaw`
    SELECT 
      jof.id as "jofId",
      jof.text,
      COUNT(jofss."subSentimentId") as "totalRows",
      COUNT(ss.id) as "validRows",
      COUNT(DISTINCT LOWER(TRIM(ss.name))) as "uniqueNames"
    FROM "JourneyOptionFlow" jof
    INNER JOIN "JourneyOptionFlowSubSentiment" jofss ON jofss."journeyOptionFlowId" = jof.id
    LEFT JOIN "SubSentiment" ss ON ss.id = jofss."subSentimentId"
    WHERE jof."isEndState" = true
    GROUP BY jof.id, jof.text
    HAVING COUNT(jofss."subSentimentId") != 12 OR COUNT(ss.id) != 12 OR COUNT(DISTINCT LOWER(TRIM(ss.name))) != 12
    ORDER BY jof.id ASC
  `;

  if (non12EndStates.length === 0) {
    console.log('🎉 100% das JOFs finais ativas no banco possuem exatamente 12 SubSentiments válidos e 12 nomes únicos!');
  } else {
    console.log('⚠️ JOFs finais ainda fora de 12:', non12EndStates);
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


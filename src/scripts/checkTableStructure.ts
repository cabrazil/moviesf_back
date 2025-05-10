import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ColumnInfo {
  column_name: string;
  data_type: string;
  column_default: string | null;
  is_nullable: string;
}

interface SequenceInfo {
  sequence_name: string | null;
}

interface SequenceValue {
  last_value: number;
  is_called: boolean;
}

async function checkTableStructure() {
  try {
    // Verificar a estrutura da tabela
    const tableStructure = await prisma.$queryRaw<ColumnInfo[]>`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'JourneyOptionFlow';
    `;
    console.log('Estrutura da tabela JourneyOptionFlow:', tableStructure);

    // Verificar a sequência do autoincrement
    const sequenceInfo = await prisma.$queryRaw<SequenceInfo[]>`
      SELECT pg_get_serial_sequence('JourneyOptionFlow', 'id') as sequence_name;
    `;
    console.log('Informação da sequência:', sequenceInfo);

    if (sequenceInfo[0]?.sequence_name) {
      const currentValue = await prisma.$queryRaw<SequenceValue[]>`
        SELECT last_value, is_called FROM "${sequenceInfo[0].sequence_name}";
      `;
      console.log('Valor atual da sequência:', currentValue);
    }

    // Verificar registros existentes
    const existingRecords = await prisma.journeyOptionFlow.findMany({
      select: {
        id: true,
        journeyStepFlowId: true,
        optionId: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    console.log('Registros existentes:', existingRecords);

  } catch (error) {
    console.error('Erro ao verificar estrutura:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStructure(); 
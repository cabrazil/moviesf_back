import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJourneyOptionFlow() {
  try {
    console.log('Verificando registros existentes em JourneyOptionFlow...');
    
    // Verificar todos os registros para o journeyStepFlowId 9
    const existingOptions = await prisma.journeyOptionFlow.findMany({
      where: {
        journeyStepFlowId: 9
      }
    });
    
    console.log('\nRegistros encontrados para journeyStepFlowId 9:');
    console.log(JSON.stringify(existingOptions, null, 2));

    // Verificar especificamente se existe um registro com optionId "2A4"
    const specificOption = await prisma.journeyOptionFlow.findFirst({
      where: {
        journeyStepFlowId: 9,
        optionId: "2A4"
      }
    });

    console.log('\nVerificando se já existe optionId "2A4":');
    console.log(specificOption ? 'Sim, já existe!' : 'Não, não existe.');

    // Verificar a estrutura da tabela
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'JourneyOptionFlow'
      ORDER BY ordinal_position;
    `;
    
    console.log('\nEstrutura da tabela JourneyOptionFlow:');
    console.log(JSON.stringify(tableInfo, null, 2));
    
  } catch (error) {
    console.error('Erro detalhado:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJourneyOptionFlow(); 
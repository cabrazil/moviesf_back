import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('Testando conexão com o banco de dados...');
    
    // Tentar listar todos os registros
    const records = await prisma.journeyOptionFlow.findMany();
    console.log(`\nTotal de registros encontrados: ${records.length}`);
    
    // Mostrar os primeiros 5 registros como exemplo
    console.log('\nPrimeiros 5 registros:');
    console.log(JSON.stringify(records.slice(0, 5), null, 2));

    // Mostrar as variáveis de conexão (mascarando informações sensíveis)
    const url = process.env.DATABASE_URL || '';
    const directUrl = process.env.DIRECT_URL || '';
    
    console.log('\nVariáveis de conexão:');
    console.log('DATABASE_URL presente:', !!url);
    console.log('DIRECT_URL presente:', !!directUrl);
    
  } catch (error) {
    console.error('\nErro ao conectar com o banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection(); 
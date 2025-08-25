/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

async function testAwardInsert(): Promise<void> {
  console.log('🧪 TESTANDO INSERÇÃO NA TABELA AWARD');
  console.log('='.repeat(50));

  try {
    // Teste 1: Inserção básica
    console.log('📝 Teste 1: Inserção básica do Oscar...');
    
    const oscarAward = await prisma.award.create({
      data: {
        name: 'Oscar',
        category: 'Cinema',
        url: 'https://www.oscars.org/'
      }
    });

    console.log('✅ Oscar criado com sucesso:', oscarAward);

    // Teste 2: Verificar se já existe
    console.log('\n📝 Teste 2: Tentando criar Oscar novamente (deve falhar por unique constraint)...');
    
    try {
      const duplicateOscar = await prisma.award.create({
        data: {
          name: 'Oscar',
          category: 'Cinema',
          url: 'https://www.oscars.org/'
        }
      });
      console.log('❌ ERRO: Deveria ter falhado por duplicata');
    } catch (error: any) {
      console.log('✅ Comportamento correto: Falhou por duplicata');
      console.log('   Erro:', error.message);
    }

    // Teste 3: Inserir outro prêmio
    console.log('\n📝 Teste 3: Criando Golden Globe...');
    
    const goldenGlobeAward = await prisma.award.create({
      data: {
        name: 'Golden Globe Awards',
        category: 'Cinema',
        url: 'https://www.goldenglobes.com/'
      }
    });

    console.log('✅ Golden Globe criado com sucesso:', goldenGlobeAward);

    // Teste 4: Listar todos os prêmios
    console.log('\n📝 Teste 4: Listando todos os prêmios...');
    
    const allAwards = await prisma.award.findMany({
      orderBy: { name: 'asc' }
    });

    console.log('📋 Prêmios encontrados:', allAwards.length);
    allAwards.forEach(award => {
      console.log(`   - ${award.name} (${award.category})`);
    });

    // Teste 5: Criar categoria para o Oscar
    console.log('\n📝 Teste 5: Criando categoria "Best Picture" para o Oscar...');
    
    const bestPictureCategory = await prisma.awardCategory.create({
      data: {
        awardId: oscarAward.id,
        name: 'Best Picture'
      }
    });

    console.log('✅ Categoria criada com sucesso:', bestPictureCategory);

    // Teste 6: Listar categorias do Oscar
    console.log('\n📝 Teste 6: Listando categorias do Oscar...');
    
    const oscarCategories = await prisma.awardCategory.findMany({
      where: { awardId: oscarAward.id },
      include: { award: true }
    });

    console.log('📋 Categorias do Oscar:', oscarCategories.length);
    oscarCategories.forEach(category => {
      console.log(`   - ${category.name}`);
    });

  } catch (error: any) {
    console.error('❌ ERRO durante teste:', error);
    console.error('   Detalhes:', error.message);
    
    if (error.code) {
      console.error('   Código:', error.code);
    }
    
    if (error.meta) {
      console.error('   Meta:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n' + '='.repeat(50));
  console.log('🧪 TESTE CONCLUÍDO');
  console.log('='.repeat(50));
}

// Executar teste
testAwardInsert().catch(console.error);

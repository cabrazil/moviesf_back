/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

interface ScriptArgs {
  title?: string;
}

function parseArgs(): ScriptArgs {
  const args: ScriptArgs = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--title=')) {
      args.title = arg.split('=')[1];
    }
  }
  
  return args;
}

async function testNewLandingPageHook(args: ScriptArgs) {
  try {
    console.log('🔍 Testando nova estrutura do landingPageHook...');
    
    // Buscar filme específico ou um exemplo
    const whereClause = args.title 
      ? { title: { contains: args.title, mode: 'insensitive' as const } }
      : {};
    
    const movies = await prisma.movie.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        year: true,
        landingPageHook: true
      },
      take: 5
    });
    
    console.log(`📊 Encontrados ${movies.length} filmes:`);
    
    for (const movie of movies) {
      console.log(`\n🎬 ${movie.title} (${movie.year})`);
      
      if (movie.landingPageHook) {
        console.log('📝 LandingPageHook completo:');
        console.log(movie.landingPageHook);
        
        // Testar extração do targetAudience
        try {
          const trimmed = movie.landingPageHook.trim();
          const jsonEndIndex = trimmed.lastIndexOf('}');
          
          if (jsonEndIndex !== -1) {
            const jsonString = trimmed.substring(0, jsonEndIndex + 1);
            const jsonData = JSON.parse(jsonString);
            
            console.log('\n✨ Estrutura JSON extraída:');
            console.log(JSON.stringify(jsonData, null, 2));
            
            if (jsonData.targetAudience) {
              console.log('\n🎯 Target Audience:');
              console.log(jsonData.targetAudience);
            } else {
              console.log('\n⚠️ Target Audience não encontrado (estrutura antiga)');
            }
            
            // Extrair texto após JSON
            const textAfterJson = trimmed.substring(jsonEndIndex + 1).trim();
            if (textAfterJson) {
              console.log('\n📖 Texto após JSON (para "Por que assistir"):');
              console.log(textAfterJson);
            }
          }
        } catch (error) {
          console.log('❌ Erro ao processar JSON:', error);
        }
      } else {
        console.log('❌ Sem landingPageHook');
      }
      
      console.log('='.repeat(80));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const args = parseArgs();
  
  if (Object.keys(args).length === 0) {
    console.log('📋 Uso: npx ts-node src/scripts/test-new-landing-page-hook.ts --title="Nome do Filme"');
    console.log('📋 Exemplo: npx ts-node src/scripts/test-new-landing-page-hook.ts --title="Pequena Miss Sunshine"');
  }
  
  testNewLandingPageHook(args).catch(console.error);
}

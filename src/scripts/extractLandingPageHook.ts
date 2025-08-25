/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

interface ScriptArgs {
  title?: string;
  year?: number;
  all?: boolean;
}

// Função para extrair o texto do landingPageHook
function extractHookText(landingPageHook: string): string | null {
  try {
    // Remover espaços em branco no início e fim
    const trimmed = landingPageHook.trim();
    
    // Procurar pelo final do JSON (última chave de fechamento })
    const jsonEndIndex = trimmed.lastIndexOf('}');
    
    if (jsonEndIndex === -1) {
      // Se não encontrar }, pode ser que não seja um JSON válido
      console.log('⚠️ Não foi possível encontrar o final do JSON');
      return null;
    }
    
    // Extrair o texto que vem depois do JSON
    const textAfterJson = trimmed.substring(jsonEndIndex + 1).trim();
    
    // Remover quebras de linha e espaços extras
    const cleanText = textAfterJson.replace(/\s+/g, ' ').trim();
    
    return cleanText || null;
  } catch (error) {
    console.error('Erro ao extrair texto do landingPageHook:', error);
    return null;
  }
}

async function extractHooks(args: ScriptArgs) {
  try {
    console.log('🔍 Extraindo textos dos landingPageHooks...\n');

    let movies;

    if (args.all) {
      // Buscar todos os filmes com landingPageHook
      movies = await prisma.movie.findMany({
        where: {
          landingPageHook: {
            not: null
          }
        },
        select: {
          id: true,
          title: true,
          year: true,
          landingPageHook: true
        },
        orderBy: {
          title: 'asc'
        }
      });
    } else if (args.title && args.year) {
      // Buscar filme específico
      movies = await prisma.movie.findMany({
        where: {
          title: args.title,
          year: args.year
        },
        select: {
          id: true,
          title: true,
          year: true,
          landingPageHook: true
        }
      });
    } else if (args.title) {
      // Buscar por título apenas
      movies = await prisma.movie.findMany({
        where: {
          title: {
            contains: args.title,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          title: true,
          year: true,
          landingPageHook: true
        },
        orderBy: {
          title: 'asc'
        }
      });
    } else {
      console.log('❌ Parâmetros inválidos. Use --all, --title="Nome" ou --title="Nome" --year=2023');
      return;
    }

    if (movies.length === 0) {
      console.log('❌ Nenhum filme encontrado com landingPageHook');
      return;
    }

    console.log(`📊 Encontrados ${movies.length} filmes com landingPageHook:\n`);

    for (const movie of movies) {
      if (!movie.landingPageHook) {
        console.log(`⚠️ ${movie.title} (${movie.year}) - Sem landingPageHook`);
        continue;
      }

      console.log(`🎬 ${movie.title} (${movie.year})`);
      console.log(`📝 LandingPageHook completo:`);
      console.log(movie.landingPageHook);
      
      const extractedText = extractHookText(movie.landingPageHook);
      
      if (extractedText) {
        console.log(`\n✨ Texto extraído:`);
        console.log(`"${extractedText}"`);
      } else {
        console.log(`\n❌ Não foi possível extrair o texto`);
      }
      
      console.log('\n' + '='.repeat(80) + '\n');
    }

    // Estatísticas
    const withExtractedText = movies.filter(movie => 
      movie.landingPageHook && extractHookText(movie.landingPageHook)
    ).length;

    console.log(`📊 Estatísticas:`);
    console.log(`   Total de filmes: ${movies.length}`);
    console.log(`   Com texto extraído: ${withExtractedText}`);
    console.log(`   Sem texto extraído: ${movies.length - withExtractedText}`);

  } catch (error) {
    console.error('❌ Erro durante a extração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Função para processar argumentos da linha de comando
function parseArgs(): ScriptArgs {
  const args = process.argv.slice(2);
  const parsed: any = {};

  args.forEach(arg => {
    if (arg.startsWith('--title=')) {
      parsed.title = arg.split('=')[1];
    } else if (arg.startsWith('--year=')) {
      parsed.year = parseInt(arg.split('=')[1]);
    } else if (arg === '--all') {
      parsed.all = true;
    }
  });

  return parsed as ScriptArgs;
}

// Execução do script
async function main() {
  const args = parseArgs();
  
  if (Object.keys(args).length === 0 || process.argv.includes('--help')) {
    console.log('🔍 Script para extrair textos dos landingPageHooks');
    console.log('\nUso:');
    console.log('  npx ts-node src/scripts/extractLandingPageHook.ts --all');
    console.log('  npx ts-node src/scripts/extractLandingPageHook.ts --title="Nome do Filme"');
    console.log('  npx ts-node src/scripts/extractLandingPageHook.ts --title="Nome do Filme" --year=2023');
    console.log('\nParâmetros:');
    console.log('  --all: Extrair de todos os filmes');
    console.log('  --title: Título do filme (busca parcial)');
    console.log('  --year: Ano do filme (opcional)');
    return;
  }

  await extractHooks(args);
}

if (require.main === module) {
  main();
}

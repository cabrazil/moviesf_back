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

async function checkMovieSentiments(args: ScriptArgs) {
  try {
    console.log('🔍 Verificando subsentimentos do filme...');
    
    if (!args.title) {
      console.log('❌ Título não fornecido. Use: --title="Nome do Filme"');
      return;
    }
    
    // Buscar filme e seus sentimentos
    const movie = await prisma.movie.findFirst({
      where: {
        title: { contains: args.title, mode: 'insensitive' as const }
      },
      select: {
        id: true,
        title: true,
        year: true,
        movieSentiments: {
          select: {
            relevance: true,
            explanation: true,
            subSentiment: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            relevance: 'desc'
          },
          take: 5
        }
      }
    });
    
    if (!movie) {
      console.log(`❌ Filme não encontrado: ${args.title}`);
      return;
    }
    
    console.log(`\n🎬 ${movie.title} (${movie.year})`);
    console.log(`📊 Total de subsentimentos: ${movie.movieSentiments.length}`);
    
    if (movie.movieSentiments.length === 0) {
      console.log('❌ Nenhum subsentimento encontrado');
      return;
    }
    
    console.log('\n📋 Subsentimentos encontrados:');
    movie.movieSentiments.forEach((sentiment, index) => {
      console.log(`\n${index + 1}. ${sentiment.subSentiment.name}`);
      console.log(`   Relevância: ${sentiment.relevance}`);
      console.log(`   Explicação: ${sentiment.explanation}`);
    });
    
    // Testar a lógica de categorização
    console.log('\n🧪 Testando lógica de categorização:');
    const topSentiment = movie.movieSentiments[0];
    const secondSentiment = movie.movieSentiments[1];
    
    if (topSentiment) {
      const mainBenefit = topSentiment.subSentiment.name.toLowerCase();
      console.log(`   Top sentiment: "${mainBenefit}"`);
      
      if (mainBenefit.includes('reconciliação') || mainBenefit.includes('aceitação') || mainBenefit.includes('perdão')) {
        console.log(`   → Categoria: Reconciliação/Aceitação/Perdão`);
      } else if (mainBenefit.includes('humor') || mainBenefit.includes('leveza') || mainBenefit.includes('diversão')) {
        console.log(`   → Categoria: Humor/Leveza/Diversão`);
      } else if (mainBenefit.includes('superação') || mainBenefit.includes('crescimento') || mainBenefit.includes('inspiração')) {
        console.log(`   → Categoria: Superação/Crescimento/Inspiração`);
      } else {
        console.log(`   → Categoria: Genérica (não reconhecida)`);
      }
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
  
  if (!args.title) {
    console.log('📋 Uso: npx ts-node src/scripts/check-movie-sentiments.ts --title="Nome do Filme"');
    console.log('📋 Exemplo: npx ts-node src/scripts/check-movie-sentiments.ts --title="Pequena Miss Sunshine"');
  }
  
  checkMovieSentiments(args).catch(console.error);
}

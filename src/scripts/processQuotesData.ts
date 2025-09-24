import { prismaApp as prisma } from '../prisma';
import * as fs from 'fs';
import * as path from 'path';

// Interface para Google Translate API
interface TranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
    }>;
  };
}

// Função para traduzir texto usando Google Translate API
async function translateText(text: string): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY não encontrada no .env');
  }

  try {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: 'pt',
        source: 'en'
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API de tradução: ${response.status}`);
    }

    const data: TranslateResponse = await response.json();
    let translatedText = data.data.translations[0].translatedText;
    
    // Limpar caracteres HTML/entidades
    translatedText = translatedText
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    return translatedText;
  } catch (error) {
    console.error('❌ Erro ao traduzir texto:', error);
    return text; // Retorna texto original em caso de erro
  }
}

// Função para buscar filme por título original e ano
async function findMovieByTitleAndYear(originalTitle: string, year: number) {
  try {
    const movie = await prisma.movie.findFirst({
      where: {
        original_title: {
          equals: originalTitle,
          mode: 'insensitive'
        },
        year: year
      }
    });

    return movie;
  } catch (error) {
    console.error('❌ Erro ao buscar filme:', error);
    return null;
  }
}

// Função para gerar URL da crítica
function generateQuoteUrl(originalTitle: string): string {
  // Converter título para formato URL (lowercase, espaços para hífens, remover caracteres especiais)
  const urlTitle = originalTitle
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-/g, '_'); // Trocar hífens por underscores para Rotten Tomatoes
  
  return `https://www.rottentomatoes.com/m/${urlTitle}/reviews?type=top_critics`;
}

// Função para processar uma seção de crítica
async function processQuoteSection(section: string, movieId: string, originalTitle: string): Promise<void> {
  const lines = section.trim().split('\n').filter(line => line.trim() !== '');
  
  if (lines.length < 3) {
    console.log('⚠️ Seção muito curta, pulando...');
    return;
  }

  // Extrair dados da seção
  const author = lines[0]?.trim();
  const vehicle = lines[1]?.trim();
  
  // Encontrar o texto da crítica (pular linhas de metadados)
  let textStartIndex = 2;
  while (textStartIndex < lines.length && 
         (lines[textStartIndex].includes('TOP CRITIC') || 
          lines[textStartIndex].includes('Fresh score') ||
          lines[textStartIndex].includes('Full Review'))) {
    textStartIndex++;
  }

  // Filtrar linhas que começam com "Full Review" e linhas vazias
  const filteredLines = lines.slice(textStartIndex).filter(line => {
    const trimmedLine = line.trim();
    return trimmedLine !== '' && !trimmedLine.startsWith('Full Review');
  });

  const text = filteredLines.join(' ').trim();
  
  if (!text) {
    console.log('⚠️ Nenhum texto encontrado na seção, pulando...');
    return;
  }

  console.log(`   📝 Processando crítica de: ${author} (${vehicle})`);
  console.log(`   📄 Texto original: ${text.substring(0, 100)}...`);

  // Traduzir texto
  const translatedText = await translateText(text);
  console.log(`   🌐 Texto traduzido: ${translatedText.substring(0, 100)}...`);

  // Gerar URL da crítica
  const quoteUrl = generateQuoteUrl(originalTitle);
  console.log(`   🔗 URL gerada: ${quoteUrl}`);

  // Verificar se citação já existe e fazer upsert
  try {
    // Buscar citação existente
    const existingQuote = await prisma.quote.findFirst({
      where: {
        movieId: movieId,
        author: author,
        vehicle: vehicle
      }
    });

    let quote;
    if (existingQuote) {
      // Atualizar citação existente
      quote = await prisma.quote.update({
        where: { id: existingQuote.id },
        data: {
          text: translatedText,
          url: quoteUrl
        }
      });
      console.log(`   🔄 Citação atualizada com ID: ${quote.id}`);
    } else {
      // Criar nova citação
      quote = await prisma.quote.create({
        data: {
          movieId: movieId,
          author: author,
          vehicle: vehicle,
          text: translatedText,
          url: quoteUrl
        }
      });
      console.log(`   ✅ Citação criada com ID: ${quote.id}`);
    }
  } catch (error) {
    console.error(`   ❌ Erro ao processar citação:`, error);
  }
}

// Função principal
async function processQuotesData(filename: string) {
  console.log('📚 PROCESSANDO DADOS DE CITAÇÕES');
  console.log('==================================================');

  try {
    // Ler arquivo
    const filePath = path.join(process.cwd(), filename);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`📁 Arquivo lido: ${filename}`);
    console.log(`📊 Tamanho: ${fileContent.length} caracteres`);

    // Extrair título e ano da primeira linha
    const lines = fileContent.split('\n');
    const firstLine = lines[0]?.trim();
    
    if (!firstLine) {
      throw new Error('Primeira linha do arquivo está vazia');
    }

    // Parse do título e ano: "1917 (2019)"
    const titleYearMatch = firstLine.match(/^(.+?)\s*\((\d{4})\)$/);
    if (!titleYearMatch) {
      throw new Error(`Formato inválido na primeira linha: ${firstLine}`);
    }

    const originalTitle = titleYearMatch[1].trim();
    const year = parseInt(titleYearMatch[2]);

    console.log(`🎬 Filme: ${originalTitle}`);
    console.log(`📅 Ano: ${year}`);

    // Buscar filme no banco
    const movie = await findMovieByTitleAndYear(originalTitle, year);
    if (!movie) {
      throw new Error(`Filme "${originalTitle}" (${year}) não encontrado no banco`);
    }

    console.log(`✅ Filme encontrado: ${movie.title} (${movie.original_title})`);
    console.log(`🆔 Movie ID: ${movie.id}`);

    // Processar seções (separadas por *)
    const sections = fileContent.split('*').slice(1); // Pular primeira seção (título)
    
    console.log(`📊 Total de seções encontradas: ${sections.length}`);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (section.trim()) {
        console.log(`\n🎯 PROCESSANDO SEÇÃO ${i + 1}/${sections.length}`);
        await processQuoteSection(section, movie.id, originalTitle);
      }
    }

    console.log('\n✅ PROCESSAMENTO CONCLUÍDO!');
    console.log(`📊 Total de citações processadas: ${sections.length}`);

  } catch (error) {
    console.error('❌ Erro durante o processamento:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar script se chamado diretamente
if (require.main === module) {
  const filename = process.argv[2];
  
  if (!filename) {
    console.error('❌ Uso: npx ts-node src/scripts/processQuotesData.ts <arquivo>');
    console.error('   Exemplo: npx ts-node src/scripts/processQuotesData.ts quotes.txt');
    process.exit(1);
  }

  processQuotesData(filename);
}

export { processQuotesData };

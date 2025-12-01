/// <reference types="node" />
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

interface JourneyOption {
  journeyOptionFlowId: number;
  optionText: string;
  movies: string[];
}

/**
 * Extrai filmes de uma string que pode conter um array JSON completo ou parcial
 */
function extractMovies(moviesStr: string): string[] {
  const movies: string[] = [];
  
  // Remover espaços e quebras de linha
  const cleaned = moviesStr.replace(/\s+/g, ' ').trim();
  
  // Tentar parsear como JSON array completo
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      // Continuar com extração manual
    }
  }
  
  // Extrair todos os filmes entre aspas duplas
  const movieMatches = cleaned.matchAll(/"([^"]+)"/g);
  for (const match of movieMatches) {
    movies.push(match[1]);
  }
  
  return movies;
}

/**
 * Lê um arquivo e retorna um mapa de journeyOptionFlowId -> JourneyOption
 */
function readFile(filePath: string): Map<number, JourneyOption> {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const result = new Map<number, JourneyOption>();

  let currentJourney: JourneyOption | null = null;
  let accumulatingMovies = false;
  let accumulatedMoviesStr = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Ignorar linhas vazias, cabeçalho e separador
    if (!trimmedLine || trimmedLine.startsWith('| journeyOptionFlowId') || trimmedLine.startsWith('| --')) {
      continue;
    }

    // Tentar parsear linha com formato: | journeyOptionFlowId | option_text | [array de filmes]
    const match = trimmedLine.match(/^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.*)$/);
    
    if (match) {
      // Nova entrada encontrada
      if (currentJourney) {
        // Finalizar a anterior se houver
        if (accumulatedMoviesStr) {
          const additionalMovies = extractMovies(accumulatedMoviesStr);
          currentJourney.movies = [...currentJourney.movies, ...additionalMovies];
          accumulatedMoviesStr = '';
        }
        result.set(currentJourney.journeyOptionFlowId, currentJourney);
      }
      
      const journeyOptionFlowId = parseInt(match[1]);
      const optionText = match[2].trim();
      const moviesStr = match[3].trim();
      
      currentJourney = {
        journeyOptionFlowId,
        optionText,
        movies: []
      };
      
      if (moviesStr) {
        if (moviesStr.startsWith('[') && moviesStr.endsWith(']')) {
          // Array completo na mesma linha
          currentJourney.movies = extractMovies(moviesStr);
          accumulatingMovies = false;
          accumulatedMoviesStr = '';
        } else if (moviesStr.startsWith('[')) {
          // Array começou mas não terminou
          accumulatedMoviesStr = moviesStr;
          accumulatingMovies = true;
        } else {
          // Sem array nesta linha
          accumulatingMovies = false;
          accumulatedMoviesStr = '';
        }
      } else {
        accumulatingMovies = false;
        accumulatedMoviesStr = '';
      }
    } else if (currentJourney && (trimmedLine.startsWith('[') || accumulatingMovies)) {
      // Continuando array de filmes em nova linha
      accumulatedMoviesStr += (accumulatedMoviesStr ? ' ' : '') + trimmedLine;
      accumulatingMovies = true;
      
      // Verificar se fechou o array
      if (trimmedLine.includes(']')) {
        const movies = extractMovies(accumulatedMoviesStr);
        currentJourney.movies = [...currentJourney.movies, ...movies];
        accumulatedMoviesStr = '';
        accumulatingMovies = false;
      }
    }
  }

  // Adicionar a última entrada se houver
  if (currentJourney) {
    if (accumulatedMoviesStr) {
      const additionalMovies = extractMovies(accumulatedMoviesStr);
      currentJourney.movies = [...currentJourney.movies, ...additionalMovies];
    }
    result.set(currentJourney.journeyOptionFlowId, currentJourney);
  }

  return result;
}

/**
 * Compara dois arquivos e retorna as diferenças
 */
function compareFiles(file1Path: string, file2Path: string): Map<number, JourneyOption> {
  console.log('📖 Lendo arquivo 1:', file1Path);
  const file1Data = readFile(file1Path);
  console.log(`   ✅ ${file1Data.size} journeyOptionFlowIds encontrados`);

  console.log('📖 Lendo arquivo 2:', file2Path);
  const file2Data = readFile(file2Path);
  console.log(`   ✅ ${file2Data.size} journeyOptionFlowIds encontrados`);

  const differences = new Map<number, JourneyOption>();

  // Para cada journeyOptionFlowId no arquivo 1
  for (const [journeyId, journey1] of file1Data.entries()) {
    const journey2 = file2Data.get(journeyId);

    if (!journey2) {
      // JourneyOptionFlowId não existe no arquivo 2, adicionar todos os filmes
      console.log(`   ⚠️  JourneyOptionFlowId ${journeyId} não encontrado no arquivo 2`);
      differences.set(journeyId, journey1);
    } else {
      // Comparar filmes
      const movies1Set = new Set(journey1.movies.map(m => m.trim().toLowerCase()));
      const movies2Set = new Set(journey2.movies.map(m => m.trim().toLowerCase()));
      
      const missingMovies = journey1.movies.filter(movie => 
        !movies2Set.has(movie.trim().toLowerCase())
      );

      if (missingMovies.length > 0) {
        console.log(`   📊 JourneyOptionFlowId ${journeyId}: ${missingMovies.length} filme(s) faltando no arquivo 2`);
        differences.set(journeyId, {
          journeyOptionFlowId: journeyId,
          optionText: journey1.optionText,
          movies: missingMovies
        });
      }
    }
  }

  return differences;
}

/**
 * Gera o conteúdo do arquivo de diferenças no mesmo formato dos arquivos originais
 */
function generateOutputFile(differences: Map<number, JourneyOption>): string {
  const lines: string[] = [];
  
  // Cabeçalho
  lines.push('| journeyOptionFlowId | option_text                                                                                         | movie_titles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |');
  lines.push('| ------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |');
  
  // Ordenar por journeyOptionFlowId
  const sortedEntries = Array.from(differences.entries()).sort((a, b) => a[0] - b[0]);
  
  for (const [journeyId, journey] of sortedEntries) {
    if (journey.movies.length === 0) {
      continue;
    }

    // Formatar lista de filmes como JSON array
    const moviesJson = JSON.stringify(journey.movies);
    
    // Formatar optionText (manter original, sem truncar)
    const optionText = journey.optionText;
    
    // Formatar linha seguindo o padrão: | journeyOptionFlowId | option_text | movie_titles |
    // O journeyOptionFlowId deve ter 18 caracteres de largura (incluindo espaços)
    const journeyIdStr = journeyId.toString().padEnd(18);
    
    const line = `| ${journeyIdStr} | ${optionText} | ${moviesJson}`;
    lines.push(line);
    lines.push(''); // Linha em branco após cada entrada
  }

  return lines.join('\n');
}

/**
 * Função principal
 */
async function main() {
  try {
    const file1Path = path.join(__dirname, '../../../filmes-por-opção-utf8.txt');
    const file2Path = path.join(__dirname, '../../../filmes-por-opção2.txt');
    const outputPath = path.join(__dirname, '../../../filmes-diferencas.txt');

    console.log('🔍 Iniciando comparação de arquivos...\n');

    const differences = compareFiles(file1Path, file2Path);

    console.log(`\n📊 Total de diferenças encontradas: ${differences.size} journeyOptionFlowId(s)`);

    if (differences.size === 0) {
      console.log('✅ Nenhuma diferença encontrada! Todos os filmes do arquivo 1 estão no arquivo 2.');
      return;
    }

    const outputContent = generateOutputFile(differences);
    writeFileSync(outputPath, outputContent, 'utf-8');

    console.log(`\n✅ Arquivo de diferenças gerado: ${outputPath}`);
    console.log(`📊 Total de registros com diferenças: ${differences.size}`);

    // Estatísticas detalhadas
    let totalMissingMovies = 0;
    for (const journey of differences.values()) {
      totalMissingMovies += journey.movies.length;
    }
    console.log(`📊 Total de filmes faltando: ${totalMissingMovies}`);

  } catch (error) {
    console.error('❌ Erro ao processar arquivos:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { compareFiles, readFile, generateOutputFile };


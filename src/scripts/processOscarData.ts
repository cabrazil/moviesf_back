/// <reference types="node" />
// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface OscarData {
  filmTitle: string;
  production: string;
  year: number;
  ceremony: number;
  nominations: {
    category: string;
    nominee: string;
    character?: string;
    isWin: boolean;
  }[];
}

// Função para parsear o texto copiado do site
function parseOscarText(text: string): OscarData | null {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length < 3) {
    console.log('❌ Texto muito curto para processar');
    return null;
  }

  const result: OscarData = {
    filmTitle: '',
    production: '',
    year: 0,
    ceremony: 0,
    nominations: []
  };

  let currentLine = 0;

  // Primeira linha: título do filme
  if (lines[currentLine]) {
    result.filmTitle = lines[currentLine];
    currentLine++;
  }

  // Segunda linha: produção
  if (lines[currentLine] && lines[currentLine].includes(';')) {
    result.production = lines[currentLine];
    currentLine++;
  }

  // Terceira linha: ano e cerimônia
  if (lines[currentLine]) {
    const yearMatch = lines[currentLine].match(/(\d{4})\s*\((\d+)(?:st|nd|rd|th)\)/);
    if (yearMatch) {
      result.year = parseInt(yearMatch[1], 10);
      result.ceremony = parseInt(yearMatch[2], 10);
      currentLine++;
    }
  }

  // Processar indicações
  for (let i = currentLine; i < lines.length; i++) {
    const line = lines[i];

    // Pular linhas de notas
    if (line.startsWith('[NOTE:') || line.startsWith('Results')) {
      continue;
    }

    // Verificar se é uma vitória (marcada com *)
    const isWin = line.startsWith('*');

    // Remover marcação de vitória se existir
    const cleanLine = line.replace(/^\*\s*/, '');

    // Padrão: "CATEGORY -- Nominee {"Character"}" (incluindo parênteses aninhados)
    // Primeiro tenta o padrão com parênteses aninhados (mais específico)
    let nominationMatch = cleanLine.match(/^([A-Z\s]+\([^)]*(?:\([^)]*\)[^)]*)*\))\s*--\s*(.+?)(?:\s*\{\"([^"]+)\"\})?\s*$/);

    // Se não encontrar, tenta o padrão com parênteses simples
    if (!nominationMatch) {
      nominationMatch = cleanLine.match(/^([A-Z\s]+\([^)]+\))\s*--\s*(.+?)(?:\s*\{\"([^"]+)\"\})?\s*$/);
    }

    // Se não encontrar, tenta o padrão sem parênteses
    if (!nominationMatch) {
      nominationMatch = cleanLine.match(/^([A-Z\s]+)\s*--\s*(.+?)(?:\s*\{\"([^"]+)\"\})?\s*$/);
    }
    if (nominationMatch) {
      const category = nominationMatch[1].trim();
      const nominee = nominationMatch[2].trim();
      const character = nominationMatch[3] || undefined;

      result.nominations.push({
        category,
        nominee,
        character,
        isWin: isWin
      });
    }
  }

  return result;
}

// Função para obter ou criar Award (Oscar)
async function getOrCreateOscarAward() {
  let oscarAward = await prisma.award.findUnique({
    where: { name: 'Oscar' }
  });

  if (!oscarAward) {
    oscarAward = await prisma.award.create({
      data: {
        name: 'Oscar',
        category: 'Cinema',
        url: 'https://www.oscars.org/'
      }
    });
    console.log('✅ Award "Oscar" criado');
  } else {
    console.log('✅ Award "Oscar" já existe');
  }

  return oscarAward;
}

// Função para obter ou criar categoria
async function getOrCreateCategory(awardId: string, categoryName: string) {
  let category = await prisma.awardCategory.findUnique({
    where: {
      awardId_name: {
        awardId,
        name: categoryName
      }
    }
  });

  if (!category) {
    category = await prisma.awardCategory.create({
      data: {
        awardId,
        name: categoryName
      }
    });
    console.log(`✅ Categoria "${categoryName}" criada`);
  } else {
    console.log(`✅ Categoria "${categoryName}" já existe`);
  }

  return category;
}

// Função para obter ou criar filme
async function getOrCreateMovie(filmTitle: string, year: number) {
  // Primeira tentativa: buscar por original_title
  let movie = await prisma.movie.findFirst({
    where: {
      original_title: {
        contains: filmTitle,
        mode: 'insensitive'
      },
      year: year
    }
  });

  // Segunda tentativa: buscar por title se não encontrou por original_title
  if (!movie) {
    console.log(`🔍 Filme "${filmTitle}" (${year}) não encontrado por original_title, tentando por title...`);
    movie = await prisma.movie.findFirst({
      where: {
        title: {
          contains: filmTitle,
          mode: 'insensitive'
        },
        year: year
      }
    });
  }

  // Terceira tentativa: buscar pelo ano anterior (cerimônia vs lançamento)
  if (!movie) {
    console.log(`🔍 Filme "${filmTitle}" (${year}) não encontrado, tentando ano anterior (${year - 1})...`);
    movie = await prisma.movie.findFirst({
      where: {
        OR: [
          { original_title: { contains: filmTitle, mode: 'insensitive' } },
          { title: { contains: filmTitle, mode: 'insensitive' } }
        ],
        year: year - 1
      }
    });
  }

  if (!movie) {
    console.log(`⚠️ Filme "${filmTitle}" (${year}) não encontrado no banco`);
    console.log('   Tentativas realizadas:');
    console.log('   - Busca por original_title');
    console.log('   - Busca por title');
    console.log('   Você precisa adicionar o filme primeiro usando populateMovies.ts');
    return null;
  }

  console.log(`✅ Filme encontrado: ${movie.original_title || movie.title} (${movie.title})`);
  return movie;
}

// Função principal de processamento
async function processOscarData(text: string): Promise<void> {
  console.log('🎬 PROCESSANDO DADOS DO OSCAR');
  console.log('='.repeat(50));

  // Parsear texto
  const oscarData = parseOscarText(text);
  if (!oscarData) {
    console.log('❌ Falha ao parsear dados');
    return;
  }

  const wins = oscarData.nominations.filter(n => n.isWin).length;
  const nominations = oscarData.nominations.filter(n => !n.isWin).length;

  console.log(`📽️ Filme: ${oscarData.filmTitle}`);
  console.log(`🏭 Produção: ${oscarData.production}`);
  console.log(`📅 Ano: ${oscarData.year} (${oscarData.ceremony}ª cerimônia)`);
  console.log(`🏆 Vitórias: ${wins}`);
  console.log(`🎯 Indicações: ${nominations}`);
  console.log(`📊 Total: ${oscarData.nominations.length}`);

  // Obter Award Oscar
  const oscarAward = await getOrCreateOscarAward();

  // Obter filme
  const movie = await getOrCreateMovie(oscarData.filmTitle, oscarData.year);
  if (!movie) {
    console.log('❌ Processamento interrompido - filme não encontrado');
    return;
  }

  // Processar cada indicação/vitória
  for (const nomination of oscarData.nominations) {
    const status = nomination.isWin ? '🏆 VITÓRIA' : '🎯 INDICAÇÃO';
    console.log(`\n${status}: ${nomination.category} -- ${nomination.nominee}`);

    try {
      // Obter ou criar categoria
      const category = await getOrCreateCategory(oscarAward.id, nomination.category);

      if (nomination.isWin) {
        // Processar vitória usando upsert
        const newWin = await prisma.movieAwardWin.upsert({
          where: {
            movieId_awardId_awardCategoryId_year: {
              movieId: movie.id,
              awardId: oscarAward.id,
              awardCategoryId: category.id,
              year: oscarData.year
            }
          },
          update: {}, // Não atualiza nada, apenas garante que existe
          create: {
            movieId: movie.id,
            awardId: oscarAward.id,
            awardCategoryId: category.id,
            year: oscarData.year
          }
        });

        console.log(`   ✅ Vitória processada com ID: ${newWin.id}`);

        // Se há informações de pessoa, criar registro em PersonAwardWin
        if (nomination.nominee && nomination.nominee.trim() !== '') {
          try {
            // Criar ator único para cada indicação específica
            // Não reutilizar atores entre categorias diferentes

            // Gerar tmdbId único para ator temporário
            const maxTmdbId = await prisma.actor.findFirst({
              orderBy: { tmdbId: 'desc' },
              select: { tmdbId: true }
            });
            const newTmdbId = (maxTmdbId?.tmdbId || 0) + 1;

            // Criar ator temporário
            const actor = await prisma.actor.create({
              data: {
                tmdbId: newTmdbId,
                name: nomination.nominee
              }
            });
            console.log(`   👤 Ator criado: ${nomination.nominee} (tmdbId: ${newTmdbId})`);

            // Usar upsert para evitar duplicatas
            await prisma.personAwardWin.upsert({
              where: {
                personId_awardId_awardCategoryId_year: {
                  personId: actor.id,
                  awardId: oscarAward.id,
                  awardCategoryId: category.id,
                  year: oscarData.year
                }
              },
              update: {
                forMovieId: movie.id // Atualiza o filme se necessário
              },
              create: {
                personId: actor.id,
                awardId: oscarAward.id,
                awardCategoryId: category.id,
                year: oscarData.year,
                forMovieId: movie.id
              }
            });
            console.log(`   🏆 Vitória de pessoa registrada: ${nomination.nominee}${nomination.character ? ` como ${nomination.character}` : ''}`);
          } catch (personError: any) {
            console.error(`   ❌ Erro ao registrar pessoa:`, personError.message);
          }
        }

      } else {
        // Processar indicação usando upsert
        const newNomination = await prisma.movieAwardNomination.upsert({
          where: {
            movieId_awardId_awardCategoryId_year: {
              movieId: movie.id,
              awardId: oscarAward.id,
              awardCategoryId: category.id,
              year: oscarData.year
            }
          },
          update: {}, // Não atualiza nada, apenas garante que existe
          create: {
            movieId: movie.id,
            awardId: oscarAward.id,
            awardCategoryId: category.id,
            year: oscarData.year
          }
        });

        console.log(`   ✅ Indicação processada com ID: ${newNomination.id}`);

        // Se há informações de pessoa, criar registro em PersonAwardNomination
        if (nomination.nominee && nomination.nominee.trim() !== '') {
          try {
            // Criar ator único para cada indicação específica
            // Não reutilizar atores entre categorias diferentes

            // Gerar tmdbId único para ator temporário
            const maxTmdbId = await prisma.actor.findFirst({
              orderBy: { tmdbId: 'desc' },
              select: { tmdbId: true }
            });
            const newTmdbId = (maxTmdbId?.tmdbId || 0) + 1;

            // Criar ator temporário
            const actor = await prisma.actor.create({
              data: {
                tmdbId: newTmdbId,
                name: nomination.nominee
              }
            });
            console.log(`   👤 Ator criado: ${nomination.nominee} (tmdbId: ${newTmdbId})`);

            // Usar upsert para evitar duplicatas
            await prisma.personAwardNomination.upsert({
              where: {
                personId_awardId_awardCategoryId_year: {
                  personId: actor.id,
                  awardId: oscarAward.id,
                  awardCategoryId: category.id,
                  year: oscarData.year
                }
              },
              update: {
                forMovieId: movie.id // Atualiza o filme se necessário
              },
              create: {
                personId: actor.id,
                awardId: oscarAward.id,
                awardCategoryId: category.id,
                year: oscarData.year,
                forMovieId: movie.id
              }
            });
            console.log(`   🎯 Indicação de pessoa registrada: ${nomination.nominee}${nomination.character ? ` como ${nomination.character}` : ''}`);
          } catch (personError: any) {
            console.error(`   ❌ Erro ao registrar pessoa:`, personError.message);
          }
        }
      }

    } catch (error: any) {
      console.error(`   ❌ Erro ao processar:`, error.message);
    }
  }

  console.log('\n✅ PROCESSAMENTO CONCLUÍDO!');
}



// Função principal
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('❌ Uso: npx ts-node src/scripts/processOscarData.ts <arquivo.txt>');
    console.log('   ou: npx ts-node src/scripts/processOscarData.ts --text "texto copiado"');
    return;
  }

  let text: string;

  if (args[0] === '--text') {
    // Texto fornecido diretamente
    text = args.slice(1).join('\n');
  } else {
    // Arquivo
    const filePath = args[0];
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Arquivo não encontrado: ${filePath}`);
      return;
    }
    text = fs.readFileSync(filePath, 'utf-8');
  }

  await processOscarData(text);
}

// Executar
main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

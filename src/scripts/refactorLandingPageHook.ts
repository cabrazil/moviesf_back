// Carregar variáveis de ambiente
import './scripts-helper';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ScriptArgs {
  title?: string;
  year?: number;
  execute: boolean;
}

function parseArgs(): ScriptArgs {
  const args = process.argv.slice(2);
  const parsed: any = { execute: false };

  for (const arg of args) {
    if (arg === '--execute') parsed.execute = true;
    else if (arg.startsWith('--title=')) parsed.title = arg.split('=')[1].replace(/^"|"$/g, '');
    else if (arg.startsWith('--year=')) parsed.year = parseInt(arg.split('=')[1].replace(/^"|"$/g, ''));
  }
  return parsed as ScriptArgs;
}

function cleanHook(hook: string): string | null {
  if (!hook) return null;

  // Mapa de Substituições Inteligentes
  // Ordem importa! Padrões mais longos/específicos primeiro.
  // O objetivo é transformar "Prepare-se para mergulhar na escuridão" em "A escuridão..."
  // E "Prepare-se para desvendar o mistério" em "O mistério..."

  const replacements = [
    // Verbo + Preposição/Artigo -> Artigo Preservado
    { regex: /^Prepare-se para (mergulhar na|embarcar na|entrar na|viajar na) /i, replace: "A " },
    { regex: /^Prepare-se para (mergulhar no|embarcar no|entrar no|viajar no) /i, replace: "O " },
    { regex: /^Prepare-se para (mergulhar em|embarcar em) /i, replace: "Em " }, // "Mergulhar em um mundo" -> "Em um mundo"

    { regex: /^Prepare-se para (testemunhar a|descobrir a|viver a|conhecer a) /i, replace: "A " },
    { regex: /^Prepare-se para (testemunhar o|descobrir o|viver o|conhecer o|desvendar o) /i, replace: "O " },

    // Exceção Específica: Preservar "jornada"
    { regex: /^Prepare-se para uma jornada /i, replace: "Uma jornada " },

    // Exceção para "Embarcar" -> "A bordo" (Melhora fluxo com 'e explorar')
    { regex: /^Prepare-se para (embarcar na) /i, replace: "A bordo da " },
    { regex: /^Prepare-se para (embarcar no) /i, replace: "A bordo do " },
    { regex: /^Prepare-se para (embarcar em) /i, replace: "A bordo de " },

    { regex: /^Prepare-se para (viver um|testemunhar um|descobrir um) /i, replace: "Um " },
    { regex: /^Prepare-se para (viver uma|testemunhar uma|descobrir uma|uma jornada) /i, replace: "Uma " },

    // Remoção Pura (Verbos transitivos diretos ou genéricos onde o resto da frase funciona sozinho)
    // Ex: "Prepare-se para testemunhar a queda" -> "A queda" (coberto acima).
    // Ex: "Prepare-se para testemunhar, com seus próprios olhos..." -> "Com seus próprios olhos..."? 
    // Ou "Prepare-se para mergulhar..." (Verbo sozinho)
    { regex: /^Prepare-se para (mergulhar|testemunhar|desvendar|viver|descobrir|conhecer|embarcar) /i, replace: "" },

    // Fallback: Remove o prefixo padrão
    { regex: /^Prepare-se para /i, replace: "" }
  ];

  for (const rule of replacements) {
    if (rule.regex.test(hook)) {
      let newHook = hook.replace(rule.regex, rule.replace);

      // Limpeza extra e Capitalização
      newHook = newHook.trim();
      if (newHook.length > 0) {
        return newHook.charAt(0).toUpperCase() + newHook.slice(1);
      }
    }
  }

  return null;
}

async function main() {
  const args = parseArgs();
  console.log('🔍 Iniciando refatoração de LandingPageHook...');
  console.log(`📋 Modo: ${args.execute ? 'EXECUÇÃO (Salvar)' : 'DRY-RUN (Apenas visualizar)'}`);

  const whereClause: any = {};
  if (args.title) {
    whereClause.title = { contains: args.title, mode: 'insensitive' };
  }
  if (args.year) {
    whereClause.year = args.year;
  }

  // Buscar apenas filmes que tenham landingPageHook começando com "Prepare-se"
  whereClause.landingPageHook = { startsWith: 'Prepare-se', mode: 'insensitive' };

  const movies = await prisma.movie.findMany({
    where: whereClause,
    select: { id: true, title: true, year: true, landingPageHook: true }
  });

  console.log(`📊 Encontrados ${movies.length} filmes candidatos.`);

  const updates: any[] = [];

  for (const movie of movies) {
    if (!movie.landingPageHook) continue;

    const newHook = cleanHook(movie.landingPageHook);

    if (newHook && newHook !== movie.landingPageHook) {
      console.log(`\n🎬 Filme: ${movie.title} (${movie.year})`);
      console.log(`🔴 Antes: "${movie.landingPageHook}"`);
      console.log(`🟢 Depois: "${newHook}"`);

      updates.push({
        id: movie.id,
        data: { landingPageHook: newHook }
      });
    }
  }

  console.log(`\n📝 Total de alterações propostas: ${updates.length}`);

  if (args.execute && updates.length > 0) {
    console.log('\n💾 Salvando alterações no banco...');
    let successCount = 0;

    for (const update of updates) {
      try {
        await prisma.movie.update({
          where: { id: update.id },
          data: update.data
        });
        successCount++;
      } catch (e) {
        console.error(`❌ Erro ao atualizar ${update.id}:`, e);
      }
    }
    console.log(`✅ ${successCount} filmes atualizados com sucesso.`);
  } else if (!args.execute && updates.length > 0) {
    console.log('\n⚠️ Para aplicar, execute com --execute');
  }

  await prisma.$disconnect();
}

main().catch(console.error);

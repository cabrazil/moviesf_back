import { PrismaClient } from '@prisma/client';
import { searchMovie } from './populateMovies';

const prisma = new PrismaClient();

// Copiar as interfaces e funções do discoverAndCurate.ts
interface ThemeConfig {
  required: Array<{
    name: string;
    minWeight: number;
  }>;
  common: string[];
}

interface ThemeDictionary {
  [key: string]: ThemeConfig;
}

const SUB_SENTIMENTS_BY_THEME: ThemeDictionary = {
  drama: {
    required: [
      { name: "Emotivo(a) (Triste)", minWeight: 0.7 },
      { name: "Drama Familiar", minWeight: 0.6 }
    ],
    common: ["Superação e Crescimento", "Reflexão Filosófica"]
  },
  superacao: {
    required: [
      { name: "Superação e Crescimento", minWeight: 0.8 },
      { name: "Inspiração / Motivação para Agir", minWeight: 0.7 }
    ],
    common: ["Emotivo(a) (Triste)", "Drama Familiar"]
  },
  luto: {
    required: [
      { name: "Emotivo(a) (Triste)", minWeight: 0.8 },
      { name: "Vazio(a)", minWeight: 0.7 }
    ],
    common: ["Superação e Crescimento", "Reflexão Filosófica"]
  },
  familia: {
    required: [
      { name: "Drama Familiar", minWeight: 0.8 },
      { name: "Conforto / Aconchego Emocional", minWeight: 0.6 }
    ],
    common: ["Emotivo(a) (Triste)", "Superação e Crescimento"]
  },
  historico: {
    required: [
      { name: "Reflexão Filosófica", minWeight: 0.8 },
      { name: "Consequências e Justiça", minWeight: 0.7 }
    ],
    common: ["Emotivo(a) (Triste)", "Drama Familiar", "Superação e Crescimento"]
  },
  comedia: {
    required: [
      { name: "Humor / Comédia", minWeight: 0.6 },
      { name: "Conforto / Aconchego Emocional", minWeight: 0.6 }
    ],
    common: ["Inspiração / Motivação para Agir", "Drama Familiar"]
  },
  acao: {
    required: [
      { name: "Empolgado(a) / Energético(a)", minWeight: 0.7 },
      { name: "Ação / Aventura", minWeight: 0.6 }
    ],
    common: ["Superação e Crescimento", "Inspiração / Motivação para Agir"]
  },
  romance: {
    required: [
      { name: "Romântico(a)", minWeight: 0.7 },
      { name: "Emotivo(a) (Feliz)", minWeight: 0.6 }
    ],
    common: ["Drama Familiar", "Conforto / Aconchego Emocional"]
  },
  thriller: {
    required: [
      { name: "Tenso(a) / Ansioso(a)", minWeight: 0.7 },
      { name: "Suspense / Mistério", minWeight: 0.6 }
    ],
    common: ["Reflexão Filosófica", "Consequências e Justiça"]
  },
  animacao: {
    required: [
      { name: "Conforto / Aconchego Emocional", minWeight: 0.6 },
      { name: "Drama Familiar", minWeight: 0.6 }
    ],
    common: ["Superação e Crescimento", "Inspiração / Motivação para Agir"]
  }
};

function identifyThemes(movie: any, keywords: string[]): string[] {
  const themes: string[] = [];
  const synopsis = movie.overview.toLowerCase();
  const genres = movie.genres.map((g: any) => g.name.toLowerCase());
  const keywordsLower = keywords.map(k => k.toLowerCase());

  console.log(`\n🔍 Analisando temas:`);
  console.log(`Sinopse: ${synopsis.substring(0, 100)}...`);
  console.log(`Gêneros: ${genres.join(', ')}`);
  console.log(`Keywords: ${keywordsLower.slice(0, 10).join(', ')}...`);

  // Identificar temas baseado em palavras-chave e gêneros
  if (synopsis.includes('superação') || synopsis.includes('superar') || 
      synopsis.includes('crescimento') || synopsis.includes('desenvolvimento') ||
      synopsis.includes('evolução') || synopsis.includes('transformação') ||
      keywordsLower.includes('superação') || keywordsLower.includes('inspiração') ||
      keywordsLower.includes('crescimento') || keywordsLower.includes('desenvolvimento')) {
    themes.push('superacao');
    console.log(`✅ Tema identificado: superacao`);
  }

  if (synopsis.includes('família') || synopsis.includes('pai') || synopsis.includes('mãe') || 
      synopsis.includes('filho') || synopsis.includes('filha') ||
      synopsis.includes('amizade') || synopsis.includes('amigo') ||
      synopsis.includes('relacionamento') || synopsis.includes('vínculo') ||
      keywordsLower.includes('família') || keywordsLower.includes('pai solteiro') ||
      keywordsLower.includes('amizade') || keywordsLower.includes('amigo')) {
    themes.push('familia');
    console.log(`✅ Tema identificado: familia`);
  }

  if (synopsis.includes('morte') || synopsis.includes('perda') || synopsis.includes('luto') ||
      keywordsLower.includes('morte') || keywordsLower.includes('luto')) {
    themes.push('luto');
    console.log(`✅ Tema identificado: luto`);
  }

  if (genres.includes('drama')) {
    themes.push('drama');
    console.log(`✅ Tema identificado: drama (gênero)`);
  }

  if (genres.includes('comédia') || genres.includes('comedia')) {
    themes.push('comedia');
    console.log(`✅ Tema identificado: comedia (gênero)`);
  }

  if (genres.includes('ação') || genres.includes('acao') || genres.includes('aventura')) {
    themes.push('acao');
    console.log(`✅ Tema identificado: acao (gênero)`);
  }

  if (genres.includes('romance')) {
    themes.push('romance');
    console.log(`✅ Tema identificado: romance (gênero)`);
  }

  if (genres.includes('thriller') || genres.includes('suspense')) {
    themes.push('thriller');
    console.log(`✅ Tema identificado: thriller (gênero)`);
  }

  if (genres.includes('animação') || genres.includes('animacao')) {
    themes.push('animacao');
    console.log(`✅ Tema identificado: animacao (gênero)`);
  }

  // Identificar tema histórico
  if (synopsis.includes('guerra') || synopsis.includes('histórico') || 
      keywordsLower.includes('guerra') || keywordsLower.includes('histórico') ||
      keywordsLower.includes('segunda guerra mundial') || keywordsLower.includes('nazista')) {
    themes.push('historico');
    console.log(`✅ Tema identificado: historico`);
  }

  // Detecção adicional baseada em keywords específicas
  if (keywordsLower.includes('brinquedo') || keywordsLower.includes('toy') ||
      keywordsLower.includes('boneco') || keywordsLower.includes('jogo')) {
    if (!themes.includes('familia')) {
      themes.push('familia');
      console.log(`✅ Tema identificado: familia (via keywords de brinquedos)`);
    }
  }

  if (keywordsLower.includes('amizade') || keywordsLower.includes('amigo') ||
      keywordsLower.includes('companheirismo') || keywordsLower.includes('lealdade')) {
    if (!themes.includes('familia')) {
      themes.push('familia');
      console.log(`✅ Tema identificado: familia (via keywords de amizade)`);
    }
  }

  if (keywordsLower.includes('aventura') || keywordsLower.includes('descoberta') ||
      keywordsLower.includes('exploração') || keywordsLower.includes('jornada')) {
    if (!themes.includes('superacao')) {
      themes.push('superacao');
      console.log(`✅ Tema identificado: superacao (via keywords de aventura)`);
    }
  }

  const uniqueThemes = [...new Set(themes)]; // Remove duplicatas
  console.log(`\n🎯 Temas finais identificados: ${uniqueThemes.join(', ')}`);
  
  return uniqueThemes;
}

async function debugThematicAnalysis(movieId: string) {
  console.log(`\n🔍 === DEBUG: ANÁLISE TEMÁTICA ===`);
  console.log(`Filme ID: ${movieId}`);

  try {
    // 1. Buscar filme no banco
    const movie = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    if (!movie) {
      console.log('❌ Filme não encontrado no banco');
      return;
    }

    console.log(`\n📽️ Filme: ${movie.title} (${movie.year})`);
    console.log(`Gêneros: ${movie.genres.join(', ')}`);

    // 2. Buscar no TMDB
    const tmdbMovie = await searchMovie(movie.title, movie.year || undefined);
    if (!tmdbMovie) {
      console.log('❌ Filme não encontrado no TMDB');
      return;
    }

    console.log(`\n🎬 TMDB: ${tmdbMovie.movie.title}`);
    console.log(`Gêneros TMDB: ${tmdbMovie.movie.genres.map((g: any) => g.name).join(', ')}`);
    console.log(`Sinopse: ${tmdbMovie.movie.overview}`);

    // 3. Preparar keywords
    const keywords = [
      ...(tmdbMovie.movie as any).keywords?.map((k: any) => k.name) || [],
      ...(tmdbMovie.movie as any).genres?.map((g: any) => g.name) || [],
      ...movie.keywords || []
    ];

    console.log(`\n🔑 Keywords: ${keywords.join(', ')}`);

    // 4. Identificar temas
    const themes = identifyThemes(tmdbMovie.movie, keywords);

    // 5. Buscar SubSentiments disponíveis
    const availableSubSentiments = await prisma.subSentiment.findMany();
    console.log(`\n📊 SubSentiments disponíveis no banco: ${availableSubSentiments.length}`);

    // 6. Aplicar mapeamento temático
    const requiredSubSentiments = themes.flatMap(theme => 
      SUB_SENTIMENTS_BY_THEME[theme]?.required || []
    );
    const commonSubSentiments = themes.flatMap(theme => 
      SUB_SENTIMENTS_BY_THEME[theme]?.common || []
    );

    console.log('\n📋 SubSentiments obrigatórios para os temas:');
    requiredSubSentiments.forEach(ss => {
      console.log(`- ${ss.name} (peso mínimo: ${ss.minWeight})`);
    });

    console.log('\n📋 SubSentiments comuns para os temas:');
    commonSubSentiments.forEach(ss => {
      console.log(`- ${ss}`);
    });

    // 7. Verificar se os SubSentiments obrigatórios existem no banco
    console.log('\n🔍 Verificando SubSentiments obrigatórios no banco:');
    for (const required of requiredSubSentiments) {
      const found = availableSubSentiments.find(ss => ss.name === required.name);
      if (found) {
        console.log(`✅ ${required.name} - ENCONTRADO (ID: ${found.id})`);
      } else {
        console.log(`❌ ${required.name} - NÃO ENCONTRADO`);
      }
    }

    // 8. Verificar se os SubSentiments comuns existem no banco
    console.log('\n🔍 Verificando SubSentiments comuns no banco:');
    for (const common of commonSubSentiments) {
      const found = availableSubSentiments.find(ss => ss.name === common);
      if (found) {
        console.log(`✅ ${common} - ENCONTRADO (ID: ${found.id})`);
      } else {
        console.log(`❌ ${common} - NÃO ENCONTRADO`);
      }
    }

    // 9. Simular a lógica de fallback
    if (requiredSubSentiments.length === 0) {
      console.log('\n⚠️ Nenhum SubSentiment obrigatório encontrado - FALLBACK ATIVADO');
    } else {
      console.log('\n✅ SubSentiments obrigatórios encontrados - ANÁLISE TEMÁTICA DEVE FUNCIONAR');
    }

  } catch (error) {
    console.error('Erro no debug:', error);
  }
}

async function main() {
  const movieId = process.argv[2];
  
  if (!movieId) {
    console.log('❌ ID do filme não fornecido');
    console.log('Uso: npx ts-node debugThematicAnalysis.ts <movieId>');
    return;
  }

  await debugThematicAnalysis(movieId);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 
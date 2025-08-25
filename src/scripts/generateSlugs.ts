import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Função para gerar slug a partir do título
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-+|-+$/g, '') // Remove hífens no início e fim
    .trim();
}

// Função para gerar slug único
async function generateUniqueSlug(title: string): Promise<string> {
  let slug = generateSlug(title);
  let counter = 1;
  
  while (await prisma.movie.findUnique({ where: { slug } })) {
    slug = `${generateSlug(title)}-${counter}`;
    counter++;
  }
  
  return slug;
}

// Função principal para gerar slugs para todos os filmes
async function generateSlugsForAllMovies() {
  try {
    console.log('🚀 Iniciando geração de slugs...');
    
    // Buscar filmes sem slug
    const movies = await prisma.movie.findMany({
      where: { slug: null },
      select: { id: true, title: true }
    });

    console.log(`📊 Encontrados ${movies.length} filmes sem slug`);

    if (movies.length === 0) {
      console.log('✅ Todos os filmes já possuem slug!');
      return;
    }

    // Gerar slugs para cada filme
    for (const movie of movies) {
      const slug = await generateUniqueSlug(movie.title);
      
      await prisma.movie.update({
        where: { id: movie.id },
        data: { slug }
      });
      
      console.log(`✅ ${movie.title} → ${slug}`);
    }

    console.log('🎉 Slugs gerados com sucesso para todos os filmes!');
    
    // Verificar resultado
    const totalMovies = await prisma.movie.count();
    const moviesWithSlug = await prisma.movie.count({
      where: { slug: { not: null } }
    });
    
    console.log(`📈 Estatísticas finais:`);
    console.log(`   - Total de filmes: ${totalMovies}`);
    console.log(`   - Filmes com slug: ${moviesWithSlug}`);
    console.log(`   - Filmes sem slug: ${totalMovies - moviesWithSlug}`);

  } catch (error) {
    console.error('❌ Erro ao gerar slugs:', error);
    throw error;
  }
}

// Executar o script
generateSlugsForAllMovies()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexão com banco fechada');
  });

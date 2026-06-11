import { prismaBlog } from '../prisma';

async function main() {
  const query = `
    SELECT title, content, description, slug
    FROM "Article"
    WHERE slug = 'gran-torino-ultima-batalha-homem' AND "blogId" = 3
    LIMIT 1
  `;

  try {
    const articles = await prismaBlog.$queryRawUnsafe(query) as any[];
    if (articles.length > 0) {
      const art = articles[0];
      console.log(`=== ARTIGO ENCONTRADO ===`);
      console.log(`Título: ${art.title}`);
      console.log(`Slug: ${art.slug}`);
      console.log(`Descrição: ${art.description}`);
      console.log(`\n--- CONTEÚDO ---`);
      console.log(art.content);
    } else {
      console.log("Artigo de Gran Torino não encontrado.");
    }
  } catch (err) {
    console.error("Erro ao buscar artigo:", err);
  }
}

main()
  .catch(console.error)
  .finally(() => prismaBlog.$disconnect());

// Carregar variáveis de ambiente antes de qualquer uso do Prisma
import './scripts-helper';

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Script para automatizar a adição de novas imagens do blog
 * 
 * Uso: npx ts-node src/scripts/add-blog-image.ts <nome-do-arquivo> [ano] [mes]
 * 
 * Exemplo: npx ts-node src/scripts/add-blog-image.ts nova-imagem.jpg 2025 outubro
 */

// Argumentos da linha de comando
const args = process.argv.slice(2);
const fileName = args[0];
const year = args[1] || '2025';
const month = args[2] || 'outubro';

if (!fileName) {
  console.error('❌ Erro: Nome do arquivo é obrigatório');
  console.log('📝 Uso: npx ts-node src/scripts/add-blog-image.ts <nome-do-arquivo> [ano] [mes]');
  console.log('📝 Exemplo: npx ts-node src/scripts/add-blog-image.ts nova-imagem.jpg 2025 outubro');
  process.exit(1);
}

// Caminhos
const projectRoot = path.join(__dirname, '..', '..', '..');
const frontendPath = path.join(projectRoot, 'moviesf_front');
const imagePath = `blog/articles/${year}/${month}/${fileName}`;
const fullImagePath = path.join(frontendPath, 'src', 'assets', imagePath);
const blogImagesPath = path.join(frontendPath, 'src', 'lib', 'blog-images.ts');

console.log('🎬 ADICIONANDO NOVA IMAGEM DO BLOG');
console.log('=====================================');
console.log(`📁 Arquivo: ${fileName}`);
console.log(`📅 Ano: ${year}`);
console.log(`📅 Mês: ${month}`);
console.log(`🖼️  Caminho: ${imagePath}`);
console.log('');

async function addBlogImage() {
  try {
    // Verificar se o arquivo de imagem existe
    if (!fs.existsSync(fullImagePath)) {
      console.error(`❌ Erro: Arquivo não encontrado em ${fullImagePath}`);
      console.log('📝 Certifique-se de que o arquivo está em:');
      console.log(`   moviesf_front/src/assets/${imagePath}`);
      return;
    }

    console.log('✅ Arquivo de imagem encontrado');

    // Ler o arquivo blog-images.ts atual
    let blogImagesContent = fs.readFileSync(blogImagesPath, 'utf8');

    // Gerar nome da variável para o import
    const importName = fileName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

    // Gerar import
    const newImport = `import ${importName} from '/src/assets/${imagePath}';`;

    // Verificar se o import já existe
    if (blogImagesContent.includes(newImport)) {
      console.log('⚠️  Import já existe no arquivo');
    } else {
      // Adicionar import após os imports existentes
      const importRegex = /(import .+ from '\/src\/assets\/blog\/articles\/2025\/outubro\/.+';)/g;
      const lastImport = blogImagesContent.match(importRegex);
      
      if (lastImport) {
        const lastImportLine = lastImport[lastImport.length - 1];
        blogImagesContent = blogImagesContent.replace(
          lastImportLine,
          `${lastImportLine}\n${newImport}`
        );
        console.log('✅ Import adicionado');
      } else {
        console.error('❌ Erro: Não foi possível encontrar onde adicionar o import');
        return;
      }
    }

    // Gerar entrada para o mapeamento
    const mappingEntry = `  '${imagePath}': ${importName},`;

    // Verificar se a entrada já existe
    if (blogImagesContent.includes(mappingEntry)) {
      console.log('⚠️  Mapeamento já existe no arquivo');
    } else {
      // Adicionar entrada no mapeamento
      const mappingRegex = /(export const blogImages = \{[\s\S]*?\} as const;)/;
      const mappingMatch = blogImagesContent.match(mappingRegex);
      
      if (mappingMatch) {
        const currentMapping = mappingMatch[1];
        const newMapping = currentMapping.replace(
          /(\s+)(\} as const;)/,
          `$1  ${mappingEntry}\n$1$2`
        );
        blogImagesContent = blogImagesContent.replace(currentMapping, newMapping);
        console.log('✅ Mapeamento adicionado');
      } else {
        console.error('❌ Erro: Não foi possível encontrar o mapeamento');
        return;
      }
    }

    // Salvar arquivo atualizado
    fs.writeFileSync(blogImagesPath, blogImagesContent);
    console.log('✅ Arquivo blog-images.ts atualizado');

    console.log('');
    console.log('🎉 IMAGEM ADICIONADA COM SUCESSO!');
    console.log('=====================================');
    console.log('📝 Próximos passos:');
    console.log('   1. cd ../moviesf_front');
    console.log('   2. git add .');
    console.log('   3. git commit -m "Add: nova imagem do blog"');
    console.log('   4. git push');
    console.log('   5. Aguardar deploy na Vercel');
    console.log('');
    console.log('🔗 URL no banco de dados:');
    console.log(`   ${imagePath}`);

  } catch (error) {
    console.error('❌ Erro ao processar imagem:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
addBlogImage();

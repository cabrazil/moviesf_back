const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function populateBlogData() {
  try {
    console.log('🚀 Iniciando população dos dados do VibesFilm Blog...');

    // 1. Criar Blog VibesFilm
    console.log('📝 Criando Blog VibesFilm...');
    const blog = await prisma.blog.upsert({
      where: { id: 3 },
      update: {
        name: 'VibesFilm Blog',
        slug: 'vibesfilm',
        themeSettings: {
          "seo": {
            "socialImage": "/images/vibesfilm-social-share.png",
            "defaultKeywords": ["Cinema", "Filmes", "Emoções", "Sentimentos", "Curadoria", "Recomendações"],
            "defaultMetaDescription": "O filme perfeito para sua vibe! Descubra filmes baseados em emoções e sentimentos."
          },
          "fonts": {
            "bodyFont": "Inter, sans-serif",
            "headingFont": "Inter, sans-serif"
          },
          "colors": {
            "accent": "#FF9F1C",
            "primary": "#2EC4B6",
            "secondary": "#FF9F1C",
            "background": "#011627",
            "textPrimary": "#FDFFFC",
            "textSecondary": "#E0E0E0"
          },
          "footer": {
            "description": "Descobrindo filmes através das emoções. O filme perfeito para cada momento da sua vida.",
            "copyrightText": "© 2025 VibesFilm. Feito com ❤️ para cinéfilos."
          },
          "layout": {
            "headerStyle": "gradient",
            "footerColumns": 4,
            "sidebarEnabled": false,
            "sidebarPosition": "right",
            "articleCardStyle": "modern"
          },
          "branding": {
            "favicon": "/vibesfilm-favicon.svg",
            "logoDark": "/vibesfilm-logo-dark.png",
            "logoLight": "/vibesfilm-logo.png",
            "siteTitle": "VibesFilm Blog"
          },
          "customCode": {
            "js": "",
            "css": ""
          },
          "socialLinks": {
            "instagram": "https://instagram.com/vibesfilm",
            "twitter": "https://twitter.com/vibesfilm",
            "youtube": "https://youtube.com/@vibesfilm"
          }
        }
      },
      create: {
        id: 3,
        name: 'VibesFilm Blog',
        slug: 'vibesfilm',
        themeSettings: {
          "seo": {
            "socialImage": "/images/vibesfilm-social-share.png",
            "defaultKeywords": ["Cinema", "Filmes", "Emoções", "Sentimentos", "Curadoria", "Recomendações"],
            "defaultMetaDescription": "O filme perfeito para sua vibe! Descubra filmes baseados em emoções e sentimentos."
          },
          "fonts": {
            "bodyFont": "Inter, sans-serif",
            "headingFont": "Inter, sans-serif"
          },
          "colors": {
            "accent": "#FF9F1C",
            "primary": "#2EC4B6",
            "secondary": "#FF9F1C",
            "background": "#011627",
            "textPrimary": "#FDFFFC",
            "textSecondary": "#E0E0E0"
          },
          "footer": {
            "description": "Descobrindo filmes através das emoções. O filme perfeito para cada momento da sua vida.",
            "copyrightText": "© 2025 VibesFilm. Feito com ❤️ para cinéfilos."
          },
          "layout": {
            "headerStyle": "gradient",
            "footerColumns": 4,
            "sidebarEnabled": false,
            "sidebarPosition": "right",
            "articleCardStyle": "modern"
          },
          "branding": {
            "favicon": "/vibesfilm-favicon.svg",
            "logoDark": "/vibesfilm-logo-dark.png",
            "logoLight": "/vibesfilm-logo.png",
            "siteTitle": "VibesFilm Blog"
          },
          "customCode": {
            "js": "",
            "css": ""
          },
          "socialLinks": {
            "instagram": "https://instagram.com/vibesfilm",
            "twitter": "https://twitter.com/vibesfilm",
            "youtube": "https://youtube.com/@vibesfilm"
          }
        }
      }
    });
    console.log('✅ Blog criado:', blog.name);

    // 2. Criar Categorias
    console.log('📂 Criando categorias...');
    const categories = await Promise.all([
      prisma.category.upsert({
        where: { slug_blogId: { slug: 'analises-emocionais', blogId: 3 } },
        update: { title: 'Análises Emocionais', description: 'Análises profundas sobre como os filmes despertam emoções' },
        create: { title: 'Análises Emocionais', slug: 'analises-emocionais', description: 'Análises profundas sobre como os filmes despertam emoções', blogId: 3 }
      }),
      prisma.category.upsert({
        where: { slug_blogId: { slug: 'curadoria-sentimentos', blogId: 3 } },
        update: { title: 'Curadoria por Sentimentos', description: 'Listas e recomendações baseadas em estados emocionais' },
        create: { title: 'Curadoria por Sentimentos', slug: 'curadoria-sentimentos', description: 'Listas e recomendações baseadas em estados emocionais', blogId: 3 }
      }),
      prisma.category.upsert({
        where: { slug_blogId: { slug: 'psicologia-cinema', blogId: 3 } },
        update: { title: 'Psicologia do Cinema', description: 'Como o cinema influencia nosso bem-estar emocional' },
        create: { title: 'Psicologia do Cinema', slug: 'psicologia-cinema', description: 'Como o cinema influencia nosso bem-estar emocional', blogId: 3 }
      }),
      prisma.category.upsert({
        where: { slug_blogId: { slug: 'tendencias', blogId: 3 } },
        update: { title: 'Tendências', description: 'Últimas tendências em filmes e streaming' },
        create: { title: 'Tendências', slug: 'tendencias', description: 'Últimas tendências em filmes e streaming', blogId: 3 }
      })
    ]);
    console.log('✅ Categorias criadas:', categories.length);

    // 3. Criar Autores
    console.log('👥 Criando autores...');
    const authors = await Promise.all([
      prisma.author.upsert({
        where: { email: 'marina@vibesfilm.com' },
        update: { name: 'Dr. Marina Silva', role: 'Psicóloga Clínica', bio: 'Psicóloga especializada em cinema terapêutico e saúde mental' },
        create: { name: 'Dr. Marina Silva', role: 'Psicóloga Clínica', imageUrl: '/default-avatar.svg', bio: 'Psicóloga especializada em cinema terapêutico e saúde mental', blogId: 3, email: 'marina@vibesfilm.com' }
      }),
      prisma.author.upsert({
        where: { email: 'lucas@vibesfilm.com' },
        update: { name: 'Lucas Mendes', role: 'Curador de Cinema', bio: 'Curador de filmes e especialista em comfort movies e filmes reconfortantes' },
        create: { name: 'Lucas Mendes', role: 'Curador de Cinema', imageUrl: '/default-avatar.svg', bio: 'Curador de filmes e especialista em comfort movies e filmes reconfortantes', blogId: 3, email: 'lucas@vibesfilm.com' }
      }),
      prisma.author.upsert({
        where: { email: 'ana@vibesfilm.com' },
        update: { name: 'Dra. Ana Carolina', role: 'Neurocientista', bio: 'Neurocientista especializada em emoções e mídia audiovisual' },
        create: { name: 'Dra. Ana Carolina', role: 'Neurocientista', imageUrl: '/default-avatar.svg', bio: 'Neurocientista especializada em emoções e mídia audiovisual', blogId: 3, email: 'ana@vibesfilm.com' }
      })
    ]);
    console.log('✅ Autores criados:', authors.length);

    // 4. Criar Tags
    console.log('🏷️ Criando tags...');
    const tagsData = [
      { name: 'ansiedade', slug: 'ansiedade', color: '#2EC4B6' },
      { name: 'bem-estar', slug: 'bem-estar', color: '#2EC4B6' },
      { name: 'cinema-terapeutico', slug: 'cinema-terapeutico', color: '#2EC4B6' },
      { name: 'saude-mental', slug: 'saude-mental', color: '#E71D36' },
      { name: 'comfort-movies', slug: 'comfort-movies', color: '#FF9F1C' },
      { name: 'curadoria', slug: 'curadoria', color: '#FF9F1C' },
      { name: 'psicologia', slug: 'psicologia', color: '#E71D36' },
      { name: 'emocoes', slug: 'emocoes', color: '#E71D36' },
      { name: 'catarse', slug: 'catarse', color: '#E71D36' },
      { name: 'neurociencia', slug: 'neurociencia', color: '#E71D36' }
    ];

    for (const tagData of tagsData) {
      await prisma.tag.upsert({
        where: { slug_blogId: { slug: tagData.slug, blogId: 3 } },
        update: { name: tagData.name, color: tagData.color },
        create: { ...tagData, blogId: 3 }
      });
    }
    console.log('✅ Tags criadas:', tagsData.length);

    console.log('🎉 População dos dados concluída com sucesso!');
    console.log('📊 Resumo:');
    console.log(`   - Blog ID: 3 (VibesFilm Blog)`);
    console.log(`   - Categorias: ${categories.length}`);
    console.log(`   - Autores: ${authors.length}`);
    console.log(`   - Tags: ${tagsData.length}`);

  } catch (error) {
    console.error('❌ Erro ao popular dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateBlogData();

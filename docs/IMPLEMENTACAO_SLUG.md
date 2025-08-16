# 🎬 Implementação de Slug para Tabela Movie

## 📋 **Plano de Implementação**

### **1. Migração do Banco de Dados**

```sql
-- Adicionar campo slug
ALTER TABLE "Movie" ADD COLUMN slug VARCHAR(255);

-- Criar índice único para performance
CREATE UNIQUE INDEX idx_movie_slug ON "Movie"(slug);

-- Gerar slugs para filmes existentes
UPDATE "Movie" 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;
```

### **2. Atualizar Schema Prisma**

```prisma
model Movie {
  id                   String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title                String                @unique @db.VarChar(255)
  slug                  String?               @unique @db.VarChar(255)  // NOVO CAMPO
  year                 Int?
  // ... outros campos
}
```

### **3. Função para Gerar Slug**

```typescript
// utils/slugGenerator.ts
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim();
}

export async function generateUniqueSlug(title: string, prisma: PrismaClient): Promise<string> {
  let slug = generateSlug(title);
  let counter = 1;
  
  while (await prisma.movie.findUnique({ where: { slug } })) {
    slug = `${generateSlug(title)}-${counter}`;
    counter++;
  }
  
  return slug;
}
```

### **4. Atualizar Rotas do Backend**

```typescript
// routes/public.ts
router.get('/filme/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const movie = await prisma.movie.findUnique({
      where: { slug },
      include: {
        platforms: {
          include: { streamingPlatform: true }
        },
        movieSentiments: {
          include: {
            mainSentiment: true,
            subSentiment: true
          }
        }
      }
    });

    if (!movie) {
      return res.status(404).json({ error: 'Filme não encontrado' });
    }

    res.json({ movie });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

### **5. Script de Migração**

```typescript
// scripts/generateSlugs.ts
import { PrismaClient } from '@prisma/client';
import { generateUniqueSlug } from '../utils/slugGenerator';

const prisma = new PrismaClient();

async function generateSlugsForAllMovies() {
  const movies = await prisma.movie.findMany({
    where: { slug: null }
  });

  console.log(`Gerando slugs para ${movies.length} filmes...`);

  for (const movie of movies) {
    const slug = await generateUniqueSlug(movie.title, prisma);
    
    await prisma.movie.update({
      where: { id: movie.id },
      data: { slug }
    });
    
    console.log(`${movie.title} → ${slug}`);
  }

  console.log('Slugs gerados com sucesso!');
}

generateSlugsForAllMovies()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## 🚀 **Ordem de Implementação**

1. **Backup do banco** (importante!)
2. **Executar migração SQL**
3. **Atualizar schema Prisma**
4. **Gerar slugs para filmes existentes**
5. **Atualizar rotas do backend**
6. **Testar funcionalidade**
7. **Atualizar frontend para usar slugs reais**

## 📊 **Benefícios Esperados**

- ✅ **URLs amigáveis**: `/filme/a-caso-do-lago`
- ✅ **Melhor SEO**: URLs otimizadas para busca
- ✅ **Performance**: Busca por índice único
- ✅ **Escalabilidade**: Facilita futuras integrações
- ✅ **Consistência**: Padrão usado por grandes plataformas

## ⚠️ **Considerações**

- **Backup obrigatório** antes da migração
- **Teste em ambiente de desenvolvimento** primeiro
- **Slugs únicos** para evitar conflitos
- **Tratamento de caracteres especiais** (acentos, símbolos)

---

**Recomendação**: Implementar o campo `slug` para melhorar SEO e performance.

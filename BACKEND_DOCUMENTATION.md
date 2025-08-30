# 🚀 Documentação: Backend Unificado - VibesFilm App + Blog

## 📋 **Visão Geral**

O backend foi configurado para servir **dois projetos independentes** com **bancos de dados Supabase separados**:

- **🎬 VibesFilm App** (Frontend principal)
- **📝 VibesFilm Blog** (Blog separado)

---

## 🏗️ **Arquitetura**

```
Backend (Porta 3000)
├── 🎬 VibesFilm App
│   ├── Banco: Supabase Principal
│   ├── ORM: Prisma
│   └── Rotas: /movies, /main-sentiments, etc.
│
└── 📝 VibesFilm Blog
    ├── Banco: Supabase Blog (separado)
    ├── Conexão: PostgreSQL direta
    └── Rotas: /blog/*
```

---

## 🗄️ **Configuração dos Bancos de Dados**

### **1. Banco Principal (VibesFilm App)**
```env
# moviesf_back/.env
DATABASE_URL="postgresql://postgres.tcvgmugkgwbaxdhreuxm:Quemmedera01*@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.tcvgmugkgwbaxdhreuxm:Quemmedera01*@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

### **2. Banco do Blog (VibesFilm Blog)**
```env
# moviesf_back/.env
BLOG_DATABASE_URL="postgresql://postgres.dadrodpfylduydjbdxpy:Supa@2605ab@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
BLOG_DIRECT_URL="postgresql://postgres.dadrodpfylduydjbdxpy:Supa@2605ab@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

---

## 📁 **Estrutura de Arquivos**

```
moviesf_back/
├── src/
│   ├── routes/
│   │   ├── index.ts              # Rotas principais
│   │   ├── movies.routes.ts      # API do app principal
│   │   ├── blog.routes.ts        # API do blog (PostgreSQL direto)
│   │   └── main-sentiments.routes.ts
│   ├── prisma.ts                 # Cliente Prisma (banco principal)
│   └── utils/
├── prisma/
│   └── schema.prisma             # Schema do banco principal
├── api/
│   └── index.ts                  # Servidor principal
└── .env                          # Variáveis de ambiente
```

---

## 🔌 **Rotas Implementadas**

### **🎬 VibesFilm App (Prisma)**
```typescript
// Rotas principais
app.use('/', routes);                    // Rotas gerais
app.use('/movies', moviesRoutes);        // Filmes
app.use('/main-sentiments', mainSentimentsRoutes); // Sentimentos
app.use('/api/personalized-journey', personalizedJourneyRoutes);
```

### **📝 VibesFilm Blog (PostgreSQL direto)**
```typescript
// Rotas do blog
app.use('/blog', blogRoutes);

// Endpoints disponíveis:
GET    /blog/articles              # Listar artigos
GET    /blog/articles/:slug        # Artigo específico
POST   /blog/articles/:id/view     # Incrementar visualizações
GET    /blog/categories            # Listar categorias
GET    /blog/articles/search       # Buscar artigos
GET    /blog/tags                  # Listar tags
GET    /blog/authors               # Listar autores
```

---

## 🔌 **Conexões de Banco de Dados**

### **1. Banco Principal (Prisma)**
```typescript
// src/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});
```

### **2. Banco do Blog (PostgreSQL direto)**
```typescript
// src/routes/blog.routes.ts
import { Pool } from 'pg';

const blogDbPool = new Pool({
  connectionString: process.env.BLOG_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
```

---

## 📊 **Estrutura das Tabelas do Blog**

### **Tabelas no Banco do Blog:**
```sql
-- Estrutura das tabelas do blog
Blog (id, name, slug, domain, themeSettings, createdAt, updatedAt)
Category (id, title, slug, description, imageUrl, blogId, createdAt, updatedAt)
Author (id, name, role, imageUrl, bio, email, website, social, skills, blogId, createdAt, updatedAt)
Tag (id, name, slug, color, blogId, createdAt, updatedAt)
Article (id, title, slug, description, content, imageUrl, keywords, published, viewCount, likeCount, date, blogId, authorId, categoryId, createdAt, updatedAt)
```

---

## 🚀 **Como Iniciar o Backend**

```bash
# 1. Instalar dependências
cd moviesf_back
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as URLs dos bancos

# 3. Gerar cliente Prisma (banco principal)
npx prisma generate

# 4. Iniciar servidor
npm run dev
# Servidor roda na porta 3000
```

---

## 🎨 **Configuração dos Frontends**

### **🎬 VibesFilm App**
```env
# moviesf_front/.env
VITE_API_BASE_URL="http://localhost:3000"
```

### **📝 VibesFilm Blog**
```env
# vibesfilm-blog/.env.local
VITE_API_BASE_URL="http://localhost:3000"
VITE_BLOG_ID=3
VITE_BLOG_NAME="VibesFilm Blog"
VITE_BLOG_SLUG="vibesfilm"
```

---

## 🧪 **Testes das APIs**

### **Testar Banco Principal:**
```bash
curl http://localhost:3000/health
curl http://localhost:3000/movies
```

### **Testar Banco do Blog:**
```bash
curl "http://localhost:3000/blog/articles?blogId=3&published=true&limit=5"
curl "http://localhost:3000/blog/categories?blogId=3"
```

---

## 🔒 **Segurança e Boas Práticas**

### **1. Separação de Dados**
- ✅ Bancos de dados completamente separados
- ✅ Conexões independentes
- ✅ Sem risco de vazamento entre projetos

### **2. Performance**
- ✅ Pool de conexões para PostgreSQL
- ✅ Singleton pattern para Prisma
- ✅ Queries otimizadas

### **3. Manutenibilidade**
- ✅ Código modular e organizado
- ✅ Rotas bem estruturadas
- ✅ Logs de erro detalhados

---

## 🚨 **Pontos de Atenção**

### **1. Variáveis de Ambiente**
- Sempre configurar `BLOG_DATABASE_URL` e `BLOG_DIRECT_URL`
- Verificar se as URLs estão corretas
- Testar conectividade antes de deploy

### **2. Migrações**
- Banco principal: usar `npx prisma migrate`
- Banco do blog: executar SQL manualmente
- Sempre fazer backup antes de alterações

### **3. Monitoramento**
- Verificar logs do servidor
- Monitorar performance das queries
- Acompanhar uso de conexões

---

## 📈 **Próximos Passos Sugeridos**

1. **Implementar cache** para queries frequentes
2. **Adicionar rate limiting** nas APIs
3. **Implementar autenticação** para admin do blog
4. **Criar dashboard** para gerenciar artigos
5. **Adicionar analytics** de visualizações

---

## ✅ **Status Atual**

✅ **Backend funcionando** na porta 3000  
✅ **VibesFilm App** conectado via Prisma  
✅ **VibesFilm Blog** conectado via PostgreSQL direto  
✅ **APIs testadas** e funcionando  
✅ **Frontends configurados** e conectados  

**Ambiente pronto para desenvolvimento e produção!** 🚀

---

## 📞 **Suporte**

Para dúvidas ou problemas:
1. Verificar logs do servidor
2. Testar conectividade dos bancos
3. Verificar variáveis de ambiente
4. Consultar esta documentação

---

*Documentação criada em: 26/08/2025*  
*Última atualização: 26/08/2025*

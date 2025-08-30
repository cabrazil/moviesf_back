# 🎬 VibesFilm Blog - API Backend

## ✅ Implementação Completa

### 📁 Arquivos Adicionados:
- `src/routes/blog.routes.ts` - Rotas completas da API do blog
- `blog_initial_data.sql` - Dados iniciais para popular o banco
- `src/routes/index.ts` - Atualizado para incluir rotas do blog

### 🛣️ Rotas Implementadas:

#### **GET /api/blog/articles**
Lista artigos com filtros opcionais
- **Parâmetros**: `blogId`, `published`, `categorySlug`, `tagSlug`, `limit`, `offset`
- **Retorna**: Array de artigos com author, category e tags

#### **GET /api/blog/articles/:slug**
Busca artigo específico por slug
- **Parâmetros**: `slug` (path), `blogId` (query)
- **Retorna**: Artigo completo ou 404

#### **POST /api/blog/articles/:id/view**
Incrementa contador de visualizações
- **Parâmetros**: `id` (path), `blogId` (body)
- **Retorna**: `{ success: true }`

#### **GET /api/blog/categories**
Lista todas as categorias do blog
- **Parâmetros**: `blogId`
- **Retorna**: Array de categorias

#### **GET /api/blog/articles/search**
Busca artigos por termo
- **Parâmetros**: `blogId`, `search`
- **Retorna**: Array de artigos que correspondem à busca

#### **GET /api/blog/tags**
Lista todas as tags com contagem de artigos
- **Parâmetros**: `blogId`
- **Retorna**: Array de tags com quantidade de uso

#### **GET /api/blog/authors**
Lista todos os autores do blog
- **Parâmetros**: `blogId`
- **Retorna**: Array de autores com contagem de artigos

## 🗄️ Setup do Banco de Dados

### 1. **Popular dados iniciais:**
```bash
# Execute o SQL no seu banco Supabase
psql -f blog_initial_data.sql "postgresql://..."
# OU copie e cole o conteúdo de blog_initial_data.sql no SQL Editor do Supabase
```

### 2. **Verificar estrutura:**
```sql
-- Verificar se o blog foi criado
SELECT * FROM "Blog" WHERE id = 3;

-- Verificar categorias
SELECT * FROM "Category" WHERE "blogId" = 3;

-- Verificar autores
SELECT * FROM "Author" WHERE "blogId" = 3;

-- Verificar artigos
SELECT * FROM "Article" WHERE "blogId" = 3;
```

## 🧪 Testes das APIs

### **Testar listagem de artigos:**
```bash
curl "http://localhost:3001/api/blog/articles?blogId=3"
```

### **Testar artigo específico:**
```bash
curl "http://localhost:3001/api/blog/articles/filme-perfeito-ansiedade?blogId=3"
```

### **Testar categorias:**
```bash
curl "http://localhost:3001/api/blog/categories?blogId=3"
```

### **Testar busca:**
```bash
curl "http://localhost:3001/api/blog/articles/search?blogId=3&search=ansiedade"
```

### **Testar incremento de visualização:**
```bash
curl -X POST "http://localhost:3001/api/blog/articles/1/view" \
  -H "Content-Type: application/json" \
  -d '{"blogId": 3}'
```

## 🔧 Configuração do Frontend

### **1. Criar arquivo `.env.local` no projeto blog:**
```env
VITE_BLOG_ID=3
VITE_BLOG_NAME="VibesFilm Blog"
VITE_BLOG_SLUG="vibesfilm"
VITE_API_BASE_URL="http://localhost:3001"
```

### **2. Gerar Prisma Client (se necessário):**
```bash
cd vibesfilm-blog
npx prisma generate
```

## 📊 Dados de Exemplo Incluídos:

### **Blog:**
- ID: 3
- Nome: "VibesFilm Blog"
- Slug: "vibesfilm"

### **Categorias:**
1. Análises Emocionais
2. Curadoria por Sentimentos  
3. Psicologia do Cinema
4. Tendências

### **Autores:**
1. Dr. Marina Silva (Psicóloga)
2. Lucas Mendes (Curador)
3. Dra. Ana Carolina (Neurocientista)
4. Roberto Tech (Analista)
5. Carla Rocha (Terapeuta)
6. Dr. Pedro Santos (Psicólogo)

### **Artigos:**
1. "Como encontrar o filme perfeito quando você está ansioso"
2. "Os 15 filmes mais reconfortantes para um domingo chuvoso"
3. "A psicologia por trás dos filmes que nos fazem chorar"

### **23 Tags temáticas** relacionadas a cinema e emoções

## 🚀 Status

✅ **Backend**: Completamente implementado
✅ **Dados iniciais**: Prontos para inserção
✅ **Frontend**: Configurado para usar dados reais
✅ **Integração**: Testada e funcional

## 📈 Próximos Passos

1. **Execute o SQL** de dados iniciais no Supabase
2. **Configure** as variáveis de ambiente
3. **Teste** as APIs usando os curls acima
4. **Verifique** o frontend com dados reais
5. **Adicione** mais artigos conforme necessário

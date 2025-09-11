# Configuração das Variáveis de Ambiente do Blog

## Passo 1: Criar arquivo .env

Crie um arquivo `.env` na raiz do projeto `moviesf_back` com o seguinte conteúdo:

```bash
# Database (App Web)
DATABASE_URL="postgresql://postgres.dadrodpfylduydjbdxpy:Supa@2605ab@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.dadrodpfylduydjbdxpy:Supa@2605ab@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Supabase Blog (mesmo banco, mas com configurações específicas para o blog)
SUPABASE_BLOG_URL="https://dadrodpfylduydjbdxpy.supabase.co"
SUPABASE_BLOG_ANON_KEY="SUA_CHAVE_ANONIMA_AQUI"
SUPABASE_BLOG_SERVICE_KEY="SUA_CHAVE_SERVICE_AQUI"

# Server
PORT=3000
NODE_ENV=development

# Vercel
VERCEL=0
```

## Passo 2: Obter as Chaves do Supabase

Para obter as chaves corretas:

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione o projeto: `dadrodpfylduydjbdxpy`
3. Vá em **Settings** > **API**
4. Copie:
   - **Project URL** → `SUPABASE_BLOG_URL`
   - **anon public** → `SUPABASE_BLOG_ANON_KEY`
   - **service_role** → `SUPABASE_BLOG_SERVICE_KEY`

## Passo 3: Testar a Configuração

Após configurar o `.env`, teste as APIs:

```bash
# Iniciar o servidor
npm run dev

# Testar health check do blog
curl http://localhost:3000/api/blog/health

# Testar listagem de artigos
curl http://localhost:3000/api/blog/posts
```

## Estrutura das APIs do Blog

### Endpoints Disponíveis:

- `GET /api/blog/health` - Health check
- `GET /api/blog/posts` - Listar artigos (com paginação)
- `GET /api/blog/posts/featured` - Artigos em destaque
- `GET /api/blog/posts/:slug` - Artigo por slug
- `GET /api/blog/categories` - Listar categorias
- `GET /api/blog/categories/:slug/posts` - Artigos por categoria
- `GET /api/blog/tags` - Listar tags
- `GET /api/blog/tags/:slug/posts` - Artigos por tag
- `GET /api/blog/posts/:id/comments` - Comentários de artigo

### Parâmetros de Query:

- `page` - Página (padrão: 1)
- `limit` - Itens por página (padrão: 10)
- `category` - Filtrar por categoria (slug)
- `search` - Buscar por texto
- `featured` - Apenas artigos em destaque (true/false)

### Exemplo de Uso:

```bash
# Buscar artigos com paginação
GET /api/blog/posts?page=1&limit=5

# Buscar artigos por categoria
GET /api/blog/posts?category=analises-emocionais

# Buscar artigos em destaque
GET /api/blog/posts?featured=true

# Buscar artigo específico
GET /api/blog/posts/filme-perfeito-ansiedade
```

## Próximos Passos

1. ✅ Configurar variáveis de ambiente
2. ✅ Testar APIs do blog
3. 🔄 Atualizar frontend para usar APIs reais
4. 🔄 Substituir mock data por dados reais

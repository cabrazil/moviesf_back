# 🚀 Guia para Testar a Landing Page Localmente

## 📋 Pré-requisitos

- ✅ Node.js 18+ instalado
- ✅ Banco de dados PostgreSQL (Supabase) configurado
- ✅ Variáveis de ambiente configuradas

## 🔧 Passo 1: Configurar Variáveis de Ambiente

### Criar arquivo `.env` no backend:

```bash
cd moviesf_back
cp .env.example .env  # Se existir
# ou criar manualmente:
```

**Conteúdo do arquivo `.env`:**
```env
# 🎬 Configuração do Backend - vibesfilm

# ===== BANCO DE DADOS PRINCIPAL =====
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# ===== BANCO DE DADOS DO BLOG =====
BLOG_DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# ===== CONFIGURAÇÕES DO SERVIDOR =====
PORT=3003
NODE_ENV=development

# ===== APIS EXTERNAS (OPCIONAIS) =====
OPENAI_API_KEY="sk-..."
TMDB_API_KEY="..."
GOOGLE_API_KEY="..."
YOUTUBE_API_KEY="..."

# ===== CONFIGURAÇÕES DE CORS =====
CORS_ORIGIN="http://localhost:5173"
```

## 🚀 Passo 2: Iniciar o Backend

```bash
cd moviesf_back

# Instalar dependências (se necessário)
npm install

# Gerar cliente Prisma
npm run prisma:generate

# Iniciar servidor de desenvolvimento
npm run dev
```

**✅ Backend rodando em:** `http://localhost:3003`

## 🌐 Passo 3: Iniciar o Frontend

```bash
cd moviesf_front

# Instalar dependências (se necessário)
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

**✅ Frontend rodando em:** `http://localhost:5173`

## 🎬 Passo 4: Testar a Landing Page

### URLs para Testar:

1. **Health Check do Backend:**
   ```
   http://localhost:3003/health
   ```

2. **Health Check do Movie Hero:**
   ```
   http://localhost:3003/api/movie/health
   ```

3. **Landing Page de um Filme:**
   ```
   http://localhost:5173/movie/[slug-do-filme]
   ```

### Exemplo de Slug de Filme:
```
http://localhost:5173/movie/inception
http://localhost:5173/movie/the-matrix
http://localhost:5173/movie/pulp-fiction
```

## 🔍 Passo 5: Verificar se Está Funcionando

### 1. Testar API Diretamente:
```bash
curl http://localhost:3003/api/movie/inception/hero
```

### 2. Verificar Logs do Backend:
```
🎬 [2024-01-15T10:30:00.000Z] Buscando filme hero: inception
✅ [2024-01-15T10:30:00.500Z] Filme encontrado: Inception
```

### 3. Verificar Console do Frontend:
- Abrir DevTools (F12)
- Verificar se não há erros de CORS
- Verificar se as requisições estão sendo feitas

## 🐛 Solução de Problemas

### ❌ Erro: "Cannot connect to database"
**Solução:**
- Verificar se as variáveis `DATABASE_URL` e `DIRECT_URL` estão corretas
- Verificar se o banco Supabase está ativo
- Testar conexão: `npm run prisma:generate`

### ❌ Erro: "CORS policy"
**Solução:**
- Verificar se o backend está rodando na porta 3003
- Verificar se o frontend está rodando na porta 5173
- Adicionar `CORS_ORIGIN="http://localhost:5173"` no .env

### ❌ Erro: "Movie not found"
**Solução:**
- Verificar se o slug do filme existe no banco
- Testar com um slug conhecido
- Verificar logs do backend para detalhes

### ❌ Erro: "Module not found"
**Solução:**
```bash
# Reinstalar dependências
cd moviesf_back && npm install
cd ../moviesf_front && npm install

# Limpar cache
npm cache clean --force
```

## 📊 Endpoints Disponíveis

### Backend (localhost:3003):
- `GET /health` - Health check geral
- `GET /api/movie/health` - Health check do movie hero
- `GET /api/movie/:slug/hero` - Dados do filme (refatorado)
- `GET /main-sentiments` - Sentimentos principais
- `GET /api/emotional-intentions/:id` - Intenções emocionais

### Frontend (localhost:5173):
- `/` - Página inicial
- `/movie/:slug` - Landing page do filme
- `/blog` - Blog
- `/about` - Sobre

## 🎯 Testando a Refatoração

### Comparar Performance:

**Antes (arquivo original):**
- Tempo de resposta: ~2-3 segundos
- Consultas sequenciais
- Logs confusos

**Depois (refatorado):**
- Tempo de resposta: ~300-500ms
- Consultas paralelas
- Logs estruturados

### Verificar Logs:
```
🚀 Executando 10 consultas em paralelo
✅ Todas as 10 consultas executadas com sucesso
🎉 Resposta montada com sucesso para: Nome do Filme
```

## 🔄 Próximos Passos

1. **Testar diferentes filmes** com slugs variados
2. **Verificar responsividade** em diferentes dispositivos
3. **Testar cenários de erro** (filme não encontrado)
4. **Monitorar performance** com DevTools
5. **Aplicar mesma refatoração** em outros endpoints

## 📞 Suporte

Se encontrar problemas:
1. Verificar logs do backend e frontend
2. Testar endpoints individualmente
3. Verificar configuração do banco
4. Consultar documentação da refatoração

---

**🎉 Sucesso!** A landing page está rodando localmente com a nova arquitetura refatorada!

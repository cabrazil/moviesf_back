---
name: backend-architecture
description: Arquitetura completa do backend unificado - VibesFilm + Blogs com ambientes de desenvolvimento (Supabase) e produção (VPS Hetzner + Docker)
---

# 🏗️ Skill: Backend Architecture - VibesFilm + Blogs

## Objetivo

Dominar a arquitetura completa do backend unificado que serve dois projetos (VibesFilm e Blogs) em dois ambientes distintos (Desenvolvimento e Produção).

## Visão Geral

O backend é uma **API RESTful unificada** que:
- ✅ Serve **dois projetos independentes** (VibesFilm e Blogs)
- ✅ Utiliza **dois ambientes** (Desenvolvimento com Supabase, Produção com VPS Hetzner)
- ✅ Implementa **bancos de dados separados** para cada projeto
- ✅ Roda na **porta 3000** em ambos os ambientes

## Arquitetura do Sistema

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Porta 3000)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🎬 VibesFilm APIs                 📝 Blogs APIs            │
│  ├── /movies                       ├── /blog/articles       │
│  ├── /main-sentiments              ├── /blog/categories     │
│  ├── /emotional-intentions         ├── /blog/tags           │
│  ├── /personalized-journey         └── /blog/authors        │
│  └── /journey-option-flows                                  │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    Camada de Dados                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🏠 DESENVOLVIMENTO (Local)        🚀 PRODUÇÃO (VPS)        │
│  ├── Supabase PostgreSQL          ├── PostgreSQL (Docker)   │
│  ├── ORM: Prisma                  ├── ORM: Prisma           │
│  └── Conexão: Pool direto         └── Conexão: Pool direto  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Ambientes de Execução

### Comparação de Ambientes

| Aspecto | 🏠 Desenvolvimento | 🚀 Produção |
|---------|-------------------|-------------|
| **Infraestrutura** | Local (Node.js) | VPS Hetzner |
| **Banco de Dados** | Supabase PostgreSQL | PostgreSQL em Docker |
| **Porta** | 3000 | 3000 (via Nginx/Caddy) |
| **SSL/HTTPS** | Não necessário | Obrigatório (Certbot) |
| **Backup** | Automático (Supabase) | Manual (cron jobs) |
| **Monitoramento** | Console logs | Docker logs + ferramentas |
| **Custo** | Gratuito/Baixo | Otimizado (VPS) |

### 🏠 Ambiente de Desenvolvimento

**Características:**
- Node.js rodando localmente
- Supabase PostgreSQL (cloud)
- Setup rápido e fácil
- Interface web do Supabase
- Backups automáticos

**Variáveis de Ambiente:**
```env
# .env.development ou .env.local
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
BLOG_DATABASE_URL="postgresql://postgres:[PASSWORD]@[BLOG_PROJECT].supabase.co:5432/postgres"
BLOG_DIRECT_URL="postgresql://postgres:[PASSWORD]@[BLOG_PROJECT].supabase.co:5432/postgres"
```

**Como Iniciar:**
```bash
# 1. Instalar dependências
npm install

# 2. Configurar .env.development
cp .env.example .env.development

# 3. Gerar Prisma Client
npx prisma generate

# 4. Executar migrações (opcional)
npx prisma migrate dev

# 5. Iniciar servidor
npm run dev
# http://localhost:3000
```

---

### 🚀 Ambiente de Produção (VPS Hetzner)

**Características:**
- VPS Hetzner (Linux Ubuntu/Debian)
- PostgreSQL 15+ em container Docker
- Docker Compose para orquestração
- Nginx/Caddy como reverse proxy
- SSL/HTTPS com Certbot
- Controle total do ambiente

**Variáveis de Ambiente:**
```env
# .env.production
NODE_ENV=production
DATABASE_URL="postgresql://vibesfilm:[PASSWORD]@localhost:5432/vibesfilm_production"
DIRECT_URL="postgresql://vibesfilm:[PASSWORD]@localhost:5432/vibesfilm_production"
BLOG_DATABASE_URL="postgresql://vibesfilm:[PASSWORD]@localhost:5432/vibesfilm_blog"
BLOG_DIRECT_URL="postgresql://vibesfilm:[PASSWORD]@localhost:5432/vibesfilm_blog"
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: vibesfilm_postgres
    environment:
      POSTGRES_USER: vibesfilm
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: vibesfilm_production
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  backend:
    build: .
    container_name: vibesfilm_backend
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      BLOG_DATABASE_URL: ${BLOG_DATABASE_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

---

## Projetos Servidos

### 🎬 VibesFilm - Plataforma de Filmes

**Descrição:** Sistema de recomendação de filmes baseado em emoções e intenções.

**APIs Principais:**
- `GET /movies` - Listar filmes
- `GET /main-sentiments` - Sentimentos principais
- `GET /emotional-intentions` - Intenções emocionais
- `GET /personalized-journey` - Jornada personalizada
- `GET /journey-option-flows` - Fluxos de opções

**Banco de Dados:**
- **ORM:** Prisma
- **Schema:** `prisma/schema.prisma`
- **Tabelas principais:** Movie, MainSentiment, EmotionalIntention, JourneyOptionFlow

**Conexão:**
```typescript
// src/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});
```

---

### 📝 Blogs - Sistema Multi-tenant

**Descrição:** Sistema de blogs multi-tenant (VibesFilm Blog e outros).

**APIs Principais:**
- `GET /blog/articles` - Listar artigos
- `GET /blog/articles/:slug` - Artigo específico
- `POST /blog/articles/:id/view` - Incrementar visualizações
- `GET /blog/categories` - Listar categorias
- `GET /blog/tags` - Listar tags
- `GET /blog/authors` - Listar autores

**Banco de Dados:**
- **Conexão:** PostgreSQL direto (pg Pool)
- **Tabelas principais:** Blog, Article, Category, Tag, Author

**Conexão:**
```typescript
// src/routes/blog.routes.ts
import { Pool } from 'pg';

const blogDbPool = new Pool({
  connectionString: process.env.BLOG_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

---

## Estrutura de Arquivos

```
moviesf_back/
├── src/
│   ├── routes/
│   │   ├── index.ts                    # Rotas principais
│   │   ├── movies.routes.ts            # VibesFilm APIs
│   │   ├── blog.routes.ts              # Blogs APIs
│   │   ├── main-sentiments.routes.ts
│   │   └── personalized-journey.routes.ts
│   ├── prisma.ts                       # Cliente Prisma
│   ├── utils/
│   │   └── aiProvider.ts               # AI providers (OpenAI, Gemini, DeepSeek)
│   └── scripts/
│       ├── orchestrator.ts             # Curadoria de filmes
│       ├── populateMovies.ts
│       └── analyzeMovieSentiments.ts
├── prisma/
│   └── schema.prisma                   # Schema do banco VibesFilm
├── api/
│   └── index.ts                        # Servidor principal
├── docs/
│   ├── BACKEND_DOCUMENTATION.md        # Esta documentação
│   └── README_CURADORIA.md             # Sistema de curadoria
├── .env.development                    # Variáveis de desenvolvimento
├── .env.production                     # Variáveis de produção
├── docker-compose.yml                  # Orquestração Docker
├── Dockerfile                          # Imagem do backend
└── package.json
```

---

## Deploy em Produção

### Pré-requisitos no VPS

```bash
# Instalar Docker e Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Instalar Node.js (opcional)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Processo de Deploy

**1. Clonar repositório no VPS:**
```bash
git clone <repository-url>
cd moviesf_back
```

**2. Configurar variáveis de ambiente:**
```bash
nano .env.production
# Adicionar todas as variáveis necessárias
```

**3. Iniciar containers:**
```bash
docker-compose up -d
```

**4. Executar migrações:**
```bash
docker-compose exec backend npx prisma migrate deploy
```

**5. Verificar logs:**
```bash
docker-compose logs -f backend
```

### Configurar Reverse Proxy

**Nginx:**
```nginx
server {
    listen 80;
    server_name api.vibesfilm.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy (mais simples):**
```
api.vibesfilm.com {
    reverse_proxy localhost:3000
}
```

**Configurar SSL:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.vibesfilm.com
```

---

## Backup e Recuperação

### Script de Backup Automático

```bash
#!/bin/bash
# /home/user/backup-db.sh

BACKUP_DIR="/home/user/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_USER="vibesfilm"

mkdir -p $BACKUP_DIR

# Backup VibesFilm
docker exec vibesfilm_postgres pg_dump -U $DB_USER vibesfilm_production | \
  gzip > $BACKUP_DIR/vibesfilm_${TIMESTAMP}.sql.gz

# Backup Blogs
docker exec vibesfilm_postgres pg_dump -U $DB_USER vibesfilm_blog | \
  gzip > $BACKUP_DIR/blog_${TIMESTAMP}.sql.gz

# Manter últimos 7 dias
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup concluído: $TIMESTAMP"
```

**Configurar Cron:**
```bash
crontab -e
# Adicionar:
0 2 * * * /home/user/backup-db.sh >> /home/user/backup.log 2>&1
```

**Restaurar Backup:**
```bash
gunzip < vibesfilm_20260204_020000.sql.gz | \
  docker exec -i vibesfilm_postgres psql -U vibesfilm vibesfilm_production
```

---

## Monitoramento e Logs

### Logs em Desenvolvimento
```bash
npm run dev  # Logs aparecem no console
```

### Logs em Produção
```bash
# Ver logs do backend
docker-compose logs -f backend

# Ver logs do PostgreSQL
docker-compose logs -f postgres

# Últimas 100 linhas
docker-compose logs --tail=100 backend

# Salvar em arquivo
docker-compose logs backend > backend.log
```

### Health Check
```bash
# Endpoint de saúde
curl https://api.vibesfilm.com/health

# Monitoramento com cron
*/5 * * * * curl -f https://api.vibesfilm.com/health || \
  echo "API DOWN" | mail -s "Alert" admin@vibesfilm.com
```

### Ferramentas Recomendadas
- **Logs:** Winston, Pino
- **Monitoramento:** PM2, Uptime Robot, Datadog
- **APM:** New Relic, Sentry
- **Métricas:** Prometheus + Grafana

---

## Segurança e Boas Práticas

### Segurança em Produção
- ✅ **Variáveis de ambiente:** Nunca commitar `.env`
- ✅ **Senhas fortes:** Usar geradores de senha
- ✅ **SSL/TLS:** HTTPS obrigatório
- ✅ **Firewall:** Configurar UFW
  ```bash
  sudo ufw allow 22/tcp    # SSH
  sudo ufw allow 80/tcp    # HTTP
  sudo ufw allow 443/tcp   # HTTPS
  sudo ufw enable
  ```
- ✅ **Rate Limiting:** Implementar em Nginx ou aplicação
- ✅ **CORS:** Configurar origens permitidas

### Performance
- ✅ **Connection Pooling:** Configurado no Prisma e pg
- ✅ **Singleton Pattern:** Prisma Client reutilizado
- ✅ **Queries otimizadas:** Usar `select` específico
- ✅ **Índices:** Criar em colunas frequentes
- ✅ **Cache:** Redis para queries frequentes (futuro)

### Manutenibilidade
- ✅ **Código modular:** Rotas separadas por domínio
- ✅ **TypeScript:** Tipagem forte
- ✅ **Logs estruturados:** Winston ou Pino
- ✅ **Documentação:** Manter atualizada
- ✅ **Versionamento:** Git (main, develop, feature/*)

---

## Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão com Banco
```bash
# Verificar se PostgreSQL está rodando
docker ps | grep postgres

# Ver logs
docker-compose logs postgres

# Testar conexão
docker exec -it vibesfilm_postgres psql -U vibesfilm -d vibesfilm_production
```

#### 2. Migrações Falhando
```bash
# Ver status
npx prisma migrate status

# Resetar (DEV apenas)
npx prisma migrate reset

# Aplicar manualmente
npx prisma migrate deploy
```

#### 3. Backend Não Inicia
```bash
# Verificar .env
cat .env.production

# Ver logs
docker-compose logs backend

# Rebuild
docker-compose up -d --build backend
```

#### 4. Porta 3000 em Uso
```bash
# Encontrar processo
sudo lsof -i :3000

# Matar processo
kill -9 <PID>

# Ou mudar porta no docker-compose.yml
```

### Comandos Úteis

```bash
# Status dos containers
docker-compose ps

# Reiniciar backend
docker-compose restart backend

# Ver uso de recursos
docker stats

# Acessar shell do container
docker exec -it vibesfilm_backend sh

# Limpar tudo (CUIDADO)
docker-compose down -v

# Logs em tempo real
docker-compose logs -f --tail=50
```

---

## Atualização em Produção

```bash
# No VPS
cd moviesf_back

# Puxar alterações
git pull origin main

# Rebuild e restart
docker-compose down
docker-compose up -d --build

# Executar migrações
docker-compose exec backend npx prisma migrate deploy

# Verificar logs
docker-compose logs -f backend
```

---

## Variáveis de Ambiente Necessárias

### Obrigatórias
```env
# Banco de dados
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
BLOG_DATABASE_URL="postgresql://..."
BLOG_DIRECT_URL="postgresql://..."

# APIs
TMDB_API_KEY="..."
OPENAI_API_KEY="sk-..."
```

### Opcionais
```env
# AI Providers
GEMINI_API_KEY="..."
DEEPSEEK_API_KEY="..."
OMDB_API_KEY="..."

# Configuração
NODE_ENV="production"
AI_PROVIDER="auto"
PORT="3000"
```

---

## Referências Rápidas

### Arquivos Importantes
- [`BACKEND_DOCUMENTATION.md`](file:///home/cabrazil/newprojs/fav_movies/moviesf_back/docs/BACKEND_DOCUMENTATION.md) - Documentação completa
- [`prisma/schema.prisma`](file:///home/cabrazil/newprojs/fav_movies/moviesf_back/prisma/schema.prisma) - Schema do banco
- [`src/routes/`](file:///home/cabrazil/newprojs/fav_movies/moviesf_back/src/routes/) - Implementação das rotas
- [`README_CURADORIA.md`](file:///home/cabrazil/newprojs/fav_movies/moviesf_back/docs/README_CURADORIA.md) - Sistema de curadoria

### Comandos Essenciais

**Desenvolvimento:**
```bash
npm run dev                    # Iniciar servidor
npx prisma generate            # Gerar Prisma Client
npx prisma migrate dev         # Executar migrações
npx prisma studio              # Abrir Prisma Studio
```

**Produção:**
```bash
docker-compose up -d           # Iniciar containers
docker-compose logs -f         # Ver logs
docker-compose restart         # Reiniciar
docker-compose down            # Parar containers
npx prisma migrate deploy      # Aplicar migrações
```

---

## Status Atual

### 🏠 Desenvolvimento
- ✅ Backend rodando localmente (porta 3000)
- ✅ Conectado ao Supabase PostgreSQL
- ✅ VibesFilm APIs via Prisma
- ✅ Blogs APIs via PostgreSQL direto
- ✅ Frontends conectados

### 🚀 Produção
- ✅ VPS Hetzner configurado
- ✅ PostgreSQL em Docker
- ✅ Backend containerizado
- ✅ Reverse proxy (Nginx/Caddy)
- ✅ SSL/HTTPS ativo
- ✅ Backups automáticos
- ✅ Monitoramento básico

---

**Backend Architecture v2.0** - VibesFilm + Blogs 🚀

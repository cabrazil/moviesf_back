# ⚡ Referência Rápida - Backend Architecture

## 🚀 Comandos Essenciais

### Desenvolvimento Local

```bash
# Iniciar servidor
npm run dev

# Gerar Prisma Client
npx prisma generate

# Executar migrações
npx prisma migrate dev

# Abrir Prisma Studio
npx prisma studio

# Ver status das migrações
npx prisma migrate status

# Resetar banco (DEV apenas)
npx prisma migrate reset
```

### Produção (Docker)

```bash
# Iniciar containers
docker-compose up -d

# Parar containers
docker-compose down

# Reiniciar containers
docker-compose restart

# Rebuild containers
docker-compose up -d --build

# Ver logs
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs --tail=100 backend

# Ver status
docker-compose ps

# Executar migrações
docker-compose exec backend npx prisma migrate deploy

# Acessar shell do backend
docker exec -it vibesfilm_backend sh

# Acessar PostgreSQL
docker exec -it vibesfilm_postgres psql -U vibesfilm -d vibesfilm_production

# Ver uso de recursos
docker stats
```

## 🌍 Ambientes

| Ambiente | Comando | URL |
|----------|---------|-----|
| **Dev** | `npm run dev` | `http://localhost:3000` |
| **Prod** | `docker-compose up -d` | `https://api.vibesfilm.com` |

## 📊 Variáveis de Ambiente

### Desenvolvimento (.env.development)
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
BLOG_DATABASE_URL="postgresql://postgres:[PASSWORD]@[BLOG_PROJECT].supabase.co:5432/postgres"
BLOG_DIRECT_URL="postgresql://postgres:[PASSWORD]@[BLOG_PROJECT].supabase.co:5432/postgres"
TMDB_API_KEY="..."
OPENAI_API_KEY="sk-..."
```

### Produção (.env.production)
```env
NODE_ENV=production
DATABASE_URL="postgresql://vibesfilm:[PASSWORD]@localhost:5432/vibesfilm_production"
DIRECT_URL="postgresql://vibesfilm:[PASSWORD]@localhost:5432/vibesfilm_production"
BLOG_DATABASE_URL="postgresql://vibesfilm:[PASSWORD]@localhost:5432/vibesfilm_blog"
BLOG_DIRECT_URL="postgresql://vibesfilm:[PASSWORD]@localhost:5432/vibesfilm_blog"
TMDB_API_KEY="..."
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="..."
DEEPSEEK_API_KEY="..."
```

## 🎬 APIs do VibesFilm

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Health check |
| `/movies` | GET | Listar filmes |
| `/main-sentiments` | GET | Sentimentos principais |
| `/emotional-intentions` | GET | Intenções emocionais |
| `/personalized-journey` | GET | Jornada personalizada |
| `/journey-option-flows` | GET | Fluxos de opções |

## 📝 APIs do Blog

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/blog/articles` | GET | Listar artigos |
| `/blog/articles/:slug` | GET | Artigo específico |
| `/blog/articles/:id/view` | POST | Incrementar views |
| `/blog/categories` | GET | Listar categorias |
| `/blog/tags` | GET | Listar tags |
| `/blog/authors` | GET | Listar autores |

## 🔧 Troubleshooting Rápido

### Erro de Conexão com Banco
```bash
# Verificar PostgreSQL
docker ps | grep postgres

# Ver logs
docker-compose logs postgres

# Testar conexão
docker exec -it vibesfilm_postgres psql -U vibesfilm -d vibesfilm_production
```

### Migrações Falhando
```bash
# Ver status
npx prisma migrate status

# Aplicar manualmente
npx prisma migrate deploy

# Resetar (DEV apenas)
npx prisma migrate reset
```

### Backend Não Inicia
```bash
# Verificar .env
cat .env.production

# Ver logs
docker-compose logs backend

# Rebuild
docker-compose up -d --build backend
```

### Porta 3000 em Uso
```bash
# Encontrar processo
sudo lsof -i :3000

# Matar processo
kill -9 <PID>
```

## 💾 Backup

### Backup Manual
```bash
# Backup VibesFilm
docker exec vibesfilm_postgres pg_dump -U vibesfilm vibesfilm_production | \
  gzip > vibesfilm_backup.sql.gz

# Backup Blogs
docker exec vibesfilm_postgres pg_dump -U vibesfilm vibesfilm_blog | \
  gzip > blog_backup.sql.gz
```

### Restaurar Backup
```bash
# Restaurar VibesFilm
gunzip < vibesfilm_backup.sql.gz | \
  docker exec -i vibesfilm_postgres psql -U vibesfilm vibesfilm_production

# Restaurar Blogs
gunzip < blog_backup.sql.gz | \
  docker exec -i vibesfilm_postgres psql -U vibesfilm vibesfilm_blog
```

### Backup Automático (Cron)
```bash
# Editar crontab
crontab -e

# Adicionar backup diário às 2h
0 2 * * * /home/user/backup-db.sh >> /home/user/backup.log 2>&1
```

## 🔒 Segurança

### Configurar Firewall (UFW)
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Configurar SSL (Certbot)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.vibesfilm.com
```

## 📈 Monitoramento

### Health Check
```bash
# Local
curl http://localhost:3000/health

# Produção
curl https://api.vibesfilm.com/health
```

### Logs
```bash
# Desenvolvimento
npm run dev  # Console

# Produção
docker-compose logs -f backend
docker-compose logs -f postgres
```

## 🔄 Atualização em Produção

```bash
# 1. Puxar alterações
git pull origin main

# 2. Rebuild containers
docker-compose down
docker-compose up -d --build

# 3. Executar migrações
docker-compose exec backend npx prisma migrate deploy

# 4. Verificar logs
docker-compose logs -f backend
```

## 📁 Estrutura de Arquivos

```
moviesf_back/
├── src/
│   ├── routes/          # Rotas das APIs
│   ├── prisma.ts        # Cliente Prisma
│   ├── utils/           # Utilitários
│   └── scripts/         # Scripts de curadoria
├── prisma/
│   └── schema.prisma    # Schema do banco
├── api/
│   └── index.ts         # Servidor principal
├── docs/                # Documentação
├── .env.development     # Variáveis de dev
├── .env.production      # Variáveis de prod
├── docker-compose.yml   # Docker Compose
├── Dockerfile           # Imagem do backend
└── package.json
```

## 🎯 Checklist de Deploy

- [ ] Clonar repositório no VPS
- [ ] Instalar Docker e Docker Compose
- [ ] Criar `.env.production`
- [ ] Criar `docker-compose.yml`
- [ ] Criar `Dockerfile`
- [ ] Executar `docker-compose up -d`
- [ ] Executar migrações
- [ ] Configurar Nginx/Caddy
- [ ] Configurar SSL com Certbot
- [ ] Configurar firewall (UFW)
- [ ] Configurar backup automático
- [ ] Testar APIs

## 💡 Dicas

- ✅ Use `.env.development` para desenvolvimento
- ✅ Use `.env.production` para produção
- ✅ Nunca commite arquivos `.env`
- ✅ Faça backup antes de migrações
- ✅ Teste em staging antes de produção
- ✅ Monitore logs regularmente
- ✅ Configure alertas de downtime

---

**Referência Rápida v2.0** ⚡

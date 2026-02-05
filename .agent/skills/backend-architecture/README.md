# 🏗️ Backend Architecture Skill

Skill para dominar a arquitetura completa do backend unificado **VibesFilm + Blogs**.

## 📚 Documentação

### Arquivo Principal

**[SKILL.md](./SKILL.md)** - 📖 Documentação completa da arquitetura
- Visão geral do sistema
- Arquitetura de dois ambientes (Dev + Prod)
- Projetos servidos (VibesFilm + Blogs)
- Deploy em produção (VPS Hetzner + Docker)
- Backup, monitoramento e segurança
- Troubleshooting completo

## 🚀 Início Rápido

### 🏠 Desenvolvimento Local
```bash
npm install
cp .env.example .env.development
npx prisma generate
npm run dev
# http://localhost:3000
```

### 🚀 Produção (VPS Hetzner)
```bash
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy
docker-compose logs -f backend
```

## 🎯 Ambientes

| Ambiente | Infraestrutura | Banco de Dados |
|----------|---------------|----------------|
| **🏠 Dev** | Local (Node.js) | Supabase PostgreSQL |
| **🚀 Prod** | VPS Hetzner | PostgreSQL em Docker |

## 📊 Projetos Servidos

### 🎬 VibesFilm
- Plataforma de recomendação de filmes
- APIs: `/movies`, `/main-sentiments`, `/emotional-intentions`
- ORM: Prisma

### 📝 Blogs
- Sistema multi-tenant de blogs
- APIs: `/blog/articles`, `/blog/categories`, `/blog/tags`
- Conexão: PostgreSQL direto (pg Pool)

## 🛠️ Ferramentas Principais

| Ferramenta | Uso |
|------------|-----|
| **Prisma** | ORM para VibesFilm |
| **Docker** | Containerização em produção |
| **Nginx/Caddy** | Reverse proxy |
| **Certbot** | SSL/HTTPS |
| **pg_dump** | Backup de banco |

## 💡 Comandos Rápidos

**Desenvolvimento:**
```bash
npm run dev                    # Iniciar servidor
npx prisma studio              # Abrir Prisma Studio
npx prisma migrate dev         # Executar migrações
```

**Produção:**
```bash
docker-compose up -d           # Iniciar
docker-compose logs -f         # Ver logs
docker-compose restart         # Reiniciar
```

## 🔒 Segurança

- ✅ SSL/HTTPS obrigatório em produção
- ✅ Firewall (UFW) configurado
- ✅ Variáveis de ambiente seguras
- ✅ Rate limiting implementado
- ✅ Backups automáticos diários

## 📞 Troubleshooting

### Problemas Comuns
1. **Erro de conexão:** Verificar `docker ps | grep postgres`
2. **Migrações falhando:** `npx prisma migrate status`
3. **Backend não inicia:** `docker-compose logs backend`
4. **Porta em uso:** `sudo lsof -i :3000`

## 📚 Documentação Completa

Leia [SKILL.md](./SKILL.md) para:
- Arquitetura detalhada
- Processo de deploy completo
- Configuração de Docker Compose
- Scripts de backup
- Monitoramento e logs
- Boas práticas de segurança

---

**Backend Architecture v2.0** 🚀

# 🚀 Guia de Deploy - Tabela MoviePillarArticle

## 📋 Pré-requisitos

- [x] Acesso SSH à VPS de produção
- [x] Arquivo `.env.production` configurado com `DATABASE_URL`
- [x] PostgreSQL client (`psql`) instalado
- [x] Backup do banco de dados (recomendado)

---

## 🛡️ Segurança

Esta migration é **100% SEGURA** porque:

1. ✅ **Apenas CRIA** uma nova tabela (não modifica dados existentes)
2. ✅ **Verifica** se a tabela já existe antes de criar
3. ✅ **Usa transação implícita** (rollback automático em caso de erro)
4. ✅ **Não afeta** outras tabelas ou dados
5. ✅ **Inclui rollback** caso necessário reverter

---

## 📝 Passo a Passo

### **Opção 1: Deploy Automatizado (Recomendado)**

```bash
# 1. Navegar para o diretório do backend
cd /home/cabrazil/newprojs/fav_movies/moviesf_back

# 2. Dar permissão de execução ao script
chmod +x scripts/deploy-pillar-article-table.sh

# 3. Executar o script de deploy
./scripts/deploy-pillar-article-table.sh
```

O script vai:
- ✅ Verificar se `.env.production` existe
- ✅ Carregar `DATABASE_URL`
- ✅ Pedir confirmação antes de executar
- ✅ Executar a migration
- ✅ Verificar se foi criada com sucesso

---

### **Opção 2: Deploy Manual**

```bash
# 1. Navegar para o diretório do backend
cd /home/cabrazil/newprojs/fav_movies/moviesf_back

# 2. Carregar variáveis de ambiente
source .env.production

# 3. Executar migration
psql "$DATABASE_URL" -f migrations/create_movie_pillar_article_table.sql

# 4. Verificar se a tabela foi criada
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE tablename = 'MoviePillarArticle';"
```

---

## ✅ Verificação Pós-Deploy

Após executar a migration, verifique:

```sql
-- 1. Verificar se a tabela existe
SELECT tablename, schemaname 
FROM pg_tables 
WHERE tablename = 'MoviePillarArticle';

-- 2. Verificar estrutura da tabela
\d "MoviePillarArticle"

-- 3. Verificar constraints
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'public."MoviePillarArticle"'::regclass;

-- 4. Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'MoviePillarArticle';
```

**Resultado esperado:**
- ✅ Tabela criada com 7 colunas
- ✅ 1 Primary Key (id)
- ✅ 1 Foreign Key (movieId → Movie.id)
- ✅ 1 Unique Constraint (movieId + blogArticleId)
- ✅ 3 Índices criados

---

## 🧪 Teste em Produção

Após o deploy, teste a API:

```bash
# Testar endpoint de detalhes do filme
curl https://api.vibesfilm.com/api/movie/o-sexto-sentido/hero | jq '.movie.pillarArticles'
```

**Resultado esperado:**
```json
{
  "movie": {
    "pillarArticles": []
  }
}
```

---

## 📊 Inserir Dados de Teste

Use o script `insert_pillar_articles.sql`:

```sql
-- Exemplo: Adicionar artigo pilar para "O Sexto Sentido"
INSERT INTO "MoviePillarArticle" ("movieId", "blogArticleId", "title", "slug", "createdAt", "updatedAt")
VALUES (
  (SELECT id FROM "Movie" WHERE title = 'O Sexto Sentido' AND year = 1999),
  'artigo-id-do-blog',
  'Os 15 Melhores Filmes de Suspense Psicológico',
  'melhores-filmes-suspense-psicologico',
  NOW(),
  NOW()
);
```

---

## 🔄 Rollback (Se Necessário)

**ATENÇÃO:** Execute apenas se precisar reverter a migration.

```sql
-- Remover a tabela
DROP TABLE IF EXISTS "MoviePillarArticle" CASCADE;
```

Isso vai:
- ❌ Deletar a tabela `MoviePillarArticle`
- ❌ Deletar todos os dados da tabela
- ✅ **NÃO** afetar outras tabelas (CASCADE apenas remove constraints)

---

## 📦 Deploy do Frontend

Após confirmar que a tabela foi criada com sucesso:

```bash
# 1. Fazer commit das alterações
cd /home/cabrazil/newprojs/fav_movies/moviesf_front
git add .
git commit -m "feat: adiciona selo de curadoria para artigos pilares"

# 2. Push para produção (Vercel fará deploy automático)
git push origin main
```

---

## 🎯 Checklist Final

- [ ] Migration executada com sucesso
- [ ] Tabela `MoviePillarArticle` criada
- [ ] Constraints e índices verificados
- [ ] API retornando `pillarArticles: []`
- [ ] Frontend deployado
- [ ] Teste end-to-end funcionando

---

## 📞 Suporte

Em caso de problemas:

1. **Verificar logs do PostgreSQL**
2. **Verificar se `DATABASE_URL` está correta**
3. **Executar queries de verificação**
4. **Consultar este guia**

---

## 📚 Arquivos Relacionados

- `migrations/create_movie_pillar_article_table.sql` - Migration SQL
- `scripts/deploy-pillar-article-table.sh` - Script de deploy
- `scripts/insert_pillar_articles.sql` - Script para inserir dados
- `prisma/schema.prisma` - Schema Prisma atualizado

# 🚀 Deploy na Vercel - Checklist Completo

## ✅ Build Completo Realizado

Todos os arquivos foram compilados com sucesso:
- ✅ `dist/api/index.js` - Entry point
- ✅ `dist/src/routes/ssr.routes.js` - Rotas SSR
- ✅ `dist/src/utils/ssrRenderer.js` - Renderizador SSR
- ✅ `dist/src/routes/newsletter.routes.js` - Newsletter
- ✅ Prisma Client gerado

## 📋 Variáveis de Ambiente Necessárias na Vercel

Configure as seguintes variáveis de ambiente no painel da Vercel:

### 🔴 OBRIGATÓRIAS (Core)

```bash
# Banco de Dados Principal (Supabase)
DATABASE_URL="postgresql://postgres.tcvgmugkgwbaxdhreuxm:Quemmedera01*@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://postgres.tcvgmugkgwbaxdhreuxm:Quemmedera01*@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Banco de Dados do Blog (Supabase)
BLOG_DATABASE_URL="postgresql://postgres.tcvgmugkgwbaxdhreuxm:Quemmedera01*@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# URL do Frontend (para redirecionamentos)
FRONTEND_URL="https://vibesfilm.com"
```

### 🟡 OPCIONAIS (já configuradas ou com fallback)

```bash
# Porta (já configurada no vercel.json)
PORT="3333"

# Node Environment
NODE_ENV="production"

# TMDB API Key (se usar)
TMDB_API_KEY="sua_chave_aqui"
```

## 🔧 Configuração no Vercel

### 1. Acesse o Painel da Vercel
- Vá para: https://vercel.com/dashboard
- Selecione seu projeto ou crie um novo

### 2. Configure as Variáveis de Ambiente
- Settings → Environment Variables
- Adicione todas as variáveis listadas acima

### 3. Deploy
```bash
# Opção 1: Via CLI
vercel --prod

# Opção 2: Via Git (automático)
# Push para branch main/master
```

## ✅ Verificação Pós-Deploy

Após o deploy, teste:

### 1. Health Check
```bash
curl https://seu-projeto.vercel.app/health
```

### 2. SSR para Bots (Googlebot)
```bash
curl -A "Googlebot" \
  https://seu-projeto.vercel.app/onde-assistir/robo-selvagem
```
**Esperado**: HTML completo com meta tags

### 3. Redirecionamento para Usuários
```bash
curl -A "Mozilla/5.0" \
  -I https://seu-projeto.vercel.app/onde-assistir/robo-selvagem
```
**Esperado**: Status 302 (redirect) para `https://vibesfilm.com/onde-assistir/robo-selvagem`

### 4. Newsletter API
```bash
curl -X POST https://seu-projeto.vercel.app/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"test"}'
```

## 📝 Notas Importantes

1. **vercel.json**: Já configurado com `maxDuration: 30s` para SSR
2. **Build**: Usa TypeScript compilado automaticamente pela Vercel
3. **Fallbacks**: Se `FRONTEND_URL` não estiver definido, usa `https://vibesfilm.com`
4. **Database Pooling**: Configurado para usar `DIRECT_URL` quando disponível

## 🐛 Troubleshooting

### Erro: `ECONNREFUSED 127.0.0.1:5432`
- **Causa**: Variáveis `DATABASE_URL` ou `DIRECT_URL` não configuradas
- **Solução**: Verifique se as variáveis estão configuradas no painel da Vercel

### Erro: `Cannot find module`
- **Causa**: Dependências não instaladas
- **Solução**: A Vercel instala automaticamente via `package.json`

### SSR não funciona
- **Causa**: User-Agent não detectado como bot
- **Solução**: Teste com `curl -A "Googlebot"` para verificar

## 📊 Monitoramento

Após o deploy, monitore:
- Logs da Vercel: Dashboard → Logs
- Performance: Dashboard → Analytics
- Errors: Dashboard → Functions → Errors

---

✅ **Status**: Pronto para deploy!


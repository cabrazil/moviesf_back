# 🧪 Testes Pós-Deploy - Vercel

## ✅ Deploy Concluído!

O backend foi deployado com sucesso na Vercel.

## 🔍 Testes Essenciais

### 1. Health Check (Básico)
```bash
curl https://moviesf-back.vercel.app/health
```
**Esperado**: `{"status":"ok","message":"Server is running"}`

### 2. SSR para Bot (Googlebot) - Filme
```bash
curl -A "Googlebot" \
  https://moviesf-back.vercel.app/onde-assistir/robo-selvagem
```
**Esperado**: 
- Status: `200 OK`
- Content-Type: `text/html; charset=utf-8`
- HTML completo com:
  - `<title>Onde Assistir Robô Selvagem...</title>`
  - `<meta name="description" content="...">`
  - `<meta property="og:title" content="...">`
  - Schema.org JSON-LD

### 3. Redirecionamento para Usuário Normal - Filme
```bash
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
  -I https://moviesf-back.vercel.app/onde-assistir/robo-selvagem
```
**Esperado**: 
- Status: `302 Found`
- Location: `https://vibesfilm.com/onde-assistir/robo-selvagem`

### 4. SSR para Bot - Artigo de Análise
```bash
curl -A "Googlebot" \
  https://moviesf-back.vercel.app/analise/algum-artigo
```
**Esperado**: HTML completo do artigo

### 5. SSR para Bot - Artigo de Lista
```bash
curl -A "Googlebot" \
  https://moviesf-back.vercel.app/lista/alguma-lista
```
**Esperado**: HTML completo do artigo

### 6. Newsletter API
```bash
curl -X POST https://moviesf-back.vercel.app/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"test"}'
```
**Esperado**: 
- Status: `200 OK`
- JSON: `{"success":true,"message":"Email inscrito com sucesso!"}`

## 🔧 Verificação de Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas na Vercel:

1. ✅ `DATABASE_URL` - Banco principal
2. ✅ `DIRECT_URL` - Conexão direta ao banco
3. ✅ `BLOG_DATABASE_URL` - Banco do blog
4. ✅ `FRONTEND_URL` - URL do frontend (default: `https://vibesfilm.com`)

### Como verificar:
- Vercel Dashboard → Settings → Environment Variables

## 🐛 Troubleshooting

### Erro: `ECONNREFUSED 127.0.0.1:5432`
**Causa**: Variáveis de ambiente não configuradas
**Solução**: Verificar `DATABASE_URL` e `DIRECT_URL` na Vercel

### Erro: `404 Not Found`
**Causa**: Rota não encontrada
**Solução**: Verificar se `vercel.json` está correto

### SSR retorna HTML vazio
**Causa**: Erro ao buscar dados do banco
**Solução**: Verificar logs da Vercel (Functions → Logs)

### Redirecionamento não funciona
**Causa**: `FRONTEND_URL` não configurado
**Solução**: Configurar variável ou usar default `https://vibesfilm.com`

## 📊 Monitoramento

### Logs da Vercel
- Dashboard → Functions → Logs
- Filtrar por: `SSR`, `Bot detectado`, `Erro`

### Métricas Importantes
- Tempo de resposta SSR
- Taxa de sucesso/erro
- Uso de memória

## ✅ Checklist Final

- [ ] Health check funcionando
- [ ] SSR retorna HTML completo para bots
- [ ] Usuários são redirecionados corretamente
- [ ] Newsletter API funcionando
- [ ] Variáveis de ambiente configuradas
- [ ] Logs sem erros críticos

---

**Status**: ✅ Deploy concluído com sucesso!


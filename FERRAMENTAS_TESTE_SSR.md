# 🧪 Ferramentas para Testar SSR na Vercel

## 🎯 Ferramentas Essenciais de SEO

### 1. **Google Rich Results Test** (Recomendado)
**URL:** https://search.google.com/test/rich-results

**Como usar:**
1. Cole a URL: `https://moviesf-back.vercel.app/onde-assistir/robo-selvagem`
2. Clique em "Testar URL"
3. Verifique se o Schema.org JSON-LD está sendo reconhecido

**O que verifica:**
- ✅ Schema.org markup (Movie)
- ✅ Meta tags básicas
- ✅ Estrutura de dados

---

### 2. **Facebook Sharing Debugger**
**URL:** https://developers.facebook.com/tools/debug/

**Como usar:**
1. Cole a URL do filme
2. Clique em "Debug"
3. Verifique Open Graph tags

**O que verifica:**
- ✅ og:title
- ✅ og:description
- ✅ og:image
- ✅ og:url
- ✅ Preview de como aparece no Facebook

**Importante:** Após fazer alterações, clique em "Scrape Again" para limpar cache

---

### 3. **Twitter Card Validator**
**URL:** https://cards-dev.twitter.com/validator

**Como usar:**
1. Cole a URL do filme
2. Verifique o preview do card

**O que verifica:**
- ✅ twitter:card
- ✅ twitter:title
- ✅ twitter:description
- ✅ twitter:image
- ✅ Preview de como aparece no Twitter

---

### 4. **LinkedIn Post Inspector**
**URL:** https://www.linkedin.com/post-inspector/

**Como usar:**
1. Cole a URL do filme
2. Verifique o preview

**O que verifica:**
- ✅ Open Graph tags (LinkedIn usa OG)
- ✅ Preview de como aparece no LinkedIn

---

### 5. **Google Search Console - URL Inspection**
**URL:** https://search.google.com/search-console

**Como usar:**
1. Adicione a propriedade (se ainda não tiver)
2. Vá em "URL Inspection"
3. Cole a URL e clique em "Test Live URL"

**O que verifica:**
- ✅ Como o Google vê a página
- ✅ Mobile-friendly
- ✅ Indexação
- ✅ Schema.org recognition

---

## 🔍 Ferramentas de Análise de HTML

### 6. **W3C Markup Validator**
**URL:** https://validator.w3.org/

**Como usar:**
1. Cole a URL: `https://moviesf-back.vercel.app/onde-assistir/robo-selvagem`
2. Verifique erros de HTML

**O que verifica:**
- ✅ Validação de HTML5
- ✅ Estrutura correta
- ✅ Erros de sintaxe

---

### 7. **Schema.org Validator**
**URL:** https://validator.schema.org/

**Como usar:**
1. Cole a URL do filme
2. Verifique o Schema.org JSON-LD

**O que verifica:**
- ✅ Validação do Schema.org
- ✅ Estrutura correta do JSON-LD
- ✅ Tipos e propriedades válidas

---

## 📊 Ferramentas de Performance e SEO

### 8. **PageSpeed Insights** (Google)
**URL:** https://pagespeed.web.dev/

**Como usar:**
1. Cole a URL do filme
2. Analise Core Web Vitals

**O que verifica:**
- ✅ Performance
- ✅ Acessibilidade
- ✅ Best Practices
- ✅ SEO Score
- ✅ Mobile vs Desktop

**Nota:** Como é SSR para bots, pode ter scores diferentes

---

### 9. **Screaming Frog SEO Spider**
**URL:** https://www.screamingfrog.co.uk/seo-spider/

**Como usar:**
1. Configure User-Agent como "Googlebot"
2. Cole a URL do filme
3. Analise meta tags

**O que verifica:**
- ✅ Meta tags (title, description)
- ✅ Open Graph
- ✅ Canonical URLs
- ✅ Headers HTTP

---

### 10. **Ahrefs SEO Toolbar** (Extensão Chrome)
**URL:** https://ahrefs.com/seo-toolbar

**Como usar:**
1. Instale a extensão
2. Acesse a URL do filme
3. Veja análise de SEO em tempo real

**O que verifica:**
- ✅ Title tag
- ✅ Meta description
- ✅ Headers (H1, H2, etc)
- ✅ Imagens alt
- ✅ Links

---

## 🤖 Testes de User-Agent (Bots)

### 11. **cURL com User-Agent**
**Terminal:**
```bash
# Teste como Googlebot
curl -A "Googlebot" \
  https://moviesf-back.vercel.app/onde-assistir/robo-selvagem

# Teste como usuário normal (deve redirecionar)
curl -A "Mozilla/5.0" \
  -I https://moviesf-back.vercel.app/onde-assistir/robo-selvagem
```

**O que verifica:**
- ✅ HTML completo para bots
- ✅ Redirecionamento para usuários
- ✅ Headers HTTP corretos

---

### 12. **Browser DevTools (Chrome/Firefox)**
**Como usar:**
1. Abra DevTools (F12)
2. Network tab → Request Headers
3. Modifique User-Agent para "Googlebot"
4. Recarregue a página

**O que verifica:**
- ✅ HTML renderizado
- ✅ Meta tags no DOM
- ✅ Schema.org no código

---

## 🔗 Testes Específicos

### 13. **Open Graph Preview**
**URL:** https://www.opengraph.xyz/

**Como usar:**
1. Cole a URL do filme
2. Veja preview de todas as redes sociais

**O que verifica:**
- ✅ Facebook preview
- ✅ Twitter preview
- ✅ LinkedIn preview
- ✅ WhatsApp preview

---

### 14. **Meta Tags Analyzer**
**URL:** https://metatags.io/

**Como usar:**
1. Cole a URL do filme
2. Veja todas as meta tags

**O que verifica:**
- ✅ Todas as meta tags
- ✅ Open Graph
- ✅ Twitter Card
- ✅ Schema.org

---

## 📱 Testes Mobile

### 15. **Google Mobile-Friendly Test**
**URL:** https://search.google.com/test/mobile-friendly

**Como usar:**
1. Cole a URL do filme
2. Verifique se é mobile-friendly

**O que verifica:**
- ✅ Responsividade
- ✅ Viewport configurado
- ✅ Texto legível
- ✅ Touch targets

---

## 🚀 Checklist de Testes

### Teste Básico (Essencial)
- [ ] Google Rich Results Test
- [ ] Facebook Sharing Debugger
- [ ] Twitter Card Validator
- [ ] cURL com User-Agent "Googlebot"

### Teste Completo (Recomendado)
- [ ] Todos os testes básicos
- [ ] Schema.org Validator
- [ ] W3C Markup Validator
- [ ] PageSpeed Insights
- [ ] Meta Tags Analyzer
- [ ] Open Graph Preview

### Teste Avançado (Opcional)
- [ ] Google Search Console
- [ ] Screaming Frog
- [ ] Ahrefs SEO Toolbar
- [ ] Mobile-Friendly Test

---

## 🎯 URLs para Testar

**Backend (SSR):**
- Filme: `https://moviesf-back.vercel.app/onde-assistir/robo-selvagem`
- Artigo: `https://moviesf-back.vercel.app/analise/[slug]`

**Frontend (SPA):**
- `https://vibesfilm.com/onde-assistir/robo-selvagem`

---

## 📝 Notas Importantes

1. **Cache:** Algumas ferramentas (Facebook, Twitter) fazem cache. Use "Scrape Again" após alterações.

2. **User-Agent:** Para testar como bot, use User-Agent "Googlebot" ou similar.

3. **HTTPS:** Certifique-se de que a URL usa HTTPS.

4. **Robots.txt:** Verifique se não está bloqueando bots.

5. **Variáveis de Ambiente:** Certifique-se de que estão configuradas na Vercel.

---

## 🐛 Troubleshooting

### Meta tags não aparecem
- Verifique se está usando User-Agent de bot
- Limpe cache do Facebook/Twitter
- Verifique logs da Vercel

### Schema.org não valida
- Verifique JSON-LD no HTML
- Use Schema.org Validator
- Verifique sintaxe JSON

### Redirecionamento não funciona
- Verifique `FRONTEND_URL` nas variáveis de ambiente
- Teste com User-Agent normal (não bot)

---

✅ **Status:** Pronto para testar!


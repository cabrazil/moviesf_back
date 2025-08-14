# 🚀 MVP Landing Page - Plano de Implementação

## 📋 Visão Geral

Desenvolver um MVP da landing page para capturar tráfego orgânico de busca por "onde assistir [filme]" e converter usuários para o app de jornadas emocionais.

## 🎯 Objetivos do MVP

1. **Validar conceito**: Testar se usuários buscam por filmes + análise emocional
2. **Capturar tráfego**: Rankear para keywords "onde assistir [filme]"
3. **Converter usuários**: Direcionar para download do app
4. **Coletar dados**: Métricas de engajamento e conversão

## 🏗️ Estrutura do MVP

### **Páginas Principais (10-20 filmes populares)**

```
📄 Estrutura de Páginas (estrutura JustWatch):
├── 🏠 Home (/)
├── 🎬 Filmes (/filme)
│   ├── /filme/gigantes-de-aco
│   ├── /filme/um-senhor-estagiario
│   ├── /filme/interestelar
│   ├── /filme/parasita
│   ├── /filme/vingadores-ultimato
│   ├── /filme/joker
│   ├── /filme/forrest-gump
│   ├── /filme/titanic
│   ├── /filme/pulp-fiction
│   ├── /filme/matrix
│   ├── /filme/star-wars
│   ├── /filme/o-poderoso-chefao
│   ├── /filme/schindlers-list
│   ├── /filme/o-silencio-dos-inocentes
│   ├── /filme/fight-club
│   ├── /filme/o-resgate-do-soldado-ryan
│   ├── /filme/o-rei-leao
│   └── /filme/e-t-o-extraterrestre
├── 💭 Sentimentos (/sentimentos)
│   ├── /sentimentos/feliz
│   ├── /sentimentos/triste
│   ├── /sentimentos/calmo
│   └── /sentimentos/ansioso
├── 🛤️ Jornadas (/jornadas)
│   ├── /jornadas/processar
│   └── /jornadas/transformar
├── 📱 App (/app)
├── 🧠 Como Funciona (/como-funciona)
└── 📞 Contato (/contato)
```

## 🔌 APIs Implementadas

### **Backend (moviesf_back)**

✅ **Rotas Públicas Criadas**:
- `GET /api/public/home` - Dados da página inicial
- `GET /api/public/filme/:slug` - Detalhes do filme (estrutura JustWatch)
- `GET /api/public/sentimentos/:slug` - Recomendações por sentimento
- `GET /api/public/jornadas/:slug` - Jornadas emocionais
- `GET /api/public/search` - Busca de filmes
- `GET /api/public/platforms` - Plataformas de streaming

✅ **Tipos TypeScript**:
- Interfaces para todas as APIs públicas
- Tipos para SEO e metadados
- Utilitários para URLs amigáveis

✅ **Utilitários SEO**:
- Geração de slugs amigáveis
- Metadados Open Graph
- Schema.org para filmes
- Breadcrumbs estruturados

## 🎨 Design e UX

### **Template de Página de Filme**

```html
📄 Estrutura da Página:
├── Header
│   ├── Logo + Menu de Navegação
│   └── Busca de Filmes
├── Hero Section
│   ├── Título do Filme + Ano
│   ├── Poster + Informações Básicas
│   └── CTA "Descobrir Jornada Emocional"
├── Seção "Onde Assistir"
│   ├── Lista de Plataformas
│   ├── Tipos de Acesso (Assinatura/Aluguel)
│   └── Links para Streaming
├── Seção "Análise Emocional"
│   ├── Sentimentos Associados
│   ├── Por Que Assistir
│   └── Contexto Emocional
├── Seção "Jornada Sugerida"
│   ├── Perguntas de Reflexão
│   ├── Próximos Passos
│   └── CTA para App
├── Seção "Filmes Similares"
│   ├── Grid de Filmes Relacionados
│   └── Links para Outras Páginas
└── Footer
    ├── Links para App
    ├── Redes Sociais
    └── Newsletter
```

### **Elementos de Conversão**

1. **Banner Flutuante**: "Descubra filmes para seu estado emocional"
2. **Popup Inteligente**: Após 30s na página
3. **CTA Contextual**: "Filmes similares para você"
4. **Newsletter**: "Receba recomendações emocionais semanais"

## 📱 Tecnologias Recomendadas

### **Frontend**
- **Framework**: Next.js 14 (SSR para SEO)
- **Styling**: Tailwind CSS + Headless UI
- **Estado**: Zustand ou Context API
- **Deploy**: Vercel (otimizado para Next.js)

### **SEO e Performance**
- **SSR/SSG**: Páginas estáticas geradas
- **Image Optimization**: Next.js Image
- **Meta Tags**: Next.js Head
- **Schema.org**: Dados estruturados
- **Sitemap**: Geração automática

## 🚀 Plano de Implementação

### **SEMANA 1: Setup e Estrutura**
- [ ] Setup do projeto Next.js
- [ ] Configuração do Tailwind CSS
- [ ] Estrutura de pastas e componentes
- [ ] Integração com APIs do backend
- [ ] Componentes base (Header, Footer, Layout)

### **SEMANA 2: Páginas Principais**
- [ ] Página Home com filmes em destaque
- [ ] Template de página de filme
- [ ] Páginas de recomendações por sentimento
- [ ] Páginas de jornadas emocionais
- [ ] Sistema de navegação

### **SEMANA 3: SEO e Performance**
- [ ] Meta tags dinâmicas
- [ ] Schema.org para filmes
- [ ] Sitemap automático
- [ ] Otimização de imagens
- [ ] Breadcrumbs estruturados

### **SEMANA 4: Conversão e Analytics**
- [ ] Elementos de conversão (CTAs, popups)
- [ ] Integração com Google Analytics
- [ ] Testes A/B de conversão
- [ ] Newsletter signup
- [ ] Links para download do app

### **SEMANA 5: Conteúdo e Testes**
- [ ] Criação de 20 páginas de filmes
- [ ] Testes de usabilidade
- [ ] Otimização de performance
- [ ] Testes de SEO
- [ ] Deploy em produção

## 📊 Métricas de Sucesso

### **KPIs Principais**
- **Tráfego Orgânico**: +100% em 3 meses
- **Taxa de Conversão**: >2% para app
- **Tempo na Página**: >2 minutos
- **Páginas por Sessão**: >3 páginas
- **Ranking SEO**: Top 10 para keywords alvo

### **Ferramentas de Analytics**
- **Google Analytics 4**: Métricas gerais
- **Google Search Console**: Performance SEO
- **Hotjar**: Heatmaps e gravações
- **Vercel Analytics**: Performance técnica

## 🎯 Próximos Passos

### **Imediato**
1. **Validar APIs**: Testar todas as rotas públicas
2. **Escolher Stack**: Definir tecnologias do frontend
3. **Design System**: Criar componentes base
4. **SEO Strategy**: Definir keywords alvo

### **Curto Prazo**
1. **Desenvolvimento**: Implementar MVP
2. **Conteúdo**: Criar páginas de filmes
3. **Testes**: Validar conversão
4. **Deploy**: Colocar em produção

### **Médio Prazo**
1. **Escala**: Mais páginas de filmes
2. **Otimização**: CRO contínuo
3. **Marketing**: Campanhas de conteúdo
4. **Monetização**: Afiliados e ads

## 💡 Diferencial Competitivo

### **vs JustWatch/Reelgood**
- ✅ **Análise Emocional**: Exclusivo no mercado
- ✅ **Jornadas Personalizadas**: Diferencial único
- ✅ **Contexto Emocional**: Por que assistir
- ✅ **Comunidade**: Possibilidade de engajamento

### **vs Sites de Crítica**
- ✅ **Informação Prática**: Onde assistir
- ✅ **Dados de Streaming**: Atualizados
- ✅ **Foco Emocional**: Não apenas crítica
- ✅ **Call-to-Action**: Download do app

## 🚨 Considerações Técnicas

### **Desafios**
- **Dados de Streaming**: Atualização constante
- **SEO**: Tempo para rankear
- **Performance**: Muitas imagens e dados
- **Manutenção**: Conteúdo dinâmico

### **Soluções**
- **Cache Inteligente**: Redis para dados de streaming
- **ISR**: Incremental Static Regeneration
- **CDN**: Otimização de imagens
- **Automação**: Scripts para atualização

## 📈 ROI Esperado

### **Investimento**
- **Desenvolvimento**: 5 semanas × 40h = 200h
- **Design**: 1 semana × 20h = 20h
- **Conteúdo**: 1 semana × 30h = 30h
- **Total**: ~250 horas

### **Retorno Esperado**
- **Tráfego**: +10.000 visitantes/mês em 6 meses
- **Conversões**: +200 downloads de app/mês
- **Receita**: +R$ 5.000/mês em afiliados
- **ROI**: >300% em 12 meses

---

**Status**: ✅ APIs Criadas | 🚧 Próximo: Setup Frontend
**Prioridade**: ALTA | **Timeline**: 5 semanas

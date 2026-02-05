# 🎯 Exemplos Práticos - Movie Curation System

## Cenários Comuns de Uso

### 1. Filme de Ação Energético

**Contexto:** Adicionar "John Wick" para jornada de filmes empolgantes

```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="John Wick" \
  --year=2014 \
  --journeyOptionFlowId=26 \
  --analysisLens=17 \
  --journeyValidation=13 \
  --ai-provider=deepseek
```

**Resultado Esperado:**
- AI Provider: DeepSeek (otimizado para ação)
- SubSentiments: "Adrenalina / Emoção Intensa", "Deslumbramento Visual"
- Tempo: ~30-45 segundos
- Custo: Baixo (DeepSeek)

---

### 2. Drama Coming-of-Age Complexo

**Contexto:** Adicionar "Lady Bird" para jornada de autodescoberta

```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="Lady Bird" \
  --year=2017 \
  --journeyOptionFlowId=25 \
  --analysisLens=14 \
  --journeyValidation=13 \
  --ai-provider=auto
```

**Resultado Esperado:**
- AI Provider: OpenAI (detecta coming-of-age)
- SubSentiments: "Autodescoberta e Crescimento", "Esperança e Superação"
- Tempo: ~40-60 segundos
- Custo: Médio (OpenAI para qualidade)

---

### 3. Romance Leve e Encantador

**Contexto:** Adicionar "Amélie Poulain" para jornada romântica

```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="O Fabuloso Destino de Amélie Poulain" \
  --year=2001 \
  --journeyOptionFlowId=72 \
  --analysisLens=13 \
  --journeyValidation=13 \
  --ai-provider=gemini
```

**Resultado Esperado:**
- AI Provider: Gemini (manual, otimizado para romance)
- SubSentiments: "Doçura / Encanto", "Conforto / Aconchego Emocional"
- Tempo: ~25-40 segundos
- Custo: Baixo (Gemini)

---

### 4. Thriller Psicológico Tenso

**Contexto:** Adicionar "Se7en" para jornada de suspense

```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="Se7en" \
  --year=1995 \
  --journeyOptionFlowId=45 \
  --analysisLens=16 \
  --journeyValidation=16 \
  --ai-provider=openai
```

**Resultado Esperado:**
- AI Provider: OpenAI (lente 16 - Ansioso)
- SubSentiments: "Suspense Crescente", "Tensão Psicológica"
- Tempo: ~40-60 segundos
- Custo: Médio-Alto (OpenAI para precisão)

---

### 5. Animação Familiar

**Contexto:** Adicionar "Toy Story" para jornada familiar

```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="Toy Story" \
  --year=1995 \
  --journeyOptionFlowId=80 \
  --analysisLens=13 \
  --journeyValidation=13 \
  --ai-provider=deepseek
```

**Resultado Esperado:**
- AI Provider: DeepSeek (família/animação)
- SubSentiments: "Alegria Nostálgica", "Conforto Familiar"
- Tempo: ~30-45 segundos
- Custo: Baixo (DeepSeek)

---

### 6. Drama Contemplativo

**Contexto:** Adicionar "Nomadland" para jornada reflexiva

```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="Nomadland" \
  --year=2020 \
  --journeyOptionFlowId=78 \
  --analysisLens=15 \
  --journeyValidation=15 \
  --ai-provider=auto
```

**Resultado Esperado:**
- AI Provider: Auto (pode escolher OpenAI ou DeepSeek)
- SubSentiments: "Vida Simples e Reflexiva", "Conexão Humana e Natureza"
- Tempo: ~35-50 segundos
- Custo: Variável

---

## Casos Especiais

### Aprovar Novos SubSentiments Automaticamente

```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="Inception" \
  --year=2010 \
  --journeyOptionFlowId=50 \
  --analysisLens=16 \
  --journeyValidation=17 \
  --ai-provider=openai \
  --approve-new-subsentiments
```

**Atenção:** Use com cuidado! Pode criar subsentimentos duplicados.

---

### Duplicar Sugestão Existente

```bash
# Primeiro, curate o filme normalmente
npx ts-node src/scripts/orchestrator.ts \
  --title="Interstellar" \
  --year=2014 \
  --journeyOptionFlowId=60 \
  --analysisLens=17 \
  --journeyValidation=15 \
  --ai-provider=auto

# Depois, duplique para outra jornada
npx ts-node src/scripts/duplicateMovieSuggestion.ts \
  "Interstellar" 2014 65
```

---

### Reprocessar Sentimentos de Filme Existente

```bash
# Reprocessar com novo provider ou configuração
npx ts-node src/scripts/reprocessMovieSentiments.ts \
  --tmdbId=157336 \
  --journeyOptionFlowId=60 \
  --ai-provider=openai
```

---

## Fluxos de Trabalho Comuns

### Workflow 1: Curadoria em Lote

```bash
# 1. Prepare lista de filmes
# 2. Execute orchestrator para cada um

for movie in "John Wick:2014:26:17:13" "Mad Max:2015:26:17:13" "The Raid:2011:26:17:13"
do
  IFS=':' read -r title year jof lens validation <<< "$movie"
  npx ts-node src/scripts/orchestrator.ts \
    --title="$title" \
    --year=$year \
    --journeyOptionFlowId=$jof \
    --analysisLens=$lens \
    --journeyValidation=$validation \
    --ai-provider=deepseek
  sleep 2  # Evitar rate limiting
done
```

### Workflow 2: Teste de Qualidade

```bash
# 1. Teste providers primeiro
npx ts-node src/scripts/testAIProviders.ts

# 2. Execute health check
npx ts-node src/scripts/healthCheck.ts

# 3. Curate filme de teste
npx ts-node src/scripts/orchestrator.ts \
  --title="The Matrix" \
  --year=1999 \
  --journeyOptionFlowId=26 \
  --analysisLens=17 \
  --journeyValidation=13 \
  --ai-provider=auto
```

### Workflow 3: Otimização de Custos

```bash
# 1. Use DeepSeek para filmes simples
npx ts-node src/scripts/orchestrator.ts \
  --title="The Avengers" \
  --year=2012 \
  --journeyOptionFlowId=26 \
  --analysisLens=17 \
  --journeyValidation=13 \
  --ai-provider=deepseek

# 2. Use OpenAI apenas para casos complexos
npx ts-node src/scripts/orchestrator.ts \
  --title="Eternal Sunshine of the Spotless Mind" \
  --year=2004 \
  --journeyOptionFlowId=45 \
  --analysisLens=14 \
  --journeyValidation=13 \
  --ai-provider=openai
```

---

## Dicas de Uso

### ✅ Boas Práticas

1. **Use `--ai-provider=deepseek`** como padrão (economia)
2. **Use `--ai-provider=auto`** quando não souber qual escolher
3. **Use `--ai-provider=openai`** para dramas complexos e coming-of-age
4. **Sempre especifique** `analysisLens` e `journeyValidation` corretos
5. **Teste com `testAIProviders.ts`** antes de processar muitos filmes

### ❌ Evite

1. **Não use** `--approve-new-subsentiments` sem revisar
2. **Não processe** o mesmo filme múltiplas vezes sem necessidade
3. **Não ignore** erros de validação
4. **Não use** OpenAI para todos os filmes (custo alto)
5. **Não esqueça** de verificar se o filme já existe

---

## Troubleshooting Rápido

### Erro: "Movie not found in TMDB"
```bash
# Verifique o título exato no TMDB
# Tente com título original em inglês
npx ts-node src/scripts/orchestrator.ts \
  --title="The Hangover" \
  --year=2009 \
  --journeyOptionFlowId=26 \
  --analysisLens=13 \
  --journeyValidation=13 \
  --ai-provider=deepseek
```

### Erro: "AI Provider failed"
```bash
# Verifique as keys no .env
# Tente com provider alternativo
npx ts-node src/scripts/orchestrator.ts \
  --title="Inception" \
  --year=2010 \
  --journeyOptionFlowId=50 \
  --analysisLens=16 \
  --journeyValidation=17 \
  --ai-provider=gemini  # Tente outro provider
```

### Erro: "SubSentiment already exists"
```bash
# Não use --approve-new-subsentiments
# Deixe o sistema usar subsentimentos existentes
npx ts-node src/scripts/orchestrator.ts \
  --title="The Dark Knight" \
  --year=2008 \
  --journeyOptionFlowId=45 \
  --analysisLens=16 \
  --journeyValidation=13 \
  --ai-provider=auto
# Sem a flag --approve-new-subsentiments
```

---

**Última atualização:** 2026-02-04

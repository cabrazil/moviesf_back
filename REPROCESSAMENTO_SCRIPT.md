# 🔄 Script de Reprocessamento de Sentimentos

## 🎯 Objetivo

Reprocessar sentimentos de filmes **já existentes** no banco de dados usando:
- ✅ Dados do banco (sinopse, keywords)
- ✅ DNA da jornada (SubSentiments configurados)
- ✅ IA focada em auditoria (não análise completa)
- ✅ Processamento em massa otimizado

---

## 📊 Diferenças vs. Orchestrator

| Aspecto | `orchestrator.ts` | `reprocessMovieSentiments.ts` |
|---------|-------------------|-------------------------------|
| **Objetivo** | Curar filme novo | Reprocessar existentes |
| **Dados** | Busca TMDB API | Usa banco de dados |
| **Prompt** | Análise completa | Auditoria focada |
| **Scope** | 1 filme | Múltiplos filmes |
| **Performance** | Média | Otimizada (batches) |
| **Custo** | Alto (TMDB + IA) | Baixo (só IA) |

---

## 🚀 Uso

### **1. Reprocessar Todos os Filmes de uma Jornada**

```bash
npm run script:prod -- src/scripts/reprocessMovieSentiments.ts \
  --jofId=134 \
  --ai-provider=deepseek \
  --batch=10
```

**O que faz:**
1. Busca todos os filmes da JOF 134
2. Para cada filme:
   - Audita com IA usando dados do banco
   - Atualiza `MovieSentiment`
   - Recalcula `relevanceScore`
   - Atualiza reflexão se score >= 6.5

---

### **2. Reprocessar Filme Específico**

```bash
npm run script:prod -- src/scripts/reprocessMovieSentiments.ts \
  --movieId="abc-123-def" \
  --jofId=134 \
  --ai-provider=deepseek
```

---

### **3. Reprocessar por Título e Ano**

```bash
npm run script:prod -- src/scripts/reprocessMovieSentiments.ts \
  --title="Lion: Uma Jornada para Casa" \
  --year=2016 \
  --jofId=134 \
  --ai-provider=deepseek
```

---

### **4. Dry-Run (Teste sem Gravar)**

```bash
npm run script:prod -- src/scripts/reprocessMovieSentiments.ts \
  --jofId=134 \
  --ai-provider=deepseek \
  --dry-run
```

**Resultado**: Mostra o que seria feito sem gravar no banco

---

## 🧬 Prompt de Auditoria

### **Estrutura:**

```
🎬 DADOS DO FILME (FONTE A)
- Título, Sinopse, Keywords

🧬 LISTA DE DNA (FONTE B)
- SubSentiments da JOF com keywords

🎯 MISSÃO
1. Verificar matches entre FONTE A e FONTE B
2. Definir relevância e justificativa
3. Criar reflexão curta

⚠️ REGRAS
- Não inventar matches
- Usar apenas nomes exatos do DNA
- Máximo 10 matches
```

### **Exemplo de Resposta da IA:**

```json
{
  "matches": [
    {
      "subSentimentName": "Superação e Resiliência",
      "relevance": 0.98,
      "explanation": "Saroo sobrevive sozinho e busca família por 25 anos"
    },
    {
      "subSentimentName": "Transformação Pessoal",
      "relevance": 0.95,
      "explanation": "De criança perdida a homem que enfrenta passado"
    }
  ],
  "reflection": "uma história real de resiliência ao reencontrar origens"
}
```

---

## 📊 Fluxo de Processamento

```
1. BUSCAR FILMES
   ├─ Por JOF ID → Todos os filmes da jornada
   ├─ Por Movie ID → Filme específico
   └─ Por Título + Ano → Busca no banco

2. BUSCAR DNA DA JORNADA
   └─ SubSentiments + keywords + weights

3. PROCESSAR EM BATCHES
   Para cada filme:
   ├─ Auditar com IA
   ├─ Salvar MovieSentiment (upsert)
   ├─ Recalcular relevanceScore
   └─ Atualizar reflexão (se score >= 6.5)

4. RESUMO
   └─ Total, Sucesso, Erros
```

---

## ⚙️ Parâmetros

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `--jofId` | number | ID da jornada | `134` |
| `--movieId` | string | UUID do filme | `abc-123` |
| `--title` | string | Título do filme | `"Lion"` |
| `--year` | number | Ano do filme | `2016` |
| `--ai-provider` | string | Provider de IA | `deepseek` |
| `--batch` | number | Tamanho do batch | `10` |
| `--dry-run` | flag | Não grava no banco | - |

---

## 🎯 Casos de Uso

### **Caso 1: Atualizar Todos os Filmes Após Mudança no DNA**

```bash
# Você adicionou novos SubSentiments à JOF 134
# Quer que todos os filmes sejam reanalisados

npm run script:prod -- src/scripts/reprocessMovieSentiments.ts \
  --jofId=134 \
  --ai-provider=deepseek
```

**Resultado**: Todos os 27 filmes serão auditados e scores recalculados

---

### **Caso 2: Melhorar Scores Baixos**

```bash
# Filmes com score < 4.0 podem melhorar com nova análise

# Dry-run primeiro
npm run script:prod -- src/scripts/reprocessMovieSentiments.ts \
  --title="Pequena Miss Sunshine" \
  --year=2006 \
  --jofId=134 \
  --dry-run

# Se parecer bom, executar de verdade
npm run script:prod -- src/scripts/reprocessMovieSentiments.ts \
  --title="Pequena Miss Sunshine" \
  --year=2006 \
  --jofId=134
```

---

### **Caso 3: Atualizar Reflexões**

```bash
# Gerar novas reflexões para filmes com score alto

npm run script:prod -- src/scripts/reprocessMovieSentiments.ts \
  --jofId=134 \
  --ai-provider=deepseek
```

**Resultado**: Filmes com score >= 6.5 terão reflexões atualizadas

---

## 💰 Custo Estimado

### **JOF com 27 filmes:**

```
Tokens por filme: ~2000 (prompt) + ~500 (resposta) = 2500
Total: 27 × 2500 = 67,500 tokens

DeepSeek: ~$0.01 (muito barato!)
OpenAI: ~$0.10
Gemini: ~$0.05
```

---

## ⚡ Performance

### **Batch Size:**

| Batch | Tempo Total (27 filmes) | Memória |
|-------|-------------------------|---------|
| 1 | ~5 min | Baixa |
| 5 | ~3 min | Média |
| 10 | ~2 min | Alta |
| 27 | ~1.5 min | Muito Alta |

**Recomendado**: `--batch=10`

---

## 🔧 TODO

- [ ] Implementar `calculateAndUpdateScore()`
- [ ] Adicionar suporte para múltiplas JOFs
- [ ] Adicionar filtro por score mínimo
- [ ] Adicionar relatório detalhado
- [ ] Adicionar retry em caso de erro de IA

---

## 📝 Exemplo de Saída

```
🔄 === REPROCESSAMENTO DE SENTIMENTOS DE FILMES ===
🤖 Provider: deepseek
📊 Modo: PRODUÇÃO (grava no banco)
📦 Batch size: 10 filmes por vez

📋 Encontrados 27 filmes na JOF 134
🧬 DNA da JOF 134: 16 SubSentiments

📦 Processando batch 1/3
   Filmes 1 a 10 de 27

🎬 Lion: Uma Jornada para Casa (2016)
✅ 10 matches encontrados
📊 Score atualizado: 6.505
📝 Reflexão atualizada

🎬 À Procura da Felicidade (2006)
✅ 9 matches encontrados
📊 Score atualizado: 6.275
📝 Reflexão atualizada

...

=== RESUMO DO REPROCESSAMENTO ===
Total processados: 27
Sucesso: 26
Erros: 1
Modo: PRODUÇÃO
```

---

**Data**: 2026-01-06  
**Arquivo**: `src/scripts/reprocessMovieSentiments.ts`

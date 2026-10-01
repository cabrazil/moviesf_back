---
name: movie-curation
description: Sistema de curadoria automatizada de filmes usando IA híbrida (OpenAI + Gemini + DeepSeek) para análise de sentimentos e intenções emocionais
---

# 🎬 Skill: Movie Curation System - vibesfilm

## Objetivo

Dominar o sistema de curadoria automatizada de filmes do vibesfilm, que utiliza inteligência artificial híbrida e a **Jev Engine** para analisar e categorizar filmes baseado em sentimentos e intenções emocionais com precisão superior à análise LLM direta.

## Visão Geral

O sistema de curadoria é uma ferramenta automatizada que:
- ✅ Utiliza a **Jev Engine** para avaliação de subsentimentos com score quantificável
- ✅ Analisa filmes baseado em **sentimentos e intenções emocionais** com alta cobertura
- ✅ É **escalável, manutenível e economicamente eficiente**
- ✅ Processa filmes por **título/ano ou TMDB ID**
- ✅ **Supera a análise LLM direta** em precisão — encontra jornadas não óbvias com cobertura de até 100%

## Por que o `curateMovie.ts` é superior à análise LLM isolada

Testes comparativos mostraram que o `curateMovie.ts` via Jev Engine:
- **Encontra jornadas contraintuitivas mas emocionalmente corretas** (ex: filme de animação esportiva melhor encaixado em `Cansado(a)/TRANSFORM` do que no óbvio `Animado(a)/PROCESS`)
- **Quantifica a precisão** com scores, patamares (Ouro/Prata/Bronze) e cobertura percentual
- **Detecta sentimentos não óbvios** (ex: `Introspectivo(a)` com 92-100% de cobertura em filmes de suspense moral que a LLM classifica genericamente como `Calmo(a)`)
- **Avalia o impacto emocional no espectador**, não apenas o tom superficial do filme

## Arquitetura do Sistema

### Componentes Principais

#### 1. 🎬 Script Principal de Curadoria (NOVO — Recomendado)
**Arquivo:** `src/scripts/curateMovie.ts`

- **4 etapas automatizadas** em um único comando
- Avaliação completa via **Jev Engine** contra todas as JOFs do banco
- Gravação inteligente das **2 melhores jornadas** (diversidade de sentimento)
- Enriquecimento semântico de keywords, Oscar data, LandingPageHook, ContentWarnings
- Suporte a **modo preview** (sem gravar) para validação prévia
- Funciona para **filmes novos e filmes já na base** (upsert seguro)

#### 2. 🤖 Sistema de AI Providers
**Arquivo:** `src/utils/aiProvider.ts`

- **Suporte:** OpenAI (GPT-4) + Google Gemini + DeepSeek
- **Otimização** de custos e qualidade

**Quando usar cada provider:**

| Provider | Casos de Uso |
|----------|--------------|
| **DeepSeek** (padrão) | Maioria dos filmes — melhor custo/benefício |
| **OpenAI** | Coming-of-age, thrillers psicológicos, dramas complexos |
| **Gemini** | Alternativa criativa |

**Use DeepSeek como padrão, a menos que o usuário especifique o contrário.**

#### 3. 📊 Scripts de Suporte

| Script | Função |
|--------|--------|
| `populateMovies.ts` | Adiciona filmes manualmente via TMDB |
| `analyzeMovieSentiments.ts` | Análise manual de sentimentos |
| `discoverAndCurateAutomated.ts` | Curadoria manual por etapas |
| `orchestrator.ts` | **Legado** — substituído pelo `curateMovie.ts` |
| `duplicateMovieSuggestion.ts` | Duplicação de sugestões entre jornadas |
| `healthCheck.ts` | Verificação de integridade do sistema |
| `reprocessMovieSentiments.ts` | Reprocessa relevanceScore e reflexão |

---

## 🚀 Comando Principal (Recomendado)

```bash
npx ts-node src/scripts/curateMovie.ts --title="Nome do Filme" --year=2024
```

---

## 📋 Todas as Formas de Executar o `curateMovie.ts`

### 1. Descoberta Automática Geral
Avalia o filme contra todas as jornadas, elege as 2 melhores e salva:
```bash
npx ts-node src/scripts/curateMovie.ts --title="Inception" --year=2010
```

### 2. Usando TMDB ID diretamente
```bash
npx ts-node src/scripts/curateMovie.ts --tmdb=27205
```

### 3. Modo Preview (sem gravar — recomendado antes de atualizar)
```bash
npx ts-node src/scripts/curateMovie.ts --title="Inception" --year=2010 --preview
# Equivalente: --dry-run
```

### 4. Forçando uma JOF específica
```bash
npx ts-node src/scripts/curateMovie.ts --title="Inception" --year=2010 --jofId=54
```

### 5. Filtrando por Sentimento Inicial
```bash
npx ts-node src/scripts/curateMovie.ts --title="Inception" --year=2010 --sentiment="ansioso"
# Valores: calmo, feliz, triste, ansioso, animado, introspectivo, cansado
```

### 6. Filtrando por Intenção Emocional
```bash
npx ts-node src/scripts/curateMovie.ts --title="Inception" --year=2010 --intention="transform"
# Valores: maintain, process, transform, explore
```

### 7. Especificando o AI Provider
```bash
npx ts-node src/scripts/curateMovie.ts --title="Inception" --year=2010 --provider=openai
# Valores: deepseek (padrão), openai, gemini
```

### 8. Ajustando Threshold da Jev Engine
```bash
npx ts-node src/scripts/curateMovie.ts --title="Inception" --year=2010 --threshold=0.65
# Padrão: 0.55 — quanto maior, mais exigente na ativação de subsentimentos
```

### 9. Ajustando Quantidade de Jornadas no Ranking
```bash
npx ts-node src/scripts/curateMovie.ts --title="Inception" --year=2010 --top=5
# Padrão: 3
```

### 10. Comando Completo
```bash
npx ts-node src/scripts/curateMovie.ts \
  --title="Inception" \
  --year=2010 \
  --sentiment="ansioso" \
  --intention="transform" \
  --provider=deepseek \
  --threshold=0.60 \
  --top=5
```

---

## 📋 Etapas Internas do `curateMovie.ts`

O script executa automaticamente **4 etapas**:

### Etapa 1: Ingestão e Verificação
- Verifica se o filme já está na base (não duplica)
- Se não encontrado, ingere automaticamente via TMDB/OMDb
- Enriquece dados de Oscar (não-bloqueante)

### Etapa 2: Enriquecimento Semântico de Keywords
- Adiciona 10-15 keywords emocionais profundas em português via IA
- Incremental — não apaga keywords existentes

### Etapa 3: Avaliação via Jev Engine
- Avalia o filme contra todas as JOFs do banco (em batches de 4)
- Computa score por fórmula oficial (intensidade × cobertura + bônus de patamar)
- Exibe ranking com patamares: **Ouro** (≥75%), **Prata** (≥65%), **Bronze** (≥50%)

### Etapa 4: Gravação e Vitrine
- Salva a **1ª campeã** (maior score geral)
- Salva a **2ª campeã** (melhor de um sentimento diferente — para diversidade de público)
- Gera reflexão poética via IA para cada jornada salva
- Atualiza `EmotionalEntryType`, `ContentWarnings`, `LandingPageHook`, `TargetAudienceForLP`
- Recalcula ranking de relevância

---

## �� Sistema de Patamares (Scores)

| Patamar | Cobertura | Bônus |
|---------|-----------|-------|
| **Ouro** | ≥ 75% dos subsentimentos | +0.6 |
| **Prata** | ≥ 65% dos subsentimentos | +0.4 |
| **Bronze** | ≥ 50% dos subsentimentos | +0.2 |
| Sem Bônus | < 50% | 0 |

---

## 🧠 Lógica de Gravação das 2 Melhores Jornadas

O script grava:
1. **1ª Opção:** JOF com maior score absoluto
2. **2ª Opção:** JOF com maior score de um **sentimento inicial diferente** (para alcançar públicos distintos)
   - Fallback: se não houver de sentimento diferente, usa a 2ª colocada geral

**Rationale:** A plataforma começa com "Como você está?". Gravar duas jornadas do mesmo sentimento seria redundante para o usuário — ele já chegaria ao filme pela primeira. A diversidade de sentimento amplifica o alcance do filme para públicos diferentes.

> ⚠️ **Limitação conhecida:** Não há piso de qualidade para a 2ª opção — pode acontecer de uma jornada Prata ser escolhida no lugar de uma Ouro do mesmo sentimento. Monitorar durante os testes com mais filmes.

---

## 🔄 Uso para Filmes Já na Base (Reprocessamento)

O script é seguro para reprocessar filmes existentes:

| Campo | Comportamento |
|---|---|
| `MovieSuggestionFlow` | Atualiza se existe, cria se não existe (upsert) |
| `MovieSentiment` | Upsert — atualiza relevance e explanation |
| Keywords | Incremental — adiciona novas, preserva existentes |
| `LandingPageHook` | Sobrescreve com nova geração |
| Oscar data | Re-fetcha (não-bloqueante) |

**Fluxo recomendado para reprocessamento:**
```bash
# 1. Ver ranking sem gravar
npx ts-node src/scripts/curateMovie.ts --title="Filme" --year=2024 --preview

# 2. Se quiser forçar uma JOF específica
npx ts-node src/scripts/curateMovie.ts --title="Filme" --year=2024 --jofId=43

# 3. Reprocessamento automático completo
npx ts-node src/scripts/curateMovie.ts --title="Filme" --year=2024
```

---

## 🔧 Ferramentas Auxiliares

### Duplicação de Sugestões
```bash
# --journeyOptionFlowId=61 → destino
# --baseJourneyOptionFlowId=6 → origem (buscar na tabela MovieSuggestionFlow)
npx ts-node src/scripts/duplicateMovieSuggestion.ts \
  --title="John Wick 4" --year=2023 \
  --journeyOptionFlowId=61 --baseJourneyOptionFlowId=6
```

### Health Check
```bash
npx ts-node src/scripts/healthCheck.ts
```

### Teste de AI Providers
```bash
npx ts-node src/scripts/testAIProviders.ts
```

---

## ⚙️ Variáveis de Ambiente Necessárias

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
TMDB_API_KEY="your-tmdb-key"
GEMINI_API_KEY="your-gemini-key"       # opcional
DEEPSEEK_API_KEY="your-deepseek-key"   # opcional
OMDB_API_KEY="your-omdb-key"           # opcional
AI_PROVIDER="auto"  # openai|gemini|deepseek|auto
```

---

## 📈 Lentes de Análise (MainSentiment IDs)

| ID | Sentimento | Quando Usar |
|----|------------|-------------|
| 13 | Feliz | Filmes positivos, alegres, românticos |
| 14 | Triste | Dramas, filmes emocionais |
| 15 | Calmo | Filmes contemplativos, relaxantes |
| 16 | Ansioso | Suspense, thrillers, tensão |
| 17 | Animado | Ação, aventura, energia |
| 18 | Introspectivo | Filmes filosóficos, dilemas morais, psicológicos |

---

## 🎯 Melhores Práticas

1. **Sempre use `--preview` primeiro** ao reprocessar filmes existentes
2. **Use `--provider=deepseek`** para maioria dos filmes (economia)
3. **Use `--provider=openai`** para dramas complexos e coming-of-age
4. **Use `--jofId`** quando a LLM sugerir uma jornada específica e quiser forçá-la
5. **Use `--sentiment` + `--intention`** para curar filmes em jornadas específicas
6. **Confie no Jev Engine** — ele frequentemente identifica jornadas contraintuitivas mas mais precisas que a análise LLM

---

**vibesfilm Curation System v3.0** — Powered by Jev Engine + OpenAI + Gemini + DeepSeek 🎬🤖

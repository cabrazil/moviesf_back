---
name: relevance-score-formula
description: Fórmula de cálculo do relevanceScore - Como funciona o score de relevância de filmes para jornadas emocionais
---

# 📐 Skill: Fórmula do Relevance Score

## Objetivo

Entender completamente como funciona o cálculo do `relevanceScore` de um filme, que determina o quão bem um filme se alinha com uma jornada emocional (Journey Option Flow).

## Visão Geral

O `relevanceScore` é um **score de 0 a 10** que combina:
- **Intensidade** (qualidade dos matches) - Quão fortes são os sentimentos
- **Abrangência** (quantidade de matches) - Quantos sentimentos esperados o filme tem

**Resultado:** Um score que equilibra qualidade e quantidade, favorecendo filmes com sentimentos **fortes** e **abrangentes**.

---

## 📊 Fórmula Completa

```
relevanceScore = min(Intensidade × √Abrangência + Bônus, 10.0)
```

### Componentes

| Componente | Descrição | Fórmula |
|------------|-----------|---------|
| **Intensidade** | Qualidade dos sentimentos | `(Média^1.5) × 10` |
| **Abrangência** | Cobertura dos sentimentos | `√(Matches/Total)` |
| **Bônus** | Incentivo para boa cobertura | `+0.5 se cobertura ≥ 50%` |
| **Teto** | Limite máximo | `10.0` |

---

## 🔢 Componentes Detalhados

### 1. Intensidade (Base)

**Fórmula:**
```typescript
Intensidade = (Média das Relevâncias)^1.5 × 10
```

**Cálculo:**
1. Pegar todas as relevâncias dos matches únicos
2. Calcular a média
3. Elevar à potência 1.5 (valoriza médias altas)
4. Multiplicar por 10 (escalar para 0-10)

**Exemplo:**
```
Matches: [0.95, 0.90, 0.85]
Média: (0.95 + 0.90 + 0.85) / 3 = 0.90
Intensidade: (0.90)^1.5 × 10 = 8.54
```

**Por que potência 1.5?**

Valoriza filmes com relevâncias altas e penaliza médias baixas:

| Média | Sem Potência | Com Potência 1.5 | Diferença |
|-------|--------------|------------------|-----------|
| 0.90 | 9.0 | 8.54 | -5% ✅ |
| 0.70 | 7.0 | 5.85 | -16% ⬇️ |
| 0.50 | 5.0 | 3.54 | -29% ⬇️⬇️ |

---

### 2. Abrangência (Cobertura)

**Fórmula:**
```typescript
Abrangência = √(Matches Únicos / Total Únicos Esperados)
```

**Cálculo:**
1. Contar quantos SubSentiments únicos o filme tem (por nome)
2. Dividir pelo total de SubSentiments únicos esperados pela JOF
3. Tirar a raiz quadrada (suaviza o impacto)

**Exemplo:**
```
Matches Únicos: 5
Total Esperado: 11
Cobertura: 5 / 11 = 0.455 (45.5%)
√Cobertura: √0.455 = 0.674
```

**Por que raiz quadrada?**

Suaviza a penalização por cobertura parcial:

| Cobertura | Sem Raiz | Com Raiz √ | Diferença |
|-----------|----------|------------|-----------|
| 100% | 1.00 | 1.00 | 0% ✅ |
| 50% | 0.50 | 0.71 | +42% 👍 |
| 25% | 0.25 | 0.50 | +100% 👍 |

---

### 3. Score Base

**Fórmula:**
```typescript
Score Base = Intensidade × √Abrangência
```

**Exemplo:**
```
Intensidade: 8.54
√Abrangência: 0.674
Score Base: 8.54 × 0.674 = 5.756
```

---

### 4. Bônus (Opcional)

**Regra:**
```typescript
Bônus = +0.5 se Cobertura >= 50%
```

**Objetivo:** Incentivar filmes com boa abrangência

**Exemplo:**
```
Cobertura: 45.5% → Sem bônus (0.0)
Cobertura: 54.5% → Com bônus (+0.5)
```

---

### 5. Teto Máximo

**Regra:**
```typescript
Score Final = min(Score Base + Bônus, 10.0)
```

**Objetivo:** Garantir escala consistente de 0 a 10

---

## 📈 Exemplo Completo: "Paterson" (JOF 75)

### Dados de Entrada

**Matches Encontrados:**

| SubSentiment | Relevância |
|--------------|-----------|
| Paz / Contemplação | 0.95 |
| Reflexão Serena | 0.90 |
| Conexão Humana e Natureza | 0.85 |
| Deslumbramento Visual | 0.85 |
| Suavidade / Leveza | 0.85 |

**Total Esperado pela JOF 75:** 11 SubSentiments

---

### Cálculo Passo a Passo

#### Passo 1: Intensidade
```
Média = (0.95 + 0.90 + 0.85 + 0.85 + 0.85) / 5 = 0.88
Intensidade = (0.88)^1.5 × 10 = 8.255
```

#### Passo 2: Abrangência
```
Matches Únicos = 5
Total Esperado = 11
Cobertura = 5 / 11 = 0.455 (45.5%)
√Cobertura = √0.455 = 0.674
```

#### Passo 3: Score Base
```
Score Base = 8.255 × 0.674 = 5.564
```

#### Passo 4: Bônus
```
Cobertura = 45.5% < 50%
Bônus = 0.0 (não se aplica)
```

#### Passo 5: Score Final
```
Score = 5.564 + 0.0 = 5.564
Score = min(5.564, 10.0) = 5.564
Score Final = 5.566 (arredondado)
```

---

## 🎯 Interpretação dos Scores

| Faixa | Classificação | Significado | Emoji |
|-------|---------------|-------------|-------|
| **9.0 - 10.0** | Excepcional | Match perfeito, altíssima qualidade | ⭐⭐⭐ |
| **7.0 - 8.9** | Excelente | Muito bem alinhado com a jornada | ⭐⭐ |
| **6.0 - 6.9** | Muito Bom | Bom match, recomendável | ⭐ |
| **5.0 - 5.9** | Bom | Match adequado | ✅ |
| **4.0 - 4.9** | Regular | Match parcial | 👍 |
| **3.0 - 3.9** | Fraco | Pouco alinhado | ⚠️ |
| **0.0 - 2.9** | Incompatível | Não recomendado | ❌ |

---

## 🔍 Casos Especiais

### Caso 1: Alta Intensidade, Baixa Cobertura

**Cenário:** Filme tem sentimentos **fortes**, mas **poucos** dos esperados.

```
Matches: [0.95, 0.90] (apenas 2)
Total Esperado: 11

Média: 0.925
Intensidade: (0.925)^1.5 × 10 = 8.89
Cobertura: 2/11 = 0.182 (18.2%)
√Cobertura: 0.427
Score: 8.89 × 0.427 = 3.80 ⚠️
```

**Resultado:** Score baixo apesar da alta qualidade dos sentimentos.

---

### Caso 2: Baixa Intensidade, Alta Cobertura

**Cenário:** Filme tem **muitos** sentimentos esperados, mas **fracos**.

```
Matches: [0.60, 0.55, 0.50, 0.55, 0.60, 0.50] (6 de 11)

Média: 0.55
Intensidade: (0.55)^1.5 × 10 = 4.08
Cobertura: 6/11 = 0.545 (54.5%)
√Cobertura: 0.738
Bônus: +0.5 (cobertura > 50%)
Score: 4.08 × 0.738 + 0.5 = 3.51 ⚠️
```

**Resultado:** Score baixo apesar da boa cobertura.

---

### Caso 3: Equilíbrio Perfeito

**Cenário:** Bom equilíbrio entre **qualidade** e **quantidade**.

```
Matches: [0.90, 0.85, 0.85, 0.80, 0.80, 0.75] (6 de 11)

Média: 0.825
Intensidade: (0.825)^1.5 × 10 = 7.50
Cobertura: 6/11 = 0.545 (54.5%)
√Cobertura: 0.738
Bônus: +0.5
Score: 7.50 × 0.738 + 0.5 = 6.04 ⭐
```

**Resultado:** Score bom com equilíbrio ideal.

---

## 💡 Vantagens da Fórmula

### ✅ 1. Valoriza Qualidade
- Potência 1.5 na média favorece relevâncias altas
- Filmes com sentimentos **fortes** pontuam melhor
- Penaliza médias medianas

### ✅ 2. Considera Quantidade
- Raiz quadrada suaviza a penalização por cobertura parcial
- Filmes com **boa abrangência** são recompensados
- Não exige cobertura 100%

### ✅ 3. Incentiva Completude
- Bônus de +0.5 para cobertura ≥ 50%
- Estimula filmes que cobrem **metade ou mais** dos sentimentos
- Recompensa diversidade emocional

### ✅ 4. Escala Consistente
- Teto de 10.0 garante comparabilidade
- Scores sempre entre 0 e 10
- Fácil interpretação

### ✅ 5. Denominador Fixo
- Usa o tamanho da **Lista Oficial da JOF**
- Scores são **comparáveis** entre filmes da mesma jornada
- Não depende do número de matches encontrados

---

## 🎓 Resumo Executivo

### Fórmula Simplificada

```typescript
relevanceScore = min(
  (Média^1.5 × 10) × √(Matches/Total) + Bônus,
  10.0
)
```

### Variáveis

| Variável | Descrição | Tipo |
|----------|-----------|------|
| **Média** | Média das relevâncias dos matches únicos | 0.0 - 1.0 |
| **Matches** | Quantidade de SubSentiments únicos encontrados | Integer |
| **Total** | Quantidade de SubSentiments únicos esperados pela JOF | Integer |
| **Bônus** | +0.5 se Matches/Total ≥ 50% | 0.0 ou 0.5 |

### Resultado

- **Score:** 0 a 10
- **Equilibra:** Qualidade (intensidade) + Quantidade (abrangência)
- **Favorece:** Filmes com sentimentos **fortes** e **abrangentes**

---

## 🛠️ Implementação

### Arquivo
```
src/scripts/recalculateRelevanceScore.ts
```

### Função Principal
```typescript
calculateRelevanceScore(
  movieSentiments: MovieSentiment[],
  totalExpectedSubSentiments: number
): number
```

### Parâmetros

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `movieSentiments` | `MovieSentiment[]` | Array de sentimentos do filme com relevâncias |
| `totalExpectedSubSentiments` | `number` | Total de SubSentiments únicos esperados pela JOF |

### Retorno

- **Tipo:** `number`
- **Valor:** 0.0 a 10.0
- **Precisão:** 3 casas decimais

---

## 📊 Tabela de Referência Rápida

### Impacto da Média (Intensidade)

| Média | Intensidade | Impacto |
|-------|-------------|---------|
| 0.95 | 9.27 | Excelente ⭐⭐⭐ |
| 0.90 | 8.54 | Muito Bom ⭐⭐ |
| 0.85 | 7.83 | Bom ⭐ |
| 0.80 | 7.16 | Adequado ✅ |
| 0.70 | 5.85 | Regular 👍 |
| 0.60 | 4.65 | Fraco ⚠️ |
| 0.50 | 3.54 | Muito Fraco ❌ |

### Impacto da Cobertura (Abrangência)

| Cobertura | √Cobertura | Multiplicador |
|-----------|------------|---------------|
| 100% | 1.00 | 1.00x ✅ |
| 75% | 0.87 | 0.87x |
| 50% | 0.71 | 0.71x + Bônus |
| 25% | 0.50 | 0.50x |
| 10% | 0.32 | 0.32x ⚠️ |

---

## 🎯 Quando Usar

### Recalcular Score
```bash
# Recalcular score de um filme específico
npx ts-node src/scripts/recalculateRelevanceScore.ts "Paterson" 2016 75

# Recalcular todos os filmes de uma JOF
npx ts-node src/scripts/recalculateRelevanceScore.ts --jof=75
```

### Analisar Sentimentos
```bash
# Análise inicial já calcula o score
npx ts-node src/scripts/analyzeMovieSentiments.ts 245891 75 15
```

### Curadoria Automatizada
```bash
# Orchestrator calcula score automaticamente
npx ts-node src/scripts/orchestrator.ts \
  --title="Paterson" \
  --year=2016 \
  --journeyOptionFlowId=75 \
  --analysisLens=15 \
  --journeyValidation=15
```

---

## 💡 Dicas Práticas

### Para Obter Scores Altos (8.0+)

1. **Alta Média de Relevâncias:** ≥ 0.85
2. **Boa Cobertura:** ≥ 50% (para ganhar bônus)
3. **Sentimentos Fortes:** Evitar relevâncias < 0.70
4. **Diversidade:** Cobrir vários SubSentiments esperados

### Para Entender Scores Baixos

1. **Verificar Média:** Se < 0.70, sentimentos são fracos
2. **Verificar Cobertura:** Se < 25%, poucos matches
3. **Analisar Matches:** Quais SubSentiments estão faltando?
4. **Considerar Outro JOF:** Talvez o filme se encaixe melhor em outra jornada

---

## 📚 Referências

### Documentação Relacionada
- **[README_CURADORIA.md](file:///home/cabrazil/newprojs/fav_movies/moviesf_back/docs/README_CURADORIA.md)** - Sistema de curadoria completo
- **[FORMULA_RELEVANCE_SCORE.md](file:///home/cabrazil/newprojs/fav_movies/moviesf_back/docs/FORMULA_RELEVANCE_SCORE.md)** - Documentação original

### Scripts Relacionados
- `recalculateRelevanceScore.ts` - Recalcula scores
- `analyzeMovieSentiments.ts` - Analisa sentimentos e calcula score inicial
- `orchestrator.ts` - Curadoria completa com cálculo de score

---

**Relevance Score Formula v1.0** - Última atualização: 2026-01-06 📐

# 📐 Fórmula de Cálculo do relevanceScore

## 🎯 Visão Geral

O `relevanceScore` é calculado usando uma fórmula que combina **Intensidade** (qualidade dos matches) com **Abrangência** (quantidade de matches), resultando em um score de 0 a 10.

---

## 📊 Fórmula Completa

```
relevanceScore = min(Intensidade × √Abrangência + Bônus, 10.0)
```

Onde:
- **Intensidade**: Mede a força/qualidade dos sentimentos no filme
- **Abrangência**: Mede a cobertura dos sentimentos esperados pela jornada
- **Bônus**: Incentivo para filmes com boa cobertura
- **Teto**: Máximo de 10.0

---

## 🔢 Componentes da Fórmula

### **1. Intensidade (Base)**

```typescript
Intensidade = (Média das Relevâncias)^1.5 × 10
```

**Cálculo:**
1. Pegar todas as relevâncias dos matches únicos
2. Calcular a média
3. Elevar à potência 1.5 (para valorizar médias altas)
4. Multiplicar por 10 (escalar para 0-10)

**Exemplo:**
```
Matches: [0.95, 0.90, 0.85]
Média: (0.95 + 0.90 + 0.85) / 3 = 0.90
Intensidade: (0.90)^1.5 × 10 = 0.854 × 10 = 8.54
```

**Por que potência 1.5?**
- Valoriza filmes com relevâncias **altas**
- Penaliza filmes com relevâncias **medianas**
- Exemplo:
  - Média 0.90: (0.90)^1.5 = 0.854 ✅
  - Média 0.70: (0.70)^1.5 = 0.585 ⬇️
  - Média 0.50: (0.50)^1.5 = 0.354 ⬇️⬇️

---

### **2. Abrangência (Cobertura)**

```typescript
Abrangência = √(Matches Únicos / Total Únicos Esperados)
```

**Cálculo:**
1. Contar quantos SubSentiments únicos o filme tem (por nome)
2. Dividir pelo total de SubSentiments únicos esperados pela JOF
3. Tirar a raiz quadrada (para suavizar o impacto)

**Exemplo:**
```
Matches Únicos: 5
Total Esperado: 11
Cobertura: 5 / 11 = 0.455 (45.5%)
√Cobertura: √0.455 = 0.674
```

**Por que raiz quadrada?**
- Suaviza a penalização por cobertura parcial
- Exemplo:
  - 100% cobertura: √1.0 = 1.0 ✅
  - 50% cobertura: √0.5 = 0.707 (não tão ruim)
  - 25% cobertura: √0.25 = 0.5 (penalizado)

---

### **3. Score Base**

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

### **4. Bônus (Opcional)**

```typescript
Bônus = +0.5 se Cobertura >= 50%
```

**Regra:**
- Se o filme cobrir **50% ou mais** dos SubSentiments esperados
- Adiciona **+0.5** ao score
- Incentiva filmes com boa abrangência

**Exemplo:**
```
Cobertura: 45.5% → Sem bônus (0.0)
Cobertura: 54.5% → Com bônus (+0.5)
```

---

### **5. Teto Máximo**

```typescript
Score Final = min(Score Base + Bônus, 10.0)
```

**Regra:**
- O score nunca pode ultrapassar **10.0**
- Garante escala consistente

---

## 📈 Exemplo Completo: "Paterson" (JOF 75)

### **Dados de Entrada**

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

### **Passo 1: Intensidade**

```
Média = (0.95 + 0.90 + 0.85 + 0.85 + 0.85) / 5 = 0.88
Intensidade = (0.88)^1.5 × 10
            = 0.8255 × 10
            = 8.255
```

---

### **Passo 2: Abrangência**

```
Matches Únicos = 5
Total Esperado = 11
Cobertura = 5 / 11 = 0.455 (45.5%)
√Cobertura = √0.455 = 0.674
```

---

### **Passo 3: Score Base**

```
Score Base = 8.255 × 0.674
           = 5.564
```

---

### **Passo 4: Bônus**

```
Cobertura = 45.5% < 50%
Bônus = 0.0 (não se aplica)
```

---

### **Passo 5: Score Final**

```
Score = 5.564 + 0.0 = 5.564
Score = min(5.564, 10.0) = 5.564
Score = 5.566 (arredondado para 3 casas)
```

---

## 🎯 Interpretação dos Scores

| Faixa | Classificação | Significado |
|-------|---------------|-------------|
| **9.0 - 10.0** | ⭐⭐⭐ Excepcional | Match perfeito, altíssima qualidade |
| **7.0 - 8.9** | ⭐⭐ Excelente | Muito bem alinhado com a jornada |
| **6.0 - 6.9** | ⭐ Muito Bom | Bom match, recomendável |
| **5.0 - 5.9** | ✅ Bom | Match adequado |
| **4.0 - 4.9** | 👍 Regular | Match parcial |
| **3.0 - 3.9** | ⚠️ Fraco | Pouco alinhado |
| **0.0 - 2.9** | ❌ Incompatível | Não recomendado |

---

## 🔍 Casos Especiais

### **Caso 1: Alta Intensidade, Baixa Cobertura**

```
Matches: [0.95, 0.90] (apenas 2)
Total Esperado: 11
Média: 0.925
Intensidade: (0.925)^1.5 × 10 = 8.89
Cobertura: 2/11 = 0.182 (18.2%)
√Cobertura: 0.427
Score: 8.89 × 0.427 = 3.80 ⚠️
```

**Interpretação**: Filme tem sentimentos **fortes**, mas **poucos** dos esperados.

---

### **Caso 2: Baixa Intensidade, Alta Cobertura**

```
Matches: [0.60, 0.55, 0.50, 0.55, 0.60, 0.50] (6 de 11)
Média: 0.55
Intensidade: (0.55)^1.5 × 10 = 4.08
Cobertura: 6/11 = 0.545 (54.5%)
√Cobertura: 0.738
Bônus: +0.5 (cobertura > 50%)
Score: 4.08 × 0.738 + 0.5 = 3.51 ⚠️
```

**Interpretação**: Filme tem **muitos** sentimentos esperados, mas **fracos**.

---

### **Caso 3: Equilíbrio Perfeito**

```
Matches: [0.90, 0.85, 0.85, 0.80, 0.80, 0.75] (6 de 11)
Média: 0.825
Intensidade: (0.825)^1.5 × 10 = 7.50
Cobertura: 6/11 = 0.545 (54.5%)
√Cobertura: 0.738
Bônus: +0.5
Score: 7.50 × 0.738 + 0.5 = 6.04 ⭐
```

**Interpretação**: Bom equilíbrio entre **qualidade** e **quantidade**.

---

## 💡 Vantagens da Fórmula

### ✅ **1. Valoriza Qualidade**
- Potência 1.5 na média favorece relevâncias altas
- Filmes com sentimentos **fortes** pontuam melhor

### ✅ **2. Considera Quantidade**
- Raiz quadrada suaviza a penalização por cobertura parcial
- Filmes com **boa abrangência** são recompensados

### ✅ **3. Incentiva Completude**
- Bônus de +0.5 para cobertura >= 50%
- Estimula filmes que cobrem **metade ou mais** dos sentimentos

### ✅ **4. Escala Consistente**
- Teto de 10.0 garante comparabilidade
- Scores sempre entre 0 e 10

### ✅ **5. Denominador Fixo**
- Usa o tamanho da **Lista Oficial da JOF**
- Scores são **comparáveis** entre filmes da mesma jornada

---

## 🎓 Resumo Executivo

```
relevanceScore = min(
  (Média^1.5 × 10) × √(Matches/Total) + Bônus,
  10.0
)
```

**Onde:**
- **Média**: Média das relevâncias dos matches únicos
- **Matches**: Quantidade de SubSentiments únicos encontrados
- **Total**: Quantidade de SubSentiments únicos esperados pela JOF
- **Bônus**: +0.5 se Matches/Total >= 50%

**Resultado:**
- Score de **0 a 10**
- Equilibra **qualidade** (intensidade) e **quantidade** (abrangência)
- Favorece filmes com sentimentos **fortes** e **abrangentes**

---

**Última atualização**: 2026-01-06
**Arquivo**: `recalculateRelevanceScore.ts`
**Função**: `calculateRelevanceScore()`

# Recálculo de Relevance Score

## Descrição
Script para recalcular o `relevanceScore` na tabela `MovieSuggestionFlow` com base nos pesos reais dos `SubSentiments` que o filme possui.

## Fórmula
```
Score = (Média dos Pesos)^1.5 × 10
+ Bônus de 0.2 se matches > 5
Teto máximo: 10.0
```

## Fluxo de Cálculo

1. **Passo A (A Ponte)**: Buscar na `JourneyOptionFlowSubSentiment` todos os `subSentimentId` associados ao `journeyOptionFlowId`
2. **Passo B (O DNA)**: Na `MovieSentiment`, buscar os `relevance` (pesos) do filme que correspondam aos SubSentiments encontrados
3. **Passo C (O Cálculo)**: 
   - Calcular a média simples dos pesos encontrados
   - Aplicar a fórmula: `Score = (Média)^1.5 × 10`
   - Se houver mais de 5 matches, somar `+0.2` ao score final
   - Aplicar teto de `10.0`
4. **Atualização**: Se o novo score for maior que o atual, fazer UPDATE no banco

## Parâmetros

### Obrigatórios (um dos dois)
- `--movieId=ID`: ID do filme a recalcular
- `--journeyId=ID`: ID da jornada (recalcula todos os filmes dessa jornada)

### Opcionais
- `--jofId=ID`: ID da JourneyOptionFlow (só funciona com --movieId, recalcula apenas essa jornada específica do filme)
- `--minScore=5.0`: Só processar sugestões com score atual menor que este valor (padrão: 5.0)
- `--dry-run`: Apenas mostra os novos scores no console, sem gravar no banco

## Exemplos de Uso

### 1. Dry-run (Visualizar sem gravar) - Um filme
```bash
npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --movieId=abc123 --dry-run
```

### 2. Recalcular apenas UMA jornada de um filme (cirúrgico!)
```bash
npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --movieId=abc123 --jofId=42 --dry-run
```

### 3. Recalcular apenas scores baixos (< 3.0) - Um filme
```bash
npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --movieId=abc123 --minScore=3.0
```

### 4. Recalcular todos os scores abaixo de 5.0 (padrão) - Um filme
```bash
npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --movieId=abc123
```

### 5. Recalcular todos os filmes de uma jornada (dry-run)
```bash
npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --journeyId=42 --dry-run
```

### 6. Recalcular todos os filmes de uma jornada com scores baixos
```bash
npm run script:prod -- src/scripts/recalculateRelevanceScore.ts --journeyId=42 --minScore=3.0
```

### 7. Ambiente de Desenvolvimento
```bash
npm run script:dev -- src/scripts/recalculateRelevanceScore.ts --movieId=abc123 --jofId=42 --dry-run
```

## Casos de Uso

### 1. Teste Inicial (Dry-run)
Sempre comece com `--dry-run` para ver o impacto antes de gravar

### 2. Correção de Scores Baixos
Se você identificou que scores abaixo de 3.0 estão descalibrados

### 3. Recalibração Completa
Para recalcular todos os scores de um filme

## Notas Importantes

1. **Atualização Condicional**: O script só atualiza se o novo score for **maior** que o atual
2. **Filtro de Score**: Use `--minScore` para evitar processar sugestões que já estão bem calibradas
3. **Segurança**: Sempre use `--dry-run` primeiro para validar os cálculos
4. **Matches**: O número de matches mostra quantos SubSentiments o filme possui vs. quantos a jornada espera
5. **Bônus**: O bônus de +0.2 só é aplicado quando há mais de 5 matches (amplitude emocional)

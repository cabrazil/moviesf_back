# Provedores de IA - OpenAI, Gemini e DeepSeek

Este documento explica como usar os diferentes provedores de IA (OpenAI, Gemini e DeepSeek) no sistema de curadoria de filmes.

## Visão Geral

O sistema agora suporta três provedores de IA:
- **OpenAI** (padrão): Usa GPT-4-turbo para análise de sentimentos e geração de reflexões
- **Gemini**: Usa Gemini Pro para as mesmas funcionalidades
- **DeepSeek**: Usa DeepSeek Chat para análise de sentimentos e geração de reflexões

## Configuração

### 1. Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no seu arquivo `.env`:

```env
# OpenAI (obrigatório se usar OpenAI)
OPENAI_API_KEY=sua_chave_openai

# Gemini (obrigatório se usar Gemini)
GEMINI_API_KEY=sua_chave_gemini

# DeepSeek (obrigatório se usar DeepSeek)
DEEPSEEK_API_KEY=sua_chave_deepseek
```

### 2. Escolha do Provedor

Você pode escolher o provedor de três formas:

#### Opção 1: Argumento de linha de comando
```bash
# Usar OpenAI
npx ts-node orchestrator.ts --title="Filme" --year=2023 --ai-provider=openai

# Usar Gemini
npx ts-node orchestrator.ts --title="Filme" --year=2023 --ai-provider=gemini

# Usar DeepSeek
npx ts-node orchestrator.ts --title="Filme" --year=2023 --ai-provider=deepseek
```

#### Opção 2: Variável de ambiente
```bash
# Definir OpenAI como padrão
export AI_PROVIDER=openai

# Definir Gemini como padrão
export AI_PROVIDER=gemini

# Definir DeepSeek como padrão
export AI_PROVIDER=deepseek
```

#### Opção 3: Padrão
Se nenhuma das opções acima for especificada, o sistema usará **OpenAI** como padrão.

## Comparação de Qualidade

### Análise de Sentimentos
- **OpenAI GPT-4**: Excelente compreensão de contexto emocional
- **Gemini Pro**: Muito boa compreensão, ligeiramente inferior ao GPT-4
- **DeepSeek Chat**: Excelente compreensão emocional, criativo e preciso

### Geração de Reflexões
- **OpenAI GPT-4**: Textos concisos e inspiradores
- **Gemini Pro**: Textos de qualidade similar, às vezes mais criativos
- **DeepSeek Chat**: Textos muito criativos e envolventes, excelente para hooks

### Estruturação JSON
- **OpenAI**: Excelente aderência ao formato solicitado
- **Gemini**: Muito boa, ocasionalmente precisa de ajustes no prompt
- **DeepSeek**: Excelente aderência ao formato, muito consistente

## Testando os Provedores

Execute o script de teste para comparar os resultados:

```bash
npx ts-node src/scripts/testAIProviders.ts
```

Este script irá:
1. Testar ambos os provedores com o mesmo prompt
2. Comparar tempos de resposta
3. Mostrar as diferenças na qualidade das respostas

## Exemplos de Uso

### Curadoria com OpenAI
```bash
npx ts-node orchestrator.ts \
  --title="O Poderoso Chefão" \
  --year=1972 \
  --journeyOptionFlowId=81 \
  --analysisLens=14 \
  --journeyValidation=15 \
  --ai-provider=openai
```

### Curadoria com Gemini
```bash
npx ts-node orchestrator.ts \
  --title="O Poderoso Chefão" \
  --year=1972 \
  --journeyOptionFlowId=81 \
  --analysisLens=14 \
  --journeyValidation=15 \
  --ai-provider=gemini
```

### Curadoria com DeepSeek
```bash
npx ts-node orchestrator.ts \
  --title="O Poderoso Chefão" \
  --year=1972 \
  --journeyOptionFlowId=81 \
  --analysisLens=14 \
  --journeyValidation=15 \
  --ai-provider=deepseek
```

### Scripts individuais
```bash
# Análise de sentimentos
npx ts-node analyzeMovieSentiments.ts "movieId" "journeyOptionFlowId" "mainSentimentId" --ai-provider=gemini

# Curadoria automática
npx ts-node discoverAndCurateAutomated.ts "Título" "2023" "sentimentId" "journeyOptionFlowId" --ai-provider=gemini

# Análise de sentimentos com DeepSeek
npx ts-node analyzeMovieSentiments.ts "movieId" "journeyOptionFlowId" "mainSentimentId" --ai-provider=deepseek

# Curadoria automática com DeepSeek
npx ts-node discoverAndCurateAutomated.ts "Título" "2023" "sentimentId" "journeyOptionFlowId" --ai-provider=deepseek
```

## Custos e Limitações

### OpenAI
- **Custo**: ~$0.03 por 1K tokens (GPT-4)
- **Limite**: 10 requests/minuto (gratuito)
- **Qualidade**: Excelente para análise emocional

### Gemini
- **Custo**: Gratuito (até 15 requests/minuto)
- **Limite**: 15 requests/minuto
- **Qualidade**: Muito boa, ligeiramente inferior ao GPT-4

### DeepSeek
- **Custo**: Muito baixo (~$0.001 por 1K tokens)
- **Limite**: 100 requests/minuto
- **Qualidade**: Excelente, comparável ao GPT-4

## Recomendações

1. **Para desenvolvimento/testes**: Use Gemini (gratuito) ou DeepSeek (muito barato)
2. **Para produção**: Use OpenAI (melhor qualidade) ou DeepSeek (excelente custo-benefício)
3. **Para comparação**: Execute testes com todos os provedores
4. **Para economia**: Use DeepSeek (melhor custo-benefício) ou Gemini para tarefas simples
5. **Para criatividade**: Use DeepSeek (excelente para hooks e reflexões criativas)

## Troubleshooting

### Erro de API Key
```
Erro na API openai: 401 Unauthorized
```
**Solução**: Verifique se a `OPENAI_API_KEY` está configurada corretamente.

### Erro de API Key DeepSeek
```
Erro na API deepseek: 401 Unauthorized
```
**Solução**: Verifique se a `DEEPSEEK_API_KEY` está configurada corretamente.

### Erro de Rate Limit
```
Erro na API gemini: 429 Too Many Requests
```
**Solução**: Aguarde alguns minutos antes de fazer novas requisições.

### Erro de Parse JSON
```
Erro ao fazer parse da resposta JSON
```
**Solução**: O provedor pode ter retornado um formato inesperado. Verifique os logs para ver a resposta completa.

## Arquivos Modificados

- `src/utils/aiProvider.ts`: Gerenciador unificado de provedores
- `src/scripts/analyzeMovieSentiments.ts`: Suporte a múltiplos provedores
- `src/scripts/discoverAndCurateAutomated.ts`: Suporte a múltiplos provedores
- `src/scripts/orchestrator.ts`: Passagem de parâmetros de provedor
- `src/scripts/testAIProviders.ts`: Script de teste e comparação

## Configuração do DeepSeek

### Modelo
- **Modelo usado**: `deepseek-chat`
- **Temperature**: 1.0 (configurado para máxima criatividade)
- **Max Tokens**: 2000

### Características Especiais
- **Excelente para análise emocional**: Compreende nuances complexas de sentimentos
- **Muito criativo**: Gera hooks e reflexões envolventes
- **Custo-benefício**: Muito mais barato que OpenAI com qualidade similar
- **Consistência**: Excelente aderência a formatos JSON solicitados 
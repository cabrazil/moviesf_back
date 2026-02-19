---
name: movie-curation
description: Sistema de curadoria automatizada de filmes usando IA híbrida (OpenAI + Gemini + DeepSeek) para análise de sentimentos e intenções emocionais
---

# 🎬 Skill: Movie Curation System - vibesfilm

## Objetivo

Dominar o sistema de curadoria automatizada de filmes do vibesfilm, que utiliza inteligência artificial híbrida para analisar e categorizar filmes baseado em sentimentos e intenções emocionais.

## Visão Geral

O sistema de curadoria é uma ferramenta automatizada que:
- ✅ Utiliza **IA híbrida** (OpenAI GPT-4 + Google Gemini + DeepSeek)
- ✅ Analisa filmes baseado em **sentimentos e intenções emocionais**
- ✅ É **escalável, manutenível e economicamente eficiente**
- ✅ Processa filmes usando **TMDB ID** para máxima eficiência

## Arquitetura do Sistema

### Componentes Principais

#### 1. 🎬 Orquestrador Central
**Arquivo:** `src/scripts/orchestrator.ts`

- Sistema automatizado completo de curadoria
- Seleção inteligente de AI provider (OpenAI/Gemini/DeepSeek/Auto)
- Processamento por `tmdbId` para máxima eficiência
- Validação e retry automático

#### 2. 🤖 Sistema de AI Providers
**Arquivo:** `src/utils/aiProvider.ts`

- **Suporte:** OpenAI (GPT-4) + Google Gemini + DeepSeek
- **Seleção automática** baseada em contexto do filme
- **Otimização** de custos e qualidade
- **Configuração específica** por gênero

**Quando usar cada provider:**

| Provider | Casos de Uso | Exemplos |
|----------|--------------|----------|
| **OpenAI** | Coming-of-age, thrillers psicológicos, dramas complexos, lente 16 (Ansioso) | "Lady Bird", "As Vantagens de Ser Invisível" |
| **DeepSeek** | Romance/Comédia, Família/Animação, Ação/Aventura, lentes 13 (Feliz) e 17 (Animado) | "John Wick", "Mad Max", filmes leves |
**USe como padrão, deepseek, a menos que o usuário especifique o contrário**
#### 3. 📊 Scripts de Processamento

| Script | Função | Uso |
|--------|--------|-----|
| `populateMovies.ts` | Adiciona filmes usando TMDB ID | Busca e insere filme no banco |
| `analyzeMovieSentiments.ts` | Análise de sentimentos com IA | Analisa emoções e sugere subsentimentos |
| `discoverAndCurateAutomated.ts` | Curadoria automatizada completa | Valida e gera reflexão final |
| `orchestrator.ts` | **Orquestrador principal** | **Executa todo o fluxo automaticamente** |

#### 4. 🛠️ Ferramentas de Suporte

| Ferramenta | Função |
|------------|--------|
| `testAIProviders.ts` | Comparação OpenAI vs Gemini vs DeepSeek |
| `duplicateMovieSuggestion.ts` | Duplicação de sugestões entre jornadas |
| `healthCheck.ts` | Verificação de integridade do sistema |
| `reprocessMovieSentiments.ts` | Reprocessa relevanceScore e reflexão |
| `rephrase_reasons` | Refaz as reflexões |

## 🚀 Como Usar: Processo de Curadoria

### Comando Principal (Recomendado)

```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="John Wick" \
  --year=2014 \
  --journeyOptionFlowId=26 \
  --analysisLens=17 \
  --journeyValidation=13 \
  --ai-provider=deepseek
```

### Parâmetros do Orchestrator

| Parâmetro | Descrição | Exemplo | Obrigatório |
|-----------|-----------|---------|-------------|
| `--title` | Título do filme | `"John Wick"` | ✅ |
| `--year` | Ano de lançamento | `2014` | ✅ |
| `--journeyOptionFlowId` | ID da opção de jornada | `26` | ✅ |
| `--analysisLens` | Lente de análise (ID do MainSentiment) | `17` (Animado) | ✅ |
| `--journeyValidation` | Sentimento de validação | `13` (Feliz) | ✅ |
| `--ai-provider` | Provider de IA | `deepseek`/`openai`/`gemini`/`auto` | ❌ (default: auto) |
| `--approve-new-subsentiments` | Aprovar novos subsentimentos | Flag opcional | ❌ |

### Lentes de Análise (MainSentiment IDs)

| ID | Sentimento | Quando Usar |
|----|------------|-------------|
| 13 | Feliz | Filmes positivos, alegres, românticos |
| 14 | Triste | Dramas, filmes emocionais |
| 15 | Calmo | Filmes contemplativos, relaxantes |
| 16 | Ansioso | Suspense, thrillers, tensão |
| 17 | Animado | Ação, aventura, energia |

## 📋 Etapas do Processo Automatizado

O orchestrator executa automaticamente 4 etapas:

### Etapa 1: Adição do Filme
```bash
# Executado internamente pelo orchestrator
populateMovies.ts --title="John Wick" --year=2014
```

**O que faz:**
- ✅ Busca no TMDB por título/ano
- ✅ Captura: diretor, gêneros, keywords, ratings (IMDb, RT, Metacritic)
- ✅ Retorna `TMDB_ID_FOUND: 245891`

### Etapa 2: Análise de Sentimentos
```bash
# Executado internamente pelo orchestrator
analyzeMovieSentiments.ts 245891 26 17 --ai-provider=auto
```

**O que faz:**
- ✅ Busca filme por `tmdbId`
- ✅ Seleção automática de AI provider
- ✅ Análise contextual usando lente especificada
- ✅ Sugere subsentimentos (ex: "Adrenalina / Emoção Intensa")

### Etapa 3: Execução de INSERTs
```bash
# Executado internamente pelo orchestrator
executeSqlFromFile.ts inserts.sql
```

**O que faz:**
- ✅ Insere `MovieSentiment` para filme
- ✅ Atualiza `JourneyOptionFlowSubSentiment` com pesos
- ✅ Tratamento de duplicatas e erros

### Etapa 4: Curadoria Final
```bash
# Executado internamente pelo orchestrator
discoverAndCurateAutomated.ts 245891 13 --ai-provider=deepseek
```

**O que faz:**
- ✅ Valida compatibilidade filme-jornada
- ✅ Gera reflexão personalizada com IA
- ✅ Cria `MovieSuggestionFlow` final

## 🔧 Exemplos Práticos

### Exemplo 1: Filme de Ação (Auto-DeepSeek)
```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="John Wick" \
  --year=2014 \
  --journeyOptionFlowId=26 \
  --analysisLens=17 \
  --journeyValidation=13 \
  --ai-provider=deepseek

# Sistema escolhe: DEEPSEEK (ação + animado)
# Resultado: "Adrenalina / Emoção Intensa", "Deslumbramento Visual"
```

### Exemplo 2: Drama Coming-of-Age (Auto-OpenAI)
```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="Lady Bird" \
  --year=2017 \
  --journeyOptionFlowId=25 \
  --analysisLens=14 \
  --journeyValidation=13 \
  --ai-provider=auto

# Sistema escolhe: OPENAI (coming-of-age complexo)
# Resultado: "Autodescoberta e Crescimento", "Esperança e Superação"
```

### Exemplo 3: Romance (Manual-Gemini)
```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="O Fabuloso Destino de Amélie Poulain" \
  --year=2001 \
  --journeyOptionFlowId=25 \
  --analysisLens=13 \
  --journeyValidation=13 \
  --ai-provider=deepseek

# Gemini manual: Otimizado para romance
# Resultado: "Doçura / Encanto", "Conforto / Aconchego Emocional"
```

## 🧠 Conceitos Fundamentais

### 1. TMDB ID como Chave Primária
- **Identificador único** e eficiente do filme
- **Substitui** busca por title/year para maior precisão
- **Evita** duplicatas e conflitos de nome

### 2. Lente de Análise (Analysis Lens)
- Sentimento principal usado para **guiar a IA**
- Determina como o filme será **interpretado emocionalmente**
- Define o **contexto** da análise

### 3. Journey Option Flow
- Representa uma **pergunta específica** na jornada do usuário
- Ex: "filmes que sejam empolgantes e cheios de energia?"
- Conecta filme à **experiência emocional desejada**

### 4. Validação de Sentimento
- Sentimento final onde o usuário deve **chegar**
- Garante que o filme leva à **experiência emocional correta**

### 5. SubSentiments
- **Nuances emocionais** específicas do filme
- Criados automaticamente pela IA ou reutilizados
- Têm **pesos** que indicam intensidade (0-10)

## 💰 Otimização de Custos

### Estratégia Híbrida
- **DeepSeek**: Custo ~80% menor que OpenAI
- **OpenAI**: Reservado para casos complexos

### Métricas de Economia

| Categoria | Provider Recomendado | Economia |
|-----------|---------------------|----------|
| Romance/Comédia | 100% DeepSeek | Máxima |
| Ação/Aventura | 90% DeepSeek | Alta |
| Coming-of-age | 100% OpenAI | Qualidade prioritária |
| Drama psicológico | 100% OpenAI | Precisão necessária |

## 📊 Sistema de Monitoramento

### Logs Estruturados
```
🎬 === ORQUESTRADOR DE CURADORIA DE FILMES ===
📋 Processando 1 filmes...
🔄 Processando: John Wick (2014)
🎯 TMDB ID capturado: 245891
🤖 AI Provider selecionado automaticamente: DEEPSEEK
📊 Baseado em: Gêneros [Ação], Lente 17
✅ Filme processado com sucesso
```

### Validação Automática
- ✅ Verificação de parâmetros obrigatórios
- ✅ Validação de IDs existentes no banco
- ✅ Detecção de filmes já processados
- ✅ Matching de subsentimentos existentes

### Tratamento de Erros
- 🔄 Retry automático para APIs
- 📝 Logs detalhados de falhas
- ⚠️ Validação de novos subsentimentos
- 🛡️ Fallback entre providers

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. JSON Inválido do Gemini
```
Erro: SyntaxError: Unexpected end of JSON input
Solução: Verificar stopSequences removido, maxTokens suficiente
```

#### 2. Subsentimento Duplicado
```
Erro: "Suspense Crescente" já existe em mainSentiment diferente
Solução: Não aprovar com --approve-new-subsentiments
```

#### 3. TMDB_ID_FOUND não capturado
```
Erro: orchestrator.ts passa title em vez de tmdbId
Solução: Verificar regex de captura TMDB_ID_FOUND
```

#### 4. AI Provider 401/404
```
Erro: Request failed with status code 401
Solução: Verificar .env carregado, keys válidas
```

### Debug Detalhado
```bash
# Ativar logs verbose
DEBUG=true npx ts-node src/scripts/orchestrator.ts [params]

# Verificar configuração
npx ts-node src/scripts/testConnection.ts

# Validar AI providers
npx ts-node src/scripts/testAIProviders.ts
```

## ⚙️ Configuração

### Variáveis de Ambiente Necessárias
```env
# Banco de dados
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# APIs obrigatórias
OPENAI_API_KEY="sk-..."
TMDB_API_KEY="your-tmdb-key"

# APIs opcionais
GEMINI_API_KEY="your-gemini-key"
DEEPSEEK_API_KEY="your-deepseek-key"
OMDB_API_KEY="your-omdb-key"

# Configuração padrão de AI
AI_PROVIDER="auto"  # openai|gemini|deepseek|auto
```

## 📈 Métricas e Performance

### Tempos de Processamento
- **OpenAI**: ~2-4 segundos por análise
- **Gemini**: ~1-3 segundos por análise
- **DeepSeek**: ~1-2 segundos por análise
- **Total**: ~30-60 segundos por filme completo

### Taxa de Sucesso
- **Busca TMDB**: ~95% para filmes conhecidos
- **Análise IA**: ~98% com retry automático
- **Curadoria**: ~95% para filmes com dados completos

### Qualidade dos Resultados
- **OpenAI**: Explicações mais detalhadas, menos novos subsentimentos
- **Gemini**: Sugestões criativas, às vezes redundantes
- **DeepSeek**: Balanceamento entre custo e qualidade

## 🛠️ Ferramentas Auxiliares

### Teste de AI Providers
```bash
# Comparação direta entre providers
npx ts-node src/scripts/testAIProviders.ts

# Resultado mostra:
# - Tempo de resposta
# - Qualidade das sugestões
# - Custo estimado
# - Formato da resposta
```

### Duplicação de Sugestões
```bash
# Duplicar sugestão existente para a jornada 61, exemplo
# --journeyOptionFlowId=61 --> destino
# --baseJourneyOptionFlowId=6 --> origem
# para descobrir a origem precisa olhar a tabela MovieSuggestionFlow e capturar um código journeyOptionFlowId
npx ts-node src/scripts/duplicateMovieSuggestion.ts --title="John Wick 4: Baba Yaga" --year=2023 --journeyOptionFlowId=61 --baseJourneyOptionFlowId=6
```

### Health Check Completo
```bash
# Verificação de integridade do sistema
npx ts-node src/scripts/healthCheck.ts

# Verifica:
# - Conexão com APIs
# - Integridade do banco
# - Configurações corretas
# - Performance dos providers
```

## 🎯 Melhores Práticas

1. **Sempre use `--ai-provider=deepseek`** para novos filmes (economia)
2. **Use `--ai-provider=auto`** quando não tiver certeza
3. **Teste com ambos providers** para casos duvidosos
4. **Documente novos subsentimentos** criados
5. **Monitore custos** e otimize quando possível
6. **Use TMDB ID** sempre que possível (mais eficiente)
7. **Valide Journey Option Flow** antes de processar

## 📚 Referências Rápidas

### Arquivos Importantes
- `src/scripts/orchestrator.ts` - Orquestrador principal
- `src/utils/aiProvider.ts` - Configuração de AI providers
- `prisma/schema.prisma` - Estrutura do banco de dados
- `docs/README_CURADORIA.md` - Documentação completa original

### Comandos Essenciais
```bash
# Curadoria completa (recomendado)
npx ts-node src/scripts/orchestrator.ts --title="FILME" --year=ANO --journeyOptionFlowId=ID --analysisLens=LENS --journeyValidation=VALIDATION --ai-provider=deepseek

# Teste de providers
npx ts-node src/scripts/testAIProviders.ts

# Health check
npx ts-node src/scripts/healthCheck.ts

# Duplicar sugestão
npx ts-node src/scripts/duplicateMovieSuggestion.ts "FILME" ANO JOURNEY_ID
```

---

**vibesfilm Curation System v2.0** - Powered by OpenAI + Gemini + DeepSeek 🎬🤖

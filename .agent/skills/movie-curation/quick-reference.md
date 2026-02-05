# ⚡ Referência Rápida - Movie Curation System

## Comando Principal

```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="TÍTULO" \
  --year=ANO \
  --journeyOptionFlowId=ID \
  --analysisLens=LENS_ID \
  --journeyValidation=VALIDATION_ID \
  --ai-provider=PROVIDER
```

## Parâmetros Essenciais

| Parâmetro | Valores | Descrição |
|-----------|---------|-----------|
| `--title` | String | Título do filme (exato do TMDB) |
| `--year` | Number | Ano de lançamento |
| `--journeyOptionFlowId` | Number | ID da opção de jornada |
| `--analysisLens` | 13-17 | ID do MainSentiment para análise |
| `--journeyValidation` | 13-17 | ID do sentimento de validação |
| `--ai-provider` | deepseek/openai/gemini/auto | Provider de IA |

## Lentes de Análise (MainSentiment)

| ID | Sentimento | Uso |
|----|------------|-----|
| 13 | Feliz | Filmes positivos, alegres, românticos |
| 14 | Triste | Dramas, filmes emocionais |
| 15 | Calmo | Filmes contemplativos, relaxantes |
| 16 | Ansioso | Suspense, thrillers, tensão |
| 17 | Animado | Ação, aventura, energia |

## AI Providers

| Provider | Quando Usar | Custo |
|----------|-------------|-------|
| `deepseek` | Ação, romance, comédia, família | 💰 Baixo |
| `openai` | Coming-of-age, dramas complexos, thrillers psicológicos | 💰💰 Médio-Alto |
| `gemini` | Romance, comédia, casos simples | 💰 Baixo |
| `auto` | Deixa o sistema decidir | 💰 Variável |

## Comandos Rápidos

### Curadoria Básica
```bash
# Filme de ação
npx ts-node src/scripts/orchestrator.ts --title="John Wick" --year=2014 --journeyOptionFlowId=26 --analysisLens=17 --journeyValidation=13 --ai-provider=deepseek

# Drama complexo
npx ts-node src/scripts/orchestrator.ts --title="Lady Bird" --year=2017 --journeyOptionFlowId=25 --analysisLens=14 --journeyValidation=13 --ai-provider=openai

# Romance
npx ts-node src/scripts/orchestrator.ts --title="Amélie" --year=2001 --journeyOptionFlowId=72 --analysisLens=13 --journeyValidation=13 --ai-provider=gemini
```

### Ferramentas de Teste
```bash
# Testar AI providers
npx ts-node src/scripts/testAIProviders.ts

# Health check
npx ts-node src/scripts/healthCheck.ts

# Duplicar sugestão
npx ts-node src/scripts/duplicateMovieSuggestion.ts "TÍTULO" ANO JOURNEY_ID
```

### Scripts Individuais (Uso Avançado)
```bash
# 1. Adicionar filme
npx ts-node src/scripts/populateMovies.ts --title="TÍTULO" --year=ANO

# 2. Analisar sentimentos
npx ts-node src/scripts/analyzeMovieSentiments.ts TMDB_ID JOF_ID LENS_ID --ai-provider=PROVIDER

# 3. Executar INSERTs
npx ts-node src/scripts/executeSqlFromFile.ts inserts.sql

# 4. Curadoria final
npx ts-node src/scripts/discoverAndCurateAutomated.ts TMDB_ID VALIDATION_ID --ai-provider=PROVIDER
```

## Variáveis de Ambiente

```env
# Obrigatórias
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
TMDB_API_KEY="..."

# Opcionais
GEMINI_API_KEY="..."
DEEPSEEK_API_KEY="..."
OMDB_API_KEY="..."
AI_PROVIDER="auto"
```

## Troubleshooting Rápido

| Erro | Solução |
|------|---------|
| Movie not found | Verifique título exato no TMDB |
| AI Provider 401 | Verifique keys no .env |
| JSON inválido | Aumente maxTokens ou troque provider |
| SubSentiment duplicado | Remova `--approve-new-subsentiments` |
| TMDB_ID não capturado | Verifique regex no orchestrator |

## Atalhos Úteis

```bash
# Alias para comandos comuns (adicione ao ~/.bashrc ou ~/.zshrc)
alias curate-action='npx ts-node src/scripts/orchestrator.ts --analysisLens=17 --journeyValidation=13 --ai-provider=deepseek'
alias curate-drama='npx ts-node src/scripts/orchestrator.ts --analysisLens=14 --journeyValidation=13 --ai-provider=openai'
alias curate-romance='npx ts-node src/scripts/orchestrator.ts --analysisLens=13 --journeyValidation=13 --ai-provider=gemini'

# Uso:
# curate-action --title="John Wick" --year=2014 --journeyOptionFlowId=26
```

## Logs e Debug

```bash
# Ativar debug
DEBUG=true npx ts-node src/scripts/orchestrator.ts [params]

# Ver logs estruturados
tail -f logs/curation.log

# Verificar última execução
cat inserts.sql
```

## Métricas Rápidas

| Métrica | Valor |
|---------|-------|
| Tempo médio | 30-60s por filme |
| Taxa de sucesso | ~95% |
| Custo DeepSeek | ~$0.001 por filme |
| Custo OpenAI | ~$0.01 por filme |
| Custo Gemini | ~$0.002 por filme |

---

**Dica:** Sempre use `--ai-provider=deepseek` como padrão para economia!

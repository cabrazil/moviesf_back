# Sistema de Curadoria de Filmes - vibesfilm

## Visão Geral

O sistema de curadoria de filmes é uma ferramenta automatizada que utiliza **inteligência artificial híbrida** (OpenAI + Gemini ou DeepSeek) para analisar e categorizar filmes baseado em sentimentos e intenções emocionais. O sistema foi projetado para ser escalável, manutenível e economicamente eficiente.

## Arquitetura Moderna

### Componentes Principais

1. **🎬 Orquestrador Central** (`orchestrator.ts`)
   - Sistema automatizado completo de curadoria
   - Seleção inteligente de AI provider (OpenAI/Gemini/DeepSeek/Auto)
   - Processamento por `tmdbId` para máxima eficiência
   - Validação e retry automático

2. **🤖 Sistema de AI Providers** (`utils/aiProvider.ts`)
   - Suporte: OpenAI (GPT-4) + Google Gemini + DeepSeek
   - Seleção automática baseada em contexto do filme
   - Otimização de custos e qualidade
   - Configuração específica por gênero

3. **📊 Scripts de Processamento**
   - `populateMovies.ts` - Adiciona filmes usando TMDB ID
   - `analyzeMovieSentiments.ts` - Análise de sentimentos com IA híbrida
   - `discoverAndCurateAutomated.ts` - Curadoria automatizada completa

4. **🛠️ Ferramentas de Suporte**
   - `testAIProviders.ts` - Comparação OpenAI vs Gemini
   - `duplicateMovieSuggestion.ts` - Duplicação de sugestões
   - `healthCheck.ts` - Verificação de integridade
   - `reprocessMovieSentiments.ts` - Reprocessa relevanceScore e reflexão
   - `rephrase_reasons` - Refaz as reflexões

## 🚀 Processo de Curadoria Automatizada

### Comando Principal (Recomendado)

```bash
# Curadoria completa automatizada
npx ts-node src/scripts/orchestrator.ts \
  --title="John Wick" \
  --year=2014 \
  --journeyOptionFlowId=26 \
  --analysisLens=17 \
  --journeyValidation=13 \
  --ai-provider=deepseek
```

### Parâmetros do Orchestrator

| Parâmetro | Descrição | Exemplo |
|-----------|-----------|---------|
| `--title` | Título do filme | `"John Wick"` |
| `--year` | Ano de lançamento | `2014` |
| `--journeyOptionFlowId` | ID da opção de jornada | `26` |
| `--analysisLens` | Lente de análise (ID do MainSentiment) | `17` (Animado) |
| `--journeyValidation` | Sentimento de validação | `13` (Feliz) |
| `--ai-provider` | Provider de IA: `deepseek`\| openai`\|`gemini`\|`auto` | `auto` |
| `--approve-new-subsentiments` | Aprovar novos subsentimentos | Flag opcional |

### 🎯 Sistema de AI Providers


```bash
# A seleção fica por conta do executar 
--ai-provider=deepseek
```

**🤖 OpenAI é escolhido para:**
- **Coming-of-age**: "Lady Bird", "As Vantagens de Ser Invisível"
- **Thrillers psicológicos**: Filmes com trauma, depressão
- **Dramas complexos**: Temas de saúde mental
- **Lente 16 (Ansioso)**: Melhor para suspense
- **Keywords complexas**: "autodescoberta", "trauma", "psicológico"

**🔮 DeepSeek é escolhido para:**
- **Romance/Comédia**: Filmes leves e românticos
- **Família/Animação**: Conteúdo familiar
- **Ação/Aventura**: "John Wick", "Mad Max"
- **Lente 13 (Feliz)** e **17 (Animado)**: Conteúdo positivo/energético
- **Default**: Para economia de custos

#### **Seleção Manual**

```bash
# OpenAI para casos complexos
--ai-provider=openai

# Gemini para economia e casos simples
--ai-provider=deepseek
```

### 📋 Etapas do Processo Automatizado

#### **Etapa 1: Adição do Filme**
```bash
# Busca e adiciona filme no banco usando TMDB
populateMovies.ts --title="John Wick" --year=2014
```
- ✅ Busca no TMDB por título/ano
- ✅ Captura: diretor, gêneros, keywords, ratings (IMDb, RT, Metacritic)
- ✅ Retorna `TMDB_ID_FOUND: 245891`

#### **Etapa 2: Análise de Sentimentos**
```bash
# Análise usando AI provider selecionado
analyzeMovieSentiments.ts 245891 26 17 --ai-provider=auto
```
- ✅ Busca filme por `tmdbId` (mais eficiente)
- ✅ Seleção automática: Gemini para ação
- ✅ Análise contextual usando lente 17 (Animado)
- ✅ Sugere subsentimentos: "Adrenalina / Emoção Intensa", "Deslumbramento Visual"

#### **Etapa 3: Execução de INSERTs**
```bash
# Executa comandos SQL gerados
executeSqlFromFile.ts inserts.sql
```
- ✅ Insere `MovieSentiment` para filme
- ✅ Atualiza `JourneyOptionFlowSubSentiment` com pesos
- ✅ Tratamento de duplicatas e erros

#### **Etapa 4: Curadoria Final**
```bash
# Curadoria e geração de reflexão
discoverAndCurateAutomated.ts 245891 13 --ai-provider=auto
```
- ✅ Valida compatibilidade filme-jornada
- ✅ Gera reflexão personalizada com IA
- ✅ Cria `MovieSuggestionFlow` final

### 🔧 Exemplos Práticos

#### **Filme de Ação (Auto-Gemini)**
```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="John Wick" \
  --year=2014 \
  --journeyOptionFlowId=26 \
  --analysisLens=17 \
  --journeyValidation=13 \
  --ai-provider=auto

# Sistema escolhe: GEMINI (ação + animado)
# Resultado: "Adrenalina / Emoção Intensa", "Deslumbramento Visual"
```

#### **Drama Coming-of-Age (Auto-OpenAI)**
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

#### **Romance (Manual-Gemini)**
```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="O Fabuloso Destino de Amélie Poulain" \
  --year=2001 \
  --journeyOptionFlowId=25 \
  --analysisLens=13 \
  --journeyValidation=13 \
  --ai-provider=gemini

# Gemini manual: Otimizado para romance
# Resultado: "Doçura / Encanto", "Conforto / Aconchego Emocional"
```

## 🧠 Conceitos Principais

### 1. **TMDB ID como Chave Primária**
- Identificador único e eficiente do filme
- Substitui busca por title/year para maior precisão
- Evita duplicatas e conflitos de nome

### 2. **Lente de Análise (Analysis Lens)**
- Sentimento principal usado para guiar a IA
- Determina como o filme será interpretado emocionalmente
- Valores: 13=Feliz, 14=Triste, 15=Calmo, 16=Ansioso, 17=Animado

### 3. **Journey Option Flow**
- Representa uma pergunta específica na jornada do usuário
- Ex: "filmes que sejam empolgantes e cheios de energia?"
- Conecta filme à experiência emocional desejada

### 4. **Validação de Sentimento**
- Sentimento final onde o usuário deve chegar
- Garante que o filme leva à experiência emocional correta

## 📊 Sistema de Monitoramento

### **Logs Estruturados**
```
🎬 === ORQUESTRADOR DE CURADORIA DE FILMES ===
📋 Processando 1 filmes...
🔄 Processando: John Wick (2014)
🎯 TMDB ID capturado: 245891
🤖 AI Provider selecionado automaticamente: GEMINI
📊 Baseado em: Gêneros [Ação], Lente 17
✅ Filme processado com sucesso
```

### **Validação Automática**
- ✅ Verificação de parâmetros obrigatórios
- ✅ Validação de IDs existentes no banco
- ✅ Detecção de filmes já processados
- ✅ Matching de subsentimentos existentes

### **Tratamento de Erros**
- 🔄 Retry automático para APIs
- 📝 Logs detalhados de falhas
- ⚠️ Validação de novos subsentimentos
- 🛡️ Fallback entre providers

## 🛠️ Ferramentas de Teste e Comparação

### **Teste de AI Providers**
```bash
# Comparação direta OpenAI vs Gemini
npx ts-node src/scripts/testAIProviders.ts

# Resultado mostra:
# - Tempo de resposta
# - Qualidade das sugestões
# - Custo estimado
# - Formato da resposta
```

### **Duplicação de Sugestões**
```bash
# Duplicar sugestão existente para nova jornada
npx ts-node src/scripts/duplicateMovieSuggestion.ts \
  "John Wick" 2014 27
```

### **Health Check Completo**
```bash
# Verificação de integridade do sistema
npx ts-node src/scripts/healthCheck.ts

# Verifica:
# - Conexão com APIs
# - Integridade do banco
# - Configurações corretas
# - Performance dos providers
```

## ⚙️ Configuração

### **Variáveis de Ambiente**
```env
# Banco de dados
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# APIs obrigatórias
OPENAI_API_KEY="sk-..."
TMDB_API_KEY="your-tmdb-key"

# APIs opcionais
GEMINI_API_KEY="your-gemini-key"
OMDB_API_KEY="your-omdb-key"

# Configuração padrão de AI
AI_PROVIDER="auto"  # openai|gemini|auto
```

### **Configuração de AI Providers**
```typescript
// src/utils/aiProvider.ts
export const AI_CONFIG = {
  openai: {
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 2000
  },
  gemini: {
    model: 'gemini-1.5-flash',
    temperature: 0.2,
    maxTokens: 1500,
    topP: 0.8,
    topK: 20
  }
};
```

## 💰 Otimização de Custos

### **Estratégia Híbrida**
- **Gemini**: Custo ~80% menor que OpenAI
- **OpenAI**: Reservado para casos complexos
- **Auto**: Otimização automática custo/qualidade

### **Métricas de Economia**
- Romance/Comédia: **100% Gemini** (economia máxima)
- Ação/Aventura: **90% Gemini** (economia alta)
- Coming-of-age: **100% OpenAI** (qualidade máxima)
- Drama psicológico: **100% OpenAI** (precisão necessária)

### **Monitoramento de Custos**
```bash
# Relatório de uso de APIs
npx ts-node src/scripts/reportCosts.ts --month=2024-01

# Mostra:
# - Distribuição OpenAI/Gemini
# - Custo por categoria
# - Economia estimada
```

## 🔧 Troubleshooting

### **Problemas Comuns**

#### **1. JSON Inválido do Gemini**
```
Erro: SyntaxError: Unexpected end of JSON input
Solução: Verificar stopSequences removido, maxTokens suficiente
```

#### **2. Subsentimento Duplicado**
```
Erro: "Suspense Crescente" já existe em mainSentiment diferente
Solução: Não aprovar com --approve-new-subsentiments
```

#### **3. TMDB_ID_FOUND não capturado**
```
Erro: orchestrator.ts passa title em vez de tmdbId
Solução: Verificar regex de captura TMDB_ID_FOUND
```

#### **4. AI Provider 401/404**
```
Erro: Request failed with status code 401
Solução: Verificar .env carregado, keys válidas
```

### **Debug Detalhado**
```bash
# Ativar logs verbose
DEBUG=true npx ts-node src/scripts/orchestrator.ts [params]

# Verificar configuração
npx ts-node src/scripts/testConnection.ts

# Validar AI providers
npx ts-node src/scripts/testAIProviders.ts
```

## 📈 Métricas e Performance

### **Tempos de Processamento**
- **OpenAI**: ~2-4 segundos por análise
- **Gemini**: ~1-3 segundos por análise
- **Total**: ~30-60 segundos por filme completo

### **Taxa de Sucesso**
- **Busca TMDB**: ~95% para filmes conhecidos
- **Análise IA**: ~98% com retry automático
- **Curadoria**: ~95% para filmes com dados completos

### **Qualidade dos Resultados**
- **OpenAI**: Explicações mais detalhadas, menos novos subsentimentos
- **Gemini**: Sugestões criativas, às vezes redundantes
- **Auto**: Balanceamento otimizado por contexto

## 🎯 Próximos Passos

### **Curto Prazo**
- [ ] Dashboard web para monitoramento
- [ ] Cache inteligente para reduzir custos
- [ ] Processamento em lote CSV
- [ ] API REST para integração

### **Médio Prazo**
- [ ] Machine Learning para otimizar seleção de provider
- [ ] A/B testing automático OpenAI vs Gemini
- [ ] Sistema de feedback para melhorar sugestões
- [ ] Integração com mais providers (Claude, etc.)

### **Longo Prazo**
- [ ] Análise de sentimentos em tempo real
- [ ] Recomendação proativa baseada em padrões
- [ ] Sistema de curadoria colaborativa
- [ ] Integração com plataformas de streaming

## 📚 Documentação Adicional

- **[AI Providers](docs/AI_PROVIDERS.md)** - Guia completo dos providers
- **[Database Schema](prisma/schema.prisma)** - Estrutura do banco
- **[API Documentation](docs/API.md)** - Endpoints disponíveis
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Guia de deploy

## 🤝 Contribuindo

1. **Sempre use `--ai-provider=deepseek`** para novos filmes
2. **Teste com ambos providers** para casos duvidosos
3. **Documente novos subsentimentos** criados
4. **Monitore custos** e otimize quando possível
5. **Escreva testes** para novas funcionalidades

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique logs em `console` ou arquivos gerados
2. Execute `healthCheck.ts` para diagnóstico
3. Teste providers com `testAIProviders.ts`
4. Consulte esta documentação
5. Contate a equipe de desenvolvimento

---

**vibesfilm Curation System v2.0** - Powered by OpenAI + Gemini 🎬🤖 
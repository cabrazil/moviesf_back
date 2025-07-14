# Sistema de Curadoria de Filmes

## Visão Geral

O sistema de curadoria de filmes é uma ferramenta automatizada que utiliza inteligência artificial para analisar e categorizar filmes baseado em sentimentos e intenções emocionais. O sistema foi projetado para ser escalável, manutenível e eficiente.

## Arquitetura

### Componentes Principais

1. **Scripts de Processamento** (`src/scripts/`)
   - `populateMovies.ts` - Adiciona filmes ao banco de dados
   - `analyzeMovieSentiments.ts` - Analisa sentimentos usando IA
   - `discoverAndCurate.ts` - Processo completo de curadoria
   - `executeSqlFromFile.ts` - Executa comandos SQL em lote

2. **Ferramentas de Gerenciamento**
   - `orchestrator.ts` - Automatiza todo o processo
   - `healthCheck.ts` - Verifica integridade do sistema
   - `cleanup.ts` - Limpeza e otimização de dados

3. **Serviços de Suporte**
   - `curationLogger.ts` - Sistema de logs estruturado
   - `curation.config.ts` - Configurações centralizadas

## Processo de Curadoria

### Fluxo Tradicional (Manual)

```bash
# 1. Adicionar filme
npx ts-node src/scripts/populateMovies.ts --title="Meu Amigo Totoro" --year=1988

# 2. Analisar sentimentos
npx ts-node src/scripts/analyzeMovieSentiments.ts "Meu Amigo Totoro" 1988 72 13

# 3. Executar INSERTs gerados
npx ts-node src/scripts/executeSqlFromFile.ts ../inserts.sql

# 4. Finalizar curadoria
npx ts-node src/scripts/discoverAndCurate.ts "Meu Amigo Totoro" 1988 15
```

### Fluxo Automatizado (Recomendado)

```bash
# Filme único
npx ts-node src/scripts/orchestrator.ts --single "Meu Amigo Totoro" 1988 72 13

# Processamento em lote via CSV
npx ts-node src/scripts/orchestrator.ts --csv movies_list.csv --sentiment 15

# Ajuda
npx ts-node src/scripts/orchestrator.ts --help
```

## Conceitos Principais

### 1. Lente de Análise
A "lente de análise" é o sentimento principal usado para guiar a IA na análise contextual do filme. Determina como o filme será interpretado emocionalmente.

### 2. Intenção Emocional
Sistema que categoriza filmes baseado na intenção do usuário:
- **PROCESSAR**: Filmes para processar emoções
- **TRANSFORMAR**: Filmes para mudança emocional
- **MANTER**: Filmes para manter estado emocional
- **EXPLORAR**: Filmes para exploração emocional

### 3. Subsentimentos
Categorias mais específicas dentro de cada sentimento principal, usadas para matching preciso entre filmes e usuários.

## Configuração

### Variáveis de Ambiente Obrigatórias

```env
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
TMDB_API_KEY="your-tmdb-key"
```

### Configuração Personalizada

```typescript
// src/config/curation.config.ts
export const customConfig = createCurationConfig('production');
```

## Manutenção do Sistema

### Verificação de Saúde

```bash
# Verificação completa
npx ts-node src/scripts/healthCheck.ts

# Códigos de saída:
# 0 = OK
# 1 = Erros críticos
# 2 = Avisos
```

### Limpeza de Dados

```bash
# Limpeza completa
npx ts-node src/scripts/cleanup.ts --full

# Limpeza específica
npx ts-node src/scripts/cleanup.ts --duplicates
npx ts-node src/scripts/cleanup.ts --orphans
npx ts-node src/scripts/cleanup.ts --optimize
```

## Logs e Monitoramento

### Sistema de Logs

Os logs são gerados automaticamente em `logs/`:
- `curation-YYYY-MM-DD.log` - Logs diários
- `session-summary-{sessionId}.json` - Resumos de sessão

### Categorias de Log

- **MOVIE_PROCESSING**: Processamento de filmes
- **SENTIMENT_ANALYSIS**: Análise de sentimentos
- **TMDB_SEARCH**: Buscas no TMDB
- **DATABASE**: Operações de banco
- **OPENAI_REQUEST**: Requisições OpenAI
- **BATCH_PROCESSING**: Processamento em lote

## Formato de Dados

### movies_list.csv
```csv
#Título do Filme,journeyOptionFlowId,ano
Meu Amigo Totoro,72,1988
Matrix,5,1999
```

### inserts.sql
```sql
INSERT INTO "MovieSentiment" ("movieId", "mainSentimentId", "subSentimentId", "createdAt", "updatedAt")
VALUES ('uuid', 14, 71, NOW(), NOW());

INSERT INTO "JourneyOptionFlowSubSentiment" ("journeyOptionFlowId", "subSentimentId", "weight", "createdAt", "updatedAt")
VALUES (80, 71, 0.80, NOW(), NOW());
```

## Troubleshooting

### Problemas Comuns

1. **Filme não encontrado no TMDB**
   - Verifique grafia do título
   - Tente ano diferente
   - Use título original

2. **Erro de análise OpenAI**
   - Verifique API key
   - Verifique limites de rate
   - Tente modelo diferente

3. **Dados inconsistentes**
   - Execute `healthCheck.ts`
   - Execute `cleanup.ts --full`
   - Verifique logs detalhados

### Códigos de Erro

- `TMDB_NOT_FOUND`: Filme não encontrado
- `OPENAI_ERROR`: Erro na análise IA
- `DATABASE_ERROR`: Erro de banco
- `VALIDATION_ERROR`: Erro de validação

## Melhorias Implementadas

### Escalabilidade
- ✅ Processamento em lote
- ✅ Configuração por ambiente
- ✅ Sistema de retry automático
- ✅ Logs estruturados

### Manutenibilidade
- ✅ Orquestrador centralizado
- ✅ Configuração centralizada
- ✅ Limpeza automática de dados
- ✅ Verificação de integridade

### Facilidade de Uso
- ✅ Scripts com help integrado
- ✅ Feedback visual detalhado
- ✅ Processamento CSV
- ✅ Detecção automática de problemas

## Próximos Passos

1. **Implementar cache** para reduzir chamadas TMDB/OpenAI
2. **Dashboard web** para monitoramento
3. **Testes automatizados** para validação
4. **API REST** para integração externa
5. **Processamento paralelo** para melhor performance

## Contribuindo

1. Sempre use o sistema de logs
2. Adicione validação de parâmetros
3. Implemente tratamento de erros
4. Escreva documentação
5. Teste em ambiente de desenvolvimento

## Suporte

Para problemas ou dúvidas:
1. Verifique logs em `logs/`
2. Execute `healthCheck.ts`
3. Consulte esta documentação
4. Contate o time de desenvolvimento 
# Rastreamento de Jornada de Filmes

Este documento explica como usar os scripts para rastrear a jornada completa de um filme através das tabelas relacionadas do sistema de recomendação.

## 📋 Objetivo

Descobrir como um filme foi sugerido em diferentes jornadas emocionais, rastreando todo o caminho desde a sugestão até a intenção emocional que gerou essa recomendação.

## 🗂️ Arquivos Criados

### 1. Script SQL (`sql/trace_movie_journey.sql`)
Consulta SQL complexa que rastreia toda a jornada de um filme através de CTEs (Common Table Expressions).

### 2. Script TypeScript (`src/scripts/traceMovieJourney.ts`)
Script principal que pode ser executado diretamente ou usado como módulo. Aceita parâmetros via linha de comando.

## 🚀 Como Usar

### Opção 1: SQL Direto (Supabase)

1. Acesse o Supabase SQL Editor
2. Copie o conteúdo de `sql/trace_movie_journey.sql`
3. Substitua `'%Inception%'` pelo título do filme desejado
4. Execute a consulta

**Exemplo:**
```sql
-- Buscar filmes com "Matrix"
WHERE m.title ILIKE '%Matrix%'
```

### Opção 2: TypeScript/Node.js

#### Executar o script principal:
```bash
# Por TMDB ID
cd moviesf_back
npx ts-node src/scripts/traceMovieJourney.ts --tmdbId=27205

# Por título
cd moviesf_back
npx ts-node src/scripts/traceMovieJourney.ts --title="Inception"

# Ver estatísticas
cd moviesf_back
npx ts-node src/scripts/traceMovieJourney.ts --stats
```

#### Usar programaticamente:
```typescript
import { traceMovieJourney, displayMovieJourney } from './src/scripts/traceMovieJourney';

// Buscar por título
const results = await traceMovieJourney('Inception');
displayMovieJourney(results);

// Buscar por TMDB ID
const resultsByTmdbId = await traceMovieJourney(undefined, undefined, 27205);
displayMovieJourney(resultsByTmdbId);

// Buscar por UUID específico
const resultsById = await traceMovieJourney(undefined, 'uuid-do-filme');
displayMovieJourney(resultsById);
```

## 📊 Estrutura dos Dados Retornados

O script rastreia a seguinte cadeia de relacionamentos:

```
Movie → MovieSuggestionFlow → JourneyOptionFlow → JourneyStepFlow → JourneyFlow → MainSentiment
                                    ↓
                            EmotionalIntentionJourneyStep → EmotionalIntention → MainSentiment
```

### Informações Retornadas:

1. **Dados do Filme:**
   - Título, ano, diretor
   - ID único

2. **Dados da Sugestão:**
   - Motivo da sugestão
   - Relevância
   - Data de criação

3. **Dados da Jornada:**
   - Passo atual na jornada
   - Pergunta sendo feita
   - Opção selecionada
   - Próximo passo

4. **Dados da Intenção Emocional:**
   - Tipo de intenção (PROCESS, TRANSFORM, MAINTAIN, EXPLORE)
   - Descrição da intenção
   - Gêneros preferidos/evitados
   - Tom emocional

5. **Dados do Sentimento Principal:**
   - Nome e descrição do sentimento

## 🎯 Casos de Uso

### 1. Análise de Recomendações
Descobrir por que um filme específico foi recomendado em diferentes contextos emocionais.

### 2. Debug de Jornadas
Identificar problemas na configuração de jornadas ou intenções emocionais.

### 3. Otimização de Sugestões
Analisar quais filmes são mais sugeridos e em quais contextos.

### 4. Validação de Dados
Verificar se as relações entre tabelas estão corretas.

## 📈 Exemplo de Saída

```
🎬 FILME 1: Inception
   Ano: 2010
   Diretor: Christopher Nolan
   Total de sugestões: 2

   📋 SUGESTÃO 1:
      ID: 123
      Motivo: Filme complexo que desafia a mente
      Relevância: 8
      Data: 15/01/2024
      
      🛤️  JORNADA:
         Sentimento Principal: Intriga
         Passo: step_3 (Ordem: 3)
         Pergunta: Você gosta de filmes que fazem você pensar?
         Opção: Sim, adoro quebra-cabeças mentais
         Próximo Passo: step_4
         É Estado Final: Não

      🎯 INTENÇÕES EMOCIONAIS:
         Intenção 1:
            Tipo: PROCESS
            Descrição: Processar informações complexas
            Prioridade: 1
            Obrigatório: Sim
            Gêneros Preferidos: Thriller, Sci-Fi, Drama
            Gêneros Evitados: Comédia, Romance
            Tom Emocional: similar
```

## 🔧 Personalização

### Modificar a Busca

Para buscar filmes diferentes, altere:

**SQL:**
```sql
WHERE m.title ILIKE '%SEU_FILME%'
```

**TypeScript:**
```typescript
const results = await traceMovieJourney('SEU_FILME');
```

### Adicionar Filtros

Para filtrar por outros critérios, modifique a consulta:

```typescript
// Filtrar por ano
const results = await prisma.movie.findMany({
  where: {
    title: { contains: 'Matrix' },
    year: { gte: 2000 }
  },
  // ... resto da consulta
});
```

## 🐛 Troubleshooting

### Erro: "Nenhum filme encontrado"
- Verifique se o título está correto
- Use busca parcial (ex: "Matrix" em vez de "The Matrix")
- Verifique se o filme existe na base de dados

### Erro: "Erro de conexão"
- Verifique se o DATABASE_URL está configurado
- Confirme se o Supabase está acessível

### Erro: "Relacionamento não encontrado"
- Verifique se as tabelas relacionadas existem
- Confirme se os dados estão populados corretamente

## 📝 Próximos Passos

1. **Automatização:** Criar endpoint API para esta funcionalidade
2. **Interface:** Desenvolver interface web para visualização
3. **Métricas:** Adicionar análises estatísticas mais detalhadas
4. **Cache:** Implementar cache para consultas frequentes
5. **Exportação:** Adicionar exportação para CSV/JSON

## 🤝 Contribuição

Para melhorar estes scripts:

1. Adicione novos filtros de busca
2. Implemente ordenação personalizada
3. Crie visualizações gráficas
4. Adicione testes automatizados
5. Documente novos casos de uso 
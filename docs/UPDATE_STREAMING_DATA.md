# Script de Atualização de Dados de Streaming

## 📋 Visão Geral

O script `updateStreamingData.ts` foi criado para manter atualizados os dados de streaming dos filmes na base de dados, utilizando uma abordagem híbrida que combina dados da API TMDB e YouTube.

## 🎯 Objetivos

- ✅ **Atualizar dados de streaming** de forma automática
- ✅ **Manter precisão** dos dados de plataformas
- ✅ **Otimizar performance** com sistema de prioridades
- ✅ **Reduzir custos** de API com atualizações seletivas

## 📊 Sistema de Prioridades

### 🔥 Alta Prioridade (Atualização Semanal)
- Filmes lançados em 2024+
- Filmes com rating 7.5+ e 1000+ votos
- **Uso:** `npx ts-node src/scripts/updateStreamingData.ts high`

###  Média Prioridade (Atualização Mensal)
- Filmes lançados entre 2020-2023
- Filmes com rating 6.5-7.4 e 500+ votos
- **Uso:** `npx ts-node src/scripts/updateStreamingData.ts medium`

###  Baixa Prioridade (Atualização Trimestral)
- Filmes lançados antes de 2020
- Filmes com rating < 6.5 ou < 500 votos
- **Uso:** `npx ts-node src/scripts/updateStreamingData.ts low`

## 🔧 Funcionalidades

### ✅ Integração Híbrida
- **TMDB API:** Captura plataformas principais (Netflix, Prime Video, etc.)
- **YouTube API:** Complementa com dados do YouTube
- **Combinação inteligente:** Dados completos e precisos

### ✅ Atualização Inteligente
- Remove dados antigos antes de inserir novos
- Usa `upsert` para evitar duplicatas
- Rate limiting (1 segundo entre requisições)

### ✅ Relatório Detalhado
- Contagem de sucessos e erros
- Taxa de sucesso percentual
- Logs detalhados por filme

## 📁 Estrutura do Script

```typescript
// Funções principais
updateStreamingData(priority)     // Função principal
getHighPriorityMovies()           // Filmes de alta prioridade
getMediumPriorityMovies()         // Filmes de média prioridade
getLowPriorityMovies()            // Filmes de baixa prioridade

// Funções de API
getTMDBStreamingData(tmdbId)      // Busca dados TMDB
checkYouTubeAvailability(title)    // Verifica YouTube
updateMovieStreamingData(movie)    // Atualiza filme específico
```

## 📅 Cronograma Sugerido

### 📅 Semanal (Alta Prioridade)
```bash
# Executar às 2h da manhã, domingos
0 2 * * 0 cd /path/to/project && npx ts-node src/scripts/updateStreamingData.ts high
```

### 📅 Mensal (Média Prioridade)
```bash
# Executar às 3h da manhã, primeiro domingo do mês
0 3 1-7 * 0 cd /path/to/project && npx ts-node src/scripts/updateStreamingData.ts medium
```

### 📅 Trimestral (Baixa Prioridade)
```bash
# Executar às 4h da manhã, primeiro domingo do trimestre
0 4 1-7 */3 0 cd /path/to/project && npx ts-node src/scripts/updateStreamingData.ts low
```

## ⚠️ Considerações Importantes

### ✅ Vantagens
- Dados sempre atualizados
- Performance otimizada
- Custo de API controlado
- Sistema escalável

### ⚠️ Limitações
- Depende de APIs externas
- Rate limiting necessário
- Possíveis falhas de rede
- Necessita monitoramento

## 📈 Monitoramento

### ✅ Métricas Importantes
- Taxa de sucesso das atualizações
- Tempo de execução
- Erros de API
- Mudanças detectadas

### ✅ Logs para Acompanhar
- Número de filmes processados
- Relações de streaming atualizadas
- Erros específicos por filme
- Performance geral

## 🚀 Próximos Passos

1. **Testar o script** com diferentes prioridades
2. **Configurar cron jobs** para execução automática
3. **Implementar monitoramento** de métricas
4. **Ajustar critérios** de prioridade conforme necessário

## 📝 Exemplo de Uso

```bash
# Atualizar filmes de alta prioridade
npx ts-node src/scripts/updateStreamingData.ts high

# Atualizar filmes de média prioridade
npx ts-node src/scripts/updateStreamingData.ts medium

# Atualizar filmes de baixa prioridade
npx ts-node src/scripts/updateStreamingData.ts low
```

## 🔗 Relacionado

- [Migração de Streaming Platforms](./STREAMING_PLATFORMS_MIGRATION.md)
- [Script populateMovies.ts](../src/scripts/populateMovies.ts)
- [Script enrichStreamingPlatformsTMDB.ts](../src/scripts/enrichStreamingPlatformsTMDB.ts)

---

**📝 Documentação criada para referência futura! 🎬**

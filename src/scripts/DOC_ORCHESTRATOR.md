# Documentação do Maestro: `orchestrator.ts`

O **`orchestrator.ts`** é o script central que automatiza todo o fluxo de curadoria ("DNA") de um filme no sistema. Ele gerencia o ciclo de vida completo de um filme, desde a busca no TMDB até validação final na jornada.

## 🔄 Fluxo de Execução

Para cada filme na lista de processamento, o orquestrador executa sequencialmente os seguintes passos (scripts):

### 1. 🎬 Adicionar/Buscar Filme
*   **Script:** `populateMovies.ts`
*   **Comando:** `npx ts-node populateMovies.ts --title="Titulo" --year=2024`
*   **Função:** 
    *   Busca o filme no TMDB.
    *   Salva dados básicos (título, sinopse, capa, `tmdbId`) no banco PostgreSQL.
    *   Identifica gêneros e metadados iniciais.

### 2. 🧬 Analisar Sentimentos (DNA Emocional)
*   **Script:** `analyzeMovieSentiments.ts`
*   **Comando:** `npx ts-node analyzeMovieSentiments.ts <tmdbId> <journeyOptionFlowId> <mainSentimentId>`
*   **Função:** 
    *   Usa IA (OpenAI/DeepSeek) para "ler" o filme emocionalmente.
    *   Gera os `MovieSentiments` (tags emocionais como "Conforto", "Tensão", "Superação").
    *   **IMPORTANTE:** Gera um arquivo `inserts.sql` com os comandos SQL para salvar essas tags.
    *   *Nota:* Este passo apenas *gera* o SQL, não executa ainda.

### 3. 💾 Persistir Análise
*   **Script:** `executeSqlFromFile.ts`
*   **Comando:** `npx ts-node executeSqlFromFile.ts ../../inserts.sql`
*   **Função:** 
    *   Lê o arquivo `inserts.sql` gerado no passo anterior.
    *   Executa os comandos no banco de dados, efetivando a gravação dos sentimentos.

### 4. 🔗 Curadoria e Validação de Jornada
*   **Script:** `discoverAndCurateAutomated.ts`
*   **Comando:** `npx ts-node discoverAndCurateAutomated.ts <tmdbId> <journeyOptionFlowId> <mainSentimentId>`
*   **Função:** 
    *   Calcula o `relevanceScore` do filme para a jornada específica.
    *   Cria o vínculo na tabela `MovieSuggestionFlow` (liga o filme à opção da jornada).
    *   Define se o filme entra no "Top 3" ou na lista geral.

---

## 🛠️ Funções Internas (Pós-Processamento)

Além de chamar scripts externos, o Orchestrator executa algumas tarefas críticas internamente para enriquecer a experiência do usuário:

*   **🎣 Hook da Landing Page (`generateLandingPageHook`)**:
    *   Usa IA para criar uma frase curta e impactante ("Prepare-se para...") usada em cards de marketing.
    *   Gera também o "Público Alvo" ("Ideal para quem busca...").

*   **⚠️ Alertas de Conteúdo (`generateContentWarnings`)**:
    *   Analisa sinopse e keywords para gerar avisos de gatilho (ex: "Violência gráfica", "Luto intenso").

*   **📊 Score de Relevância (`calculateAndUpdateScore`)**:
    *   Garante que o score numérico (0-100) esteja atualizado e consistente em todas as tabelas.

---

## 🚀 Como Usar

O orquestrador geralmente é invocado através de um script de entrypoint (como `run_curation.ts` ou manualmente) passando uma lista de objetos:

```typescript
const moviesToProcess = [
  {
    title: "A Chegada",
    year: 2016,
    journeyOptionFlowId: 159, // ID da opção "Quero refletir sobre a vida..."
    analysisLens: 18,         // ID do sentimento "Calmo/Reflexivo"
    journeyValidation: 159    // ID para validar o match final
  }
];

// Executa
orchestrator.processMovieList(moviesToProcess, true);
```

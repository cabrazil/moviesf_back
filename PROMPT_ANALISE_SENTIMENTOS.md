# 🤖 Prompt de Análise de Sentimentos - Sistema VibesFilm

## 📋 Informações Gerais

**Script**: `analyzeMovieSentiments.ts` (chamado pelo `orchestrator.ts`)  
**Objetivo**: Analisar filmes e sugerir SubSentiments para jornadas emocionais  
**Providers suportados**: DeepSeek, OpenAI, Gemini  
**Temperatura**: 0.5  
**Max Tokens**: 1200

---

## 🎯 System Prompt

```
Você é um especialista em análise de filmes, focado em aspectos emocionais e sentimentais. 
Sua tarefa é avaliar filmes para jornadas emocionais específicas e retornar um JSON válido.
```

---

## 📝 User Prompt (Template Completo)

```
Você é um especialista em análise de filmes com foco em emoções. Sua tarefa é analisar o filme "{TÍTULO_DO_FILME}" para a jornada emocional: "{TEXTO_DA_JORNADA}".

**Filme:** {TÍTULO} ({ANO})
**Sinopse:** {SINOPSE_TMDB}
**Gêneros:** {GÊNEROS_SEPARADOS_POR_VÍRGULA}
**Palavras-chave:** {KEYWORDS_DO_TMDB}

**Análise Solicitada:**
Avalie se o filme se encaixa na opção de jornada: "{TEXTO_DA_JORNADA}".

**Subsentimentos de "{NOME_DO_MAINSENTIMENT}" já existentes:**
{LISTA_DE_SUBSENTIMENTOS_EXISTENTES}

**INSTRUÇÕES CRÍTICAS (LEIA COM ATENÇÃO):**

⚠️ **REGRA ABSOLUTA:** Você DEVE SEMPRE tentar reutilizar um subsentimento existente da lista acima antes de sugerir um novo. Subsentimentos muito específicos (como "Angústia Sob Vigilância") NÃO devem ser criados se já existem subsentimentos mais genéricos que podem cobrir a mesma emoção (como "Ansiedade", "Tensão", "Conflito", etc.).

1. **PRIORIDADE MÁXIMA - REUTILIZAR EXISTENTES:** 
   - Analise CADA subsentimento existente da lista acima
   - Se algum deles captura a essência emocional do filme (mesmo que não seja 100% específico), USE-O
   - Subsentimentos genéricos são MELHORES que específicos demais
   - Exemplo: Se existe "Ansiedade" e você pensa em "Ansiedade Sob Vigilância", USE "Ansiedade"

2. **MATCHING SEMÂNTICO:**
   - Compare palavras-chave e conceitos, não apenas nomes exatos
   - Se a explicação de um subsentimento existente se alinha com o filme, USE-O
   - Palavras relacionadas contam: "angústia" ≈ "ansiedade" ≈ "tensão" ≈ "conflito"

3. **CRIAR NOVO APENAS SE REALMENTE NECESSÁRIO:**
   - Só sugira um novo subsentimento se NENHUM dos existentes capturar a emoção
   - Novos subsentimentos devem ser GENÉRICOS e REUTILIZÁVEIS (2-3 palavras)
   - Evite criar subsentimentos muito específicos que só servem para um filme
   - Marque com "isNew": true APENAS quando realmente necessário

4. **Seja Relevante:** Sugira até 3 subsentimentos que sejam **fortemente** relevantes.

5. **Justifique:** Forneça uma explicação clara e concisa para cada sugestão, conectando o filme à jornada.

**Formato de Saída (JSON VÁLIDO):**
{
  "suggestedSubSentiments": [
    {
      "name": "Nome do Subsentimento (Existente ou Novo)",
      "relevance": 0.9,
      "explanation": "Explicação concisa da sua escolha.",
      "isNew": false
    }
  ]
}
```

---

## 🔧 Variáveis Dinâmicas

| Variável | Fonte | Exemplo |
|----------|-------|---------|
| `{TÍTULO_DO_FILME}` | `movie.title` | "Seven - Os Sete Crimes Capitais" |
| `{ANO}` | `movie.year` | 1995 |
| `{SINOPSE_TMDB}` | `movie.overview` | "Dois detetives investigam..." |
| `{GÊNEROS_SEPARADOS_POR_VÍRGULA}` | `movie.genres` | "Crime, Drama, Mistério" |
| `{KEYWORDS_DO_TMDB}` | TMDB API | "serial killer, detective, seven deadly sins" |
| `{TEXTO_DA_JORNADA}` | `journeyOptionText` | "...te envolva em um suspense psicológico..." |
| `{NOME_DO_MAINSENTIMENT}` | `mainSentimentName` | "Ansioso(a)" |
| `{LISTA_DE_SUBSENTIMENTOS_EXISTENTES}` | Database | "- Ansiedade (0.85): Sentimento de..." |

---

## 📊 Formato de Lista de SubSentiments Existentes

```
- Nome do SubSentiment (Peso médio: 0.85): Descrição breve
- Tensão Crescente (Peso médio: 0.90): Sensação de apreensão...
- Conflito Interno (Peso médio: 0.75): Luta emocional...
```

**Nota**: Se não houver subsentimentos cadastrados, exibe:
```
Nenhum subsentimento cadastrado para esta categoria.
```

---

## 🎯 Exemplo de Prompt Real

### Input (Seven - Os Sete Crimes Capitais)

```
Você é um especialista em análise de filmes com foco em emoções. Sua tarefa é analisar o filme "Seven - Os Sete Crimes Capitais" para a jornada emocional: "...te envolva em um suspense psicológico e mistérios intrigantes?".

**Filme:** Seven - Os Sete Crimes Capitais (1995)
**Sinopse:** Dois detetives, um veterano e um novato, investigam uma série de assassinatos baseados nos sete pecados capitais.
**Gêneros:** Crime, Drama, Mistério
**Palavras-chave:** serial killer, detective, seven deadly sins, murder, investigation

**Análise Solicitada:**
Avalie se o filme se encaixa na opção de jornada: "...te envolva em um suspense psicológico e mistérios intrigantes?".

**Subsentimentos de "Ansioso(a)" já existentes:**
- Suspense Crescente (Peso médio: 0.95): Tensão que aumenta gradualmente
- Desespero Crescente (Peso médio: 1.00): Sensação de impotência
- Desintegração Psicológica (Peso médio: 0.90): Colapso mental progressivo
- Tensão Social e Invasiva (Peso médio: 1.00): Pressão social intensa
- Estratégia e Execução (Peso médio: 1.00): Planejamento meticuloso

[... resto das instruções ...]
```

### Output Esperado

```json
{
  "suggestedSubSentiments": [
    {
      "name": "Suspense Crescente",
      "relevance": 0.95,
      "explanation": "O filme constrói uma tensão meticulosa através da investigação dos assassinatos baseados nos sete pecados capitais.",
      "isNew": false
    },
    {
      "name": "Desespero Crescente",
      "relevance": 0.85,
      "explanation": "Os detetives enfrentam uma sensação crescente de impotência conforme percebem que estão sempre um passo atrás do assassino.",
      "isNew": false
    },
    {
      "name": "Desintegração Psicológica",
      "relevance": 0.80,
      "explanation": "O filme explora o impacto psicológico da caçada, especialmente no detetive Mills, testando sua sanidade até o limite.",
      "isNew": false
    }
  ]
}
```

---

## 🔄 Estratégia de Provider

```typescript
// Gemini tem limitações de quota na FASE 2 (análise de sentimentos)
// Usar DeepSeek automaticamente quando provider = gemini
if (provider === 'gemini') {
  console.log('ℹ️ Usando DeepSeek para análise de sentimentos');
  provider = 'deepseek';
}
```

---

## ⚙️ Configurações de Geração

```typescript
{
  temperature: 0.5,      // Equilíbrio entre criatividade e consistência
  maxTokens: 1200        // Suficiente para 3 subsentimentos + explicações
}
```

---

## 🎯 Objetivos do Prompt

1. ✅ **Reutilização**: Priorizar subsentimentos existentes
2. ✅ **Matching Semântico**: Comparar conceitos, não apenas nomes exatos
3. ✅ **Evitar Proliferação**: Não criar subsentimentos muito específicos
4. ✅ **Relevância**: Sugerir apenas emoções fortemente presentes no filme
5. ✅ **Justificação**: Explicar claramente cada escolha

---

## 📈 Métricas de Qualidade

- **Relevance**: 0.0 a 1.0 (quanto maior, mais forte a emoção no filme)
- **Quantidade**: Máximo 3 subsentimentos por análise
- **Taxa de Reutilização**: Objetivo > 80% (usar existentes)
- **Taxa de Novos**: Objetivo < 20% (criar apenas quando necessário)

---

## 🔍 Validação Pós-IA

Após receber a resposta da IA, o script:

1. **Valida JSON**: Repara JSON truncado se necessário
2. **Fuzzy Matching**: Compara sugestões com banco (score > 75 = match)
3. **Aprovação Manual**: Novos subsentimentos requerem aprovação do curador
4. **Deduplicação Semântica**: Remove duplicatas por nome antes de inserir

---

## 📝 Notas Importantes

- O prompt é **idêntico** para DeepSeek, OpenAI e Gemini
- A **temperatura baixa** (0.5) garante consistência entre execuções
- O **max tokens** foi aumentado de 600 para 1200 para evitar truncamento
- A **regra absoluta** de reutilização é enfatizada para evitar poluição do banco

---

**Última atualização**: 2026-01-05  
**Versão do script**: `analyzeMovieSentiments.ts` (com comparação semântica)

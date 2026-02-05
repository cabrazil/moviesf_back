# 🎬 Movie Curation Skill

Skill para dominar o sistema de curadoria automatizada de filmes do **vibesfilm**.

## 📚 Documentação

### Arquivos Principais

1. **[SKILL.md](./SKILL.md)** - 📖 Documentação completa do sistema
   - Visão geral e arquitetura
   - Componentes e ferramentas
   - Guia de uso detalhado
   - Conceitos fundamentais
   - Troubleshooting completo

2. **[examples.md](./examples.md)** - 🎯 Exemplos práticos
   - Cenários comuns de uso
   - Casos especiais
   - Workflows completos
   - Dicas e boas práticas

3. **[quick-reference.md](./quick-reference.md)** - ⚡ Referência rápida
   - Comandos essenciais
   - Parâmetros e valores
   - Atalhos úteis
   - Troubleshooting rápido

## 🚀 Início Rápido

### Comando Básico
```bash
npx ts-node src/scripts/orchestrator.ts \
  --title="John Wick" \
  --year=2014 \
  --journeyOptionFlowId=26 \
  --analysisLens=17 \
  --journeyValidation=13 \
  --ai-provider=deepseek
```

### Lentes de Análise
- **13** - Feliz (romance, comédia)
- **14** - Triste (drama)
- **15** - Calmo (contemplativo)
- **16** - Ansioso (suspense, thriller)
- **17** - Animado (ação, aventura)

### AI Providers
- **deepseek** - Recomendado (baixo custo)
- **openai** - Dramas complexos
- **gemini** - Romance/comédia
- **auto** - Seleção automática

## 📖 Como Usar Esta Skill

1. **Primeiro:** Leia [SKILL.md](./SKILL.md) para entender o sistema completo
2. **Depois:** Consulte [examples.md](./examples.md) para ver casos práticos
3. **Referência:** Use [quick-reference.md](./quick-reference.md) para comandos rápidos

## 🎯 Objetivo

Dominar completamente o sistema de curadoria automatizada de filmes, incluindo:
- ✅ Entender a arquitetura e componentes
- ✅ Saber quando usar cada AI provider
- ✅ Executar curadoria completa automatizada
- ✅ Otimizar custos e qualidade
- ✅ Resolver problemas comuns
- ✅ Usar ferramentas auxiliares

## 🛠️ Ferramentas Principais

| Ferramenta | Função |
|------------|--------|
| `orchestrator.ts` | Curadoria completa automatizada |
| `testAIProviders.ts` | Teste e comparação de providers |
| `healthCheck.ts` | Verificação de integridade |
| `duplicateMovieSuggestion.ts` | Duplicar sugestões |

## 💡 Dicas Rápidas

- 💰 **Economia:** Use `--ai-provider=deepseek` como padrão
- 🎯 **Qualidade:** Use `--ai-provider=openai` para dramas complexos
- ⚡ **Automático:** Use `--ai-provider=auto` quando em dúvida
- 📊 **Teste:** Execute `testAIProviders.ts` antes de processar em lote

## 📞 Suporte

Para problemas ou dúvidas:
1. Consulte a seção de Troubleshooting em [SKILL.md](./SKILL.md)
2. Verifique os exemplos em [examples.md](./examples.md)
3. Execute `healthCheck.ts` para diagnóstico
4. Consulte a referência rápida em [quick-reference.md](./quick-reference.md)

---

**vibesfilm Curation System v2.0** 🎬🤖

#!/bin/bash

# Script para atualizar analyzeMovieSentiments.ts com novo formato de prompt

FILE="src/scripts/analyzeMovieSentiments.ts"

# Criar backup
cp "$FILE" "${FILE}.backup-$(date +%Y%m%d_%H%M%S)"

echo "✅ Backup criado"
echo "⚠️  ATENÇÃO: As mudanças precisam ser feitas manualmente devido à complexidade"
echo ""
echo "📝 MUDANÇAS NECESSÁRIAS:"
echo ""
echo "1. Na função analyzeMovieWithAI (linha ~123):"
echo "   - Adicionar parâmetro: journeyOptionFlowId: number"
echo "   - Mudar retorno de 'suggestedSubSentiments' para 'matches'"
echo "   - Adicionar campo 'type: OFFICIAL | SUGGESTION' no retorno"
echo ""
echo "2. Substituir busca de existingSubSentiments por:"
echo "   - officialJofSubSentiments (da JOF)"
echo "   - librarySubSentiments (do MainSentiment, excluindo oficiais)"
echo ""
echo "3. Atualizar prompt completo (linha ~174-224)"
echo ""
echo "4. Atualizar parsing da resposta da IA (linha ~250+)"
echo ""
echo "Consulte o arquivo PROMPT_ANALISE_SENTIMENTOS.md para o novo formato completo"

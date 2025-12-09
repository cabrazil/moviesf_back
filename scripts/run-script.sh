#!/bin/bash
# Script wrapper para executar scripts de manutenção com ambiente correto
# Uso: ./scripts/run-script.sh [development|production] <script-path> [args...]
# OU via npm: npm run script:dev -- src/scripts/orchestrator.ts --title="..." --year=2001

set -e

ENV=${1:-development}
SCRIPT_PATH=${2}

if [ -z "$SCRIPT_PATH" ]; then
  echo "❌ Uso: ./scripts/run-script.sh [development|production] <script-path> [args...]"
  echo ""
  echo "Exemplos:"
  echo "  ./scripts/run-script.sh development src/scripts/orchestrator.ts --title=\"Shrek\" --year=2001"
  echo "  ./scripts/run-script.sh production src/scripts/populateMovies.ts"
  echo ""
  echo "Via npm (use -- para separar argumentos):"
  echo "  npm run script:dev -- src/scripts/orchestrator.ts --title=\"Shrek\" --year=2001"
  exit 1
fi

if [ "$ENV" != "development" ] && [ "$ENV" != "production" ]; then
  echo "❌ Ambiente inválido: $ENV"
  echo "Use: development ou production"
  exit 1
fi

# Verificar se arquivo de ambiente existe
ENV_FILE=".env.${ENV}"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Arquivo $ENV_FILE não encontrado!"
  echo "💡 Execute: npm run env:setup:${ENV}"
  exit 1
fi

# Shift para remover ENV e SCRIPT_PATH dos argumentos
shift 2

# Executar script com NODE_ENV definido
echo "📋 Executando script com ambiente: $ENV"
echo "📁 Script: $SCRIPT_PATH"
if [ $# -gt 0 ]; then
  echo "📝 Argumentos: $@"
fi
echo ""

NODE_ENV=$ENV npx ts-node "$SCRIPT_PATH" "$@"


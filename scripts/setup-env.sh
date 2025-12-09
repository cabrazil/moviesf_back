#!/bin/bash
# Script para configurar ambiente de desenvolvimento ou produção
# Uso: ./scripts/setup-env.sh [development|production]

set -e

ENV=${1:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if [ "$ENV" != "development" ] && [ "$ENV" != "production" ]; then
  echo "❌ Ambiente inválido: $ENV"
  echo "Uso: ./scripts/setup-env.sh [development|production]"
  exit 1
fi

ENV_FILE=".env.$ENV.example"
TARGET_ENV_FILE=".env.$ENV"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Arquivo $ENV_FILE não encontrado!"
  exit 1
fi

echo "📋 Configurando ambiente: $ENV"
echo "📁 Copiando $ENV_FILE para $TARGET_ENV_FILE..."

cp "$ENV_FILE" "$TARGET_ENV_FILE"

echo "✅ Ambiente configurado com sucesso!"
echo ""
echo "📝 Arquivo $TARGET_ENV_FILE criado/atualizado"
echo "⚠️  Lembre-se de atualizar as chaves de API no arquivo $TARGET_ENV_FILE"
echo ""
echo "Para usar este ambiente:"
echo "  NODE_ENV=$ENV npm run dev    # Desenvolvimento"
echo "  NODE_ENV=$ENV npm start      # Produção"


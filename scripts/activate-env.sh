#!/bin/bash
# Ativa ambiente de desenvolvimento ou produção
# Uso: source ./scripts/activate-env.sh [development|production]
# OU: . ./scripts/activate-env.sh [development|production]

ENV=${1:-development}

if [ "$ENV" != "development" ] && [ "$ENV" != "production" ]; then
  echo "❌ Ambiente inválido: $ENV"
  echo "Use: development ou production"
  return 2>/dev/null || exit 1
fi

ENV_FILE=".env.${ENV}"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Arquivo $ENV_FILE não encontrado!"
  echo "💡 Execute: npm run env:setup:${ENV}"
  return 2>/dev/null || exit 1
fi

# Carregar variáveis do arquivo de ambiente
export NODE_ENV=$ENV
set -a
source "$ENV_FILE"
set +a

echo "✅ Ambiente $ENV ativado"
echo "📊 DB Filmes: $(echo $DATABASE_URL | grep -oP '@\K[^:]+' || echo 'não configurado')"
echo "📝 DB Blog: $(echo $BLOG_DATABASE_URL | grep -oP '@\K[^:]+' || echo 'não configurado')"
echo ""
echo "💡 Agora você pode executar scripts normalmente:"
echo "   npx ts-node src/scripts/orchestrator.ts --title=\"Shrek\" --year=2001"


#!/bin/bash

# Script de post-deploy para o backend
# Configura as labels do Traefik após cada deploy no Dokploy

set -e

echo "🔧 Configurando labels do Traefik para o backend..."

SERVICE_NAME="vibesfilm-moviesfback-diifom"
DOMAIN="api-vibes.cbrazil.com"
PORT="3333"
ROUTER_NAME="vibes-back"

# Verificar se o serviço existe
if ! docker service ls | grep -q "$SERVICE_NAME"; then
    echo "❌ Erro: Serviço $SERVICE_NAME não encontrado!"
    exit 1
fi

# Adicionar labels do Traefik
docker service update \
  --container-label-add traefik.enable=true \
  --container-label-add "traefik.http.routers.${ROUTER_NAME}.rule=Host(\`${DOMAIN}\`)" \
  --container-label-add "traefik.http.routers.${ROUTER_NAME}.entrypoints=websecure" \
  --container-label-add "traefik.http.routers.${ROUTER_NAME}.tls.certresolver=letsencrypt" \
  --container-label-add "traefik.http.services.${ROUTER_NAME}.loadbalancer.server.port=${PORT}" \
  "$SERVICE_NAME"

echo "✅ Labels do Traefik configuradas com sucesso!"
echo "⏳ Aguardando 10 segundos para o Traefik atualizar..."
sleep 10

# Testar a API
echo "🧪 Testando a API..."
if curl -s -f "https://${DOMAIN}/health" > /dev/null; then
    echo "✅ API está respondendo corretamente!"
    echo "🌐 URL: https://${DOMAIN}"
else
    echo "⚠️  Aviso: API não está respondendo ainda. Aguarde alguns segundos."
fi

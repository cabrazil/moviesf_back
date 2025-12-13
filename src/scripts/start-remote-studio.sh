#!/bin/bash

# Configurações do Servidor e Banco
REMOTE_USER="vibesfilm"
REMOTE_HOST="178.156.178.145"
REMOTE_PORT="5433" # Porta que o Docker expõe no VPS (conforme vimos no docker ps)
LOCAL_PORT="5434"  # Porta local diferente da padrão (5432) para evitar conflitos

# Credenciais do Banco (Extraídas do container)
DB_USER="vibesfilm"
DB_PASS="Sec010203"
DB_NAME="vibesfilm"

echo "============================================="
echo "🔌 Estabelecendo Túnel Seguro com VPS..."
echo "Target: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PORT -> localhost:$LOCAL_PORT"
echo "============================================="

# Tenta matar qualquer processo usando a porta 5434 antes de começar
fuser -k $LOCAL_PORT/tcp > /dev/null 2>&1

# Inicia o túnel SSH em background
# -N: Não executa comando remoto
# -L: Forward de porta
ssh -N -L $LOCAL_PORT:localhost:$REMOTE_PORT $REMOTE_USER@$REMOTE_HOST &
TUNNEL_PID=$!

# Função para limpar ao sair (Trap)
cleanup() {
    echo ""
    echo "🔒 Fechando túnel SSH (PID $TUNNEL_PID)..."
    kill $TUNNEL_PID
    echo "👋 Até logo!"
}
trap cleanup EXIT

# Aguarda um momento para o túnel estabelecer
sleep 2

echo "✅ Túnel estabelecido!"
echo "🚀 Iniciando Prisma Studio conectado à PRODUÇÃO..."
echo "⚠️  CUIDADO: Você está editando dados reais!"
echo ""

# Inicia o Prisma Studio com a URL apontando para o túnel local
export DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:$LOCAL_PORT/$DB_NAME"
npx prisma studio --browser none

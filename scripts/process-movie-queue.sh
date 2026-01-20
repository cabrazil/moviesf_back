#!/bin/bash

# ============================================
# Script: Processar Fila de Filmes (Docker)
# Executa orchestrator dentro do container Docker
# ============================================

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configurações
CONTAINER_NAME="moviesf_back"  # Ajustar se necessário
QUEUE_FILE="/home/vibesfilm/queue/movies_queue.txt"
LOG_DIR="/home/vibesfilm/logs/orchestrator"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/batch_$TIMESTAMP.log"

# Criar diretórios se não existirem
mkdir -p "$(dirname "$QUEUE_FILE")"
mkdir -p "$LOG_DIR"

# Função de log
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Detectar container automaticamente
detect_container() {
    # Buscar container com padrão moviesfback no nome
    local CONTAINER_ID=$(docker ps --filter "name=moviesfback" --filter "status=running" --format "{{.ID}}" | head -1)
    
    if [ -z "$CONTAINER_ID" ]; then
        # Fallback: tentar por label do Dokploy
        CONTAINER_ID=$(docker ps --filter "label=com.docker.compose.project=moviesf" --filter "status=running" --format "{{.ID}}" | head -1)
    fi
    
    if [ -z "$CONTAINER_ID" ]; then
        echo "ERROR: Container não encontrado!" >&2
        docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}" >&2
        return 1
    fi
    
    # Retornar apenas o ID (sem log)
    echo "$CONTAINER_ID"
}

# Verificar se arquivo de fila existe
if [ ! -f "$QUEUE_FILE" ]; then
    log_error "Arquivo de fila não encontrado: $QUEUE_FILE"
    log "Crie o arquivo e adicione os comandos, um por linha."
    exit 1
fi

# Verificar se arquivo está vazio
if [ ! -s "$QUEUE_FILE" ]; then
    log_warning "Arquivo de fila está vazio. Nada para processar."
    exit 0
fi

# Detectar container
CONTAINER_ID=$(detect_container)
CONTAINER_NAME=$(docker ps --filter "id=$CONTAINER_ID" --format "{{.Names}}")

log "=========================================="
log "🎬 PROCESSAMENTO EM LOTE DE FILMES"
log "=========================================="
log "🐳 Container: $CONTAINER_NAME ($CONTAINER_ID)"
log "📋 Fila: $QUEUE_FILE"
log "📝 Log: $LOG_FILE"
log ""

# Contar total de comandos
TOTAL_COMMANDS=$(grep -v '^#' "$QUEUE_FILE" | grep -v '^$' | wc -l)
log "📊 Total de comandos: $TOTAL_COMMANDS"
log ""

# Contadores
SUCCESS_COUNT=0
ERROR_COUNT=0
CURRENT=0

# Processar cada linha do arquivo
while IFS= read -r line || [ -n "$line" ]; do
    # Ignorar linhas vazias e comentários
    if [[ -z "$line" ]] || [[ "$line" =~ ^# ]]; then
        continue
    fi
    
    CURRENT=$((CURRENT + 1))
    
    log "------------------------------------------"
    log "🎬 Processando [$CURRENT/$TOTAL_COMMANDS]"
    log "📝 Comando: $line"
    log "------------------------------------------"
    
    # Executar comando dentro do container (usando npx ts-node diretamente)
    if docker exec "$CONTAINER_ID" npx ts-node $line >> "$LOG_FILE" 2>&1; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        log_success "Filme processado com sucesso! [$CURRENT/$TOTAL_COMMANDS]"
    else
        ERROR_COUNT=$((ERROR_COUNT + 1))
        log_error "Erro ao processar filme! [$CURRENT/$TOTAL_COMMANDS]"
    fi
    
    log ""
    
    # Pequena pausa entre processamentos
    sleep 2
    
done < "$QUEUE_FILE"

# Resumo final
log "=========================================="
log "📊 RESUMO DO PROCESSAMENTO"
log "=========================================="
log "Total processado: $CURRENT"
log_success "Sucessos: $SUCCESS_COUNT"
if [ $ERROR_COUNT -gt 0 ]; then
    log_error "Erros: $ERROR_COUNT"
else
    log "Erros: 0"
fi
log ""
log "📝 Log completo: $LOG_FILE"
log "=========================================="

# Fazer backup da fila processada
BACKUP_FILE="/home/vibesfilm/queue/processed/movies_queue_$TIMESTAMP.txt"
mkdir -p "$(dirname "$BACKUP_FILE")"
cp "$QUEUE_FILE" "$BACKUP_FILE"
log "💾 Backup da fila: $BACKUP_FILE"

# Limpar arquivo de fila
> "$QUEUE_FILE"
log "🗑️  Fila limpa e pronta para novos comandos"

log ""
if [ $ERROR_COUNT -eq 0 ]; then
    log_success "✅ Processamento concluído com sucesso!"
    exit 0
else
    log_error "⚠️  Processamento concluído com erros. Verifique o log."
    exit 1
fi

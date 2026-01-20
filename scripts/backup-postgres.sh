#!/bin/bash

# ============================================
# Script de Backup Automático - PostgreSQL
# Bancos: Vibesfilm + Blog
# Frequência: Diário (via cron)
# Retenção: 7 dias
# ============================================

set -e  # Parar em caso de erro

# Configurações
BACKUP_DIR="/home/cabrazil/backups/postgres"
LOG_DIR="/home/cabrazil/backups/logs"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
DATE_SIMPLE=$(date +%Y-%m-%d)

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Criar diretórios se não existirem
mkdir -p "$BACKUP_DIR"/{vibesfilm,blog}
mkdir -p "$LOG_DIR"

# Arquivo de log
LOG_FILE="$LOG_DIR/backup_$DATE_SIMPLE.log"

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

# Função para fazer backup de um banco
backup_database() {
    local DB_NAME=$1
    local DB_URL=$2
    local BACKUP_PATH=$3
    
    log "Iniciando backup do banco: $DB_NAME"
    
    # Nome do arquivo de backup
    local BACKUP_FILE="$BACKUP_PATH/${DB_NAME}_backup_$DATE.sql.gz"
    
    # Fazer backup usando pg_dump e comprimir com gzip
    if pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"; then
        local FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_success "Backup de $DB_NAME concluído: $BACKUP_FILE ($FILE_SIZE)"
        
        # Verificar integridade do arquivo
        if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
            log_success "Integridade do backup verificada"
        else
            log_error "Arquivo de backup corrompido!"
            return 1
        fi
    else
        log_error "Falha ao fazer backup de $DB_NAME"
        return 1
    fi
}

# Função para limpar backups antigos
cleanup_old_backups() {
    local BACKUP_PATH=$1
    local DB_NAME=$2
    
    log "Limpando backups antigos de $DB_NAME (mantendo últimos $RETENTION_DAYS dias)..."
    
    # Contar backups antes da limpeza
    local BEFORE_COUNT=$(find "$BACKUP_PATH" -name "${DB_NAME}_backup_*.sql.gz" | wc -l)
    
    # Remover backups mais antigos que RETENTION_DAYS
    find "$BACKUP_PATH" -name "${DB_NAME}_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # Contar backups após limpeza
    local AFTER_COUNT=$(find "$BACKUP_PATH" -name "${DB_NAME}_backup_*.sql.gz" | wc -l)
    local DELETED=$((BEFORE_COUNT - AFTER_COUNT))
    
    if [ $DELETED -gt 0 ]; then
        log_success "Removidos $DELETED backup(s) antigo(s) de $DB_NAME"
    else
        log "Nenhum backup antigo para remover de $DB_NAME"
    fi
}

# Função para enviar notificação (opcional)
send_notification() {
    local STATUS=$1
    local MESSAGE=$2
    
    # Aqui você pode adicionar integração com:
    # - Telegram
    # - Discord
    # - Email
    # - Slack
    # etc.
    
    # Exemplo com curl (descomente e configure):
    # curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
    #     -d "chat_id=<CHAT_ID>" \
    #     -d "text=🗄️ Backup PostgreSQL - $STATUS: $MESSAGE"
}

# ============================================
# INÍCIO DO PROCESSO DE BACKUP
# ============================================

log "=========================================="
log "🗄️  INICIANDO BACKUP AUTOMÁTICO"
log "=========================================="
log "Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')"
log "Retenção: $RETENTION_DAYS dias"
log ""

# Carregar variáveis de ambiente
if [ -f /home/cabrazil/newprojs/fav_movies/moviesf_back/.env.production ]; then
    source /home/cabrazil/newprojs/fav_movies/moviesf_back/.env.production
    log_success "Variáveis de ambiente carregadas"
else
    log_error "Arquivo .env.production não encontrado!"
    exit 1
fi

# Verificar se as variáveis estão definidas
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL (Vibesfilm) não está definida!"
    exit 1
fi

if [ -z "$BLOG_DATABASE_URL" ]; then
    log_warning "BLOG_DATABASE_URL não está definida. Pulando backup do blog."
    SKIP_BLOG=true
else
    SKIP_BLOG=false
fi

# ============================================
# BACKUP DO BANCO VIBESFILM
# ============================================

log ""
log "📊 Banco: VIBESFILM"
log "------------------------------------------"

if backup_database "vibesfilm" "$DATABASE_URL" "$BACKUP_DIR/vibesfilm"; then
    cleanup_old_backups "$BACKUP_DIR/vibesfilm" "vibesfilm"
    VIBESFILM_STATUS="✅ SUCESSO"
else
    VIBESFILM_STATUS="❌ FALHA"
fi

# ============================================
# BACKUP DO BANCO BLOG
# ============================================

if [ "$SKIP_BLOG" = false ]; then
    log ""
    log "📝 Banco: BLOG"
    log "------------------------------------------"
    
    if backup_database "blog" "$BLOG_DATABASE_URL" "$BACKUP_DIR/blog"; then
        cleanup_old_backups "$BACKUP_DIR/blog" "blog"
        BLOG_STATUS="✅ SUCESSO"
    else
        BLOG_STATUS="❌ FALHA"
    fi
else
    BLOG_STATUS="⏭️  PULADO"
fi

# ============================================
# RESUMO FINAL
# ============================================

log ""
log "=========================================="
log "📊 RESUMO DO BACKUP"
log "=========================================="
log "Vibesfilm: $VIBESFILM_STATUS"
log "Blog:      $BLOG_STATUS"
log ""

# Estatísticas de armazenamento
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
TOTAL_FILES=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)

log "Espaço utilizado: $TOTAL_SIZE"
log "Total de backups: $TOTAL_FILES arquivos"
log ""

# Listar últimos 5 backups de cada banco
log "Últimos backups - Vibesfilm:"
find "$BACKUP_DIR/vibesfilm" -name "*.sql.gz" -type f -printf "%T@ %p\n" | sort -rn | head -5 | while read timestamp file; do
    size=$(du -h "$file" | cut -f1)
    date=$(date -d "@${timestamp%.*}" '+%Y-%m-%d %H:%M:%S')
    log "  - $(basename "$file") ($size) - $date"
done

if [ "$SKIP_BLOG" = false ]; then
    log ""
    log "Últimos backups - Blog:"
    find "$BACKUP_DIR/blog" -name "*.sql.gz" -type f -printf "%T@ %p\n" | sort -rn | head -5 | while read timestamp file; do
        size=$(du -h "$file" | cut -f1)
        date=$(date -d "@${timestamp%.*}" '+%Y-%m-%d %H:%M:%S')
        log "  - $(basename "$file") ($size) - $date"
    done
fi

log ""
log "=========================================="
log "✅ BACKUP CONCLUÍDO"
log "=========================================="
log "Log completo: $LOG_FILE"

# Enviar notificação (opcional)
# send_notification "CONCLUÍDO" "Vibesfilm: $VIBESFILM_STATUS | Blog: $BLOG_STATUS"

exit 0
